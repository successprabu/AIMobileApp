import React, { useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Checkbox,
  DataTable,
  Divider,
  Portal,
  Text,
  TextInput,
} from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { useTranslation } from "react-i18next";
import { authPost } from "../api/client";
import { PATHS } from "../api/endpoints";
import type { AuthUser } from "../types/auth";
import type { ImportRecord, TransactionFormData } from "../types/transaction";
import { extractTextFromImageUri } from "../utils/imageOcr";
import {
  importTemplateCsv,
  parseRecordsFromText,
  processAmountDistribution,
} from "../utils/transactionImport";
import {
  hasValidationErrors,
  validateTransaction,
} from "../utils/transactionValidation";

function dateUTC() {
  return new Date(new Date().toUTCString()).toISOString();
}

type Props = {
  visible: boolean;
  onDismiss: () => void;
  user: AuthUser;
  onImportComplete: (successCount: number) => void;
};

export default function TransactionImportModal({
  visible,
  onDismiss,
  user,
  onImportComplete,
}: Props) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"ocr" | "manual">("ocr");
  const [extractedRecords, setExtractedRecords] = useState<ImportRecord[]>([]);
  const [manualRecords, setManualRecords] = useState<ImportRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectAll, setSelectAll] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentRecord, setCurrentRecord] = useState({
    name: "",
    villageName: "",
    amount: "",
    oldAmount: "",
    newAmount: "",
    initial: "",
    phoneNo: "",
    remarks: "",
  });

  const customerId = (user.customerID as number) ?? 0;
  const functionId = (user.functionId as number) ?? 0;
  const userId = String(user.id ?? "SYSTEM");

  const reset = () => {
    setExtractedRecords([]);
    setManualRecords([]);
    setImagePreview(null);
    setProgress(0);
    setSelectAll(true);
    setTab("ocr");
    setCurrentRecord({
      name: "",
      villageName: "",
      amount: "",
      oldAmount: "",
      newAmount: "",
      initial: "",
      phoneNo: "",
      remarks: "",
    });
  };

  const close = () => {
    reset();
    onDismiss();
  };

  const downloadTemplate = async () => {
    const csv = importTemplateCsv();
    const path = `${FileSystem.cacheDirectory}import_template.csv`;
    await FileSystem.writeAsStringAsync(path, csv);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, { mimeType: "text/csv" });
    }
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t("an_error_occurred"), t("imagePermissionRequired"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setImagePreview(asset.uri);
    setIsProcessing(true);
    setProgress(0);

    try {
      const text = await extractTextFromImageUri(asset.uri, setProgress);
      let parsed = parseRecordsFromText(text);
      parsed = processAmountDistribution(parsed);
      parsed = parsed.map((r) => ({
        ...r,
        customerId,
        functionId,
        createdBy: userId,
        createdDt: dateUTC(),
        updatedBy: userId,
        updatedDt: dateUTC(),
      }));
      setExtractedRecords(parsed);
    } catch {
      Alert.alert(t("an_error_occurred"), t("ocrFailed"));
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const addManualRecord = () => {
    if (!currentRecord.name.trim() || !currentRecord.villageName.trim()) {
      Alert.alert(t("an_error_occurred"), t("manualRecordNameVillageRequired"));
      return;
    }

    const amt = parseFloat(currentRecord.amount) || 0;
    const old = parseFloat(currentRecord.oldAmount) || 0;
    const neu = parseFloat(currentRecord.newAmount) || 0;

    setManualRecords([
      ...manualRecords,
      {
        id: Date.now() + Math.random() * 1000,
        name: currentRecord.name,
        villageName: currentRecord.villageName,
        amount: amt || old + neu,
        oldAmount: old,
        newAmount: neu,
        initial: currentRecord.initial,
        phoneNo: currentRecord.phoneNo,
        remarks: currentRecord.remarks,
        isSelected: true,
        customerId,
        functionId,
        createdBy: userId,
        createdDt: dateUTC(),
        updatedBy: userId,
        updatedDt: dateUTC(),
      },
    ]);

    setCurrentRecord({
      name: "",
      villageName: "",
      amount: "",
      oldAmount: "",
      newAmount: "",
      initial: "",
      phoneNo: "",
      remarks: "",
    });
  };

  const confirmManualToExtracted = () => {
    if (manualRecords.length === 0) return;
    setExtractedRecords(manualRecords);
    setManualRecords([]);
    setTab("ocr");
  };

  const toggleRecord = (id: number) => {
    setExtractedRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isSelected: !r.isSelected } : r))
    );
  };

  const toggleSelectAll = () => {
    const next = !selectAll;
    setSelectAll(next);
    setExtractedRecords((prev) => prev.map((r) => ({ ...r, isSelected: next })));
  };

  const editRecord = (id: number, field: keyof ImportRecord, value: string | number) => {
    setExtractedRecords((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };
        if (field === "oldAmount" || field === "newAmount") {
          updated.amount =
            Number(updated.oldAmount) + Number(updated.newAmount);
        }
        return updated;
      })
    );
  };

  const saveSelected = async () => {
    const selected = extractedRecords.filter((r) => r.isSelected);
    if (selected.length === 0) {
      Alert.alert(t("an_error_occurred"), t("noRecordsSelected"));
      return;
    }

    setSaving(true);
    let successCount = 0;

    for (const record of selected) {
      const payload: TransactionFormData = {
        id: 0,
        customerId: record.customerId ?? customerId,
        villageName: record.villageName || "Unknown",
        initial: record.initial || "",
        name: record.name || "Unknown",
        oldAmount: record.oldAmount || 0,
        newAmount: record.newAmount || 0,
        amount: record.amount || (record.oldAmount || 0) + (record.newAmount || 0),
        remarks: record.remarks || "",
        phoneNo: record.phoneNo || "",
        createdBy: record.createdBy ?? userId,
        createdDt: record.createdDt ?? dateUTC(),
        updatedBy: record.updatedBy ?? userId,
        updatedDt: record.updatedDt ?? dateUTC(),
        isActive: true,
        type: "R",
        returnStatus: "N",
        returnRemark: "",
        functionId: record.functionId ?? functionId,
      };

      const errors = validateTransaction(payload, t);
      if (hasValidationErrors(errors)) continue;

      try {
        const res = await authPost<{ result: boolean }>(
          PATHS.SAVE_TRANSACTION,
          payload as unknown as Record<string, unknown>
        );
        if (res.result) successCount++;
      } catch {
        // continue bulk import
      }
    }

    setSaving(false);
    if (successCount > 0) {
      onImportComplete(successCount);
      close();
    } else {
      Alert.alert(t("an_error_occurred"), t("importSaveFailed"));
    }
  };

  const selectedCount = extractedRecords.filter((r) => r.isSelected).length;
  const selectedTotal = extractedRecords
    .filter((r) => r.isSelected)
    .reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <Portal>
      <Modal visible={visible} animationType="slide" onRequestClose={close}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text variant="titleLarge">{t("importData")}</Text>
            <Button onPress={close}>{t("close")}</Button>
          </View>

          <View style={styles.tabs}>
            <Button
              mode={tab === "ocr" ? "contained" : "outlined"}
              onPress={() => setTab("ocr")}
              style={styles.tabBtn}
            >
              {t("ocrImport")}
            </Button>
            <Button
              mode={tab === "manual" ? "contained" : "outlined"}
              onPress={() => setTab("manual")}
              style={styles.tabBtn}
            >
              {t("manualEntry")}
            </Button>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {tab === "manual" ? (
              <View>
                <Text variant="bodyMedium" style={styles.hint}>
                  {t("manualEntryHint")}
                </Text>
                <TextInput
                  label={`${t("name")} *`}
                  mode="outlined"
                  value={currentRecord.name}
                  onChangeText={(v) => setCurrentRecord({ ...currentRecord, name: v })}
                  style={styles.field}
                />
                <TextInput
                  label={`${t("village")} *`}
                  mode="outlined"
                  value={currentRecord.villageName}
                  onChangeText={(v) =>
                    setCurrentRecord({ ...currentRecord, villageName: v })
                  }
                  style={styles.field}
                />
                <View style={styles.row2}>
                  <TextInput
                    label={t("amount")}
                    mode="outlined"
                    keyboardType="numeric"
                    value={currentRecord.amount}
                    onChangeText={(v) =>
                      setCurrentRecord({ ...currentRecord, amount: v })
                    }
                    style={[styles.field, styles.half]}
                  />
                  <TextInput
                    label={t("initial")}
                    mode="outlined"
                    value={currentRecord.initial}
                    onChangeText={(v) =>
                      setCurrentRecord({ ...currentRecord, initial: v })
                    }
                    style={[styles.field, styles.half]}
                  />
                </View>
                <TextInput
                  label={t("mobile")}
                  mode="outlined"
                  keyboardType="phone-pad"
                  value={currentRecord.phoneNo}
                  onChangeText={(v) =>
                    setCurrentRecord({ ...currentRecord, phoneNo: v })
                  }
                  style={styles.field}
                />
                <TextInput
                  label={t("remarks")}
                  mode="outlined"
                  value={currentRecord.remarks}
                  onChangeText={(v) =>
                    setCurrentRecord({ ...currentRecord, remarks: v })
                  }
                  style={styles.field}
                />
                <Button mode="contained" onPress={addManualRecord} icon="plus">
                  {t("addRecord")}
                </Button>

                {manualRecords.map((r, idx) => (
                  <View key={r.id} style={styles.manualRow}>
                    <Text>
                      {idx + 1}. {r.name} — {r.villageName} — ₹{r.amount}
                    </Text>
                    <Button
                      compact
                      textColor="#c62828"
                      onPress={() =>
                        setManualRecords(manualRecords.filter((m) => m.id !== r.id))
                      }
                    >
                      {t("delete")}
                    </Button>
                  </View>
                ))}

                {manualRecords.length > 0 ? (
                  <Button
                    mode="contained-tonal"
                    onPress={confirmManualToExtracted}
                    style={styles.mt}
                  >
                    {t("importRecordsCount", { count: manualRecords.length })}
                  </Button>
                ) : null}
              </View>
            ) : !extractedRecords.length && !isProcessing ? (
              <View style={styles.center}>
                <Text variant="titleMedium">{t("uploadImageTitle")}</Text>
                <Text variant="bodySmall" style={styles.hint}>
                  {t("uploadImageHint")}
                </Text>
                <Button mode="contained" icon="upload" onPress={pickImage} style={styles.mt}>
                  {t("selectImage")}
                </Button>
                <Button mode="outlined" icon="download" onPress={downloadTemplate} style={styles.mt}>
                  {t("downloadTemplate")}
                </Button>
              </View>
            ) : isProcessing ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" />
                <Text style={styles.mt}>{t("processingImage")}</Text>
                <Text>{progress}%</Text>
                {imagePreview ? (
                  <Image source={{ uri: imagePreview }} style={styles.preview} />
                ) : null}
              </View>
            ) : (
              <View>
                <Text variant="bodyMedium">
                  {t("importSummary", {
                    total: extractedRecords.length,
                    selected: selectedCount,
                    amount: selectedTotal.toLocaleString(),
                  })}
                </Text>
                <Pressable onPress={toggleSelectAll} style={styles.checkRow}>
                  <Checkbox status={selectAll ? "checked" : "unchecked"} />
                  <Text>{t("selectAll")}</Text>
                </Pressable>
                <DataTable>
                  <DataTable.Header>
                    <DataTable.Title>{t("name")}</DataTable.Title>
                    <DataTable.Title>{t("village")}</DataTable.Title>
                    <DataTable.Title numeric>{t("amount")}</DataTable.Title>
                  </DataTable.Header>
                  {extractedRecords.map((r) => (
                    <DataTable.Row key={r.id}>
                      <DataTable.Cell>
                        <Checkbox
                          status={r.isSelected ? "checked" : "unchecked"}
                          onPress={() => toggleRecord(r.id)}
                        />
                      </DataTable.Cell>
                      <DataTable.Cell>
                        <TextInput
                          dense
                          value={r.name}
                          onChangeText={(v) => editRecord(r.id, "name", v)}
                        />
                      </DataTable.Cell>
                      <DataTable.Cell>
                        <TextInput
                          dense
                          value={r.villageName}
                          onChangeText={(v) => editRecord(r.id, "villageName", v)}
                        />
                      </DataTable.Cell>
                      <DataTable.Cell numeric>{r.amount}</DataTable.Cell>
                    </DataTable.Row>
                  ))}
                </DataTable>
                <Button mode="outlined" onPress={pickImage} style={styles.mt}>
                  {t("uploadDifferentImage")}
                </Button>
              </View>
            )}
          </ScrollView>

          <Divider />
          <View style={styles.footer}>
            <Button onPress={close}>{t("cancel")}</Button>
            {tab === "ocr" && extractedRecords.length > 0 && !isProcessing ? (
              <Button
                mode="contained"
                loading={saving}
                disabled={saving || selectedCount === 0}
                onPress={saveSelected}
              >
                {t("saveSelected", { count: selectedCount })}
              </Button>
            ) : null}
          </View>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    marginTop: 48,
    backgroundColor: "#fff",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  tabs: { flexDirection: "row", paddingHorizontal: 12, gap: 8 },
  tabBtn: { flex: 1 },
  body: { flex: 1, padding: 16 },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    gap: 8,
  },
  center: { alignItems: "center", paddingVertical: 24 },
  hint: { color: "#666", marginVertical: 8, textAlign: "center" },
  mt: { marginTop: 12 },
  field: { marginBottom: 8, backgroundColor: "#fff" },
  row2: { flexDirection: "row", gap: 8 },
  half: { flex: 1 },
  preview: { width: 200, height: 160, marginTop: 16, borderRadius: 8 },
  manualRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
  },
  checkRow: { flexDirection: "row", alignItems: "center", marginVertical: 8 },
});

import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Divider,
  Snackbar,
  Switch,
  Text,
  TextInput,
} from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { authPost } from "../api/client";
import { useVoiceInput } from "../hooks/useVoiceInput";
import { PATHS } from "../api/endpoints";
import TransactionImportModal from "../components/TransactionImportModal";
import VoiceTextField from "../components/VoiceTextField";
import { useAuth } from "../context/AuthContext";
import type { MainStackParamList } from "../navigation/types";
import type { AuthUser } from "../types/auth";
import type {
  LastRecordResponse,
  TransactionFormData,
  TransactionSaveResponse,
} from "../types/transaction";
import {
  hasValidationErrors,
  validateTransaction,
} from "../utils/transactionValidation";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { importTemplateCsv } from "../utils/transactionImport";

function dateUTC() {
  return new Date(new Date().toUTCString()).toISOString();
}

function emptyForm(customerId: number, functionId: number, userId: string): TransactionFormData {
  return {
    id: 0,
    customerId,
    villageName: "",
    initial: "",
    name: "",
    oldAmount: 0,
    newAmount: 0,
    amount: 0,
    remarks: "",
    phoneNo: "",
    createdBy: userId,
    createdDt: dateUTC(),
    updatedBy: userId,
    updatedDt: dateUTC(),
    isActive: true,
    type: "R",
    returnStatus: "N",
    returnRemark: "",
    functionId,
  };
}

export default function NewReceiptScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const u = user as AuthUser;
  const customerId = (u.customerID as number) ?? 0;
  const functionId = (u.functionId as number) ?? 0;
  const userId = String(u.id ?? "SYSTEM");

  const [formData, setFormData] = useState<TransactionFormData>(() =>
    emptyForm(customerId, functionId, userId)
  );
  const [errors, setErrors] = useState<Partial<Record<keyof TransactionFormData, string>>>({});
  const [saving, setSaving] = useState(false);
  const [autoTranslateEnabled, setAutoTranslateEnabled] = useState(false);
  const [lastRecord, setLastRecord] = useState<LastRecordResponse["data"] | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [showTotals, setShowTotals] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [snack, setSnack] = useState({ visible: false, message: "", isError: false });

  const handleSpeechResult = useCallback((field: string, transcript: string) => {
    if (field === "phoneNo") {
      setFormData((prev) => ({
        ...prev,
        phoneNo: transcript.replace(/\D/g, "").slice(0, 15),
      }));
      return;
    }
    if (field === "oldAmount" || field === "newAmount") {
      const numeric = transcript.replace(/[^\d.]/g, "");
      setFormData((prev) => ({
        ...prev,
        [field]: numeric ? Number(numeric) : 0,
      }));
      return;
    }
    setFormData((prev) => ({ ...prev, [field]: transcript }));
  }, []);

  const { recordingField, toggleRecording } = useVoiceInput(handleSpeechResult);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t("addTransaction") });
  }, [navigation, t]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      amount: Number(prev.oldAmount) + Number(prev.newAmount),
    }));
  }, [formData.oldAmount, formData.newAmount]);

  const showMessage = (message: string, isError = false) => {
    setSnack({ visible: true, message, isError });
  };

  const updateField = <K extends keyof TransactionFormData>(
    key: K,
    value: TransactionFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleVoice = async (field: string) => {
    const ok = await toggleRecording(field);
    if (ok === false) showMessage(t("speechNotAvailable"), true);
  };

  const handleClear = () => {
    setFormData(emptyForm(customerId, functionId, userId));
    setErrors({});
  };

  const downloadTemplate = async () => {
    const csv = importTemplateCsv();
    const path = `${FileSystem.cacheDirectory}import_template.csv`;
    await FileSystem.writeAsStringAsync(path, csv);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, { mimeType: "text/csv" });
    }
  };

  const handleSubmit = async () => {
    if (saving) return;

    if (!functionId) {
      showMessage(t("pleaseCreateFunction"), true);
      return;
    }

    const validationErrors = validateTransaction(formData, t);
    if (hasValidationErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    try {
      const res = await authPost<TransactionSaveResponse>(
        PATHS.SAVE_TRANSACTION,
        formData as unknown as Record<string, unknown>
      );

      if (res.result) {
        if (res.data) setLastRecord(res.data);
        setFormData(emptyForm(customerId, functionId, userId));
        setErrors({});
        showMessage(t("transactionSaved"));
      } else {
        showMessage(res.message ?? t("an_error_occurred"), true);
      }
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data
              ?.message
          : undefined;
      showMessage(msg ?? t("an_error_occurred"), true);
    } finally {
      setSaving(false);
    }
  };

  const onImportComplete = useCallback((count: number) => {
    showMessage(t("importSuccess", { count }));
  }, [t]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.toolbar}>
          <View style={styles.switchRow}>
            <Switch
              value={autoTranslateEnabled}
              onValueChange={setAutoTranslateEnabled}
            />
            <Text variant="bodyMedium" style={styles.switchLabel}>
              {t("enableTranslationSuggestions")}
            </Text>
          </View>
          <View style={styles.toolbarBtns}>
            <Button compact mode="outlined" icon="download" onPress={downloadTemplate}>
              {t("downloadTemplate")}
            </Button>
            <Button compact mode="contained" icon="file-import" onPress={() => setShowImport(true)}>
              {t("import")}
            </Button>
          </View>
        </View>

        {lastRecord?.transaction ? (
          <Card style={styles.card}>
            <Card.Title
              title={t("lastRecordHistory")}
              right={(props) => (
                <Button
                  {...props}
                  compact
                  onPress={() => setHistoryExpanded(!historyExpanded)}
                >
                  {historyExpanded ? "−" : "+"}
                </Button>
              )}
            />
            {historyExpanded ? (
              <Card.Content>
                <Text>
                  {t("placeName")}: {lastRecord.transaction.villageName}
                </Text>
                <Text>
                  {t("name")}: {lastRecord.transaction.name}
                </Text>
                <Text>
                  {t("amount")}: {lastRecord.transaction.amount}
                </Text>
                <View style={styles.totalRow}>
                  <Text>{t("totalRecord")}:</Text>
                  <Button compact onPress={() => setShowTotals(!showTotals)}>
                    {showTotals ? t("hide") : t("show")}
                  </Button>
                  <Text>{showTotals ? lastRecord.totalTrans : "•••••"}</Text>
                </View>
                <Text>
                  {t("totalAmount")}: {showTotals ? lastRecord.totalAmount : "•••••"}
                </Text>
              </Card.Content>
            ) : null}
          </Card>
        ) : null}

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="labelLarge" style={styles.label}>
              {t("village")} *
            </Text>
            <VoiceTextField
              value={formData.villageName}
              onChangeText={(v) => updateField("villageName", v)}
              fieldName="villageName"
              placeholder={t("enter_village")}
              suggestionsEnabled={autoTranslateEnabled}
              enableSuggestions
              errorText={errors.villageName}
              recordingField={recordingField}
              onToggleVoice={handleVoice}
            />

            <Text variant="labelLarge" style={styles.label}>
              {t("name")} *
            </Text>
            <VoiceTextField
              value={formData.name}
              onChangeText={(v) => updateField("name", v)}
              fieldName="name"
              placeholder={t("enter_name")}
              suggestionsEnabled={autoTranslateEnabled}
              enableSuggestions
              errorText={errors.name}
              recordingField={recordingField}
              onToggleVoice={handleVoice}
            />

            <Text variant="labelLarge" style={styles.label}>
              {t("initial")}
            </Text>
            <VoiceTextField
              value={formData.initial}
              onChangeText={(v) => updateField("initial", v)}
              fieldName="initial"
              placeholder={t("enter_initial")}
              suggestionsEnabled={autoTranslateEnabled}
              enableSuggestions
              recordingField={recordingField}
              onToggleVoice={handleVoice}
            />

            <View style={styles.row2}>
              <View style={styles.half}>
                <Text variant="labelLarge" style={styles.label}>
                  {t("oldAmount")} *
                </Text>
                <TextInput
                  mode="outlined"
                  keyboardType="numeric"
                  value={String(formData.oldAmount || "")}
                  onChangeText={(v) =>
                    updateField("oldAmount", v === "" ? 0 : Number(v))
                  }
                  error={!!errors.oldAmount}
                  right={
                    <TextInput.Icon
                      icon={recordingField === "oldAmount" ? "microphone-off" : "microphone"}
                      onPress={() => handleVoice("oldAmount")}
                    />
                  }
                  style={styles.amountInput}
                />
                {errors.oldAmount ? (
                  <Text variant="bodySmall" style={styles.error}>
                    {errors.oldAmount}
                  </Text>
                ) : null}
              </View>
              <View style={styles.half}>
                <Text variant="labelLarge" style={styles.label}>
                  {t("newAmount")} *
                </Text>
                <TextInput
                  mode="outlined"
                  keyboardType="numeric"
                  value={String(formData.newAmount || "")}
                  onChangeText={(v) =>
                    updateField("newAmount", v === "" ? 0 : Number(v))
                  }
                  error={!!errors.newAmount}
                  right={
                    <TextInput.Icon
                      icon={recordingField === "newAmount" ? "microphone-off" : "microphone"}
                      onPress={() => handleVoice("newAmount")}
                    />
                  }
                  style={styles.amountInput}
                />
                {errors.newAmount ? (
                  <Text variant="bodySmall" style={styles.error}>
                    {errors.newAmount}
                  </Text>
                ) : null}
              </View>
            </View>

            <Text variant="labelLarge" style={styles.label}>
              {t("total")} *
            </Text>
            <TextInput
              mode="outlined"
              value={String(formData.amount)}
              disabled
              style={styles.amountInput}
            />

            <Text variant="labelLarge" style={styles.label}>
              {t("mobile")}
            </Text>
            <TextInput
              mode="outlined"
              keyboardType="phone-pad"
              value={formData.phoneNo}
              onChangeText={(v) => updateField("phoneNo", v.replace(/\D/g, ""))}
              placeholder={t("enter_mobile")}
              error={!!errors.phoneNo}
              right={
                <TextInput.Icon
                  icon={recordingField === "phoneNo" ? "microphone-off" : "microphone"}
                  onPress={() => handleVoice("phoneNo")}
                />
              }
              style={styles.amountInput}
            />
            {errors.phoneNo ? (
              <Text variant="bodySmall" style={styles.error}>
                {errors.phoneNo}
              </Text>
            ) : null}

            <Text variant="labelLarge" style={styles.label}>
              {t("remarks")}
            </Text>
            <VoiceTextField
              value={formData.remarks}
              onChangeText={(v) => updateField("remarks", v)}
              fieldName="remarks"
              placeholder={t("enter_remarks")}
              suggestionsEnabled={autoTranslateEnabled}
              enableSuggestions
              recordingField={recordingField}
              onToggleVoice={handleVoice}
            />

            <Divider style={styles.divider} />

            <View style={styles.actions}>
              <Button
                mode="contained"
                icon="content-save"
                onPress={handleSubmit}
                loading={saving}
                disabled={saving}
                style={styles.actionBtn}
              >
                {saving ? t("processing_your_request") : t("save")}
              </Button>
              <Button
                mode="outlined"
                icon="close"
                onPress={handleClear}
                disabled={saving}
                style={styles.actionBtn}
              >
                {t("clearButton")}
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      <TransactionImportModal
        visible={showImport}
        onDismiss={() => setShowImport(false)}
        user={u}
        onImportComplete={onImportComplete}
      />

      <Snackbar
        visible={snack.visible}
        onDismiss={() => setSnack((s) => ({ ...s, visible: false }))}
        duration={4000}
        style={snack.isError ? styles.snackError : undefined}
      >
        {snack.message}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f0f4f8" },
  scroll: { padding: 12, paddingBottom: 32 },
  toolbar: { marginBottom: 12 },
  switchRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  switchLabel: { marginLeft: 8, flex: 1 },
  toolbarBtns: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  card: { marginBottom: 12 },
  label: { marginTop: 8, marginBottom: 4 },
  row2: { flexDirection: "row", gap: 8 },
  half: { flex: 1 },
  amountInput: { backgroundColor: "#fff" },
  error: { color: "#c62828", marginBottom: 4 },
  divider: { marginVertical: 16 },
  actions: { flexDirection: "row", gap: 12, justifyContent: "center" },
  actionBtn: { flex: 1 },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  snackError: { backgroundColor: "#c62828" },
});

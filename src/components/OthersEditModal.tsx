import React, { useEffect, useMemo, useState } from "react";
import { Modal, ScrollView, StyleSheet, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Button, Checkbox, Portal, Text, TextInput } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { OTHERS_TYPE_KEYS } from "../constants/othersTypes";
import VoiceTextField from "./VoiceTextField";
import { useVoiceInput } from "../hooks/useVoiceInput";
import type { TransactionRecord } from "../types/transaction";
import { hasOthersErrors, validateOthers } from "../utils/othersValidation";
import { useAppTheme } from "../hooks/useAppTheme";
import { useThemedInputProps } from "../hooks/useThemedInputProps";

type Props = {
  visible: boolean;
  transaction: TransactionRecord | null;
  onDismiss: () => void;
  onSave: (record: TransactionRecord) => Promise<void>;
};

export default function OthersEditModal({
  visible,
  transaction,
  onDismiss,
  onSave,
}: Props) {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const inputTheme = useThemedInputProps();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [draft, setDraft] = useState<TransactionRecord | null>(null);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(transaction ? { ...transaction, type: "O" } : null);
    setErrors({});
  }, [transaction, visible]);

  const handleSpeech = (field: string, transcript: string) => {
    if (!draft) return;
    if (field === "phoneNo") {
      setDraft({ ...draft, phoneNo: transcript.replace(/\D/g, "").slice(0, 15) });
    } else if (field === "others") {
      const num = Number(transcript.replace(/[^\d.]/g, "")) || 0;
      setDraft({ ...draft, others: num });
    } else if (
      field === "villageName" ||
      field === "name" ||
      field === "othersRemark"
    ) {
      setDraft({ ...draft, [field]: transcript });
    }
  };

  const { recordingField, toggleRecording } = useVoiceInput(handleSpeech);

  if (!draft) return null;

  const handleSave = async () => {
    const validationErrors = validateOthers(draft, t);
    if (hasOthersErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...draft, type: "O" });
      onDismiss();
    } finally {
      setSaving(false);
    }
  };

  const translateType = (key: string) => {
    const label = t(key);
    return label === key ? key : label;
  };

  return (
    <Portal>
      <Modal visible={visible} animationType="slide" onRequestClose={onDismiss}>
        <View style={styles.sheet}>
          <Text variant="titleLarge" style={styles.title}>
            {t("editOthers")}
          </Text>
          <ScrollView keyboardShouldPersistTaps="handled">
            <VoiceTextField
              label={t("name")}
              mode="outlined"
              value={draft.name}
              onChangeText={(v) => setDraft({ ...draft, name: v })}
              fieldName="name"
              recordingField={recordingField}
              onToggleVoice={toggleRecording}
              errorText={errors.name}
              style={styles.field}
            />
            <VoiceTextField
              label={t("placeName")}
              mode="outlined"
              value={draft.villageName}
              onChangeText={(v) => setDraft({ ...draft, villageName: v })}
              fieldName="villageName"
              recordingField={recordingField}
              onToggleVoice={toggleRecording}
              errorText={errors.villageName}
              style={styles.field}
            />
            <VoiceTextField
              label={t("phoneNo")}
              mode="outlined"
              keyboardType="phone-pad"
              value={draft.phoneNo}
              onChangeText={(v) =>
                setDraft({ ...draft, phoneNo: v.replace(/\D/g, "") })
              }
              fieldName="phoneNo"
              recordingField={recordingField}
              onToggleVoice={toggleRecording}
              errorText={errors.phoneNo}
              style={styles.field}
            />
            <VoiceTextField
              label={t("othersRemarks")}
              mode="outlined"
              value={draft.othersRemark ?? ""}
              onChangeText={(v) => setDraft({ ...draft, othersRemark: v })}
              fieldName="othersRemark"
              recordingField={recordingField}
              onToggleVoice={toggleRecording}
              style={styles.field}
            />
            <VoiceTextField
              label={t("others")}
              mode="outlined"
              keyboardType="numeric"
              value={draft.others != null ? String(draft.others) : ""}
              onChangeText={(v) =>
                setDraft({ ...draft, others: v === "" ? 0 : Number(v) })
              }
              fieldName="others"
              recordingField={recordingField}
              onToggleVoice={toggleRecording}
              errorText={errors.others}
              style={styles.field}
            />
            <Text variant="labelLarge" style={styles.pickerLabel}>
              {t("othersType")} *
            </Text>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={draft.othersType ?? ""}
                onValueChange={(v) => setDraft({ ...draft, othersType: v })}
              >
                <Picker.Item label={t("select")} value="" />
                {OTHERS_TYPE_KEYS.map((key) => (
                  <Picker.Item key={key} label={translateType(key)} value={key} />
                ))}
              </Picker>
            </View>
            {errors.othersType ? (
              <Text style={styles.err}>{errors.othersType}</Text>
            ) : null}
            <TextInput
              {...inputTheme}
              label={t("amount")}
              mode="outlined"
              keyboardType="numeric"
              value={draft.amount ? String(draft.amount) : ""}
              onChangeText={(v) =>
                setDraft({ ...draft, amount: v === "" ? 0 : Number(v) })
              }
              error={!!errors.amount}
              style={[inputTheme.style, styles.field]}
            />
            {errors.amount ? <Text style={styles.err}>{errors.amount}</Text> : null}
            <View style={styles.checkRow}>
              <Checkbox
                status={draft.isActive ? "checked" : "unchecked"}
                onPress={() => setDraft({ ...draft, isActive: !draft.isActive })}
              />
              <Text onPress={() => setDraft({ ...draft, isActive: !draft.isActive })}>
                {t("active")}
              </Text>
            </View>
          </ScrollView>
          <View style={styles.footer}>
            <Button onPress={onDismiss} disabled={saving} textColor={c.textMuted}>
              {t("cancel")}
            </Button>
            <Button mode="contained" onPress={() => void handleSave()} loading={saving} buttonColor={c.primary}>
              {t("save")}
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
}

function makeStyles(c: ReturnType<typeof useAppTheme>["theme"]["colors"]) {
  return StyleSheet.create({
    sheet: {
      flex: 1,
      marginTop: 48,
      backgroundColor: c.card,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 16,
    },
    title: { marginBottom: 12, color: c.text },
    field: { marginBottom: 8 },
    pickerLabel: { marginTop: 4, marginBottom: 4, color: c.textMuted },
    pickerWrap: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      marginBottom: 8,
      backgroundColor: c.inputBg,
    },
    err: { color: c.danger, marginBottom: 8, marginLeft: 4 },
    checkRow: { flexDirection: "row", alignItems: "center", marginVertical: 8 },
    footer: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 12,
      gap: 12,
    },
  });
}

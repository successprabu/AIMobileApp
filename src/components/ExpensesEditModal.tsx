import React, { useEffect, useState } from "react";
import { Modal, ScrollView, StyleSheet, View } from "react-native";
import { Button, Checkbox, Portal, Text, TextInput } from "react-native-paper";
import { useTranslation } from "react-i18next";
import VoiceTextField from "./VoiceTextField";
import { useVoiceInput } from "../hooks/useVoiceInput";
import type { TransactionRecord } from "../types/transaction";
import { hasExpensesErrors, validateExpenses } from "../utils/expensesValidation";

type Props = {
  visible: boolean;
  transaction: TransactionRecord | null;
  onDismiss: () => void;
  onSave: (record: TransactionRecord) => Promise<void>;
};

export default function ExpensesEditModal({
  visible,
  transaction,
  onDismiss,
  onSave,
}: Props) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<TransactionRecord | null>(null);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(transaction ? { ...transaction, type: "E" } : null);
    setErrors({});
  }, [transaction, visible]);

  const handleSpeech = (field: string, transcript: string) => {
    if (!draft) return;
    if (field === "phoneNo") {
      setDraft({ ...draft, phoneNo: transcript.replace(/\D/g, "").slice(0, 15) });
    } else if (field === "villageName" || field === "name") {
      setDraft({ ...draft, [field]: transcript });
    }
  };

  const { recordingField, toggleRecording } = useVoiceInput(handleSpeech);

  if (!draft) return null;

  const handleSave = async () => {
    const validationErrors = validateExpenses(draft, t);
    if (hasExpensesErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...draft, type: "E", oldAmount: 0, newAmount: 0 });
      onDismiss();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <Modal visible={visible} animationType="slide" onRequestClose={onDismiss}>
        <View style={styles.sheet}>
          <Text variant="titleLarge" style={styles.title}>
            {t("editExpenses", { defaultValue: "Edit Expenses" })}
          </Text>
          <ScrollView keyboardShouldPersistTaps="handled">
            <VoiceTextField
              label={t("expensesCategory")}
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
              label={t("expensesDescription")}
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
            <TextInput
              label={t("amount")}
              mode="outlined"
              keyboardType="numeric"
              value={draft.amount ? String(draft.amount) : ""}
              onChangeText={(v) =>
                setDraft({ ...draft, amount: v === "" ? 0 : Number(v) })
              }
              error={!!errors.amount}
              style={styles.field}
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
            <Button onPress={onDismiss} disabled={saving}>
              {t("cancel")}
            </Button>
            <Button mode="contained" onPress={() => void handleSave()} loading={saving}>
              {t("save")}
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    marginTop: 48,
    backgroundColor: "#fff",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 16,
  },
  title: { marginBottom: 12 },
  field: { marginBottom: 8, backgroundColor: "#fff" },
  err: { color: "#c62828", marginBottom: 8, marginLeft: 4 },
  checkRow: { flexDirection: "row", alignItems: "center", marginVertical: 8 },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    gap: 12,
  },
});

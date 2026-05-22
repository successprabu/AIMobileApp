import React, { useEffect, useMemo, useState } from "react";
import { Modal, ScrollView, StyleSheet, View } from "react-native";
import { Button, Checkbox, Portal, Text, TextInput } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../hooks/useAppTheme";
import { useThemedInputProps } from "../hooks/useThemedInputProps";
import type { TransactionRecord } from "../types/transaction";
import {
  hasValidationErrors,
  validateTransaction,
} from "../utils/transactionValidation";

type Props = {
  visible: boolean;
  transaction: TransactionRecord | null;
  onDismiss: () => void;
  onSave: (record: TransactionRecord) => Promise<void>;
};

export default function TransactionEditModal({
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
    setDraft(transaction ? { ...transaction } : null);
    setErrors({});
  }, [transaction, visible]);

  if (!draft) return null;

  const updateAmount = (field: "oldAmount" | "newAmount", raw: string) => {
    const num = raw === "" ? 0 : Number(raw);
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [field]: num };
      next.amount = Number(next.oldAmount) + Number(next.newAmount);
      return next;
    });
  };

  const handleSave = async () => {
    const validationErrors = validateTransaction(draft, t);
    if (hasValidationErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }
    setSaving(true);
    try {
      await onSave(draft);
      onDismiss();
    } finally {
      setSaving(false);
    }
  };

  const fieldProps = { ...inputTheme, style: [inputTheme.style, styles.field] };

  return (
    <Portal>
      <Modal visible={visible} animationType="slide" onRequestClose={onDismiss}>
        <View style={styles.sheet}>
          <Text variant="titleLarge" style={styles.title}>
            {t("editTransaction")}
          </Text>
          <ScrollView keyboardShouldPersistTaps="handled">
            <TextInput
              {...fieldProps}
              label={t("name")}
              mode="outlined"
              value={draft.name}
              onChangeText={(v) => setDraft({ ...draft, name: v })}
              error={!!errors.name}
            />
            {errors.name ? <Text style={styles.err}>{errors.name}</Text> : null}

            <TextInput
              {...fieldProps}
              label={t("placeName")}
              mode="outlined"
              value={draft.villageName}
              onChangeText={(v) => setDraft({ ...draft, villageName: v })}
              error={!!errors.villageName}
            />
            {errors.villageName ? (
              <Text style={styles.err}>{errors.villageName}</Text>
            ) : null}

            <TextInput
              {...fieldProps}
              label={t("phoneNo")}
              mode="outlined"
              keyboardType="phone-pad"
              value={draft.phoneNo}
              onChangeText={(v) =>
                setDraft({ ...draft, phoneNo: v.replace(/\D/g, "") })
              }
              error={!!errors.phoneNo}
            />

            <TextInput
              {...fieldProps}
              label={t("oldAmount")}
              mode="outlined"
              keyboardType="numeric"
              value={String(draft.oldAmount || "")}
              onChangeText={(v) => updateAmount("oldAmount", v)}
              error={!!errors.oldAmount}
            />

            <TextInput
              {...fieldProps}
              label={t("newAmount")}
              mode="outlined"
              keyboardType="numeric"
              value={String(draft.newAmount || "")}
              onChangeText={(v) => updateAmount("newAmount", v)}
              error={!!errors.newAmount}
            />

            <TextInput
              {...fieldProps}
              label={t("amount")}
              mode="outlined"
              value={String(draft.amount)}
              disabled
            />

            <View style={styles.checkRow}>
              <Checkbox
                status={draft.isActive ? "checked" : "unchecked"}
                onPress={() => setDraft({ ...draft, isActive: !draft.isActive })}
              />
              <Text
                style={{ color: c.text }}
                onPress={() => setDraft({ ...draft, isActive: !draft.isActive })}
              >
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

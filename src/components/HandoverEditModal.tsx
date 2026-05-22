import React, { useEffect, useMemo, useState } from "react";
import { Modal, ScrollView, StyleSheet, View } from "react-native";
import { Button, Portal, Text, TextInput } from "react-native-paper";
import { useTranslation } from "react-i18next";
import VoiceTextField from "./VoiceTextField";
import { useAppTheme } from "../hooks/useAppTheme";
import { useThemedInputProps } from "../hooks/useThemedInputProps";
import { useVoiceInput } from "../hooks/useVoiceInput";
import type { HandoverForm, HandoverListRow, HandoverSavePayload } from "../types/handover";

type Props = {
  visible: boolean;
  row: HandoverListRow | null;
  customerId: number;
  functionId: number;
  userId: number;
  onDismiss: () => void;
  onSave: (payload: HandoverSavePayload) => Promise<boolean>;
};

function buildInitialForm(
  row: HandoverListRow | null,
  customerId: number,
  functionId: number,
  userId: number
): HandoverForm {
  const totalRcdAmount =
    row && row.receipt === 0 ? row.others : row?.receipt ?? 0;

  return {
    id: 0,
    customerId,
    functionId,
    handoverBy: row?.username ?? "",
    receivedBy: "",
    receivedByMoible: "",
    totalRcdAmount,
    handoverAmount: 0,
    differnceAmount: totalRcdAmount,
    remarks: "",
    createdBy: String(userId),
    createdDt: new Date().toISOString(),
    updatedBy: String(userId),
    updatedDt: new Date().toISOString(),
    isActive: true,
    status: 1,
  };
}

export default function HandoverEditModal({
  visible,
  row,
  customerId,
  functionId,
  userId,
  onDismiss,
  onSave,
}: Props) {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const inputTheme = useThemedInputProps();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [form, setForm] = useState<HandoverForm>(() =>
    buildInitialForm(row, customerId, functionId, userId)
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm(buildInitialForm(row, customerId, functionId, userId));
    }
  }, [visible, row, customerId, functionId, userId]);

  const handleSpeech = (field: string, transcript: string) => {
    if (field === "handoverAmount") {
      const num = Number(transcript.replace(/[^\d.]/g, "")) || 0;
      updateField("handoverAmount", num);
    } else if (field === "receivedByMoible") {
      setForm((prev) => ({
        ...prev,
        receivedByMoible: transcript.replace(/\D/g, "").slice(0, 15),
      }));
    } else if (field === "receivedBy" || field === "remarks") {
      setForm((prev) => ({ ...prev, [field]: transcript }));
    }
  };

  const { recordingField, toggleRecording } = useVoiceInput(handleSpeech);

  const updateField = (field: keyof HandoverForm, value: string | number) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "totalRcdAmount" || field === "handoverAmount") {
        next.differnceAmount =
          Number(next.totalRcdAmount) - Number(next.handoverAmount);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!row) return;
    setSaving(true);
    try {
      const { handoverBy: _displayName, ...rest } = form;
      const ok = await onSave({
        ...rest,
        handoverBy: Number(row.userId),
      });
      if (ok) onDismiss();
    } finally {
      setSaving(false);
    }
  };

  if (!row) return null;

  const fieldProps = { ...inputTheme, style: [inputTheme.style, styles.field] };

  return (
    <Portal>
      <Modal visible={visible} animationType="slide" onRequestClose={onDismiss}>
        <View style={styles.sheet}>
          <Text variant="titleLarge" style={styles.title}>
            {t("editHandover")}
          </Text>
          <ScrollView keyboardShouldPersistTaps="handled">
            <TextInput
              {...fieldProps}
              label={t("handoverBy")}
              mode="outlined"
              value={form.handoverBy}
              disabled
            />
            <TextInput
              {...fieldProps}
              label={t("total")}
              mode="outlined"
              value={String(form.totalRcdAmount)}
              disabled
            />
            <VoiceTextField
              label={t("handoverAmount")}
              mode="outlined"
              keyboardType="numeric"
              value={form.handoverAmount ? String(form.handoverAmount) : ""}
              onChangeText={(v) =>
                updateField("handoverAmount", v === "" ? 0 : Number(v))
              }
              fieldName="handoverAmount"
              recordingField={recordingField}
              onToggleVoice={toggleRecording}
            />
            <VoiceTextField
              label={t("receivedBy")}
              mode="outlined"
              value={form.receivedBy}
              onChangeText={(v) => updateField("receivedBy", v)}
              fieldName="receivedBy"
              recordingField={recordingField}
              onToggleVoice={toggleRecording}
            />
            <VoiceTextField
              label={t("receivedByMobile")}
              mode="outlined"
              keyboardType="phone-pad"
              value={form.receivedByMoible}
              onChangeText={(v) => updateField("receivedByMoible", v)}
              fieldName="receivedByMoible"
              recordingField={recordingField}
              onToggleVoice={toggleRecording}
            />
            <TextInput
              {...fieldProps}
              label={t("differnceAmount")}
              mode="outlined"
              value={String(form.differnceAmount)}
              disabled
            />
            <VoiceTextField
              label={t("remarks")}
              mode="outlined"
              multiline
              numberOfLines={3}
              value={form.remarks}
              onChangeText={(v) => updateField("remarks", v)}
              fieldName="remarks"
              recordingField={recordingField}
              onToggleVoice={toggleRecording}
            />
          </ScrollView>
          <View style={styles.actions}>
            <Button mode="outlined" onPress={onDismiss} disabled={saving} textColor={c.textMuted}>
              {t("cancel")}
            </Button>
            <Button
              mode="contained"
              onPress={() => void handleSave()}
              loading={saving}
              buttonColor={c.primary}
            >
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
    actions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 8,
      marginTop: 8,
      paddingBottom: 24,
    },
  });
}

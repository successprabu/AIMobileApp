import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  Divider,
  Snackbar,
  Text,
  TextInput,
} from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { authPost } from "../api/client";
import { useVoiceInput } from "../hooks/useVoiceInput";
import { PATHS } from "../api/endpoints";
import NewReceiptHeaderRight from "../components/NewReceiptHeaderRight";
import VoiceTextField from "../components/VoiceTextField";
import { useFormAutoSave } from "../hooks/useFormAutoSave";
import { useVoiceSaveSpeech } from "../hooks/useVoiceSaveSpeech";
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
  isTransactionValid,
  validateTransaction,
} from "../utils/transactionValidation";
import { useAppTheme } from "../hooks/useAppTheme";
/* Import / template — re-enable later:
import TransactionImportModal from "../components/TransactionImportModal";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { importTemplateCsv } from "../utils/transactionImport";
*/
import { useThemedInputProps } from "../hooks/useThemedInputProps";

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
  const { theme } = useAppTheme();
  const c = theme.colors;
  const inputTheme = useThemedInputProps();
  const styles = useMemo(() => makeReceiptStyles(c), [c]);
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
  const [snack, setSnack] = useState({
    visible: false,
    message: "",
    isError: false,
    duration: 4000,
  });

  const handleSpeechResultBase = useCallback((field: string, transcript: string) => {
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

  const resetFingerprintRef = React.useRef<(() => void) | null>(null);
  const submitRef = React.useRef<
    (source: "manual" | "auto" | "voice") => Promise<boolean>
  >(async () => false);

  const isValid = useMemo(
    () => Boolean(functionId) && isTransactionValid(formData, t),
    [formData, functionId, t]
  );

  const flashAutoSaveHint = useCallback(() => {
    setSnack({
      visible: true,
      message: t("autoSaveHint"),
      isError: false,
      duration: 6000,
    });
  }, [t]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t("addTransaction"),
      headerRight: () => (
        <NewReceiptHeaderRight
          translateEnabled={autoTranslateEnabled}
          onTranslateChange={setAutoTranslateEnabled}
          onAutoSaveEnabled={flashAutoSaveHint}
        />
      ),
    });
  }, [navigation, t, flashAutoSaveHint, autoTranslateEnabled]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      amount: Number(prev.oldAmount) + Number(prev.newAmount),
    }));
  }, [formData.oldAmount, formData.newAmount]);

  const showMessage = (message: string, isError = false, duration = 4000) => {
    setSnack({ visible: true, message, isError, duration });
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
    if (ok === "unsupported") {
      showMessage(t("speechRequiresExpoGo"), true);
      return;
    }
    if (ok === false) showMessage(t("speechNotAvailable"), true);
  };

  const handleClear = () => {
    setFormData(emptyForm(customerId, functionId, userId));
    setErrors({});
  };

  const handleSubmit = useCallback(
    async (source: "manual" | "auto" | "voice" = "manual"): Promise<boolean> => {
      if (saving) return false;

      if (!functionId) {
        if (source !== "auto") showMessage(t("pleaseCreateFunction"), true);
        return false;
      }

      const validationErrors = validateTransaction(formData, t);
      if (hasValidationErrors(validationErrors)) {
        if (source !== "auto") setErrors(validationErrors);
        return false;
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
          resetFingerprintRef.current?.();
          showMessage(
            source === "auto" ? t("autoSaved") : t("transactionSaved")
          );
          return true;
        }
        if (source !== "auto") {
          showMessage(res.message ?? t("an_error_occurred"), true);
        }
        return false;
      } catch (e: unknown) {
        const msg =
          e && typeof e === "object" && "response" in e
            ? (e as { response?: { data?: { message?: string } } }).response?.data
                ?.message
            : undefined;
        if (source !== "auto") showMessage(msg ?? t("an_error_occurred"), true);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [saving, functionId, formData, t, customerId, userId]
  );

  submitRef.current = handleSubmit;

  const { resetSaveFingerprint } = useFormAutoSave({
    formData,
    isValid,
    saving,
    onSave: (source) => submitRef.current(source),
  });
  resetFingerprintRef.current = resetSaveFingerprint;

  const handleSpeechResult = useVoiceSaveSpeech(handleSpeechResultBase, () => {
    void submitRef.current("voice");
  });
  const { recordingField, toggleRecording } = useVoiceInput(handleSpeechResult);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
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
                  {...inputTheme}
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
                  style={[inputTheme.style, styles.amountInput]}
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
                  {...inputTheme}
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
                  style={[inputTheme.style, styles.amountInput]}
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
              {...inputTheme}
              mode="outlined"
              value={String(formData.amount)}
              disabled
              style={[inputTheme.style, styles.amountInput]}
            />

            <Divider style={styles.divider} />

            <View style={styles.actions}>
              <Button
                mode="contained"
                icon="content-save"
                onPress={() => void handleSubmit("manual")}
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

            <Text variant="titleSmall" style={[styles.optionalHeading, { color: c.textMuted }]}>
              {t("mobile_optional_section", { defaultValue: "Optional" })}
            </Text>

            <Text variant="labelLarge" style={styles.label}>
              {t("mobile")}
            </Text>
            <TextInput
              {...inputTheme}
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
              style={[inputTheme.style, styles.amountInput]}
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
          </Card.Content>
        </Card>
      </ScrollView>

      <Snackbar
        visible={snack.visible}
        onDismiss={() => setSnack((s) => ({ ...s, visible: false }))}
        duration={snack.duration}
        style={snack.isError ? styles.snackError : undefined}
      >
        {snack.message}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

function makeReceiptStyles(c: ReturnType<typeof useAppTheme>["theme"]["colors"]) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    scroll: { padding: 12, paddingBottom: 32 },
    optionalHeading: { marginTop: 20, marginBottom: 4, fontWeight: "600" },
    card: { marginBottom: 12, backgroundColor: c.card },
    label: { marginTop: 8, marginBottom: 4, color: c.textMuted },
    row2: { flexDirection: "row", gap: 8 },
    half: { flex: 1 },
    amountInput: { marginBottom: 4 },
    error: { color: c.danger, marginBottom: 4 },
    divider: { marginVertical: 16 },
    actions: { flexDirection: "row", gap: 12, justifyContent: "center" },
    actionBtn: { flex: 1 },
    totalRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 8,
    },
    snackError: { backgroundColor: c.danger },
  });
}

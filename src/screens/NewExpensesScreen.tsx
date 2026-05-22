import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import {
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
import { PATHS } from "../api/endpoints";
import { EXPENSE_CATEGORY_KEYS } from "../constants/expenseCategories";
import AutoSaveHeaderSwitch from "../components/AutoSaveHeaderSwitch";
import VoiceTextField from "../components/VoiceTextField";
import { useAuth } from "../context/AuthContext";
import { useFormAutoSave } from "../hooks/useFormAutoSave";
import { useVoiceInput } from "../hooks/useVoiceInput";
import { useVoiceSaveSpeech } from "../hooks/useVoiceSaveSpeech";
import type { MainStackParamList } from "../navigation/types";
import type { AuthUser } from "../types/auth";
import type {
  TransactionFormData,
  TransactionSaveResponse,
} from "../types/transaction";
import {
  hasExpensesErrors,
  isExpensesValid,
  validateExpenses,
} from "../utils/expensesValidation";
import { useAppTheme } from "../hooks/useAppTheme";
import { useThemedInputProps } from "../hooks/useThemedInputProps";

function dateUTC() {
  return new Date(new Date().toUTCString()).toISOString();
}

function emptyExpensesForm(
  customerId: number,
  functionId: number,
  userId: string
): TransactionFormData {
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
    type: "E",
    returnStatus: "N",
    returnRemark: "",
    functionId,
  };
}

export default function NewExpensesScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const inputTheme = useThemedInputProps();
  const styles = useMemo(() => makeExpenseStyles(c), [c]);
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const u = user as AuthUser;
  const customerId = (u.customerID as number) ?? 0;
  const functionId = (u.functionId as number) ?? 0;
  const userId = String(u.id ?? "SYSTEM");

  const [formData, setFormData] = useState<TransactionFormData>(() =>
    emptyExpensesForm(customerId, functionId, userId)
  );
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [saving, setSaving] = useState(false);
  const [autoTranslateEnabled, setAutoTranslateEnabled] = useState(false);
  const [snack, setSnack] = useState({ visible: false, message: "", isError: false });

  const resetFingerprintRef = React.useRef<(() => void) | null>(null);
  const submitRef = React.useRef<
    (source: "manual" | "auto" | "voice") => Promise<boolean>
  >(async () => false);

  const isValid = useMemo(
    () => Boolean(functionId) && isExpensesValid(formData, t),
    [formData, functionId, t]
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t("addExpenses"),
      headerRight: () => <AutoSaveHeaderSwitch />,
    });
  }, [navigation, t]);

  const handleSpeechResultBase = useCallback((field: string, transcript: string) => {
    if (field === "phoneNo") {
      setFormData((prev) => ({
        ...prev,
        phoneNo: transcript.replace(/\D/g, "").slice(0, 15),
      }));
      return;
    }
    if (field === "amount") {
      const numeric = transcript.replace(/[^\d.]/g, "");
      setFormData((prev) => ({
        ...prev,
        amount: numeric ? Number(numeric) : 0,
      }));
      return;
    }
    setFormData((prev) => ({ ...prev, [field]: transcript }));
  }, []);

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
        delete next[key as string];
        return next;
      });
    }
  };

  const handleVoice = async (field: string) => {
    const ok = await toggleRecording(field);
    if (ok === "unsupported") showMessage(t("speechRequiresExpoGo"), true);
    else if (ok === false) showMessage(t("speechNotAvailable"), true);
  };

  const handleClear = () => {
    setFormData(emptyExpensesForm(customerId, functionId, userId));
    setErrors({});
  };

  const handleSubmit = useCallback(
    async (source: "manual" | "auto" | "voice" = "manual"): Promise<boolean> => {
      if (saving) return false;

      if (!functionId) {
        if (source !== "auto") showMessage(t("pleaseCreateFunction"), true);
        return false;
      }

      const validationErrors = validateExpenses(formData, t);
      if (hasExpensesErrors(validationErrors)) {
        if (source !== "auto") setErrors(validationErrors);
        return false;
      }

      setSaving(true);
      try {
        const payload: TransactionFormData = {
          ...formData,
          type: "E",
          oldAmount: 0,
          newAmount: 0,
          amount: Number(formData.amount),
        };

        const res = await authPost<TransactionSaveResponse>(
          PATHS.SAVE_TRANSACTION,
          payload as unknown as Record<string, unknown>
        );

        if (res.result) {
          setFormData(emptyExpensesForm(customerId, functionId, userId));
          setErrors({});
          resetFingerprintRef.current?.();
          showMessage(source === "auto" ? t("autoSaved") : t("expensesSaved"));
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
        <Text variant="bodySmall" style={[styles.hint, { color: c.textMuted }]}>
          {t("autoSaveHint")}
        </Text>
        <View style={styles.switchRow}>
          <Switch
            value={autoTranslateEnabled}
            onValueChange={setAutoTranslateEnabled}
          />
          <Text variant="bodyMedium" style={styles.switchLabel}>
            {t("enableTranslationSuggestions")}
          </Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="labelLarge" style={styles.label}>
              {t("expensesCategory")} *
            </Text>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={formData.villageName || ""}
                onValueChange={(v) => updateField("villageName", v)}
                style={styles.picker}
              >
                <Picker.Item label={t("select")} value="" />
                {EXPENSE_CATEGORY_KEYS.map((key) => (
                  <Picker.Item key={key} label={t(key)} value={key} />
                ))}
              </Picker>
            </View>
            {errors.villageName ? (
              <Text variant="bodySmall" style={styles.error}>
                {errors.villageName}
              </Text>
            ) : null}

            <Text variant="labelLarge" style={styles.label}>
              {t("expensesRcdPerson")} *
            </Text>
            <VoiceTextField
              value={formData.name}
              onChangeText={(v) => updateField("name", v)}
              fieldName="name"
              placeholder={t("enter_expensesDescription")}
              suggestionsEnabled={autoTranslateEnabled}
              enableSuggestions
              errorText={errors.name}
              recordingField={recordingField}
              onToggleVoice={handleVoice}
            />

            <Text variant="labelLarge" style={styles.label}>
              {t("amount")} *
            </Text>
            <TextInput
              {...inputTheme}
              mode="outlined"
              keyboardType="numeric"
              value={formData.amount ? String(formData.amount) : ""}
              onChangeText={(v) =>
                updateField("amount", v === "" ? 0 : Number(v))
              }
              placeholder={t("enter_amount")}
              error={!!errors.amount}
              style={[inputTheme.style, styles.input]}
              right={
                <TextInput.Icon
                  icon={recordingField === "amount" ? "microphone-off" : "microphone"}
                  onPress={() => handleVoice("amount")}
                />
              }
            />
            {errors.amount ? (
              <Text variant="bodySmall" style={styles.error}>
                {errors.amount}
              </Text>
            ) : null}

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
              style={[inputTheme.style, styles.input]}
              right={
                <TextInput.Icon
                  icon={recordingField === "phoneNo" ? "microphone-off" : "microphone"}
                  onPress={() => handleVoice("phoneNo")}
                />
              }
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
          </Card.Content>
        </Card>
      </ScrollView>

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

function makeExpenseStyles(c: ReturnType<typeof useAppTheme>["theme"]["colors"]) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    scroll: { padding: 12, paddingBottom: 32 },
    hint: { marginBottom: 8, lineHeight: 18 },
    switchRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    switchLabel: { marginLeft: 8, flex: 1, color: c.text },
    card: { marginBottom: 12, backgroundColor: c.card },
    label: { marginTop: 8, marginBottom: 4, color: c.textMuted },
    pickerWrap: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      marginBottom: 8,
      backgroundColor: c.inputBg,
    },
    picker: { height: Platform.OS === "ios" ? 180 : 48 },
    input: { marginBottom: 4 },
    error: { color: c.danger, marginBottom: 8, marginLeft: 4 },
    divider: { marginVertical: 16 },
    actions: { flexDirection: "row", gap: 12, justifyContent: "center" },
    actionBtn: { flex: 1 },
    snackError: { backgroundColor: c.danger },
  });
}

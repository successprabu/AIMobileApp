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
  Text,
  TextInput,
} from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { authPost } from "../api/client";
import { PATHS } from "../api/endpoints";
import { OTHERS_TYPE_KEYS } from "../constants/othersTypes";
import { SUGGESTION_LANG_LABEL } from "../constants/suggestionLanguages";
import NewReceiptHeaderRight from "../components/NewReceiptHeaderRight";
import VoiceTextField from "../components/VoiceTextField";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useFormAutoSave } from "../hooks/useFormAutoSave";
import { useVoiceInput } from "../hooks/useVoiceInput";
import { useVoiceSaveSpeech } from "../hooks/useVoiceSaveSpeech";
import type { MainStackParamList } from "../navigation/types";
import type { AuthUser } from "../types/auth";
import type {
  LastRecordResponse,
  TransactionFormData,
  TransactionSaveResponse,
} from "../types/transaction";
import {
  hasOthersErrors,
  isOthersValid,
  validateOthers,
} from "../utils/othersValidation";
import { useAppTheme } from "../hooks/useAppTheme";
import { useThemedInputProps } from "../hooks/useThemedInputProps";

function dateUTC() {
  return new Date(new Date().toUTCString()).toISOString();
}

function emptyOthersForm(
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
    type: "O",
    returnStatus: "N",
    returnRemark: "",
    functionId,
    others: 0,
    othersType: "",
    othersRemark: "",
  };
}

export default function AddOthersScreen() {
  const { t } = useTranslation();
  const { suggestionTargetLanguage } = useLanguage();
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const inputTheme = useThemedInputProps();
  const styles = useMemo(() => makeOthersStyles(c), [c]);
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const u = user as AuthUser;
  const customerId = (u.customerID as number) ?? 0;
  const functionId = (u.functionId as number) ?? 0;
  const userId = String(u.id ?? "SYSTEM");

  const [formData, setFormData] = useState<TransactionFormData>(() =>
    emptyOthersForm(customerId, functionId, userId)
  );
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [saving, setSaving] = useState(false);
  const [autoTranslateEnabled, setAutoTranslateEnabled] = useState(false);
  const [lastRecord, setLastRecord] = useState<LastRecordResponse["data"] | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [snack, setSnack] = useState({
    visible: false,
    message: "",
    isError: false,
    duration: 4000,
  });

  const resetFingerprintRef = React.useRef<(() => void) | null>(null);
  const submitRef = React.useRef<
    (source: "manual" | "auto" | "voice") => Promise<boolean>
  >(async () => false);

  const isValid = useMemo(
    () => Boolean(functionId) && isOthersValid(formData, t),
    [formData, functionId, t]
  );

  const flashSnack = useCallback((message: string) => {
    setSnack({
      visible: true,
      message,
      isError: false,
      duration: 6000,
    });
  }, []);

  const flashAutoSaveHint = useCallback(() => {
    flashSnack(t("autoSaveHintOthers"));
  }, [flashSnack, t]);

  const flashTranslateHint = useCallback(() => {
    flashSnack(
      t("translateHint", {
        language: SUGGESTION_LANG_LABEL[suggestionTargetLanguage],
      })
    );
  }, [flashSnack, t, suggestionTargetLanguage]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t("addOthers"),
      headerRight: () => (
        <NewReceiptHeaderRight
          translateEnabled={autoTranslateEnabled}
          onTranslateChange={setAutoTranslateEnabled}
          onTranslateEnabled={flashTranslateHint}
          onAutoSaveEnabled={flashAutoSaveHint}
        />
      ),
    });
  }, [navigation, t, flashAutoSaveHint, flashTranslateHint, autoTranslateEnabled]);

  const handleSpeechResultBase = useCallback((field: string, transcript: string) => {
    if (field === "phoneNo") {
      setFormData((prev) => ({
        ...prev,
        phoneNo: transcript.replace(/\D/g, "").slice(0, 15),
      }));
      return;
    }
    if (field === "others" || field === "amount") {
      const numeric = transcript.replace(/[^\d.]/g, "");
      setFormData((prev) => ({
        ...prev,
        [field]: numeric ? Number(numeric) : 0,
      }));
      return;
    }
    if (
      field === "villageName" ||
      field === "name" ||
      field === "initial" ||
      field === "remarks" ||
      field === "othersRemark"
    ) {
      setFormData((prev) => ({ ...prev, [field]: transcript }));
    }
  }, []);

  const showMessage = (message: string, isError = false, duration = 4000) => {
    setSnack({ visible: true, message, isError, duration });
  };

  const updateField = <K extends keyof TransactionFormData>(
    key: K,
    value: TransactionFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key as string]) {
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
    setFormData(emptyOthersForm(customerId, functionId, userId));
    setErrors({});
  };

  const handleSubmit = useCallback(
    async (source: "manual" | "auto" | "voice" = "manual"): Promise<boolean> => {
      if (saving) return false;

      if (!functionId) {
        if (source !== "auto") showMessage(t("pleaseCreateFunction"), true);
        return false;
      }

      const validationErrors = validateOthers(formData, t);
      if (hasOthersErrors(validationErrors)) {
        if (source !== "auto") setErrors(validationErrors);
        return false;
      }

      setSaving(true);
      try {
        const payload: TransactionFormData = {
          ...formData,
          type: "O",
          others: Number(formData.others ?? 0),
          amount: Number(formData.amount ?? 0),
          oldAmount: 0,
          newAmount: 0,
        };

        const res = await authPost<TransactionSaveResponse>(
          PATHS.SAVE_TRANSACTION,
          payload as unknown as Record<string, unknown>
        );

        if (res.result) {
          if (res.data) setLastRecord(res.data);
          setFormData(emptyOthersForm(customerId, functionId, userId));
          setErrors({});
          resetFingerprintRef.current?.();
          showMessage(source === "auto" ? t("autoSaved") : t("othersSaved"));
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

  const { resetSaveFingerprint, triggerAutoSave } = useFormAutoSave({
    formData,
    isValid,
    saving,
    onSave: (source) => submitRef.current(source),
    mode: "blur",
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
              right={() => (
                <Button compact onPress={() => setHistoryExpanded(!historyExpanded)}>
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
                  {t("others")}:{" "}
                  {(lastRecord.transaction as { others?: number }).others ?? "—"}
                </Text>
                <Text>
                  {t("totalRecord")}: {lastRecord.totalTrans}
                </Text>
                <Text>
                  {t("totalAmount")}: {lastRecord.totalAmount}
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

            <Text variant="labelLarge" style={styles.label}>
              {t("others")} *
            </Text>
            <TextInput
              {...inputTheme}
              mode="outlined"
              keyboardType="numeric"
              value={formData.others ? String(formData.others) : ""}
              onChangeText={(v) =>
                updateField("others", v === "" ? 0 : Number(v))
              }
              onBlur={() => triggerAutoSave()}
              placeholder={t("enter_amount")}
              error={!!errors.others}
              style={[inputTheme.style, styles.input]}
              right={
                <TextInput.Icon
                  icon={recordingField === "others" ? "microphone-off" : "microphone"}
                  onPress={() => handleVoice("others")}
                />
              }
            />
            {errors.others ? (
              <Text variant="bodySmall" style={styles.error}>
                {errors.others}
              </Text>
            ) : null}

            <Text variant="labelLarge" style={styles.label}>
              {t("othersType")} *
            </Text>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={formData.othersType ?? ""}
                onValueChange={(v) => updateField("othersType", v)}
                style={styles.picker}
              >
                <Picker.Item label={t("select")} value="" />
                {OTHERS_TYPE_KEYS.map((key) => (
                  <Picker.Item key={key} label={t(key)} value={key} />
                ))}
              </Picker>
            </View>
            {errors.othersType ? (
              <Text variant="bodySmall" style={styles.error}>
                {errors.othersType}
              </Text>
            ) : null}

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
              {t("amount")}
            </Text>
            <TextInput
              {...inputTheme}
              mode="outlined"
              keyboardType="numeric"
              value={formData.amount ? String(formData.amount) : ""}
              onChangeText={(v) =>
                updateField("amount", v === "" ? 0 : Number(v))
              }
              placeholder={t("enter_description_detail", {
                defaultValue: "Enter description detail",
              })}
              error={!!errors.amount}
              style={[inputTheme.style, styles.input]}
              right={
                <TextInput.Icon
                  icon={recordingField === "amount" ? "microphone-off" : "microphone"}
                  onPress={() => handleVoice("amount")}
                />
              }
            />

            <Text variant="labelLarge" style={styles.label}>
              {t("othersRemarks")}
            </Text>
            <VoiceTextField
              value={formData.othersRemark ?? ""}
              onChangeText={(v) => updateField("othersRemark", v)}
              fieldName="othersRemark"
              placeholder={t("enter_description_detail", {
                defaultValue: "Enter description detail",
              })}
              suggestionsEnabled={autoTranslateEnabled}
              enableSuggestions
              recordingField={recordingField}
              onToggleVoice={handleVoice}
            />

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

function makeOthersStyles(c: ReturnType<typeof useAppTheme>["theme"]["colors"]) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    scroll: { padding: 12, paddingBottom: 32 },
    optionalHeading: { marginTop: 20, marginBottom: 4, fontWeight: "600" },
    card: { marginBottom: 12, backgroundColor: c.card },
    label: { marginTop: 8, marginBottom: 4, color: c.textMuted },
    pickerWrap: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      marginBottom: 8,
      backgroundColor: c.inputBg,
    },
    picker: { height: Platform.OS === "ios" ? 160 : 48 },
    input: { marginBottom: 4 },
    error: { color: c.danger, marginBottom: 8, marginLeft: 4 },
    divider: { marginVertical: 16 },
    actions: { flexDirection: "row", gap: 12, justifyContent: "center" },
    actionBtn: { flex: 1 },
    snackError: { backgroundColor: c.danger },
  });
}

import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import {
  Button,
  Card,
  Divider,
  Snackbar,
  Text,
  TextInput,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { authGet, authPost } from "../api/client";
import { PATHS } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { resolveFunctionIdAfterSave } from "../utils/functionSession";
import type { AuthUser } from "../types/auth";
import type {
  FunctionFormData,
  FunctionListResponse,
  FunctionRecord,
  FunctionSaveResponse,
} from "../types/function";
import type { MainStackParamList } from "../navigation/types";
import {
  formatDisplayDate,
  isValidIsoDate,
  normalizeDateInput,
  parseIsoToDate,
  parsePickerToIso,
  todayIsoDate,
} from "../utils/date";

function dateUTC() {
  return new Date(new Date().toUTCString()).toISOString();
}

function emptyForm(customerId: number): FunctionFormData {
  return {
    id: 0,
    customerId,
    functionName: "",
    functionDate: todayIsoDate(),
    mahalName: "",
    funPersionNames: "",
    remarks: "",
    funMessage: "",
    createdBy: "SYSTEM",
    createdDt: dateUTC(),
    updatedBy: "SYSTEM",
    updatedDt: dateUTC(),
    isActive: true,
  };
}

function toDateInputValue(dateStr: string): string {
  if (!dateStr) return todayIsoDate();
  if (dateStr.includes("T")) return dateStr.split("T")[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const normalized = normalizeDateInput(dateStr);
  return isValidIsoDate(normalized) ? normalized : todayIsoDate();
}

function validateForm(
  data: FunctionFormData
): Partial<Record<keyof FunctionFormData, string>> {
  const err: Partial<Record<keyof FunctionFormData, string>> = {};
  if (!data.functionName.trim()) err.functionName = "required";
  if (!data.functionDate.trim() || !isValidIsoDate(data.functionDate)) {
    err.functionDate = "required";
  }
  if (!data.mahalName.trim()) err.mahalName = "required";
  if (!data.funPersionNames.trim()) err.funPersionNames = "required";
  return err;
}

export default function FunctionMasterScreen() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const scrollRef = useRef<ScrollView>(null);

  const u = user as AuthUser;
  const customerId = (u.customerID as number) ?? 0;
  const sessionFunctionId = (u.functionId as number) ?? 0;

  const [formData, setFormData] = useState<FunctionFormData>(() =>
    emptyForm(customerId)
  );
  const [dateText, setDateText] = useState(() => formatDisplayDate(todayIsoDate()));
  const [errors, setErrors] = useState<Partial<Record<keyof FunctionFormData, string>>>({});
  const [functions, setFunctions] = useState<FunctionRecord[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [snack, setSnack] = useState({ visible: false, message: "", isError: false });

  useLayoutEffect(() => {
    navigation.setOptions({ title: t("functionMaster") });
  }, [navigation, t]);

  const showMessage = (message: string, isError = false) => {
    setSnack({ visible: true, message, isError });
  };

  const syncDateFromText = (text: string) => {
    setDateText(text);
    const iso = normalizeDateInput(text);
    if (isValidIsoDate(iso)) {
      setFormData((prev) => ({ ...prev, functionDate: iso }));
      if (errors.functionDate) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.functionDate;
          return next;
        });
      }
    }
  };

  const applyPickedDate = (selected: Date) => {
    const iso = parsePickerToIso(selected);
    setFormData((prev) => ({ ...prev, functionDate: iso }));
    setDateText(formatDisplayDate(iso));
    setPickerDate(selected);
    if (errors.functionDate) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.functionDate;
        return next;
      });
    }
  };

  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
      if (event.type === "set" && selected) {
        applyPickedDate(selected);
      }
      return;
    }
    if (selected) {
      setPickerDate(selected);
    }
  };

  const openDatePicker = () => {
    const base = parseIsoToDate(formData.functionDate || todayIsoDate());
    setPickerDate(base);
    setShowDatePicker(true);
  };

  const fetchList = useCallback(async () => {
    if (!customerId) return;
    setLoadingList(true);
    try {
      const json = await authGet<FunctionListResponse>(PATHS.MASTER_LIST_FUNCTION, {
        id: "",
        customer_id: customerId,
        function_name: "",
        current_page: 1,
        page_size: 50,
      });
      if (json.result && json.data?.functions) {
        setFunctions(json.data.functions);
      } else {
        setFunctions([]);
        if (json.message) showMessage(json.message, true);
      }
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response
        ?.data?.message;
      showMessage(msg ?? t("an_error_occurred"), true);
      setFunctions([]);
    } finally {
      setLoadingList(false);
    }
  }, [customerId, t]);

  React.useEffect(() => {
    if (customerId) {
      setFormData((prev) => ({ ...prev, customerId }));
      void fetchList();
    }
  }, [customerId, fetchList]);

  const handleChange = (name: keyof FunctionFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleClear = () => {
    const cleared = emptyForm(customerId);
    setFormData(cleared);
    setDateText(formatDisplayDate(cleared.functionDate));
    setErrors({});
  };

  const handleEdit = (fn: FunctionRecord) => {
    void updateUser({ functionId: fn.id });
    const iso = toDateInputValue(fn.functionDate ?? "");
    setFormData({
      id: fn.id,
      customerId: fn.customerId ?? customerId,
      functionName: fn.functionName ?? "",
      functionDate: iso,
      mahalName: fn.mahalName ?? "",
      funPersionNames: fn.funPersionNames ?? "",
      remarks: fn.remarks ?? "",
      funMessage: fn.funMessage ?? "",
      createdBy: fn.createdBy ?? "SYSTEM",
      createdDt: fn.createdDt ?? dateUTC(),
      updatedBy: fn.updatedBy ?? "SYSTEM",
      updatedDt: fn.updatedDt ?? dateUTC(),
      isActive: fn.isActive ?? true,
    });
    setDateText(formatDisplayDate(iso));
    setErrors({});
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    showMessage(t("edit"));
  };

  const handleSubmit = async () => {
    const iso = normalizeDateInput(dateText);
    const payload: FunctionFormData = {
      ...formData,
      functionDate: isValidIsoDate(iso) ? iso : formData.functionDate,
    };

    const validation = validateForm(payload);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      showMessage(
        t("mobile_required_fields", {
          defaultValue: "Please fill all required fields (use date DD/MM/YYYY).",
        }),
        true
      );
      return;
    }

    setSaving(true);
    try {
      const json = await authPost<FunctionSaveResponse>(
        PATHS.MASTER_SAVE_FUNCTION,
        payload as unknown as Record<string, unknown>
      );
      if (json.result) {
        const newFunctionId = await resolveFunctionIdAfterSave(customerId, json, payload);
        if (newFunctionId) {
          await updateUser({ functionId: newFunctionId });
          showMessage(
            t("mobile_function_saved_active", {
              defaultValue:
                "Function saved. It is now your active function for receipts and expenses.",
            })
          );
        } else {
          showMessage(t("saveSuccessMessage"));
        }
        const cleared = emptyForm(customerId);
        setFormData(cleared);
        setDateText(formatDisplayDate(cleared.functionDate));
        setErrors({});
        void fetchList();
      } else {
        showMessage(
          json.message ??
            t("mobile_function_save_error", {
              defaultValue: "Something went wrong while saving the function.",
            }),
          true
        );
      }
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response
        ?.data?.message;
      showMessage(msg ?? t("an_error_occurred"), true);
    } finally {
      setSaving(false);
    }
  };

  if (!customerId) {
    return (
      <View style={styles.centered}>
        <Text variant="bodyLarge">
          {t("mobile_no_customer", {
            defaultValue: "No customer account linked. Function master is not available.",
          })}
        </Text>
      </View>
    );
  }

  const field = (
    labelKey: string,
    name: keyof FunctionFormData,
    required?: boolean,
    multiline?: boolean
  ) => (
    <TextInput
      key={name}
      label={required ? `${t(labelKey)} *` : t(labelKey)}
      value={String(formData[name] ?? "")}
      onChangeText={(v) => handleChange(name, v)}
      mode="outlined"
      style={styles.field}
      dense
      multiline={multiline}
      numberOfLines={multiline ? 3 : 1}
      error={!!errors[name]}
    />
  );

  const datePickerModal =
    showDatePicker && Platform.OS !== "web" ? (
      Platform.OS === "ios" ? (
        <Modal transparent animationType="slide" visible={showDatePicker}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowDatePicker(false)}>
            <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
              <Text variant="titleMedium" style={styles.modalTitle}>
                {t("functionDate")}
              </Text>
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display="spinner"
                onChange={onPickerChange}
              />
              <View style={styles.modalActions}>
                <Button onPress={() => setShowDatePicker(false)}>{t("cancel")}</Button>
                <Button
                  mode="contained"
                  onPress={() => {
                    applyPickedDate(pickerDate);
                    setShowDatePicker(false);
                  }}
                >
                  {t("save")}
                </Button>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="default"
          onChange={onPickerChange}
        />
      )
    ) : null;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Card mode="elevated" style={styles.card}>
          <Card.Title title={t("functionCreate")} />
          <Card.Content>
            {field("functionName", "functionName", true)}

            <Text variant="labelMedium" style={styles.dateLabel}>
              {t("functionDate")} *
            </Text>
            <View style={styles.dateRow}>
              <TextInput
                label={t("enter_function_date", { defaultValue: "DD/MM/YYYY" })}
                value={dateText}
                onChangeText={syncDateFromText}
                onBlur={() => {
                  const iso = normalizeDateInput(dateText);
                  if (isValidIsoDate(iso)) {
                    setDateText(formatDisplayDate(iso));
                    setFormData((prev) => ({ ...prev, functionDate: iso }));
                  }
                }}
                mode="outlined"
                style={[styles.field, styles.dateInput]}
                dense
                placeholder="21/05/2026"
                keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric"}
                error={!!errors.functionDate}
              />
              <Button
                mode="contained-tonal"
                icon="calendar"
                onPress={openDatePicker}
                style={styles.calBtn}
                compact
              >
                {t("mobile_pick_date", { defaultValue: "Pick" })}
              </Button>
            </View>
            {errors.functionDate ? (
              <Text variant="bodySmall" style={styles.dateErr}>
                {t("mobile_date_invalid", {
                  defaultValue: "Enter a valid date (DD/MM/YYYY) or tap Pick.",
                })}
              </Text>
            ) : null}
            <Text variant="bodySmall" style={styles.dateHint}>
              {t("mobile_date_hint", {
                defaultValue: "Type date as DD/MM/YYYY or use Pick — same as web date field.",
              })}
            </Text>

            {datePickerModal}

            {field("mahalName", "mahalName", true)}
            {field("funPersionNames", "funPersionNames", true)}
            {field("remarks", "remarks", false, true)}
            {field("funMessage", "funMessage", false, true)}

            <View style={styles.actions}>
              <Button
                mode="contained"
                icon="content-save"
                onPress={() => void handleSubmit()}
                loading={saving}
                disabled={saving}
              >
                {t("save")}
              </Button>
              <Button mode="outlined" icon="close" onPress={handleClear} disabled={saving}>
                {t("clearButton")}
              </Button>
            </View>
          </Card.Content>
        </Card>

        <Card mode="outlined" style={styles.card}>
          <Card.Title
            title={t("function_list")}
            right={() =>
              loadingList ? <ActivityIndicator style={styles.listSpinner} /> : null
            }
          />
          <Divider />
          <FlatList
            data={functions}
            keyExtractor={(item) => String(item.id)}
            scrollEnabled={false}
            ListEmptyComponent={
              !loadingList ? (
                <Text style={styles.emptyList} variant="bodyMedium">
                  {t("mobile_no_rows", { defaultValue: "No functions found." })}
                </Text>
              ) : null
            }
            renderItem={({ item }) => {
              const isActive = sessionFunctionId > 0 && item.id === sessionFunctionId;
              return (
              <Pressable style={styles.listRow} onPress={() => handleEdit(item)}>
                <View style={styles.listMain}>
                  <View style={styles.listTitleRow}>
                    <Text variant="titleSmall">{item.functionName}</Text>
                    {isActive ? (
                      <Text variant="labelSmall" style={styles.activeBadge}>
                        {t("mobile_active_function", { defaultValue: "Active" })}
                      </Text>
                    ) : null}
                  </View>
                  <Text variant="bodySmall" style={styles.muted}>
                    {formatDisplayDate(item.functionDate)} · {item.mahalName}
                  </Text>
                  <Text variant="bodySmall" numberOfLines={1}>
                    {item.funPersionNames}
                  </Text>
                </View>
                <MaterialCommunityIcons name="pencil" size={22} color="#0984e3" />
              </Pressable>
            );
            }}
            ItemSeparatorComponent={() => <Divider />}
          />
        </Card>
      </ScrollView>

      <Snackbar
        visible={snack.visible}
        onDismiss={() => setSnack((s) => ({ ...s, visible: false }))}
        duration={3000}
        style={snack.isError ? styles.snackError : undefined}
      >
        {snack.message}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32 },
  card: { marginBottom: 16 },
  field: { marginBottom: 10 },
  dateLabel: { marginBottom: 4, opacity: 0.8 },
  dateRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  dateInput: { flex: 1, marginBottom: 4 },
  calBtn: { marginTop: 6 },
  dateHint: { opacity: 0.6, marginBottom: 10 },
  dateErr: { color: "#c62828", marginBottom: 6 },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  listMain: { flex: 1, marginRight: 8 },
  listTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  activeBadge: {
    color: "#0984e3",
    fontWeight: "700",
    backgroundColor: "#0984e318",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
  },
  muted: { opacity: 0.7, marginTop: 2 },
  emptyList: { padding: 16, textAlign: "center" },
  listSpinner: { marginRight: 16 },
  centered: { flex: 1, padding: 24, justifyContent: "center" },
  snackError: { backgroundColor: "#c62828" },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalSheet: {
    backgroundColor: "#fff",
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalTitle: { marginBottom: 8, textAlign: "center" },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
});

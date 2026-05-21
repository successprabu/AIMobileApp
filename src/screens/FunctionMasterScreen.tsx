import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
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
import type { AuthUser } from "../types/auth";
import type {
  FunctionFormData,
  FunctionListResponse,
  FunctionRecord,
  FunctionSaveResponse,
} from "../types/function";
import type { MainStackParamList } from "../navigation/types";

function dateUTC() {
  return new Date(new Date().toUTCString()).toISOString();
}

function emptyForm(customerId: number): FunctionFormData {
  return {
    id: 0,
    customerId,
    functionName: "",
    functionDate: "",
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

/** Display dd/MM/yyyy (web list format). */
function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const slash = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const d = dateStr.includes("T")
      ? new Date(dateStr)
      : slash
        ? new Date(`${slash[3]}-${slash[2]}-${slash[1]}`)
        : new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

/** yyyy-MM-dd for date picker / API (HTML date input equivalent). */
function toDateInputValue(dateStr: string): string {
  if (!dateStr) return "";
  if (dateStr.includes("T")) return dateStr.split("T")[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const m = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return dateStr;
}

function parsePickerDate(isoDate: string): Date {
  if (!isoDate) return new Date();
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function validateForm(data: FunctionFormData): Partial<Record<keyof FunctionFormData, string>> {
  const err: Partial<Record<keyof FunctionFormData, string>> = {};
  if (!data.functionName.trim()) err.functionName = "required";
  if (!data.functionDate.trim()) err.functionDate = "required";
  if (!data.mahalName.trim()) err.mahalName = "required";
  if (!data.funPersionNames.trim()) err.funPersionNames = "required";
  return err;
}

export default function FunctionMasterScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const scrollRef = useRef<ScrollView>(null);

  const u = user as AuthUser;
  const customerId = (u.customerID as number) ?? 0;

  const [formData, setFormData] = useState<FunctionFormData>(() => emptyForm(customerId));
  const [errors, setErrors] = useState<Partial<Record<keyof FunctionFormData, string>>>({});
  const [functions, setFunctions] = useState<FunctionRecord[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [snack, setSnack] = useState({ visible: false, message: "", isError: false });

  useLayoutEffect(() => {
    navigation.setOptions({ title: t("functionMaster") });
  }, [navigation, t]);

  const showMessage = (message: string, isError = false) => {
    setSnack({ visible: true, message, isError });
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
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data
        ?.message;
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
    setFormData(emptyForm(customerId));
    setErrors({});
  };

  const handleEdit = (fn: FunctionRecord) => {
    setFormData({
      id: fn.id,
      customerId: fn.customerId ?? customerId,
      functionName: fn.functionName ?? "",
      functionDate: toDateInputValue(fn.functionDate ?? ""),
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
    setErrors({});
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    showMessage(t("edit"));
  };

  const handleSubmit = async () => {
    const validation = validateForm(formData);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      showMessage(
        t("mobile_required_fields", { defaultValue: "Please fill all required fields." }),
        true
      );
      return;
    }

    setSaving(true);
    try {
      const json = await authPost<FunctionSaveResponse>(
        PATHS.MASTER_SAVE_FUNCTION,
        formData as unknown as Record<string, unknown>
      );
      if (json.result) {
        showMessage(t("saveSuccessMessage"));
        setFormData(emptyForm(customerId));
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
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data
        ?.message;
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
      label={
        required
          ? `${t(labelKey)} *`
          : t(labelKey)
      }
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
            <Pressable onPress={() => setShowDatePicker(true)}>
              <View pointerEvents="none">
                <TextInput
                  label={`${t("functionDate")} *`}
                  value={
                    formData.functionDate
                      ? formatDisplayDate(formData.functionDate)
                      : ""
                  }
                  placeholder={t("enter_function_date", {
                    defaultValue: "Select date",
                  })}
                  mode="outlined"
                  style={styles.field}
                  dense
                  editable={false}
                  error={!!errors.functionDate}
                  right={
                    <TextInput.Icon icon="calendar" onPress={() => setShowDatePicker(true)} />
                  }
                />
              </View>
            </Pressable>
            {showDatePicker ? (
              <DateTimePicker
                value={parsePickerDate(formData.functionDate)}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_, selected) => {
                  setShowDatePicker(Platform.OS === "ios");
                  if (selected) {
                    const y = selected.getFullYear();
                    const m = String(selected.getMonth() + 1).padStart(2, "0");
                    const d = String(selected.getDate()).padStart(2, "0");
                    handleChange("functionDate", `${y}-${m}-${d}`);
                  }
                }}
              />
            ) : null}
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
            renderItem={({ item }) => (
              <Pressable style={styles.listRow} onPress={() => handleEdit(item)}>
                <View style={styles.listMain}>
                  <Text variant="titleSmall">{item.functionName}</Text>
                  <Text variant="bodySmall" style={styles.muted}>
                    {formatDisplayDate(item.functionDate)} · {item.mahalName}
                  </Text>
                  <Text variant="bodySmall" numberOfLines={1}>
                    {item.funPersionNames}
                  </Text>
                </View>
                <MaterialCommunityIcons name="pencil" size={22} color="#0984e3" />
              </Pressable>
            )}
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
  muted: { opacity: 0.7, marginTop: 2 },
  emptyList: { padding: 16, textAlign: "center" },
  listSpinner: { marginRight: 16 },
  centered: { flex: 1, padding: 24, justifyContent: "center" },
  snackError: { backgroundColor: "#c62828" },
});

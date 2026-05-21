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
import {
  Button,
  Card,
  Checkbox,
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
  CustomerListResponse,
  CustomerRecord,
  CustomerSaveResponse,
  UserFormData,
} from "../types/user";
import type { MainStackParamList } from "../navigation/types";

function dateUTC() {
  return new Date(new Date().toUTCString()).toISOString();
}

function emptyForm(customerId: number, functionId: number, updatedBy: string): UserFormData {
  const now = dateUTC();
  return {
    id: 0,
    customerId,
    functionId,
    name: "",
    primary_phone: "",
    secondary_phone: "",
    email: "",
    country: "",
    state: "",
    district: "",
    address_line1: "",
    address_line2: "",
    is_primary_phone_whatsup: false,
    is_secondary_phone_whatsup: false,
    pincode: 0,
    password: "",
    conpassword: "",
    userType: "NU",
    createdBy: updatedBy,
    createdDt: now,
    updatedBy,
    updateddBy: "SYSTEM",
    updatedDt: now,
    isActive: true,
  };
}

function validateUser(
  data: UserFormData,
  isEditing: boolean,
  t: (key: string, opts?: { defaultValue?: string }) => string
): Partial<Record<string, string>> {
  const err: Partial<Record<string, string>> = {};
  if (!data.name.trim()) err.name = t("required");
  if (!/^\d{10}$/.test(data.primary_phone.trim())) {
    err.primary_phone = t("validation_phone");
  }
  if (!isEditing) {
    if (!data.password) err.password = t("required");
    if (!data.conpassword) err.conpassword = t("required");
    else if (data.password !== data.conpassword) err.conpassword = t("passwordMatch");
  } else if (data.password && data.password !== data.conpassword) {
    err.conpassword = t("passwordMatch");
  }
  if (data.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    err.email = t("invalidEmail");
  }
  return err;
}

function recordToForm(
  record: CustomerRecord,
  customerId: number,
  functionId: number,
  updatedBy: string
): UserFormData {
  const pwd = record.password ?? "";
  return {
    id: record.id,
    customerId: record.customerId ?? customerId,
    functionId: record.functionId ?? functionId,
    name: record.name ?? "",
    primary_phone: String(record.primary_phone ?? ""),
    secondary_phone: record.secondary_phone ?? "",
    email: record.email ?? "",
    country: record.country ?? "",
    state: record.state ?? "",
    district: record.district ?? "",
    address_line1: record.address_line1 ?? "",
    address_line2: record.address_line2 ?? "",
    is_primary_phone_whatsup: !!record.is_primary_phone_whatsup,
    is_secondary_phone_whatsup: !!record.is_secondary_phone_whatsup,
    pincode: Number(record.pincode) || 0,
    password: pwd,
    conpassword: pwd,
    userType: record.userType ?? "NU",
    createdBy: record.createdBy ?? updatedBy,
    createdDt: record.createdDt ?? dateUTC(),
    updatedBy,
    updateddBy: record.updateddBy ?? "SYSTEM",
    updatedDt: record.updatedDt ?? dateUTC(),
    isActive: record.isActive ?? true,
  };
}

export default function UserMasterScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const scrollRef = useRef<ScrollView>(null);

  const u = user as AuthUser;
  const customerId = (u.customerID as number) ?? 0;
  const functionId = (u.functionId as number) ?? 0;
  const updatedBy = String(u.id ?? "APPLICATION");

  const [formData, setFormData] = useState<UserFormData>(() =>
    emptyForm(customerId, functionId, updatedBy)
  );
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [snack, setSnack] = useState({ visible: false, message: "", isError: false });

  useLayoutEffect(() => {
    navigation.setOptions({ title: t("userMaster") });
  }, [navigation, t]);

  const showMessage = (message: string, isError = false) => {
    setSnack({ visible: true, message, isError });
  };

  const fetchList = useCallback(async () => {
    if (!customerId) return;
    setLoadingList(true);
    try {
      const json = await authGet<CustomerListResponse>(PATHS.MASTER_LIST_CUSTOMERS, {
        customer_id: customerId,
        function_name: "",
        current_page: 1,
        page_size: 50,
      });
      if (json.result && json.data?.customers) {
        setCustomers(json.data.customers);
      } else {
        setCustomers([]);
      }
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data
        ?.message;
      showMessage(msg ?? t("an_error_occurred"), true);
      setCustomers([]);
    } finally {
      setLoadingList(false);
    }
  }, [customerId, t]);

  React.useEffect(() => {
    if (customerId) {
      setFormData((prev) => ({ ...prev, customerId, functionId, updatedBy }));
      void fetchList();
    }
  }, [customerId, functionId, updatedBy, fetchList]);

  const handleChange = (name: keyof UserFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as string]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name as string];
        return next;
      });
    }
  };

  const handleClear = () => {
    setFormData(emptyForm(customerId, functionId, updatedBy));
    setIsEditing(false);
    setErrors({});
  };

  const handleEdit = (record: CustomerRecord) => {
    setFormData(recordToForm(record, customerId, functionId, updatedBy));
    setIsEditing(true);
    setErrors({});
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    showMessage(t("edit"));
  };

  const handleSubmit = async () => {
    const validation = validateUser(formData, isEditing, t);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      showMessage(
        t("mobile_required_fields", {
          defaultValue: "Please fix the highlighted fields.",
        }),
        true
      );
      return;
    }

    setSaving(true);
    try {
      const path = isEditing ? PATHS.MASTER_UPDATE_CUSTOMER : PATHS.AUTH_ADD_CUSTOMER;
      const json = await authPost<CustomerSaveResponse>(
        path,
        formData as unknown as Record<string, unknown>
      );
      if (json.result !== false) {
        showMessage(
          json.message ??
            (isEditing
              ? t("mobile_user_updated", { defaultValue: "User updated successfully." })
              : t("saveSuccessMessage"))
        );
        handleClear();
        void fetchList();
      } else {
        showMessage(
          json.message ??
            t("mobile_user_save_error", {
              defaultValue: "Something went wrong while saving the user.",
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
            defaultValue: "No customer account linked. User master is not available.",
          })}
        </Text>
      </View>
    );
  }

  const field = (
    key: keyof UserFormData,
    labelKey: string,
    required?: boolean,
    options?: { keyboard?: "default" | "phone-pad" | "email-address"; secure?: boolean }
  ) => (
    <TextInput
      key={key}
      label={required ? `${t(labelKey)} *` : t(labelKey)}
      value={String(formData[key] ?? "")}
      onChangeText={(v) => {
        if (key === "primary_phone") {
          handleChange(key, v.replace(/\D/g, "").slice(0, 10));
        } else {
          handleChange(key, v);
        }
      }}
      mode="outlined"
      style={styles.field}
      dense
      keyboardType={options?.keyboard ?? "default"}
      secureTextEntry={options?.secure && !showPassword}
      error={!!errors[key as string]}
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
          <Card.Title
            title={t("userCreate")}
            subtitle={
              isEditing
                ? t("editCustomer")
                : t("mobile_new_user", { defaultValue: "New user" })
            }
          />
          <Card.Content>
            {field("name", "name", true)}
            {field("primary_phone", "primary_phone", true, { keyboard: "phone-pad" })}
            {field("email", "email", false, { keyboard: "email-address" })}

            {field("password", "password", !isEditing, { secure: true })}
            <TextInput
              label={`${t("confirm_password")} *`}
              value={formData.conpassword}
              onChangeText={(v) => handleChange("conpassword", v)}
              mode="outlined"
              style={styles.field}
              dense
              secureTextEntry={!showPassword}
              error={!!errors.conpassword}
            />
            <Button
              mode="text"
              compact
              onPress={() => setShowPassword((s) => !s)}
              style={styles.showPwd}
            >
              {showPassword
                ? t("mobile_hide", { defaultValue: "Hide" })
                : t("mobile_show", { defaultValue: "Show" })}{" "}
              {t("password")}
            </Button>

            <View style={styles.checkRow}>
              <Checkbox
                status={formData.isActive ? "checked" : "unchecked"}
                onPress={() => handleChange("isActive", !formData.isActive)}
              />
              <Text onPress={() => handleChange("isActive", !formData.isActive)}>
                {t("active")}
              </Text>
            </View>
            <View style={styles.checkRow}>
              <Checkbox
                status={formData.is_primary_phone_whatsup ? "checked" : "unchecked"}
                onPress={() =>
                  handleChange("is_primary_phone_whatsup", !formData.is_primary_phone_whatsup)
                }
              />
              <Text
                style={styles.checkLabel}
                onPress={() =>
                  handleChange("is_primary_phone_whatsup", !formData.is_primary_phone_whatsup)
                }
              >
                {t("is_primary_phone_whatsup")}
              </Text>
            </View>

            <View style={styles.actions}>
              <Button
                mode="contained"
                icon="content-save"
                onPress={() => void handleSubmit()}
                loading={saving}
                disabled={saving}
              >
                {isEditing ? t("edit") : t("save")}
              </Button>
              <Button mode="outlined" icon="close" onPress={handleClear} disabled={saving}>
                {t("clearButton")}
              </Button>
            </View>
          </Card.Content>
        </Card>

        <Card mode="outlined" style={styles.card}>
          <Card.Title
            title={t("user_list")}
            right={() =>
              loadingList ? <ActivityIndicator style={styles.listSpinner} /> : null
            }
          />
          <Divider />
          <FlatList
            data={customers}
            keyExtractor={(item) => String(item.id)}
            scrollEnabled={false}
            ListEmptyComponent={
              !loadingList ? (
                <Text style={styles.emptyList} variant="bodyMedium">
                  {t("mobile_no_rows", { defaultValue: "No users found." })}
                </Text>
              ) : null
            }
            renderItem={({ item }) => (
              <Pressable style={styles.listRow} onPress={() => handleEdit(item)}>
                <View style={styles.listMain}>
                  <Text variant="titleSmall">{item.name}</Text>
                  <Text variant="bodySmall" style={styles.muted}>
                    {item.primary_phone}
                  </Text>
                  <Text variant="bodySmall" style={styles.muted}>
                    {t("whatsapp")}:{" "}
                    {item.is_primary_phone_whatsup ? t("yes") : t("no")} · {t("active")}:{" "}
                    {item.isActive ? t("yes") : t("no")}
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
  showPwd: { alignSelf: "flex-start", marginBottom: 8 },
  checkRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  checkLabel: { flex: 1, flexWrap: "wrap" },
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

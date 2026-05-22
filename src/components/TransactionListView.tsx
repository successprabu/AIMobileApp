import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  Dialog,
  Divider,
  IconButton,
  Menu,
  Snackbar,
  Text,
  TextInput,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { authGet, authPost, authPostParams } from "../api/client";
import { PATHS } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../hooks/useAppTheme";
import { useVoiceInput } from "../hooks/useVoiceInput";
import type { MainStackParamList } from "../navigation/types";
import type { AuthUser } from "../types/auth";
import type {
  TransactionDeleteResponse,
  TransactionListResponse,
  TransactionRecord,
  TransactionSaveResponse,
  TransactionType,
} from "../types/transaction";
import { PRIMARY_PINK } from "../theme/themes";

const PAGE_SIZES = [5, 10, 25, 50] as const;

const TYPE_ACCENT: Record<TransactionType, string> = {
  R: PRIMARY_PINK,
  E: "#e17055",
  O: "#00cec9",
};

const TYPE_ICON: Record<TransactionType, keyof typeof MaterialCommunityIcons.glyphMap> = {
  R: "cash-plus",
  E: "cash-minus",
  O: "gift-outline",
};

export type TransactionListViewProps = {
  transType: TransactionType;
  titleKey: string;
  savedMessageKey: string;
  withUserScope?: boolean;
  renderRowBody: (item: TransactionRecord) => React.ReactNode;
  EditModal: React.ComponentType<{
    visible: boolean;
    transaction: TransactionRecord | null;
    onDismiss: () => void;
    onSave: (record: TransactionRecord) => Promise<void>;
  }>;
};

export default function TransactionListView({
  transType,
  titleKey,
  savedMessageKey,
  withUserScope = false,
  renderRowBody,
  EditModal,
}: TransactionListViewProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const accent = transType === "R" ? c.primary : TYPE_ACCENT[transType];
  const styles = useMemo(() => makeStyles(c), [c]);

  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const u = user as AuthUser;

  const [nameFilter, setNameFilter] = useState("");
  const [placeFilter, setPlaceFilter] = useState("");
  const [mobileFilter, setMobileFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageSizeMenuOpen, setPageSizeMenuOpen] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [rows, setRows] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<TransactionRecord | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [snack, setSnack] = useState({ visible: false, message: "", isError: false });

  useLayoutEffect(() => {
    navigation.setOptions({ title: t(titleKey) });
  }, [navigation, t, titleKey]);

  const showMessage = (message: string, isError = false) => {
    setSnack({ visible: true, message, isError });
  };

  const handleSpeechFilter = useCallback((field: string, transcript: string) => {
    if (field === "name") setNameFilter(transcript);
    else if (field === "placeName") setPlaceFilter(transcript);
    else if (field === "mobile") setMobileFilter(transcript.replace(/\D/g, "").slice(0, 15));
  }, []);

  const { recordingField, toggleRecording } = useVoiceInput(handleSpeechFilter);

  const handleVoice = async (field: string) => {
    const ok = await toggleRecording(field);
    if (ok === "unsupported") showMessage(t("speechRequiresExpoGo"), true);
    else if (ok === false) showMessage(t("speechNotAvailable"), true);
  };

  const listParams = useMemo(() => {
    const base: Record<string, string | number | undefined | null> = {
      customer_id: u.customerID ?? 0,
      customer_name: nameFilter,
      trans_type: transType,
      village_name: placeFilter,
      mobile: mobileFilter,
      current_page: page,
      page_size: pageSize,
    };
    if (withUserScope) {
      base.user_type = String(u.userType ?? "");
      base.userId = u.id ?? 0;
    }
    return base;
  }, [
    mobileFilter,
    nameFilter,
    page,
    pageSize,
    placeFilter,
    transType,
    u.customerID,
    u.id,
    u.userType,
    withUserScope,
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const json = await authGet<TransactionListResponse>(PATHS.LIST_TRANSACTION, listParams);
      if (json.result && json.data) {
        setRows(json.data.transactions ?? []);
        setTotalPages(Math.max(1, json.data.totalPages ?? 1));
      } else {
        setRows([]);
        setTotalPages(1);
        if (json.message) showMessage(json.message, true);
      }
    } catch {
      showMessage(t("an_error_occurred"), true);
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [listParams, t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const onSearch = () => {
    setPage(1);
    void load();
  };

  const onClear = () => {
    setNameFilter("");
    setPlaceFilter("");
    setMobileFilter("");
    setPage(1);
  };

  const totals = useMemo(() => {
    const totalAmount = rows.reduce((acc, r) => acc + Number(r.amount || 0), 0);
    return { totalAmount, totalRows: rows.length };
  }, [rows]);

  const handleDelete = async () => {
    if (deleteId == null) return;
    setDeleting(true);
    try {
      const deletedBy = String(u.userName ?? u.name ?? u.mobile ?? u.id ?? "system");
      const res = await authPostParams<TransactionDeleteResponse>(
        PATHS.DELETE_TRANSACTION,
        { id: deleteId, deletedBy }
      );
      if (res.result) {
        setRows((prev) => prev.filter((r) => r.id !== deleteId));
        setDeleteId(null);
        showMessage(t("mobile_deleted", { defaultValue: "Record removed." }));
      } else {
        showMessage(res.message ?? t("an_error_occurred"), true);
      }
    } catch {
      showMessage(t("an_error_occurred"), true);
    } finally {
      setDeleting(false);
    }
  };

  const handleEditSave = async (record: TransactionRecord) => {
    const res = await authPost<TransactionSaveResponse>(
      PATHS.SAVE_TRANSACTION,
      { ...record, type: transType } as unknown as Record<string, unknown>
    );
    if (res.result) {
      setRows((prev) => prev.map((r) => (r.id === record.id ? { ...record, type: transType } : r)));
      showMessage(t(savedMessageKey));
    } else {
      showMessage(res.message ?? t("an_error_occurred"), true);
      throw new Error("save failed");
    }
  };

  const filterField = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    voiceKey: string,
    keyboardType?: "default" | "phone-pad"
  ) => (
    <View style={styles.filterRow}>
      <TextInput
        label={label}
        mode="outlined"
        dense
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        style={styles.filterInput}
        outlineColor={c.border}
        activeOutlineColor={accent}
      />
      <IconButton
        icon={recordingField === voiceKey ? "microphone-off" : "microphone"}
        iconColor={accent}
        onPress={() => void handleVoice(voiceKey)}
      />
    </View>
  );

  const renderItem = ({ item }: { item: TransactionRecord }) => (
    <View style={[styles.rowCard, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={[styles.rowStripe, { backgroundColor: accent }]} />
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <View style={[styles.rowIcon, { backgroundColor: `${accent}22` }]}>
            <MaterialCommunityIcons name={TYPE_ICON[transType]} size={20} color={accent} />
          </View>
          <View style={styles.rowContent}>{renderRowBody(item)}</View>
        </View>
        <Text variant="bodySmall" style={{ color: c.textMuted }}>
          {t("phoneNo")}: {item.phoneNo || "—"} · {t("active")}:{" "}
          {item.isActive ? t("yes") : t("no")}
        </Text>
        <View style={styles.rowActions}>
          <IconButton icon="pencil" iconColor={c.primary} onPress={() => setEditing(item)} />
          <IconButton
            icon="delete-outline"
            iconColor={c.danger}
            onPress={() => setDeleteId(item.id)}
          />
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.flex}>
      <Card style={[styles.searchCard, { backgroundColor: c.card }]} mode="elevated" elevation={1}>
        <Card.Content>
          <View style={styles.searchHead}>
            <MaterialCommunityIcons name="filter-variant" size={20} color={accent} />
            <Text variant="titleSmall" style={{ color: c.text, fontWeight: "700" }}>
              {t("search")}
            </Text>
          </View>
          {filterField(t("name"), nameFilter, setNameFilter, "name")}
          {filterField(t("placeName"), placeFilter, setPlaceFilter, "placeName")}
          {filterField(t("mobile"), mobileFilter, setMobileFilter, "mobile", "phone-pad")}

          <View style={styles.searchActions}>
            <Button mode="contained" icon="magnify" onPress={onSearch} compact buttonColor={accent}>
              {t("search")}
            </Button>
            <Button mode="outlined" icon="close" onPress={onClear} compact textColor={c.text}>
              {t("clearButton")}
            </Button>
            <Menu
              visible={pageSizeMenuOpen}
              onDismiss={() => setPageSizeMenuOpen(false)}
              anchor={
                <Button mode="outlined" onPress={() => setPageSizeMenuOpen(true)} compact textColor={c.text}>
                  {t("pageSize")}: {pageSize}
                </Button>
              }
            >
              {PAGE_SIZES.map((n) => (
                <Menu.Item
                  key={n}
                  title={String(n)}
                  onPress={() => {
                    setPageSize(n);
                    setPage(1);
                    setPageSizeMenuOpen(false);
                  }}
                />
              ))}
            </Menu>
          </View>
        </Card.Content>
      </Card>

      {loading && !refreshing ? (
        <ActivityIndicator style={styles.loader} color={accent} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
              tintColor={accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={48} color={c.textMuted} />
              <Text style={[styles.empty, { color: c.textMuted }]}>{t("noData")}</Text>
            </View>
          }
          ListFooterComponent={
            <>
              <View style={[styles.totalsBar, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}>
                <Text style={[styles.footerText, { color: c.text }]}>
                  {t("totalRows")}: {totals.totalRows} · {t("amount")}: ₹
                  {totals.totalAmount.toLocaleString()}
                </Text>
              </View>
              <View style={styles.pager}>
                <Button disabled={page <= 1} onPress={() => setPage(1)} compact textColor={c.primary}>
                  «
                </Button>
                <Button disabled={page <= 1} onPress={() => setPage((p) => p - 1)} compact textColor={c.primary}>
                  ‹
                </Button>
                <Text variant="bodyMedium" style={{ color: c.text, fontWeight: "600" }}>
                  {page} / {totalPages}
                </Text>
                <Button
                  disabled={page >= totalPages}
                  onPress={() => setPage((p) => p + 1)}
                  compact
                  textColor={c.primary}
                >
                  ›
                </Button>
                <Button
                  disabled={page >= totalPages}
                  onPress={() => setPage(totalPages)}
                  compact
                  textColor={c.primary}
                >
                  »
                </Button>
              </View>
            </>
          }
        />
      )}

      <EditModal
        visible={!!editing}
        transaction={editing}
        onDismiss={() => setEditing(null)}
        onSave={handleEditSave}
      />

      <Dialog visible={deleteId != null} onDismiss={() => setDeleteId(null)} style={{ backgroundColor: c.card }}>
        <Dialog.Title style={{ color: c.text }}>{t("deleteConfirmation")}</Dialog.Title>
        <Dialog.Content>
          <Text style={{ color: c.textMuted }}>{t("deleteConfirmationMessage")}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setDeleteId(null)} textColor={c.textMuted}>
            {t("cancel")}
          </Button>
          <Button textColor={c.danger} loading={deleting} onPress={() => void handleDelete()}>
            {t("delete")}
          </Button>
        </Dialog.Actions>
      </Dialog>

      <Snackbar
        visible={snack.visible}
        onDismiss={() => setSnack((s) => ({ ...s, visible: false }))}
        duration={3500}
        style={snack.isError ? { backgroundColor: c.danger } : { backgroundColor: c.primary }}
      >
        {snack.message}
      </Snackbar>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useAppTheme>["theme"]["colors"]) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    searchCard: { margin: 12, marginBottom: 4, borderRadius: 16 },
    searchHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
    filterRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
    filterInput: { flex: 1, backgroundColor: c.inputBg },
    searchActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 10,
      alignItems: "center",
    },
    loader: { marginTop: 32 },
    list: { padding: 12, paddingBottom: 32 },
    rowCard: {
      flexDirection: "row",
      marginBottom: 10,
      borderRadius: 14,
      borderWidth: 1,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    rowStripe: { width: 4 },
    rowBody: { flex: 1, padding: 12, paddingLeft: 10 },
    rowTop: { flexDirection: "row", alignItems: "flex-start" },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },
    rowContent: { flex: 1 },
    rowActions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 2 },
    emptyWrap: { alignItems: "center", marginTop: 40, gap: 8 },
    empty: { textAlign: "center" },
    totalsBar: {
      marginTop: 8,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 8,
    },
    footerText: { textAlign: "center", fontWeight: "600" },
    pager: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 4,
      marginBottom: 16,
    },
  });
}

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
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { authGet, authPost, authPostParams } from "../api/client";
import { PATHS } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
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

const PAGE_SIZES = [5, 10, 25, 50] as const;

export type TransactionListViewProps = {
  transType: TransactionType;
  titleKey: string;
  savedMessageKey: string;
  /** Include user_type / userId in list API (others list on web). */
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
      />
      <IconButton
        icon={recordingField === voiceKey ? "microphone-off" : "microphone"}
        onPress={() => void handleVoice(voiceKey)}
      />
    </View>
  );

  const renderItem = ({ item }: { item: TransactionRecord }) => (
    <Card style={styles.rowCard} mode="outlined">
      <Card.Content>
        {renderRowBody(item)}
        <Text variant="bodySmall">
          {t("phoneNo")}: {item.phoneNo || "—"} · {t("active")}:{" "}
          {item.isActive ? t("yes") : t("no")}
        </Text>
        <View style={styles.rowActions}>
          <IconButton icon="pencil" onPress={() => setEditing(item)} />
          <IconButton
            icon="delete"
            iconColor="#c62828"
            onPress={() => setDeleteId(item.id)}
          />
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.flex}>
      <Card style={styles.searchCard}>
        <Card.Content>
          {filterField(t("name"), nameFilter, setNameFilter, "name")}
          {filterField(t("placeName"), placeFilter, setPlaceFilter, "placeName")}
          {filterField(t("mobile"), mobileFilter, setMobileFilter, "mobile", "phone-pad")}

          <View style={styles.searchActions}>
            <Button mode="contained" icon="magnify" onPress={onSearch} compact>
              {t("search")}
            </Button>
            <Button mode="outlined" icon="close" onPress={onClear} compact>
              {t("clearButton")}
            </Button>
            <Menu
              visible={pageSizeMenuOpen}
              onDismiss={() => setPageSizeMenuOpen(false)}
              anchor={
                <Button mode="outlined" onPress={() => setPageSizeMenuOpen(true)} compact>
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
        <ActivityIndicator style={styles.loader} />
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
            />
          }
          ListEmptyComponent={<Text style={styles.empty}>{t("noData")}</Text>}
          ListFooterComponent={
            <>
              <Divider style={styles.divider} />
              <Text style={styles.footerText}>
                {t("totalRows")}: {totals.totalRows} {t("pagerows")} · {t("amount")}: ₹
                {totals.totalAmount.toLocaleString()}
              </Text>
              <View style={styles.pager}>
                <Button disabled={page <= 1} onPress={() => setPage(1)} compact>
                  «
                </Button>
                <Button disabled={page <= 1} onPress={() => setPage((p) => p - 1)} compact>
                  ‹
                </Button>
                <Text variant="bodyMedium">
                  {page} / {totalPages}
                </Text>
                <Button
                  disabled={page >= totalPages}
                  onPress={() => setPage((p) => p + 1)}
                  compact
                >
                  ›
                </Button>
                <Button
                  disabled={page >= totalPages}
                  onPress={() => setPage(totalPages)}
                  compact
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

      <Dialog visible={deleteId != null} onDismiss={() => setDeleteId(null)}>
        <Dialog.Title>{t("deleteConfirmation")}</Dialog.Title>
        <Dialog.Content>
          <Text>{t("deleteConfirmationMessage")}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setDeleteId(null)}>{t("cancel")}</Button>
          <Button
            textColor="#c62828"
            loading={deleting}
            onPress={() => void handleDelete()}
          >
            {t("delete")}
          </Button>
        </Dialog.Actions>
      </Dialog>

      <Snackbar
        visible={snack.visible}
        onDismiss={() => setSnack((s) => ({ ...s, visible: false }))}
        duration={3500}
        style={snack.isError ? styles.snackErr : undefined}
      >
        {snack.message}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f0f4f8" },
  searchCard: { margin: 12, marginBottom: 0 },
  filterRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  filterInput: { flex: 1, backgroundColor: "#fff" },
  searchActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
    alignItems: "center",
  },
  loader: { marginTop: 24 },
  list: { padding: 12, paddingBottom: 32 },
  rowCard: { marginBottom: 10 },
  rowActions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 4 },
  empty: { textAlign: "center", marginTop: 24, color: "#666" },
  divider: { marginVertical: 12 },
  footerText: { textAlign: "center", marginBottom: 8 },
  pager: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    marginBottom: 16,
  },
  snackErr: { backgroundColor: "#c62828" },
});

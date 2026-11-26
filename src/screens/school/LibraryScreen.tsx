import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Linking, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { ActivityIndicator, FAB, IconButton, Text, TextInput } from "react-native-paper";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { schoolError } from "../../api/school";
import { issueBook, library, returnBook, saveBooks, studentList } from "../../api/schoolErp";
import { useSchoolAuth } from "../../context/SchoolAuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { Notice, PillButton } from "../../components/ui/AuthUi";
import Sheet from "../../components/ui/Sheet";
import type { Book, Loan, Student } from "../../school/erp";
import { Chips, SCHOOL_GREEN, day, shiftDay, todayIso, ui } from "./schoolUi";

type Tab = "Issued" | "Overdue" | "Books";
const blank = (): Book => ({ accessionNo: "", title: "", author: "", category: "", copies: 1, shelf: "" });

/** Library: books given out (return in one tap), overdue with WhatsApp reminder, issue a book, the book list. */
export default function LibraryScreen() {
  const { school } = useSchoolAuth();
  const sid = school?.user.schoolId ?? "";
  const { theme } = useAppTheme();
  const c = theme.colors;
  const [tab, setTab] = useState<Tab>("Issued");
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [issue, setIssue] = useState(false);
  const [bookQ, setBookQ] = useState("");
  const [kidQ, setKidQ] = useState("");
  const [pickBook, setPickBook] = useState<Book | null>(null);
  const [pickKid, setPickKid] = useState<Student | null>(null);
  const [days, setDays] = useState("14");
  const [editBook, setEditBook] = useState<{ i: number; b: Book } | null>(null);
  const [busy, setBusy] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulk, setBulk] = useState("");

  const load = useCallback(async () => {
    try {
      const [l, s] = await Promise.all([library(sid), studentList(sid).catch(() => [] as Student[])]);
      setBooks(l.books);
      setLoans(l.loans);
      setStudents(s.filter((x) => x.status === "Active"));
    } catch (e) {
      setNote({ kind: "error", text: schoolError(e, "Could not load the library.") });
    } finally {
      setLoading(false);
    }
  }, [sid]);
  useEffect(() => {
    void load();
  }, [load]);

  const today = todayIso();
  const open = loans.filter((l) => !l.returnedAt);
  const overdue = open.filter((l) => l.dueDate < today);
  const out = (id?: string) => open.filter((l) => l.bookId === id).length;
  const late = (l: Loan) => Math.round((Date.parse(today) - Date.parse(l.dueDate)) / 86400000);

  const t = q.trim().toLowerCase();
  const shownLoans = (tab === "Overdue" ? overdue : open).filter((l) => !t || l.title.toLowerCase().includes(t) || l.studentName.toLowerCase().includes(t));
  const shownBooks = books.filter((b) => !t || b.title.toLowerCase().includes(t) || b.author.toLowerCase().includes(t) || b.accessionNo.toLowerCase().includes(t));

  const bookHits = useMemo(() => {
    const x = bookQ.trim().toLowerCase();
    return x.length < 2 ? [] : books.filter((b) => (b.title.toLowerCase().includes(x) || b.accessionNo.toLowerCase().includes(x)) && out(b.id) < b.copies).slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookQ, books, loans]);
  const kidHits = useMemo(() => {
    const x = kidQ.trim().toLowerCase();
    return x.length < 2 ? [] : students.filter((s) => s.name.toLowerCase().includes(x) || s.admissionNo.toLowerCase().includes(x)).slice(0, 8);
  }, [kidQ, students]);

  const doIssue = async () => {
    if (!pickBook?.id || !pickKid) return;
    setBusy(true);
    try {
      const loan = await issueBook(sid, pickBook.id, pickKid.id, shiftDay(today, Number(days) || 14));
      setLoans((l) => [loan, ...l]);
      setNote({ kind: "success", text: `📖 ${pickBook.title} given to ${pickKid.name}. Return by ${day(loan.dueDate)}.` });
      setIssue(false);
      setPickBook(null);
      setPickKid(null);
      setBookQ("");
      setKidQ("");
    } catch (e) {
      Alert.alert("Could not issue", schoolError(e, "Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const giveBack = (l: Loan) =>
    Alert.alert("Book returned?", `${l.title} from ${l.studentName}`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Returned",
        onPress: () =>
          void returnBook(sid, l.id)
            .then((x) => setLoans((all) => all.map((y) => (y.id === x.id ? x : y))))
            .catch((e) => setNote({ kind: "error", text: schoolError(e, "Could not save.") })),
      },
    ]);

  const remind = (l: Loan) => {
    const s = students.find((x) => x.id === l.studentId);
    if (!s?.parentPhone) return;
    const msg = `Dear parent, ${l.studentName} has the library book "${l.title}" which was due on ${day(l.dueDate)}. Please send it back to school. Thank you – ${school?.schoolName ?? "School"} library`;
    void Linking.openURL(`https://wa.me/91${s.parentPhone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(msg)}`);
  };

  const saveBook = async () => {
    if (!editBook) return;
    if (editBook.b.title.trim().length < 2) return Alert.alert("Title", "Please type the book title.");
    const next = [...books];
    if (editBook.i < 0) next.push(editBook.b);
    else next[editBook.i] = editBook.b;
    setBusy(true);
    try {
      setBooks(await saveBooks(sid, next));
      setEditBook(null);
    } catch (e) {
      Alert.alert("Could not save", schoolError(e, "Please try again."));
    } finally {
      setBusy(false);
    }
  };
  const removeBook = (i: number) =>
    Alert.alert("Remove this book?", books[i].title, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => void saveBooks(sid, books.filter((_, j) => j !== i)).then(setBooks).catch((e) => setNote({ kind: "error", text: schoolError(e, "Could not remove.") })) },
    ]);

  /** One book per line: Title, Author, Category, Copies, Shelf (same as the website). */
  const addBulk = async () => {
    const rows = bulk
      .split("\n")
      .map((l) => l.split(/\t|,/).map((x) => x.trim()))
      .filter((r) => r[0]);
    if (!rows.length) return;
    let n = books.length;
    const added: Book[] = rows.map((r) => ({ accessionNo: `B${String(++n).padStart(4, "0")}`, title: r[0], author: r[1] ?? "", category: r[2] ?? "", copies: Number(r[3]) || 1, shelf: r[4] ?? "" }));
    setBusy(true);
    try {
      setBooks(await saveBooks(sid, [...books, ...added]));
      setBulk("");
      setBulkOpen(false);
      setNote({ kind: "success", text: `📚 ${added.length} books added.` });
    } catch (e) {
      Alert.alert("Could not add", schoolError(e, "Please check the lines."));
    } finally {
      setBusy(false);
    }
  };

  const exportOverdue = async () => {
    const cell = (v: string | number) => {
      const t = String(v ?? "");
      return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    const rows = overdue.map((l) => {
      const s = students.find((x) => x.id === l.studentId);
      return [l.title, l.accessionNo, l.studentName, l.className, s?.parentPhone ?? "", l.issuedOn, l.dueDate, late(l)];
    });
    const csv = "\ufeff" + [["Book", "Accession no", "Student", "Class", "Parent mobile", "Issued", "Due", "Days late"], ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
    const uri = `${FileSystem.cacheDirectory ?? ""}library-overdue-${today}.csv`;
    await FileSystem.writeAsStringAsync(uri, csv);
    await Sharing.shareAsync(uri, { mimeType: "text/csv", dialogTitle: "Overdue books" });
  };

  if (loading) {
    return (
      <View style={[ui.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={SCHOOL_GREEN} />
      </View>
    );
  }

  const header = (
    <View style={{ gap: 8, marginBottom: 8 }}>
      {note ? <Notice kind={note.kind} text={note.text} /> : null}
      <Text style={{ color: c.textMuted }}>
        📚 {books.reduce((t2, b) => t2 + (b.copies || 0), 0)} copies · 📤 {open.length} given out · ⏰ {overdue.length} overdue
      </Text>
      <Chips<Tab> items={["Issued", "Overdue", "Books"]} value={tab} onChange={setTab} label={(x) => (x === "Overdue" ? `Overdue (${overdue.length})` : x)} color={SCHOOL_GREEN} />
      <TextInput mode="outlined" dense placeholder="Search" value={q} onChangeText={setQ} left={<TextInput.Icon icon="magnify" />} activeOutlineColor={SCHOOL_GREEN} />
      {tab === "Books" ? <PillButton label="Add many books" icon="playlist-plus" variant="soft" color={SCHOOL_GREEN} onPress={() => setBulkOpen(true)} /> : null}
      {tab === "Overdue" && overdue.length ? <PillButton label="Export overdue list (Excel)" icon="file-excel-outline" variant="soft" color={SCHOOL_GREEN} onPress={() => void exportOverdue().catch(() => setNote({ kind: "error", text: "Could not make the file." }))} /> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {tab === "Books" ? (
        <FlatList
          data={shownBooks}
          keyExtractor={(b, i) => b.id ?? String(i)}
          contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
          ListHeaderComponent={header}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} />}
          renderItem={({ item: b }) => {
            const i = books.indexOf(b);
            return (
              <View style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontWeight: "700" }}>{b.title}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 12 }}>
                    {b.accessionNo} · {b.author} · {b.category} · shelf {b.shelf || "—"} · {b.copies - out(b.id)}/{b.copies} in
                  </Text>
                </View>
                <IconButton icon="pencil" size={18} onPress={() => setEditBook({ i, b: { ...b } })} />
                <IconButton icon="delete-outline" size={18} onPress={() => removeBook(i)} />
              </View>
            );
          }}
        />
      ) : (
        <FlatList
          data={shownLoans}
          keyExtractor={(l) => l.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
          ListHeaderComponent={header}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} />}
          ListEmptyComponent={<Text style={{ color: c.textMuted, textAlign: "center", marginTop: 24 }}>{tab === "Overdue" ? "🎉 Nothing overdue." : "No books given out."}</Text>}
          renderItem={({ item: l }) => (
            <View style={[styles.row, { backgroundColor: c.surface, borderColor: l.dueDate < today ? c.danger : c.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontWeight: "700" }}>📖 {l.title}</Text>
                <Text style={{ color: c.textMuted, fontSize: 12 }}>
                  {l.studentName} · {l.className} · due {day(l.dueDate)}
                  {l.dueDate < today ? ` · ${late(l)} days late` : ""}
                </Text>
              </View>
              {l.dueDate < today ? <IconButton icon="whatsapp" size={20} iconColor={SCHOOL_GREEN} onPress={() => remind(l)} accessibilityLabel="Remind parent" /> : null}
              <Pressable onPress={() => giveBack(l)} style={[styles.ret, { borderColor: SCHOOL_GREEN }]}>
                <Text style={{ color: SCHOOL_GREEN, fontWeight: "800" }}>Returned</Text>
              </Pressable>
            </View>
          )}
        />
      )}
      <FAB
        icon={tab === "Books" ? "book-plus" : "book-arrow-right"}
        label={tab === "Books" ? "Add book" : "Issue book"}
        color="#fff"
        style={styles.fab}
        onPress={() => (tab === "Books" ? setEditBook({ i: -1, b: blank() }) : setIssue(true))}
      />

      <Sheet visible={issue} title="Issue a book" onClose={() => setIssue(false)}>
        {pickBook ? (
          <Pressable onPress={() => setPickBook(null)}>
            <Notice kind="success" text={`📖 ${pickBook.title} (tap to change)`} />
          </Pressable>
        ) : (
          <>
            <TextInput mode="outlined" dense label="Book title or accession no" value={bookQ} onChangeText={setBookQ} activeOutlineColor={SCHOOL_GREEN} />
            {bookHits.map((b) => (
              <Pressable key={b.id} onPress={() => setPickBook(b)} style={styles.hit}>
                <Text style={{ color: c.text }}>
                  {b.title} · {b.accessionNo}
                </Text>
              </Pressable>
            ))}
          </>
        )}
        {pickKid ? (
          <Pressable onPress={() => setPickKid(null)}>
            <Notice kind="success" text={`🧒 ${pickKid.name} · ${pickKid.className} (tap to change)`} />
          </Pressable>
        ) : (
          <>
            <TextInput mode="outlined" dense label="Student name or admission no" value={kidQ} onChangeText={setKidQ} style={{ marginTop: 10 }} activeOutlineColor={SCHOOL_GREEN} />
            {kidHits.map((s) => (
              <Pressable key={s.id} onPress={() => setPickKid(s)} style={styles.hit}>
                <Text style={{ color: c.text }}>
                  {s.name} · {s.className} {s.section ?? ""}
                </Text>
              </Pressable>
            ))}
          </>
        )}
        <Text style={[ui.label, { color: c.text }]}>Return within (days)</Text>
        <Chips items={["7", "14", "21", "30"]} value={days} onChange={setDays} color={SCHOOL_GREEN} />
        <PillButton label="Issue" icon="book-arrow-right" color={SCHOOL_GREEN} onPress={() => void doIssue()} loading={busy} disabled={busy || !pickBook || !pickKid} style={{ marginTop: 14 }} />
      </Sheet>

      <Sheet visible={bulkOpen} title="Add many books" onClose={() => setBulkOpen(false)}>
        <Text style={{ color: c.textMuted }}>One book per line: Title, Author, Category, Copies, Shelf. Paste from Excel works too.</Text>
        <TextInput mode="outlined" multiline numberOfLines={8} value={bulk} onChangeText={setBulk} placeholder="Panchatantra Tales, Vishnu Sharma, Stories, 2, A1" style={{ marginTop: 10, minHeight: 160 }} activeOutlineColor={SCHOOL_GREEN} />
        <PillButton label={`Add ${bulk.split("\n").filter((l) => l.trim()).length} books`} icon="playlist-plus" color={SCHOOL_GREEN} onPress={() => void addBulk()} loading={busy} disabled={busy || !bulk.trim()} style={{ marginTop: 14 }} />
      </Sheet>
      <Sheet visible={!!editBook} title={editBook?.i === -1 ? "Add book" : "Edit book"} onClose={() => setEditBook(null)}>
        {editBook ? (
          <>
            {(
              [
                ["title", "Title *"],
                ["author", "Author"],
                ["accessionNo", "Accession no"],
                ["category", "Category"],
                ["shelf", "Shelf"],
              ] as const
            ).map(([k, label]) => (
              <TextInput key={k} mode="outlined" label={label} value={String(editBook.b[k] ?? "")} onChangeText={(v) => setEditBook((e) => (e ? { ...e, b: { ...e.b, [k]: v } } : e))} style={{ marginTop: 8 }} activeOutlineColor={SCHOOL_GREEN} />
            ))}
            <TextInput mode="outlined" label="Copies" value={String(editBook.b.copies)} onChangeText={(v) => setEditBook((e) => (e ? { ...e, b: { ...e.b, copies: Number(v.replace(/\D/g, "")) || 1 } } : e))} keyboardType="number-pad" style={{ marginTop: 8 }} activeOutlineColor={SCHOOL_GREEN} />
            <PillButton label="Save book" icon="content-save-outline" color={SCHOOL_GREEN} onPress={() => void saveBook()} loading={busy} disabled={busy} style={{ marginTop: 14 }} />
          </>
        ) : null}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  ret: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  hit: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#cbd5e1" },
  fab: { position: "absolute", right: 16, bottom: 16, backgroundColor: SCHOOL_GREEN },
});

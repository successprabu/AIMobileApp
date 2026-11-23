import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Easing, Image, Pressable, View, StyleSheet } from "react-native";
import {
  DrawerContentScrollView,
  useDrawerStatus,
  type DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { ND } from "../components/ui/Motion";
import { Text, Switch } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useLanguage, type LangCode } from "../context/LanguageContext";
import { useAppTheme } from "../hooks/useAppTheme";
import { APP_DISPLAY_NAME, PRIMARY_PINK } from "../theme/themes";
import type { MainStackParamList } from "./types";
import { screenIcon } from "../constants/screenIcons";

type Leaf = {
  screen: keyof MainStackParamList;
  titleKey: string;
  roles: string[];
};

const SECTIONS: { key: string; titleKey: string; accent: string; items: Leaf[] }[] = [
  {
    key: "home",
    titleKey: "home",
    accent: PRIMARY_PINK,
    items: [
      { screen: "Dashboard", titleKey: "dashboard", roles: ["SU", "AU", "NU", "MU"] },
      { screen: "ClientList", titleKey: "Clients", roles: ["SU"] },
      { screen: "RegisterClient", titleKey: "registerClient", roles: ["SU"] },
      { screen: "Enquiries", titleKey: "enquiries", roles: ["SU"] },
      { screen: "MahalBookings", titleKey: "mahalBookings", roles: ["SU", "MU"] },
      { screen: "MyMahals", titleKey: "myMahals", roles: ["SU", "MU"] },
      { screen: "FollowUps", titleKey: "followUps", roles: ["SU", "MU"] },
      { screen: "AddMoitechCustomer", titleKey: "addMoiTechCustomer", roles: ["MU"] },
    ],
  },
  {
    key: "masters",
    titleKey: "Masters",
    accent: "#636e72",
    items: [
      { screen: "FunctionMaster", titleKey: "functionMaster", roles: ["SU", "AU"] },
      { screen: "UserMaster", titleKey: "userMaster", roles: ["SU", "AU"] },
    ],
  },
  {
    key: "transactions",
    titleKey: "transactions",
    accent: "#00b894",
    items: [
      { screen: "Transaction", titleKey: "addTransaction", roles: ["SU", "AU", "NU"] },
      { screen: "TransactionList", titleKey: "transactionList", roles: ["SU", "AU", "NU"] },
      { screen: "AddExpenses", titleKey: "addExpenses", roles: ["SU", "AU", "NU"] },
      { screen: "ExpensesList", titleKey: "expensesList", roles: ["SU", "AU", "NU"] },
      { screen: "Others", titleKey: "addOthers", roles: ["SU", "AU", "NU"] },
      { screen: "OthersList", titleKey: "othersList", roles: ["SU", "AU", "NU"] },
      { screen: "Handover", titleKey: "handOver", roles: ["SU", "AU", "NU"] },
      { screen: "MoiGiven", titleKey: "moiGiven", roles: ["SU", "AU"] },
      { screen: "History", titleKey: "history", roles: ["SU", "AU"] },
    ],
  },
  {
    key: "reports",
    titleKey: "Reports",
    accent: "#6c5ce7",
    items: [
      { screen: "IncomeReport", titleKey: "receiptReport", roles: ["SU", "AU"] },
      { screen: "ExpensesReport", titleKey: "expenseReport", roles: ["SU", "AU"] },
      { screen: "OthersReport", titleKey: "othersReport", roles: ["SU", "AU"] },
      { screen: "RegionalReport", titleKey: "locationAmountReport", roles: ["SU", "AU"] },
      { screen: "SummaryReport", titleKey: "summaryReport", roles: ["SU", "AU"] },
    ],
  },
  {
    key: "more",
    titleKey: "mobile_more",
    accent: "#74b9ff",
    items: [
      { screen: "ThemeSettings", titleKey: "Theme Settings", roles: ["SU", "AU", "NU", "MU"] },
      { screen: "ChangePassword", titleKey: "changePassword", roles: ["SU", "AU", "NU", "MU"] },
      { screen: "UserGuide", titleKey: "userGuide", roles: ["SU", "AU", "NU", "MU"] },
      { screen: "Help", titleKey: "help", roles: ["SU", "AU", "NU", "MU"] },
    ],
  },
];

const LANG_LABEL: Record<LangCode, string> = {
  en: "EN",
  ta: "த",
  ml: "മ",
  te: "త",
  kn: "ಕ",
  hi: "हि",
};

function getActiveScreen(state: DrawerContentComponentProps["state"]): string | undefined {
  const home = state.routes[state.index];
  const nested = home.state as { routes: { name: string }[]; index: number } | undefined;
  if (nested?.routes?.length) return nested.routes[nested.index]?.name;
  return undefined;
}

function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (name.slice(0, 2) || "MS").toUpperCase();
}

/** Fades and slides a menu row in each time the sidebar opens (`play` changes on every open). */
function SlideIn({ index, play, children }: { index: number; play: number; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    // Runs once per opening (play goes 1, 2, 3…); nothing before the first opening, so rows never animate twice.
    if (!play) return;
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 300, delay: Math.min(index, 14) * 30, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start();
  }, [index, play, v]);
  return (
    <Animated.View style={{ opacity: v, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }] }}>{children}</Animated.View>
  );
}

/** A menu row: springs when pressed; the open screen gets a filled pill with a white marker that grows in. */
function MenuRow({ label, icon, color, active, onPress, c }: { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string; active: boolean; onPress: () => void; c: ReturnType<typeof useAppTheme>["theme"]["colors"] }) {
  const press = useRef(new Animated.Value(1)).current;
  const on = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(on, { toValue: active ? 1 : 0, friction: 7, tension: 120, useNativeDriver: ND }).start();
  }, [active, on]);
  const squeeze = (v: number) => Animated.spring(press, { toValue: v, friction: 5, tension: 260, useNativeDriver: ND }).start();
  return (
    <Animated.View style={{ transform: [{ scale: press }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => squeeze(0.96)}
        onPressOut={() => squeeze(1)}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        style={({ pressed }) => [styles.item, { backgroundColor: !active && pressed ? c.primaryMuted : "transparent" }]}
      >
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.activeFill, { backgroundColor: c.primary, opacity: on, transform: [{ scaleX: on.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}
        />
        <Animated.View pointerEvents="none" style={[styles.marker, { opacity: on, transform: [{ scaleY: on }] }]} />
        <View style={[styles.itemIcon, { backgroundColor: active ? "rgba(255,255,255,0.22)" : `${color}1f` }]}>
          <MaterialCommunityIcons name={icon} size={19} color={active ? "#fff" : color} />
        </View>
        <Text style={[styles.itemLabel, { color: active ? "#fff" : c.text, fontWeight: active ? "800" : "600" }]} numberOfLines={1}>
          {label}
        </Text>
        {active && <MaterialCommunityIcons name="chevron-right" size={18} color="#fff" />}
      </Pressable>
    </Animated.View>
  );
}

/** Section heading; its arrow turns when the section folds. */
function SectionHead({ title, folded, onPress, color }: { title: string; folded: boolean; onPress: () => void; color: string }) {
  const v = useRef(new Animated.Value(folded ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: folded ? 1 : 0, duration: 220, useNativeDriver: ND }).start();
  }, [folded, v]);
  return (
    <Pressable onPress={onPress} style={styles.sectionHead} accessibilityRole="button" accessibilityState={{ expanded: !folded }}>
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      <Animated.View style={{ transform: [{ rotate: v.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] }) }] }}>
        <MaterialCommunityIcons name="chevron-up" size={18} color={color} />
      </Animated.View>
    </Pressable>
  );
}

/** The avatar pops in with a soft ring each time the sidebar opens. */
function Avatar({ text, color, play }: { text: string; color: string; play: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!play) return;
    v.setValue(0);
    Animated.spring(v, { toValue: 1, friction: 5, tension: 80, useNativeDriver: ND }).start();
  }, [play, v]);
  return (
    <View style={styles.avatarRing}>
      <Animated.View style={[styles.avatar, { transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }], opacity: v }]}>
        <Text style={[styles.avatarText, { color }]}>{text}</Text>
      </Animated.View>
    </View>
  );
}

/**
 * Sidebar: profile banner, menu sections for the user's role (tap a heading to fold it),
 * then dark mode, language and sign out.
 */
export default function AppDrawerContent(props: DrawerContentComponentProps) {
  const { navigation, state } = props;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { language, supportedLanguages, changeLanguage } = useLanguage();
  const { theme, mode, toggleMode } = useAppTheme();
  const c = theme.colors;
  const [folded, setFolded] = useState<Record<string, boolean>>({});
  // Counts sidebar openings so the entrance animations replay each time.
  const drawerOpen = useDrawerStatus() === "open";
  const [play, setPlay] = useState(0);
  useEffect(() => {
    if (drawerOpen) setPlay((p) => p + 1);
  }, [drawerOpen]);
  // Before any navigation the stack has no recorded route yet: that is the dashboard.
  const activeScreen = useMemo(() => getActiveScreen(state) ?? "Dashboard", [state]);
  const role = user?.userType ?? "";
  const displayName = (user?.name as string) ?? (user?.userName as string) ?? "";
  const designation = (user?.userTypeDescription as string) ?? role;

  const go = (screen: keyof MainStackParamList) => {
    navigation.navigate("Home", { screen });
    navigation.closeDrawer();
  };

  const confirmLogout = () => {
    Alert.alert(t("Logout"), "", [
      { text: t("cancel"), style: "cancel" },
      { text: t("Logout"), style: "destructive", onPress: () => void signOut() },
    ]);
  };

  let row = 0;
  const sections = SECTIONS.map((section) => ({ ...section, visible: section.items.filter((i) => i.roles.includes(role)) })).filter((s) => s.visible.length);

  return (
    <View style={[styles.root, { backgroundColor: c.drawerBg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 14, backgroundColor: c.drawerHeader }]}>
        <View style={styles.bubbleA} />
        <View style={styles.bubbleB} />
        <View style={styles.bubbleC} />
        <View style={styles.brandRow}>
          <View style={styles.logoRing}>
            <Image source={require("../../assets/brand-logo.png")} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.brandTitle}>{APP_DISPLAY_NAME}</Text>
          <Pressable onPress={() => navigation.closeDrawer()} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close menu" hitSlop={8}>
            <MaterialCommunityIcons name="close" size={18} color="#fff" />
          </Pressable>
        </View>
        <View style={styles.profileRow}>
          <Avatar text={userInitials(displayName)} color={c.drawerHeader} play={play} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.hello}>{t("hello", { defaultValue: "Hello" })} 👋</Text>
            <Text style={styles.profileName} numberOfLines={1}>{displayName || "—"}</Text>
            <View style={styles.rolePill}>
              <MaterialCommunityIcons name="shield-account-outline" size={12} color="#fff" />
              <Text style={styles.roleText} numberOfLines={1}>{designation}</Text>
            </View>
          </View>
        </View>
      </View>

      <DrawerContentScrollView {...props} style={{ flex: 1 }} contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
        {sections.map((section) => {
          const isFolded = folded[section.key] ?? false;
          const title = section.key === "more" ? t("mobile_more", { defaultValue: "More" }) : t(section.titleKey);
          return (
            <View key={section.key} style={{ marginBottom: 6 }}>
              <SectionHead title={title} folded={isFolded} color={c.textMuted} onPress={() => setFolded((f) => ({ ...f, [section.key]: !isFolded }))} />
              {!isFolded &&
                section.visible.map((item) => {
                  const index = row++;
                  return (
                    <SlideIn key={item.screen} index={index} play={play}>
                      <MenuRow
                        label={t(item.titleKey, { defaultValue: item.titleKey })}
                        icon={screenIcon(item.screen).icon}
                        color={screenIcon(item.screen).color}
                        active={activeScreen === item.screen}
                        onPress={() => go(item.screen)}
                        c={c}
                      />
                    </SlideIn>
                  );
                })}
            </View>
          );
        })}
      </DrawerContentScrollView>

      <View style={[styles.footer, { borderTopColor: c.border, paddingBottom: insets.bottom + 12, backgroundColor: c.drawerFooter }]}>
        <View style={[styles.footerRow, styles.themeCard, { backgroundColor: c.chipBg }]}>
          <MaterialCommunityIcons name={mode === "dark" ? "weather-night" : "white-balance-sunny"} size={20} color={c.primary} />
          <Text style={{ flex: 1, color: c.text, fontWeight: "600" }}>{t("mobile_dark_theme", { defaultValue: "Dark theme" })}</Text>
          <Switch value={mode === "dark"} onValueChange={() => void toggleMode()} />
        </View>
        <View style={styles.langRow}>
          {supportedLanguages.map((code) => {
            const on = language === code;
            return (
              <Pressable
                key={code}
                onPress={() => void changeLanguage(code)}
                accessibilityLabel={`Language ${code}`}
                style={({ pressed }) => [styles.langPill, { backgroundColor: on ? c.primary : c.chipBg, transform: [{ scale: pressed ? 0.9 : on ? 1.06 : 1 }] }]}
              >
                <Text style={{ color: on ? "#fff" : c.textMuted, fontWeight: "700", fontSize: 13 }}>{LANG_LABEL[code]}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable onPress={confirmLogout} style={({ pressed }) => [styles.logout, { backgroundColor: pressed ? `${c.danger}2e` : `${c.danger}17`, transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
          <MaterialCommunityIcons name="logout" size={18} color={c.danger} />
          <Text style={{ color: c.danger, fontWeight: "800" }}>{t("Logout")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 18, paddingBottom: 18, overflow: "hidden", borderBottomRightRadius: 28 },
  bubbleA: { position: "absolute", width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.10)", top: -50, right: -40 },
  bubbleB: { position: "absolute", width: 90, height: 90, borderRadius: 45, backgroundColor: "rgba(255,255,255,0.08)", bottom: -30, right: 60 },
  bubbleC: { position: "absolute", width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(0,0,0,0.12)", bottom: -60, left: -40 },
  closeBtn: { marginLeft: "auto", width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  hello: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "600" },
  avatarRing: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: "rgba(255,255,255,0.55)", alignItems: "center", justifyContent: "center" },
  activeFill: { borderRadius: 14 },
  marker: { position: "absolute", left: 3, top: 12, bottom: 12, width: 4, borderRadius: 2, backgroundColor: "#fff" },
  themeCard: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoRing: { width: 30, height: 30, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.95)", alignItems: "center", justifyContent: "center" },
  logo: { width: 22, height: 24 },
  brandTitle: { color: "#fff", fontSize: 15, fontWeight: "800", opacity: 0.95 },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 16 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  avatarText: { fontWeight: "900", fontSize: 18 },
  profileName: { color: "#fff", fontSize: 18, fontWeight: "800" },
  rolePill: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2, marginTop: 4 },
  roleText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  scrollInner: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8 },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, paddingVertical: 6 },
  sectionTitle: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1 },
  item: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 14, marginBottom: 2 },
  itemIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  itemLabel: { flex: 1, fontSize: 14.5 },
  footer: { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  footerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  langRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  langPill: { minWidth: 38, height: 32, borderRadius: 999, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  logout: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 46, borderRadius: 999 },
});

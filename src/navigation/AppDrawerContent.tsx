import React, { useMemo, useState } from "react";
import { Alert, Image, Pressable, View, StyleSheet } from "react-native";
import {
  DrawerContentScrollView,
  type DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { Text, Switch } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useLanguage, type LangCode } from "../context/LanguageContext";
import { useAppTheme } from "../hooks/useAppTheme";
import { APP_DISPLAY_NAME, PRIMARY_PINK, PRIMARY_PINK_DARK, PRIMARY_PINK_LIGHT } from "../theme/themes";
import type { MainStackParamList } from "./types";

type Leaf = {
  screen: keyof MainStackParamList;
  titleKey: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  roles: string[];
};

const SECTIONS: { key: string; titleKey: string; accent: string; items: Leaf[] }[] = [
  {
    key: "home",
    titleKey: "home",
    accent: PRIMARY_PINK,
    items: [
      { screen: "Dashboard", titleKey: "dashboard", icon: "view-dashboard-variant", color: PRIMARY_PINK, roles: ["SU", "AU", "NU", "MU"] },
      { screen: "ClientList", titleKey: "Clients", icon: "account-multiple", color: "#6c5ce7", roles: ["SU"] },
      { screen: "AddNewMahal", titleKey: "addMahal", icon: "office-building", color: "#5f27cd", roles: ["SU", "MU"] },
      { screen: "MahalBooking", titleKey: "mahalBooking", icon: "calendar-month", color: "#e84393", roles: ["SU", "MU"] },
      { screen: "MahalBookingList", titleKey: "mahalBookingList", icon: "calendar-check", color: "#fd79a8", roles: ["SU", "MU"] },
      { screen: "AddMoitechCustomer", titleKey: "addMoiTechCustomer", icon: "account-heart", color: "#00b894", roles: ["SU", "MU"] },
    ],
  },
  {
    key: "masters",
    titleKey: "Masters",
    accent: "#636e72",
    items: [
      { screen: "FunctionMaster", titleKey: "functionMaster", icon: "tune-variant", color: "#576574", roles: ["SU", "AU"] },
      { screen: "UserMaster", titleKey: "userMaster", icon: "account-cog", color: "#2d3436", roles: ["SU", "AU"] },
    ],
  },
  {
    key: "transactions",
    titleKey: "transactions",
    accent: "#00b894",
    items: [
      { screen: "Transaction", titleKey: "addTransaction", icon: "cash-plus", color: "#00b894", roles: ["SU", "AU", "NU"] },
      { screen: "TransactionList", titleKey: "transactionList", icon: "clipboard-text-outline", color: PRIMARY_PINK_DARK, roles: ["SU", "AU", "NU"] },
      { screen: "AddExpenses", titleKey: "addExpenses", icon: "cash-minus", color: "#e17055", roles: ["SU", "AU", "NU"] },
      { screen: "ExpensesList", titleKey: "expensesList", icon: "format-list-bulleted", color: "#d63031", roles: ["SU", "AU", "NU"] },
      { screen: "Others", titleKey: "addOthers", icon: "gift-outline", color: "#00cec9", roles: ["SU", "AU", "NU"] },
      { screen: "OthersList", titleKey: "othersList", icon: "playlist-plus", color: "#81ecec", roles: ["SU", "AU", "NU"] },
      { screen: "Handover", titleKey: "handOver", icon: "handshake", color: "#f39c12", roles: ["SU", "AU", "NU"] },
    ],
  },
  {
    key: "reports",
    titleKey: "Reports",
    accent: "#6c5ce7",
    items: [
      { screen: "IncomeReport", titleKey: "receiptReport", icon: "chart-line", color: PRIMARY_PINK, roles: ["SU", "AU"] },
      { screen: "ExpensesReport", titleKey: "expenseReport", icon: "chart-bar", color: "#e17055", roles: ["SU", "AU"] },
      { screen: "OthersReport", titleKey: "othersReport", icon: "chart-timeline-variant", color: "#00b894", roles: ["SU", "AU"] },
      { screen: "RegionalReport", titleKey: "locationAmountReport", icon: "map-marker-radius", color: "#6c5ce7", roles: ["SU", "AU"] },
      { screen: "SummaryReport", titleKey: "summaryReport", icon: "chart-pie", color: "#a29bfe", roles: ["SU", "AU"] },
    ],
  },
  {
    key: "more",
    titleKey: "mobile_more",
    accent: "#74b9ff",
    items: [
      { screen: "ThemeSettings", titleKey: "Theme Settings", icon: "palette-outline", color: PRIMARY_PINK_LIGHT, roles: ["SU", "AU", "NU"] },
      { screen: "Help", titleKey: "help", icon: "lifebuoy", color: "#3498db", roles: ["SU", "AU", "NU", "MU"] },
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

/** Only one section open at a time — default Home expanded. */
function singleExpanded(openKey: string | null): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const s of SECTIONS) {
    out[s.key] = s.key === openKey;
  }
  return out;
}

const INITIAL_EXPANDED_KEY = "home";

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

export default function AppDrawerContent(props: DrawerContentComponentProps) {
  const { navigation, state } = props;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { language, supportedLanguages, changeLanguage } = useLanguage();
  const { theme, mode, toggleMode } = useAppTheme();
  const c = theme.colors;

  const [expanded, setExpanded] = useState(() =>
    singleExpanded(INITIAL_EXPANDED_KEY)
  );
  const activeScreen = useMemo(() => getActiveScreen(state), [state]);
  const role = user?.userType ?? "";
  const displayName = (user?.name as string) ?? (user?.userName as string) ?? "";
  const designation = (user?.userTypeDescription as string) ?? role;
  const initials = userInitials(displayName);

  const go = (screen: keyof MainStackParamList) => {
    navigation.navigate("Home", { screen });
    navigation.closeDrawer();
  };

  const toggleSection = (key: string) => {
    setExpanded((prev) => {
      const isOpen = prev[key] ?? false;
      return singleExpanded(isOpen ? null : key);
    });
  };

  const confirmLogout = () => {
    Alert.alert(t("Logout"), "", [
      { text: t("cancel"), style: "cancel" },
      { text: t("Logout"), style: "destructive", onPress: () => void signOut() },
    ]);
  };

  const renderMenuItem = (item: Leaf) => {
    const active = activeScreen === item.screen;
    return (
      <Pressable
        key={item.screen}
        onPress={() => go(item.screen)}
        style={({ pressed }) => [
          styles.menuItem,
          { backgroundColor: active ? c.primaryMuted : "transparent" },
          pressed && { opacity: 0.85 },
        ]}
      >
        {active ? <View style={[styles.activeBar, { backgroundColor: item.color }]} /> : null}
        <View style={[styles.menuIcon, { backgroundColor: active ? item.color : `${item.color}22` }]}>
          <MaterialCommunityIcons name={item.icon} size={18} color={active ? "#fff" : item.color} />
        </View>
        <Text style={[styles.menuLabel, { color: active ? c.primary : c.text }]} numberOfLines={1}>
          {t(item.titleKey)}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: c.drawerBg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: c.drawerHeader }]}>
        <View style={styles.headerRow}>
          <View style={styles.logoRing}>
            <Image source={require("../../assets/brand-logo.png")} style={styles.logo} resizeMode="contain" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.brandTitle}>{APP_DISPLAY_NAME}</Text>
            <Text style={styles.brandSub}>{t("mobile_marriage_mgmt", { defaultValue: "Marriage event accounts" })}</Text>
          </View>
        </View>
      </View>

      <DrawerContentScrollView
        {...props}
        style={styles.scroll}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
      >
        {SECTIONS.map((section) => {
          const visible = section.items.filter((i) => {
            if (section.key === "more" && i.screen === "ThemeSettings") {
              return ["SU", "AU", "NU"].includes(role);
            }
            return i.roles.includes(role);
          });
          if (!visible.length) return null;
          const isOpen = expanded[section.key] ?? false;
          const sectionTitle =
            section.key === "more"
              ? t("mobile_more", { defaultValue: "More" })
              : t(section.titleKey);

          return (
            <View key={section.key} style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
              <Pressable
                onPress={() => toggleSection(section.key)}
                style={styles.sectionHead}
              >
                <View style={[styles.sectionDot, { backgroundColor: section.accent }]} />
                <Text style={[styles.sectionTitle, { color: c.textMuted }]}>{sectionTitle}</Text>
                <Text style={[styles.sectionCount, { color: c.textMuted }]}>{visible.length}</Text>
                <MaterialCommunityIcons
                  name={isOpen ? "chevron-up" : "chevron-down"}
                  size={22}
                  color={c.textMuted}
                />
              </Pressable>
              {isOpen ? visible.map(renderMenuItem) : null}
            </View>
          );
        })}
      </DrawerContentScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: c.drawerFooter,
            borderTopColor: c.border,
            paddingBottom: insets.bottom + 10,
          },
        ]}
      >
        <View style={[styles.profileCard, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}>
          <View style={[styles.avatar, { backgroundColor: c.primary }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: c.text }]} numberOfLines={1}>
              {displayName || "—"}
            </Text>
            <Text style={[styles.profileRole, { color: c.textMuted }]} numberOfLines={1}>
              {designation}
            </Text>
          </View>
        </View>

        <View style={styles.themeRow}>
          <MaterialCommunityIcons
            name={mode === "dark" ? "weather-night" : "white-balance-sunny"}
            size={20}
            color={c.primary}
          />
          <Text style={[styles.themeLabel, { color: c.text }]}>
            {t("mobile_dark_theme", { defaultValue: "Dark theme" })}
          </Text>
          <Switch value={mode === "dark"} onValueChange={() => void toggleMode()} />
        </View>

        <View style={styles.langRow}>
          {supportedLanguages.map((code) => (
            <Pressable
              key={code}
              onPress={() => void changeLanguage(code)}
              style={[
                styles.langChip,
                {
                  backgroundColor: language === code ? c.chipSelected : c.chipBg,
                  borderColor: language === code ? c.chipSelected : c.border,
                },
              ]}
            >
              <Text
                style={{
                  color: language === code ? c.textInverse : c.textMuted,
                  fontWeight: "600",
                  fontSize: 12,
                }}
              >
                {LANG_LABEL[code]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={confirmLogout}
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.9 }]}
        >
          <MaterialCommunityIcons name="logout" size={18} color="#fff" />
          <Text style={styles.logoutText}>{t("Logout")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 14, paddingBottom: 12 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  logoRing: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: 32, height: 36 },
  headerText: { marginLeft: 10, flex: 1 },
  brandTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  brandSub: { color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: 1 },
  scroll: { flex: 1 },
  scrollInner: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 8 },
  section: {
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  sectionDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  sectionTitle: {
    flex: 1,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  sectionCount: { fontSize: 10, marginRight: 4 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginHorizontal: 4,
    marginBottom: 2,
    borderRadius: 8,
  },
  activeBar: {
    position: "absolute",
    left: 0,
    top: 6,
    bottom: 6,
    width: 3,
    borderRadius: 2,
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: "500" },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  profileInfo: { marginLeft: 10, flex: 1 },
  profileName: { fontSize: 15, fontWeight: "700" },
  profileRole: { fontSize: 11, marginTop: 2 },
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  themeLabel: { flex: 1, fontSize: 13, fontWeight: "600" },
  langRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  langChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#e74c3c",
    borderRadius: 10,
    paddingVertical: 11,
  },
  logoutText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});

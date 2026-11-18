import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Image, Pressable, View, StyleSheet } from "react-native";
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
      { screen: "RegisterClient", titleKey: "registerClient", icon: "account-plus", color: "#00b894", roles: ["SU"] },
      { screen: "Enquiries", titleKey: "enquiries", icon: "email-alert-outline", color: "#0ea5e9", roles: ["SU"] },
      { screen: "MahalBookings", titleKey: "mahalBookings", icon: "calendar-check", color: "#e84393", roles: ["SU", "MU"] },
      { screen: "MyMahals", titleKey: "myMahals", icon: "office-building", color: "#5f27cd", roles: ["SU", "MU"] },
      { screen: "AddMoitechCustomer", titleKey: "addMoiTechCustomer", icon: "account-heart", color: "#00b894", roles: ["MU"] },
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
      { screen: "MoiGiven", titleKey: "moiGiven", icon: "gift-open-outline", color: "#8b5cf6", roles: ["SU", "AU"] },
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
      { screen: "ThemeSettings", titleKey: "Theme Settings", icon: "palette-outline", color: PRIMARY_PINK_LIGHT, roles: ["SU", "AU", "NU", "MU"] },
      { screen: "UserGuide", titleKey: "userGuide", icon: "book-open-page-variant-outline", color: "#10b981", roles: ["SU", "AU", "NU", "MU"] },
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

/** Fades and slides a menu row in when the sidebar opens. */
function SlideIn({ index, children }: { index: number; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 260, delay: Math.min(index, 14) * 28, useNativeDriver: true }).start();
  }, [index, v]);
  return (
    <Animated.View style={{ opacity: v, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] }) }] }}>{children}</Animated.View>
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
        <View style={styles.brandRow}>
          <View style={styles.logoRing}>
            <Image source={require("../../assets/brand-logo.png")} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.brandTitle}>{APP_DISPLAY_NAME}</Text>
        </View>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={[styles.avatarText, { color: c.drawerHeader }]}>{userInitials(displayName)}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.profileName} numberOfLines={1}>{displayName || "—"}</Text>
            <View style={styles.rolePill}>
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
              <Pressable
                onPress={() => setFolded((f) => ({ ...f, [section.key]: !isFolded }))}
                style={styles.sectionHead}
                accessibilityRole="button"
                accessibilityState={{ expanded: !isFolded }}
              >
                <Text style={[styles.sectionTitle, { color: c.textMuted }]}>{title}</Text>
                <MaterialCommunityIcons name={isFolded ? "chevron-down" : "chevron-up"} size={18} color={c.textMuted} />
              </Pressable>
              {!isFolded &&
                section.visible.map((item) => {
                  const active = activeScreen === item.screen;
                  const index = row++;
                  return (
                    <SlideIn key={item.screen} index={index}>
                      <Pressable
                        onPress={() => go(item.screen)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        style={({ pressed }) => [
                          styles.item,
                          { backgroundColor: active ? c.primary : pressed ? c.primaryMuted : "transparent" },
                        ]}
                      >
                        <View style={[styles.itemIcon, { backgroundColor: active ? "rgba(255,255,255,0.22)" : `${item.color}1f` }]}>
                          <MaterialCommunityIcons name={item.icon} size={19} color={active ? "#fff" : item.color} />
                        </View>
                        <Text style={[styles.itemLabel, { color: active ? "#fff" : c.text, fontWeight: active ? "800" : "600" }]} numberOfLines={1}>
                          {t(item.titleKey, { defaultValue: item.titleKey })}
                        </Text>
                        {active && <MaterialCommunityIcons name="chevron-right" size={18} color="#fff" />}
                      </Pressable>
                    </SlideIn>
                  );
                })}
            </View>
          );
        })}
      </DrawerContentScrollView>

      <View style={[styles.footer, { borderTopColor: c.border, paddingBottom: insets.bottom + 12, backgroundColor: c.drawerFooter }]}>
        <View style={styles.footerRow}>
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
                style={[styles.langPill, { backgroundColor: on ? c.primary : c.chipBg }]}
              >
                <Text style={{ color: on ? "#fff" : c.textMuted, fontWeight: "700", fontSize: 13 }}>{LANG_LABEL[code]}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable onPress={confirmLogout} style={({ pressed }) => [styles.logout, { borderColor: c.danger, backgroundColor: pressed ? `${c.danger}14` : "transparent" }]}>
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
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoRing: { width: 30, height: 30, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.95)", alignItems: "center", justifyContent: "center" },
  logo: { width: 22, height: 24 },
  brandTitle: { color: "#fff", fontSize: 15, fontWeight: "800", opacity: 0.95 },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 16 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  avatarText: { fontWeight: "900", fontSize: 18 },
  profileName: { color: "#fff", fontSize: 18, fontWeight: "800" },
  rolePill: { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2, marginTop: 4 },
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
  logout: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 44, borderRadius: 14, borderWidth: 1.5 },
});

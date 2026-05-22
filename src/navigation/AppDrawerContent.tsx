import React, { useMemo } from "react";
import { Alert, Image, Pressable, View, StyleSheet } from "react-native";
import {
  DrawerContentScrollView,
  type DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { Text, Button } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useLanguage, type LangCode } from "../context/LanguageContext";
import { APP_DISPLAY_NAME, colors } from "../theme/appTheme";
import type { MainStackParamList } from "./types";

type Leaf = {
  screen: keyof MainStackParamList;
  titleKey: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  roles: string[];
};

const SECTIONS: {
  titleKey: string;
  accent: string;
  items: Leaf[];
}[] = [
  {
    titleKey: "home",
    accent: "#0984e3",
    items: [
      {
        screen: "Dashboard",
        titleKey: "dashboard",
        icon: "view-dashboard-variant",
        color: "#0984e3",
        roles: ["SU", "AU", "NU", "MU"],
      },
      {
        screen: "ClientList",
        titleKey: "Clients",
        icon: "account-multiple",
        color: "#6c5ce7",
        roles: ["SU"],
      },
      {
        screen: "AddNewMahal",
        titleKey: "addMahal",
        icon: "office-building",
        color: "#5f27cd",
        roles: ["SU", "MU"],
      },
      {
        screen: "MahalBooking",
        titleKey: "mahalBooking",
        icon: "calendar-month",
        color: "#e84393",
        roles: ["SU", "MU"],
      },
      {
        screen: "MahalBookingList",
        titleKey: "mahalBookingList",
        icon: "calendar-check",
        color: "#fd79a8",
        roles: ["SU", "MU"],
      },
      {
        screen: "AddMoitechCustomer",
        titleKey: "addMoiTechCustomer",
        icon: "account-heart",
        color: "#00b894",
        roles: ["SU", "MU"],
      },
    ],
  },
  {
    titleKey: "Masters",
    accent: "#636e72",
    items: [
      {
        screen: "FunctionMaster",
        titleKey: "functionMaster",
        icon: "tune-variant",
        color: "#576574",
        roles: ["SU", "AU"],
      },
      {
        screen: "UserMaster",
        titleKey: "userMaster",
        icon: "account-cog",
        color: "#2d3436",
        roles: ["SU", "AU"],
      },
    ],
  },
  {
    titleKey: "transactions",
    accent: "#00b894",
    items: [
      {
        screen: "Transaction",
        titleKey: "addTransaction",
        icon: "cash-plus",
        color: "#00b894",
        roles: ["SU", "AU", "NU"],
      },
      {
        screen: "TransactionList",
        titleKey: "transactionList",
        icon: "clipboard-text-outline",
        color: "#0984e3",
        roles: ["SU", "AU", "NU"],
      },
      {
        screen: "AddExpenses",
        titleKey: "addExpenses",
        icon: "cash-minus",
        color: "#e17055",
        roles: ["SU", "AU", "NU"],
      },
      {
        screen: "ExpensesList",
        titleKey: "expensesList",
        icon: "format-list-bulleted",
        color: "#d63031",
        roles: ["SU", "AU", "NU"],
      },
      {
        screen: "Others",
        titleKey: "addOthers",
        icon: "gift-outline",
        color: "#00cec9",
        roles: ["SU", "AU", "NU"],
      },
      {
        screen: "OthersList",
        titleKey: "othersList",
        icon: "playlist-plus",
        color: "#81ecec",
        roles: ["SU", "AU", "NU"],
      },
      {
        screen: "Handover",
        titleKey: "handOver",
        icon: "handshake",
        color: "#f39c12",
        roles: ["SU", "AU", "NU"],
      },
    ],
  },
  {
    titleKey: "Reports",
    accent: "#6c5ce7",
    items: [
      {
        screen: "IncomeReport",
        titleKey: "receiptReport",
        icon: "chart-line",
        color: "#0984e3",
        roles: ["SU", "AU"],
      },
      {
        screen: "ExpensesReport",
        titleKey: "expenseReport",
        icon: "chart-bar",
        color: "#e17055",
        roles: ["SU", "AU"],
      },
      {
        screen: "OthersReport",
        titleKey: "othersReport",
        icon: "chart-timeline-variant",
        color: "#00b894",
        roles: ["SU", "AU"],
      },
      {
        screen: "RegionalReport",
        titleKey: "locationAmountReport",
        icon: "map-marker-radius",
        color: "#6c5ce7",
        roles: ["SU", "AU"],
      },
      {
        screen: "SummaryReport",
        titleKey: "summaryReport",
        icon: "chart-pie",
        color: "#a29bfe",
        roles: ["SU", "AU"],
      },
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
  const nested = home.state as
    | { routes: { name: string }[]; index: number }
    | undefined;
  if (nested?.routes?.length) {
    return nested.routes[nested.index]?.name;
  }
  return undefined;
}

function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (name.slice(0, 2) || "MS").toUpperCase();
}

function MenuItem({
  title,
  icon,
  color,
  active,
  onPress,
}: {
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        active && styles.menuItemActive,
        pressed && !active && styles.menuItemPressed,
      ]}
    >
      {active ? <View style={[styles.activeBar, { backgroundColor: color }]} /> : null}
      <View
        style={[
          styles.menuIcon,
          { backgroundColor: active ? color : `${color}18` },
        ]}
      >
        <MaterialCommunityIcons
          name={icon}
          size={21}
          color={active ? "#fff" : color}
        />
      </View>
      <Text
        variant="bodyMedium"
        style={[styles.menuLabel, active && styles.menuLabelActive]}
        numberOfLines={1}
      >
        {title}
      </Text>
      <MaterialCommunityIcons
        name={active ? "circle-small" : "chevron-right"}
        size={active ? 12 : 20}
        color={active ? colors.primary : "#cbd5e1"}
      />
    </Pressable>
  );
}

function SectionCard({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionDot, { backgroundColor: accent }]} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export default function AppDrawerContent(props: DrawerContentComponentProps) {
  const { navigation, state } = props;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { language, supportedLanguages, changeLanguage } = useLanguage();

  const activeScreen = useMemo(() => getActiveScreen(state), [state]);

  const role = user?.userType ?? "";
  const displayName =
    (user?.name as string | undefined) ??
    (user?.userName as string | undefined) ??
    "";
  const designation =
    (user?.userTypeDescription as string | undefined) ?? role;
  const initials = userInitials(displayName);

  const go = (screen: keyof MainStackParamList) => {
    navigation.navigate("Home", { screen });
    navigation.closeDrawer();
  };

  const confirmLogout = () => {
    Alert.alert(t("Logout"), "", [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("Logout"),
        style: "destructive",
        onPress: () => {
          void signOut();
          navigation.closeDrawer();
        },
      },
    ]);
  };

  const showTheme = ["SU", "AU", "NU"].includes(role);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.headerBlob1} />
        <View style={styles.headerBlob2} />
        <View style={styles.headerInner}>
          <View style={styles.logoRing}>
            <Image
              source={require("../../assets/brand-logo.png")}
              style={styles.brandLogo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.brandBlock}>
            <Text style={styles.brandTitle}>{APP_DISPLAY_NAME}</Text>
            <Text style={styles.brandTagline}>
              {t("mobile_app_tagline", { defaultValue: "Smart account management" })}
            </Text>
          </View>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>
              {displayName || "—"}
            </Text>
            <View style={styles.roleBadge}>
              <MaterialCommunityIcons name="shield-account" size={12} color="#0984e3" />
              <Text style={styles.roleText} numberOfLines={1}>
                {designation}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <DrawerContentScrollView
        {...props}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {SECTIONS.map((section) => {
          const visible = section.items.filter((i) => i.roles.includes(role));
          if (!visible.length) return null;
          return (
            <SectionCard key={section.titleKey} title={t(section.titleKey)} accent={section.accent}>
              {visible.map((item) => (
                <MenuItem
                  key={item.screen}
                  title={t(item.titleKey)}
                  icon={item.icon}
                  color={item.color}
                  active={activeScreen === item.screen}
                  onPress={() => go(item.screen)}
                />
              ))}
            </SectionCard>
          );
        })}

        <SectionCard
          title={t("mobile_more", { defaultValue: "More" })}
          accent="#74b9ff"
        >
          {showTheme ? (
            <MenuItem
              title={t("Theme Settings", { defaultValue: "Theme settings" })}
              icon="palette-outline"
              color="#9b59b6"
              active={activeScreen === "ThemeSettings"}
              onPress={() => go("ThemeSettings")}
            />
          ) : null}
          <MenuItem
            title={t("help")}
            icon="lifebuoy"
            color="#3498db"
            active={activeScreen === "Help"}
            onPress={() => go("Help")}
          />
        </SectionCard>

        <View style={styles.langCard}>
          <View style={styles.langHeader}>
            <MaterialCommunityIcons name="translate" size={18} color={colors.primary} />
            <Text style={styles.langTitle}>{t("choose_language")}</Text>
          </View>
          <View style={styles.langGrid}>
            {supportedLanguages.map((code) => {
              const selected = language === code;
              return (
                <Pressable
                  key={code}
                  onPress={() => void changeLanguage(code)}
                  style={[styles.langChip, selected && styles.langChipSelected]}
                >
                  <Text
                    style={[styles.langChipText, selected && styles.langChipTextSelected]}
                  >
                    {LANG_LABEL[code]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          onPress={confirmLogout}
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutPressed]}
        >
          <MaterialCommunityIcons name="logout" size={20} color="#fff" />
          <Text style={styles.logoutText}>{t("Logout")}</Text>
        </Pressable>

        <Text style={styles.version}>v1.0 · {APP_DISPLAY_NAME}</Text>
      </DrawerContentScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#eef2f7" },
  header: {
    backgroundColor: "#0c5ba8",
    paddingHorizontal: 18,
    paddingBottom: 18,
    overflow: "hidden",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#0c5ba8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  headerBlob1: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(108, 92, 231, 0.35)",
    top: -40,
    right: -30,
  },
  headerBlob2: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(9, 132, 227, 0.4)",
    bottom: 20,
    left: -35,
  },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  logoRing: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  brandLogo: { width: 40, height: 44 },
  brandBlock: { marginLeft: 14, flex: 1 },
  brandTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  brandTagline: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    marginTop: 2,
    fontWeight: "500",
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 15,
  },
  profileInfo: { marginLeft: 12, flex: 1 },
  profileName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  roleText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "600",
    maxWidth: 160,
  },
  scroll: { flex: 1, backgroundColor: "transparent" },
  scrollContent: { paddingHorizontal: 12, paddingTop: 14 },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginBottom: 12,
    shadowColor: "#1e3a5f",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 4,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 4,
    marginVertical: 2,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 12,
    position: "relative",
    overflow: "hidden",
  },
  menuItemActive: {
    backgroundColor: "rgba(9, 132, 227, 0.1)",
  },
  menuItemPressed: {
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  activeBar: {
    position: "absolute",
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    color: colors.text,
    fontWeight: "500",
    fontSize: 15,
  },
  menuLabelActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  langCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  langTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  langGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  langChip: {
    minWidth: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  langChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  langChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
  },
  langChipTextSelected: {
    color: "#fff",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#e74c3c",
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 10,
    shadowColor: "#c0392b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutPressed: { opacity: 0.9 },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  version: {
    textAlign: "center",
    fontSize: 11,
    color: "#94a3b8",
    marginBottom: 4,
  },
});

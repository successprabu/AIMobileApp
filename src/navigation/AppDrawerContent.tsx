import React from "react";
import { Alert, Image, Pressable, View, StyleSheet } from "react-native";
import {
  DrawerContentScrollView,
  type DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { Text, Divider, Button, Chip } from "react-native-paper";
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

const SECTIONS: { titleKey: string; items: Leaf[] }[] = [
  {
    titleKey: "home",
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
        color: "#a29bfe",
        roles: ["SU", "MU"],
      },
      {
        screen: "MahalBooking",
        titleKey: "mahalBooking",
        icon: "calendar-month",
        color: "#fd79a8",
        roles: ["SU", "MU"],
      },
      {
        screen: "MahalBookingList",
        titleKey: "mahalBookingList",
        icon: "format-list-bulleted",
        color: "#e84393",
        roles: ["SU", "MU"],
      },
      {
        screen: "AddMoitechCustomer",
        titleKey: "addMoiTechCustomer",
        icon: "account-heart",
        color: "#00cec9",
        roles: ["SU", "MU"],
      },
    ],
  },
  {
    titleKey: "Masters",
    items: [
      {
        screen: "FunctionMaster",
        titleKey: "functionMaster",
        icon: "tune-variant",
        color: "#636e72",
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
        icon: "clipboard-list",
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
        icon: "view-list",
        color: "#d63031",
        roles: ["SU", "AU", "NU"],
      },
      {
        screen: "Others",
        titleKey: "addOthers",
        icon: "file-document-plus",
        color: "#00cec9",
        roles: ["SU", "AU", "NU"],
      },
      {
        screen: "OthersList",
        titleKey: "othersList",
        icon: "file-document-multiple",
        color: "#81ecec",
        roles: ["SU", "AU", "NU"],
      },
      {
        screen: "Handover",
        titleKey: "handOver",
        icon: "handshake",
        color: "#fdcb6e",
        roles: ["SU", "AU", "NU"],
      },
    ],
  },
  {
    titleKey: "Reports",
    items: [
      {
        screen: "IncomeReport",
        titleKey: "receiptReport",
        icon: "chart-line",
        color: "#74b9ff",
        roles: ["SU", "AU"],
      },
      {
        screen: "ExpensesReport",
        titleKey: "expenseReport",
        icon: "chart-bar",
        color: "#a29bfe",
        roles: ["SU", "AU"],
      },
      {
        screen: "OthersReport",
        titleKey: "othersReport",
        icon: "chart-timeline-variant",
        color: "#55efc4",
        roles: ["SU", "AU"],
      },
      {
        screen: "RegionalReport",
        titleKey: "locationAmountReport",
        icon: "map-marker-radius",
        color: "#ffeaa7",
        roles: ["SU", "AU"],
      },
      {
        screen: "SummaryReport",
        titleKey: "summaryReport",
        icon: "chart-pie",
        color: "#6c5ce7",
        roles: ["SU", "AU"],
      },
    ],
  },
];

const LANG_LABEL: Record<LangCode, string> = {
  en: "English",
  ta: "தமிழ்",
  ml: "മലയാളം",
  te: "తెలుగు",
  kn: "ಕನ್ನಡ",
  hi: "हिन्दी",
};

function MenuRow({
  title,
  icon,
  color,
  onPress,
}: {
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && styles.menuPressed]}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon} size={20} color="#fff" />
      </View>
      <Text variant="bodyLarge" style={styles.menuLabel}>
        {title}
      </Text>
      <MaterialCommunityIcons name="chevron-right" size={22} color="#b2bec3" />
    </Pressable>
  );
}

export default function AppDrawerContent(props: DrawerContentComponentProps) {
  const { navigation } = props;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { language, supportedLanguages, changeLanguage } = useLanguage();

  const role = user?.userType ?? "";
  const displayName =
    (user?.name as string | undefined) ??
    (user?.userName as string | undefined) ??
    "";
  const designation =
    (user?.userTypeDescription as string | undefined) ?? role;

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
    <DrawerContentScrollView
      {...props}
      style={styles.drawer}
      contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
    >
      <View style={[styles.drawerHeader, { paddingTop: insets.top + 12 }]}>
        <Image
          source={require("../../assets/brand-logo.png")}
          style={styles.brandLogo}
          resizeMode="contain"
        />
        <Text variant="titleLarge" style={styles.brandTitle}>
          {APP_DISPLAY_NAME}
        </Text>
        <View style={styles.userPill}>
          <MaterialCommunityIcons name="account-circle" size={20} color="#fff" />
          <View style={styles.userPillText}>
            <Text variant="titleSmall" style={styles.userName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text variant="bodySmall" style={styles.userRole} numberOfLines={1}>
              {designation}
            </Text>
          </View>
        </View>
      </View>

      {SECTIONS.map((section) => {
        const visible = section.items.filter((i) => i.roles.includes(role));
        if (!visible.length) return null;
        return (
          <View key={section.titleKey} style={styles.section}>
            <Text style={styles.sectionLabel}>{t(section.titleKey)}</Text>
            {visible.map((item) => (
              <MenuRow
                key={item.screen}
                title={t(item.titleKey)}
                icon={item.icon}
                color={item.color}
                onPress={() => go(item.screen)}
              />
            ))}
          </View>
        );
      })}

      {showTheme ? (
        <MenuRow
          title={t("Theme Settings", { defaultValue: "Theme settings" })}
          icon="palette"
          color="#9b59b6"
          onPress={() => go("ThemeSettings")}
        />
      ) : null}
      <MenuRow
        title={t("help")}
        icon="help-circle-outline"
        color="#74b9ff"
        onPress={() => go("Help")}
      />

      <Divider style={styles.div} />
      <Text style={styles.sectionLabel}>{t("choose_language")}</Text>
      <View style={styles.langRow}>
        {supportedLanguages.map((code) => (
          <Chip
            key={code}
            selected={language === code}
            onPress={() => void changeLanguage(code)}
            style={styles.chip}
            compact
            selectedColor={colors.primary}
          >
            {LANG_LABEL[code]}
          </Chip>
        ))}
      </View>

      <Button
        mode="contained"
        icon="logout"
        buttonColor={colors.danger}
        textColor="#fff"
        onPress={confirmLogout}
        style={styles.logout}
      >
        {t("Logout")}
      </Button>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  drawer: { backgroundColor: "#f8fafc" },
  drawerHeader: {
    backgroundColor: colors.drawerGradientTop,
    paddingHorizontal: 16,
    paddingBottom: 20,
    marginBottom: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  brandLogo: { width: 44, height: 48, marginBottom: 8 },
  brandTitle: { color: "#fff", fontWeight: "800" },
  userPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
  },
  userPillText: { marginLeft: 8, flex: 1 },
  userName: { color: "#fff", fontWeight: "600" },
  userRole: { color: "rgba(255,255,255,0.85)" },
  section: { marginBottom: 4 },
  sectionLabel: {
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 10,
    marginVertical: 3,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  menuPressed: { opacity: 0.92 },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuLabel: { flex: 1, color: colors.text, fontWeight: "500" },
  div: { marginVertical: 12 },
  langRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  chip: { marginBottom: 4 },
  logout: { marginHorizontal: 16, borderRadius: 10 },
});

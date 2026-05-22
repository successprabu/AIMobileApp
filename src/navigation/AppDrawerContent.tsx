import React from "react";
import { Alert, Image, View, StyleSheet } from "react-native";
import {
  DrawerContentScrollView,
  type DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { Text, List, Divider, Button, Chip } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useLanguage, type LangCode } from "../context/LanguageContext";
import type { MainStackParamList } from "./types";

type Leaf = {
  screen: keyof MainStackParamList;
  titleKey: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
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
        roles: ["SU", "AU", "NU", "MU"],
      },
      {
        screen: "ClientList",
        titleKey: "Clients",
        icon: "account-multiple",
        roles: ["SU"],
      },
      {
        screen: "AddNewMahal",
        titleKey: "addMahal",
        icon: "office-building",
        roles: ["SU", "MU"],
      },
      {
        screen: "MahalBooking",
        titleKey: "mahalBooking",
        icon: "calendar-month",
        roles: ["SU", "MU"],
      },
      {
        screen: "MahalBookingList",
        titleKey: "mahalBookingList",
        icon: "format-list-bulleted",
        roles: ["SU", "MU"],
      },
      {
        screen: "AddMoitechCustomer",
        titleKey: "addMoiTechCustomer",
        icon: "account-heart",
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
        roles: ["SU", "AU"],
      },
      {
        screen: "UserMaster",
        titleKey: "userMaster",
        icon: "account-cog",
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
        roles: ["SU", "AU", "NU"],
      },
      {
        screen: "TransactionList",
        titleKey: "transactionList",
        icon: "clipboard-list",
        roles: ["SU", "AU", "NU"],
      },
      {
        screen: "AddExpenses",
        titleKey: "addExpenses",
        icon: "cash-minus",
        roles: ["SU", "AU", "NU"],
      },
      {
        screen: "ExpensesList",
        titleKey: "expensesList",
        icon: "view-list",
        roles: ["SU", "AU", "NU"],
      },
      {
        screen: "Others",
        titleKey: "addOthers",
        icon: "file-document-plus",
        roles: ["SU", "AU", "NU"],
      },
      {
        screen: "OthersList",
        titleKey: "othersList",
        icon: "file-document-multiple",
        roles: ["SU", "AU", "NU"],
      },
      {
        screen: "Handover",
        titleKey: "handOver",
        icon: "handshake",
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
        roles: ["SU", "AU"],
      },
      {
        screen: "ExpensesReport",
        titleKey: "expenseReport",
        icon: "chart-bar",
        roles: ["SU", "AU"],
      },
      {
        screen: "OthersReport",
        titleKey: "othersReport",
        icon: "chart-timeline-variant",
        roles: ["SU", "AU"],
      },
      {
        screen: "RegionalReport",
        titleKey: "locationAmountReport",
        icon: "map-marker-radius",
        roles: ["SU", "AU"],
      },
      {
        screen: "SummaryReport",
        titleKey: "summaryReport",
        icon: "chart-pie",
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
      contentContainerStyle={{ paddingTop: insets.top + 8 }}
    >
      <View style={styles.brand}>
        <Image
          source={require("../../assets/brand-logo.png")}
          style={styles.brandLogo}
          resizeMode="contain"
          accessibilityLabel={t("my_accounts")}
        />
        <Text variant="titleMedium" style={styles.brandText}>
          {t("my_accounts")}
        </Text>
      </View>

      <View style={styles.userBox}>
        <Text variant="titleSmall">{displayName}</Text>
        <Text variant="bodySmall" style={styles.muted}>
          {designation}
        </Text>
      </View>

      <Divider style={styles.div} />

      {SECTIONS.map((section) => {
        const visible = section.items.filter((i) => i.roles.includes(role));
        if (!visible.length) return null;
        return (
          <View key={section.titleKey}>
            <Text style={styles.section} variant="labelLarge">
              {t(section.titleKey)}
            </Text>
            {visible.map((item) => (
              <List.Item
                key={item.screen}
                title={t(item.titleKey)}
                onPress={() => go(item.screen)}
                left={() => (
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={22}
                    color="#2d3436"
                    style={styles.iconLeft}
                  />
                )}
              />
            ))}
          </View>
        );
      })}

      {showTheme ? (
        <List.Item
          title={t("Theme Settings", { defaultValue: "Theme settings" })}
          onPress={() => go("ThemeSettings")}
          left={() => (
            <MaterialCommunityIcons
              name="palette"
              size={22}
              color="#2d3436"
              style={styles.iconLeft}
            />
          )}
        />
      ) : null}
      <List.Item
        title={t("help")}
        onPress={() => go("Help")}
        left={() => (
          <MaterialCommunityIcons
            name="help-circle-outline"
            size={22}
            color="#2d3436"
            style={styles.iconLeft}
          />
        )}
      />

      <Divider style={styles.div} />
      <Text style={styles.section} variant="labelLarge">
        {t("choose_language")}
      </Text>
      <View style={styles.langRow}>
        {supportedLanguages.map((code) => (
          <Chip
            key={code}
            selected={language === code}
            onPress={() => void changeLanguage(code)}
            style={styles.chip}
            compact
          >
            {LANG_LABEL[code]}
          </Chip>
        ))}
      </View>

      <Button mode="contained-tonal" icon="logout" onPress={confirmLogout} style={styles.logout}>
        {t("Logout")}
      </Button>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  brand: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  brandLogo: { width: 36, height: 40 },
  brandText: { marginLeft: 8, fontWeight: "700", flexShrink: 1 },
  userBox: { paddingHorizontal: 16, marginBottom: 8 },
  muted: { opacity: 0.7 },
  div: { marginVertical: 8 },
  section: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    opacity: 0.65,
  },
  iconLeft: { marginLeft: 8, alignSelf: "center" },
  langRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  chip: { marginBottom: 4 },
  logout: { margin: 16, marginTop: 8 },
});

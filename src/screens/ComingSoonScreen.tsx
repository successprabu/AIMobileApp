import React, { useLayoutEffect, useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text, Card, Button } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "../hooks/useAppTheme";
import { useTranslation } from "react-i18next";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MainStackParamList } from "../navigation/types";

const TITLE_KEYS: Partial<Record<keyof MainStackParamList, string>> = {
  ClientList: "Clients",
  AddNewMahal: "addMahal",
  MahalBooking: "mahalBooking",
  MahalBookingList: "mahalBookingList",
  AddMoitechCustomer: "addMoiTechCustomer",
  FunctionMaster: "functionMaster",
  UserMaster: "userMaster",
  Transaction: "addTransaction",
  TransactionList: "transactionList",
  AddExpenses: "addExpenses",
  ExpensesList: "expensesList",
  Others: "addOthers",
  OthersList: "othersList",
  Handover: "handOver",
  ThemeSettings: "Theme Settings",
  Help: "help",
};

export default function ComingSoonScreen() {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const styles = useMemo(() => makeStyles(c), [c]);
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const name = route.name as keyof MainStackParamList;
  const key = TITLE_KEYS[name];
  const title = key ? t(key) : name;

  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  return (
    <ScrollView contentContainerStyle={styles.pad} style={styles.screen}>
      <Card mode="elevated" style={[styles.card, { backgroundColor: c.card }]}>
        <Card.Content style={styles.cardInner}>
          <View style={[styles.iconWrap, { backgroundColor: c.primaryMuted }]}>
            <MaterialCommunityIcons name="hammer-wrench" size={40} color={c.primary} />
          </View>
          <Text variant="titleLarge" style={[styles.title, { color: c.text }]}>
            {title}
          </Text>
          <Text style={styles.body} variant="bodyMedium">
            {t("mobile_coming_soon_body", {
              defaultValue:
                "This screen will be ported from the web app next. Menus and login already use the same API.",
            })}
          </Text>
          <Button mode="contained-tonal" icon="arrow-left" onPress={() => navigation.goBack()}>
            {t("dashboard")}
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

function makeStyles(c: ReturnType<typeof useAppTheme>["theme"]["colors"]) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    pad: { padding: 24, flexGrow: 1, justifyContent: "center" },
    card: { borderRadius: 16 },
    cardInner: { alignItems: "center", paddingVertical: 24 },
    iconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    title: { fontWeight: "700", textAlign: "center", marginBottom: 12 },
    body: { marginBottom: 20, lineHeight: 22, textAlign: "center", color: c.textMuted },
  });
}

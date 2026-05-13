import React, { useLayoutEffect } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Text, Card } from "react-native-paper";
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
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const name = route.name as keyof MainStackParamList;
  const key = TITLE_KEYS[name];
  const title = key ? t(key) : name;

  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Card mode="elevated">
        <Card.Content>
          <Text variant="titleMedium">{title}</Text>
          <Text style={styles.body} variant="bodyMedium">
            {t("mobile_coming_soon_body", {
              defaultValue:
                "This screen will be ported from the web app next. Menus and login already use the same API.",
            })}
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16 },
  body: { marginTop: 12, lineHeight: 22 },
});

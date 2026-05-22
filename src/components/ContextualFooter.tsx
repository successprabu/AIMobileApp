import React, { useMemo } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { DrawerNavigationProp } from "@react-navigation/drawer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CONTEXTUAL_FOOTER_LINKS,
  FOOTER_BAR_HEIGHT,
  type ContextualNavLink,
} from "../constants/contextualNavLinks";
import { useAppTheme } from "../hooks/useAppTheme";
import { useActiveMainScreen } from "../hooks/useActiveMainScreen";
import type { MainStackParamList, RootDrawerParamList } from "../navigation/types";
import { PRIMARY_PINK, PRIMARY_PINK_DARK } from "../theme/themes";

const FOOTER_PINK = PRIMARY_PINK;
const FOOTER_TEXT = "#ffffff";
const FOOTER_TEXT_MUTED = "rgba(255,255,255,0.75)";
const FOOTER_ACTIVE_BG = "rgba(255,255,255,0.22)";

export default function ContextualFooter() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const activeScreen = useActiveMainScreen();
  const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();

  const links = CONTEXTUAL_FOOTER_LINKS[activeScreen];
  const styles = useMemo(() => makeStyles(), []);

  if (!links?.length) return null;

  const go = (screen: keyof MainStackParamList) => {
    navigation.navigate("Home", { screen });
  };

  const bottomPad = Math.max(insets.bottom, 6);
  const left = links[0];
  const right = links[1];

  return (
    <View
      style={[
        styles.bar,
        styles.barShadow,
        {
          backgroundColor: FOOTER_PINK,
          paddingBottom: bottomPad,
          minHeight: FOOTER_BAR_HEIGHT + bottomPad,
        },
      ]}
    >
      <View style={styles.row}>
        {left ? (
          <FooterItem
            link={left}
            shortLabel={t(left.shortKey)}
            fullLabel={t(left.titleKey)}
            active={activeScreen === left.screen}
            onPress={() => go(left.screen)}
            align="left"
            styles={styles}
          />
        ) : (
          <View />
        )}
        {right ? (
          <FooterItem
            link={right}
            shortLabel={t(right.shortKey)}
            fullLabel={t(right.titleKey)}
            active={activeScreen === right.screen}
            onPress={() => go(right.screen)}
            align="right"
            styles={styles}
          />
        ) : (
          <View />
        )}
      </View>
    </View>
  );
}

function FooterItem({
  link,
  shortLabel,
  fullLabel,
  active,
  onPress,
  align,
  styles,
}: {
  link: ContextualNavLink;
  shortLabel: string;
  fullLabel: string;
  active: boolean;
  onPress: () => void;
  align: "left" | "right";
  styles: ReturnType<typeof makeStyles>;
}) {
  const iconName = link.icon as keyof typeof MaterialCommunityIcons.glyphMap;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={fullLabel}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.item,
        align === "left" ? styles.itemLeft : styles.itemRight,
        active && styles.itemActive,
        pressed && styles.itemPressed,
      ]}
    >
      <MaterialCommunityIcons
        name={iconName}
        size={22}
        color={active ? FOOTER_TEXT : FOOTER_TEXT_MUTED}
      />
      <Text
        variant="labelMedium"
        numberOfLines={1}
        style={[styles.shortLabel, { color: active ? FOOTER_TEXT : FOOTER_TEXT_MUTED }]}
      >
        {shortLabel}
      </Text>
    </Pressable>
  );
}

function makeStyles() {
  return StyleSheet.create({
    bar: {
      borderTopWidth: 0,
      paddingTop: 8,
      paddingHorizontal: 12,
    },
    barShadow: {
      ...Platform.select({
        ios: {
          shadowColor: PRIMARY_PINK_DARK,
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
        },
        android: { elevation: 12 },
        default: {},
      }),
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
    },
    item: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 10,
      maxWidth: "48%",
    },
    itemLeft: {
      justifyContent: "flex-start",
    },
    itemRight: {
      justifyContent: "flex-end",
    },
    itemActive: {
      backgroundColor: FOOTER_ACTIVE_BG,
    },
    itemPressed: {
      opacity: 0.9,
    },
    shortLabel: {
      fontWeight: "700",
      fontSize: 12,
    },
  });
}

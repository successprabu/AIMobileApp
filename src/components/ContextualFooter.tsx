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

export default function ContextualFooter() {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const isDark = theme.mode === "dark";
  const insets = useSafeAreaInsets();
  const activeScreen = useActiveMainScreen();
  const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();

  const links = CONTEXTUAL_FOOTER_LINKS[activeScreen];
  const styles = useMemo(() => makeStyles(c, isDark), [c, isDark]);

  if (!links?.length) return null;

  const go = (screen: keyof MainStackParamList) => {
    navigation.navigate("Home", { screen });
  };

  return (
    <View
      style={[
        styles.bar,
        isDark ? styles.barShadowDark : styles.barShadowLight,
        {
          backgroundColor: c.footerBg,
          borderTopColor: c.footerBorder,
          paddingBottom: Math.max(insets.bottom, 8),
          minHeight: FOOTER_BAR_HEIGHT + Math.max(insets.bottom, 8),
        },
      ]}
    >
      <View style={[styles.accentLine, { backgroundColor: c.primary }]} />
      {links.map((link) => (
        <FooterLink
          key={link.screen}
          link={link}
          label={t(link.titleKey)}
          active={activeScreen === link.screen}
          onPress={() => go(link.screen)}
          styles={styles}
          primary={c.primary}
          text={c.text}
          textMuted={c.textMuted}
          linkBg={c.footerLinkBg}
          activeBg={c.primaryMuted}
        />
      ))}
    </View>
  );
}

function FooterLink({
  link,
  label,
  active,
  onPress,
  styles,
  primary,
  text,
  textMuted,
  linkBg,
  activeBg,
}: {
  link: ContextualNavLink;
  label: string;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
  primary: string;
  text: string;
  textMuted: string;
  linkBg: string;
  activeBg: string;
}) {
  const iconName = link.icon as keyof typeof MaterialCommunityIcons.glyphMap;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.link,
        { backgroundColor: active ? activeBg : linkBg },
        pressed && { opacity: 0.88 },
      ]}
    >
      <MaterialCommunityIcons
        name={iconName}
        size={20}
        color={active ? primary : textMuted}
      />
      <Text
        variant="labelMedium"
        numberOfLines={1}
        style={[styles.linkText, { color: active ? primary : text }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function makeStyles(
  c: ReturnType<typeof useAppTheme>["theme"]["colors"],
  isDark: boolean
) {
  return StyleSheet.create({
    bar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-evenly",
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingTop: 10,
      paddingHorizontal: 8,
      position: "relative",
    },
    accentLine: {
      position: "absolute",
      top: 0,
      left: 12,
      right: 12,
      height: 2,
      borderRadius: 1,
      opacity: isDark ? 0.85 : 0.55,
    },
    barShadowLight: {
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        },
        android: { elevation: 12 },
        default: {},
      }),
    },
    barShadowDark: {
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.45,
          shadowRadius: 10,
        },
        android: { elevation: 16 },
        default: {},
      }),
    },
    link: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 9,
      paddingHorizontal: 10,
      borderRadius: 10,
      marginHorizontal: 4,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? c.border : "transparent",
    },
    linkText: { fontWeight: "600", fontSize: 12 },
  });
}

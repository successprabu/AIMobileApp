import React, { useMemo } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { DrawerNavigationProp } from "@react-navigation/drawer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CONTEXTUAL_FOOTER_LINKS,
  FOOTER_BAR_HEIGHT,
  FOOTER_RAINBOW_STRIP,
  type ContextualNavLink,
} from "../constants/contextualNavLinks";
import { useAppTheme } from "../hooks/useAppTheme";
import { useActiveMainScreen } from "../hooks/useActiveMainScreen";
import type { MainStackParamList, RootDrawerParamList } from "../navigation/types";

function tintBg(hex: string, alpha: number) {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  if (hex.length === 7) return `${hex}${a}`;
  return hex;
}

export default function ContextualFooter() {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const isDark = theme.mode === "dark";
  const insets = useSafeAreaInsets();
  const activeScreen = useActiveMainScreen();
  const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();

  const links = CONTEXTUAL_FOOTER_LINKS[activeScreen];
  const styles = useMemo(() => makeStyles(isDark), [isDark]);

  if (!links?.length) return null;

  const go = (screen: keyof MainStackParamList) => {
    navigation.navigate("Home", { screen });
  };

  const bottomPad = Math.max(insets.bottom, 6);

  return (
    <View
      style={[
        styles.bar,
        isDark ? styles.barShadowDark : styles.barShadowLight,
        {
          backgroundColor: c.footerBg,
          borderTopColor: c.footerBorder,
          paddingBottom: bottomPad,
          minHeight: FOOTER_BAR_HEIGHT + bottomPad,
        },
      ]}
    >
      <View style={styles.rainbowRow}>
        {FOOTER_RAINBOW_STRIP.map((color) => (
          <View key={color} style={[styles.rainbowSegment, { backgroundColor: color }]} />
        ))}
      </View>

      <View style={styles.iconRow}>
        {links.map((link) => (
          <FooterIcon
            key={link.screen}
            link={link}
            label={t(link.titleKey)}
            active={activeScreen === link.screen}
            onPress={() => go(link.screen)}
            styles={styles}
          />
        ))}
      </View>
    </View>
  );
}

function FooterIcon({
  link,
  label,
  active,
  onPress,
  styles,
}: {
  link: ContextualNavLink;
  label: string;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  const iconName = link.icon as keyof typeof MaterialCommunityIcons.glyphMap;
  const accent = link.color;
  const chipBg = active ? accent : tintBg(accent, 0.22);
  const iconColor = active ? "#ffffff" : accent;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: chipBg,
          borderColor: active ? accent : tintBg(accent, 0.45),
        },
        pressed && styles.chipPressed,
      ]}
    >
      <MaterialCommunityIcons name={iconName} size={26} color={iconColor} />
      {active ? <View style={[styles.activeDot, { backgroundColor: "#ffffff" }]} /> : null}
    </Pressable>
  );
}

function makeStyles(isDark: boolean) {
  return StyleSheet.create({
    bar: {
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingTop: 0,
      paddingHorizontal: 20,
      position: "relative",
    },
    rainbowRow: {
      flexDirection: "row",
      height: 4,
      width: "100%",
      marginBottom: 10,
      borderRadius: 2,
      overflow: "hidden",
    },
    rainbowSegment: {
      flex: 1,
      height: 4,
    },
    iconRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 28,
      paddingVertical: 4,
    },
    chip: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.35 : 0.12,
          shadowRadius: 4,
        },
        android: { elevation: activeElevation(isDark) },
        default: {},
      }),
    },
    chipPressed: {
      transform: [{ scale: 0.94 }],
      opacity: 0.92,
    },
    activeDot: {
      position: "absolute",
      bottom: 6,
      width: 5,
      height: 5,
      borderRadius: 3,
    },
    barShadowLight: {
      ...Platform.select({
        ios: {
          shadowColor: "#c2185b",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
        },
        android: { elevation: 14 },
        default: {},
      }),
    },
    barShadowDark: {
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.5,
          shadowRadius: 12,
        },
        android: { elevation: 18 },
        default: {},
      }),
    },
  });
}

function activeElevation(isDark: boolean) {
  return isDark ? 8 : 5;
}

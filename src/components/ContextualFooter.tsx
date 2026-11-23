import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Platform, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
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
import { ND, useReduceMotion } from "./ui/Motion";

const FOOTER_PINK = PRIMARY_PINK;
const FOOTER_TEXT = "#ffffff";

export default function ContextualFooter() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const activeScreen = useActiveMainScreen();
  const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();

  const { user } = useAuth();
  // Mahal admins don't record moi, so the receipt shortcuts are not for them.
  const links = user?.userType === "MU" && activeScreen === "Dashboard" ? undefined : CONTEXTUAL_FOOTER_LINKS[activeScreen];
  const styles = useMemo(() => makeStyles(), []);

  if (!links?.length) return null;

  const go = (screen: keyof MainStackParamList) => {
    navigation.navigate("Home", { screen } as never);
  };

  const bottomPad = Math.max(insets.bottom, 6);
  const left = links[0];
  const right = links[1];

  return (
    <FooterShell bottomPad={bottomPad} styles={styles}>
      <View style={styles.row}>
        {left ? (
          <FooterItem
            link={left}
            shortLabel={t(left.shortKey)}
            fullLabel={t(left.titleKey)}
            active={activeScreen === left.screen}
            onPress={() => go(left.screen)}
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
            styles={styles}
          />
        ) : (
          <View />
        )}
      </View>
    </FooterShell>
  );
}

let footerShown = false;

/** The bar itself: rounded top, soft glow, and it slides up once when it first appears. */
function FooterShell({ bottomPad, styles, children }: { bottomPad: number; styles: ReturnType<typeof makeStyles>; children: React.ReactNode }) {
  const reduce = useReduceMotion();
  // Slides up only the first time; after that it just appears, so moving between screens never flickers.
  const v = useRef(new Animated.Value(footerShown ? 1 : 0)).current;
  useEffect(() => {
    if (footerShown || reduce) {
      v.setValue(1);
      return;
    }
    footerShown = true;
    Animated.spring(v, { toValue: 1, friction: 8, tension: 60, useNativeDriver: ND }).start();
  }, [reduce, v]);
  return (
    <Animated.View
      style={[
        styles.bar,
        styles.barShadow,
        {
          backgroundColor: FOOTER_PINK,
          paddingBottom: bottomPad,
          minHeight: FOOTER_BAR_HEIGHT + bottomPad,
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
        },
      ]}
    >
      <View pointerEvents="none" style={[styles.glow, { width: 160, height: 160, borderRadius: 80, top: -100, left: -40, backgroundColor: "rgba(255,255,255,0.10)" }]} />
      <View pointerEvents="none" style={[styles.glow, { width: 120, height: 120, borderRadius: 60, bottom: -70, right: -20, backgroundColor: "rgba(0,0,0,0.12)" }]} />
      {children}
    </Animated.View>
  );
}

function FooterItem({
  link,
  shortLabel,
  fullLabel,
  active,
  onPress,
  styles,
}: {
  link: ContextualNavLink;
  shortLabel: string;
  fullLabel: string;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  const iconName = link.icon as keyof typeof MaterialCommunityIcons.glyphMap;
  // `on` moves to 1 when this link becomes the open screen (white pill grows in); `press` springs on touch.
  const on = useRef(new Animated.Value(active ? 1 : 0)).current;
  const press = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.spring(on, { toValue: active ? 1 : 0, friction: 7, tension: 120, useNativeDriver: ND }).start();
  }, [active, on]);
  const squeeze = (v: number) => Animated.spring(press, { toValue: v, friction: 5, tension: 260, useNativeDriver: ND }).start();

  return (
    <Animated.View style={{ maxWidth: "48%", transform: [{ scale: press }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => squeeze(0.92)}
        onPressOut={() => squeeze(1)}
        accessibilityRole="button"
        accessibilityLabel={fullLabel}
        accessibilityState={{ selected: active }}
        style={styles.item}
      >
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.activePill, { opacity: on, transform: [{ scale: on.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }]} />
        <View style={[styles.iconWrap, { backgroundColor: active ? "rgba(194,24,91,0.12)" : "rgba(255,255,255,0.18)" }]}>
          <MaterialCommunityIcons name={iconName} size={20} color={active ? FOOTER_PINK : FOOTER_TEXT} />
        </View>
        <Text variant="labelMedium" numberOfLines={1} style={[styles.shortLabel, { color: active ? FOOTER_PINK : FOOTER_TEXT }]}>
          {shortLabel}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function makeStyles() {
  return StyleSheet.create({
    bar: {
      paddingTop: 10,
      paddingHorizontal: 14,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow: "hidden",
    },
    glow: { position: "absolute" },
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
      gap: 8,
      paddingVertical: 6,
      paddingLeft: 6,
      paddingRight: 14,
      borderRadius: 999,
    },
    activePill: { backgroundColor: "#ffffff", borderRadius: 999 },
    iconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    shortLabel: {
      fontWeight: "800",
      fontSize: 13,
    },
  });
}

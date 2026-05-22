import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
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
import type { MainStackParamList } from "../navigation/types";
import type { RootDrawerParamList } from "../navigation/types";

export default function ContextualFooter() {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const activeScreen = useActiveMainScreen();
  const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();

  const links = CONTEXTUAL_FOOTER_LINKS[activeScreen];
  const styles = useMemo(() => makeStyles(c), [c]);

  if (!links?.length) return null;

  const go = (screen: keyof MainStackParamList) => {
    navigation.navigate("Home", { screen });
  };

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          paddingBottom: Math.max(insets.bottom, 8),
          minHeight: FOOTER_BAR_HEIGHT + Math.max(insets.bottom, 8),
        },
      ]}
    >
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
}: {
  link: ContextualNavLink;
  label: string;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
  primary: string;
  text: string;
  textMuted: string;
}) {
  const iconName = link.icon as keyof typeof MaterialCommunityIcons.glyphMap;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.link,
        active && { backgroundColor: `${primary}18` },
        pressed && { opacity: 0.85 },
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

function makeStyles(c: ReturnType<typeof useAppTheme>["theme"]["colors"]) {
  return StyleSheet.create({
    bar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-evenly",
      borderTopWidth: 1,
      paddingTop: 8,
      paddingHorizontal: 8,
    },
    link: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 10,
      marginHorizontal: 4,
    },
    linkText: { fontWeight: "600", fontSize: 12 },
  });
}

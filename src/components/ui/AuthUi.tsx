import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../hooks/useAppTheme";
import { HeroArt, ND, useLoop, useMotionOn, type HeroArtKind } from "./Motion";


type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/** Deep brand colours for the hero; the layered circles give it a gradient look without an extra library. */
const HERO_BG = "#b0124f";
const HERO_DEEP = "#7a0a3a";
const HERO_GLOW = "#ec407a";

/** Fades and lifts its children in after `delay` ms. */
export function Rise({ delay = 0, style, children }: { delay?: number; style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 480, delay, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start();
  }, [delay, v]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** Shakes sideways each time `trigger` changes to a new non-empty value (an error appearing). */
export function Shake({ trigger, style, children }: { trigger: string; style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!trigger) return;
    x.setValue(0);
    Animated.sequence(
      [10, -10, 7, -7, 3, 0].map((to) => Animated.timing(x, { toValue: to, duration: 55, useNativeDriver: ND })),
    ).start();
  }, [trigger, x]);
  return <Animated.View style={[style, { transform: [{ translateX: x }] }]}>{children}</Animated.View>;
}

/** An icon that floats up and down slowly, for the hero decoration. */
function FloatIcon({ on, name, size, top, left, right, delay, opacity = 0.22 }: { on: boolean; name: IconName; size: number; top: number; left?: number | `${number}%`; right?: number | `${number}%`; delay: number; opacity?: number }) {
  const v = useLoop(on, 2600, { delay });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top,
        left,
        right,
        opacity,
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) },
          { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ["-8deg", "8deg"] }) },
        ],
      }}
    >
      <MaterialCommunityIcons name={name} size={size} color="#fff" />
    </Animated.View>
  );
}

/** A soft glowing circle that drifts slowly, for depth behind the hero. */
function Blob({ on, size, color, top, left, right, duration }: { on: boolean; size: number; color: string; top: number; left?: number; right?: number; duration: number }) {
  const v = useLoop(on, duration, { easing: Easing.inOut(Easing.quad) });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top,
        left,
        right,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        transform: [
          { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, 18] }) },
          { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
        ],
      }}
    />
  );
}

const HERO_ICONS: { name: IconName; size: number; top: number; left?: `${number}%`; right?: `${number}%` }[] = [
  { name: "ring", size: 26, top: 34, left: "21%" },
  { name: "flower-tulip-outline", size: 22, top: 84, left: "4%" },
  { name: "party-popper", size: 24, top: 30, right: "9%" },
  { name: "gift-outline", size: 22, top: 92, right: "5%" },
  { name: "heart-outline", size: 18, top: 140, left: "14%" },
  { name: "silverware-fork-knife", size: 18, top: 146, right: "16%" },
];

/**
 * The coloured top of the sign-in and sign-up screens: drifting glow, floating icons, the screen's animated picture
 * (`art`) and the title. `onBack` adds a back arrow (for screens without a navigation header).
 */
export function AuthHero({
  title,
  subtitle,
  badge,
  onBack,
  compact,
  art = "success",
  paddingTop = 0,
}: {
  title: string;
  subtitle?: string;
  badge?: { label: string; icon: IconName; color: string };
  onBack?: () => void;
  compact?: boolean;
  art?: HeroArtKind;
  paddingTop?: number;
}) {
  const on = useMotionOn();
  return (
    <View style={[styles.hero, { paddingTop: paddingTop + (compact ? 10 : 22), paddingBottom: compact ? 54 : 66 }]}>
      <Blob on={on} size={260} color={HERO_GLOW} top={-120} left={-80} duration={5200} />
      <Blob on={on} size={220} color={HERO_DEEP} top={60} right={-90} duration={6400} />
      <Blob on={on} size={120} color="rgba(255,255,255,0.08)" top={compact ? 120 : 180} left={40} duration={4600} />
      {HERO_ICONS.slice(0, compact ? 4 : 6).map((i, n) => (
        <FloatIcon key={i.name} on={on} {...i} delay={n * 350} />
      ))}

      {onBack ? (
        <Pressable onPress={onBack} style={[styles.back, { top: paddingTop + 10 }]} accessibilityRole="button" accessibilityLabel="Back" hitSlop={10}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
        </Pressable>
      ) : null}

      <View style={{ alignItems: "center" }}>
        <HeroArt kind={art} size={compact ? 64 : 84} />
        <Rise delay={220} style={{ alignItems: "center", marginTop: -14 }}>
          {badge ? (
            <View style={[styles.badge, { backgroundColor: badge.color }]}>
              <MaterialCommunityIcons name={badge.icon} size={14} color="#fff" />
              <Text style={styles.badgeText}>{badge.label}</Text>
            </View>
          ) : null}
          <Text style={[styles.heroTitle, compact && { fontSize: 24 }]}>{title}</Text>
          {subtitle ? <Text style={styles.heroSub}>{subtitle}</Text> : null}
        </Rise>
      </View>
    </View>
  );
}

/** A rounded white card that overlaps the bottom of the hero. */
export function AuthCard({ children, style, delay = 260 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; delay?: number }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  return (
    <Rise delay={delay} style={[styles.card, { backgroundColor: c.card, borderColor: c.border, shadowColor: theme.mode === "dark" ? "#000" : "#7a0a3a" }, style]}>
      {children}
    </Rise>
  );
}

/** A pill button that springs down a little when pressed. `variant="outline"` for the second choice. */
export function PillButton({
  label,
  onPress,
  icon,
  loading,
  disabled,
  variant = "solid",
  color,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  variant?: "solid" | "outline" | "soft";
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useAppTheme();
  const tint = color ?? theme.colors.primary;
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(scale, { toValue: v, friction: 6, tension: 220, useNativeDriver: ND }).start();
  const off = disabled || loading;
  const solid = variant === "solid";
  const fg = solid ? "#fff" : tint;
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => to(0.96)}
        onPressOut={() => to(1)}
        disabled={off}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!off, busy: !!loading }}
        style={[
          styles.pill,
          solid && { backgroundColor: tint, shadowColor: tint, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
          variant === "outline" && { borderWidth: 1.5, borderColor: tint },
          variant === "soft" && { backgroundColor: `${tint}1f` },
          off && { opacity: 0.5 },
        ]}
      >
        {loading ? <ActivityIndicator color={fg} size="small" /> : icon ? <MaterialCommunityIcons name={icon} size={20} color={fg} /> : null}
        <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

/** A coloured note (info / error / success) that slides in; errors also shake. */
export function Notice({ kind, text }: { kind: "info" | "error" | "success"; text: string }) {
  const { theme } = useAppTheme();
  const tone = {
    info: { bg: "#e0f2fe", fg: "#0369a1", icon: "information-outline" as IconName },
    error: { bg: `${theme.colors.danger}1c`, fg: theme.colors.danger, icon: "alert-circle-outline" as IconName },
    success: { bg: "#dcfce7", fg: "#15803d", icon: "check-circle-outline" as IconName },
  }[kind];
  return (
    <Shake trigger={kind === "error" ? text : ""}>
      <Rise style={[styles.notice, { backgroundColor: tone.bg, borderColor: `${tone.fg}40` }]}>
        <MaterialCommunityIcons name={tone.icon} size={20} color={tone.fg} />
        <Text style={{ color: tone.fg, flex: 1, fontWeight: "600" }}>{text}</Text>
      </Rise>
    </Shake>
  );
}

/** Numbered steps joined by a line that fills as each step is done. `step` is 0-based. */
export function StepBar({ steps, step, color }: { steps: string[]; step: number; color?: string }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const tint = color ?? c.primary;
  const fill = useRef(new Animated.Value(step)).current;
  useEffect(() => {
    Animated.timing(fill, { toValue: step, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [step, fill]);
  const last = Math.max(steps.length - 1, 1);
  return (
    <View style={styles.steps}>
      <View style={[styles.track, { backgroundColor: c.border }]}>
        <Animated.View style={[styles.trackFill, { backgroundColor: tint, width: fill.interpolate({ inputRange: [0, last], outputRange: ["0%", "100%"] }) }]} />
      </View>
      {steps.map((s, i) => {
        const done = i < step;
        const now = i === step;
        return (
          <View key={s} style={styles.stepItem}>
            <View style={[styles.dot, { backgroundColor: done || now ? tint : c.card, borderColor: done || now ? tint : c.border }, now && { transform: [{ scale: 1.12 }] }]}>
              {done ? <MaterialCommunityIcons name="check" size={16} color="#fff" /> : <Text style={{ color: now ? "#fff" : c.textMuted, fontWeight: "800", fontSize: 13 }}>{i + 1}</Text>}
            </View>
            <Text style={{ marginTop: 6, fontSize: 12, fontWeight: now ? "800" : "600", color: now ? tint : c.textMuted }}>{s}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** A springy green tick, for "mobile verified". */
export function PopCheck({ label }: { label: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: 1, friction: 4, tension: 90, useNativeDriver: ND }).start();
  }, [v]);
  return (
    <Animated.View style={[styles.verified, { opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }]}>
      <MaterialCommunityIcons name="check-decagram" size={20} color="#15803d" />
      <Text style={{ color: "#15803d", fontWeight: "800" }}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: HERO_BG,
    overflow: "hidden",
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    paddingHorizontal: 24,
  },
  back: {
    position: "absolute",
    left: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  badge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginTop: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.45)" },
  badgeText: { color: "#fff", fontWeight: "800", fontSize: 12, letterSpacing: 0.3 },
  heroTitle: { color: "#fff", fontSize: 30, fontWeight: "900", marginTop: 10, textAlign: "center", letterSpacing: 0.3 },
  heroSub: { color: "rgba(255,255,255,0.88)", marginTop: 6, textAlign: "center", lineHeight: 20, maxWidth: 320 },
  card: {
    marginHorizontal: 16,
    marginTop: -40,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  pill: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 52, borderRadius: 999, paddingHorizontal: 20 },
  pillText: { fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },
  notice: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 14 },
  steps: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18, paddingHorizontal: 4 },
  track: { position: "absolute", top: 15, left: "16%", right: "16%", height: 3, borderRadius: 2, overflow: "hidden" },
  trackFill: { height: 3, borderRadius: 2 },
  stepItem: { alignItems: "center", flex: 1 },
  dot: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  verified: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: "#dcfce7", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 10 },
});

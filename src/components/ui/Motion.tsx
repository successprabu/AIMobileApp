import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Image, Platform, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";

/**
 * Light, code-drawn animations (no GIF or Lottie files, so the app stays small and smooth):
 * - they run on the native UI thread (native driver), not in JavaScript;
 * - looping ones stop while their screen is hidden behind another screen;
 * - with the phone's "Remove animations / Reduce motion" setting on, they stay still.
 */
export const ND = Platform.OS !== "web";
type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/** False when the phone asks for less motion. */
export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => alive && setReduce(!!v)).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", (v) => setReduce(!!v));
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);
  return reduce;
}

/** True while looping animations should run: this screen is in front and motion is allowed. */
export function useMotionOn() {
  const focused = useIsFocused();
  const reduce = useReduceMotion();
  return focused && !reduce;
}

/**
 * A value that goes 0 → 1 (and back, with `pingPong`) forever while `on`. Stops cleanly when off, so a hidden
 * screen uses no animation time.
 */
export function useLoop(on: boolean, duration: number, { delay = 0, pingPong = true, easing = Easing.inOut(Easing.sin) } = {}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!on) return undefined;
    const steps = pingPong
      ? [Animated.timing(v, { toValue: 1, duration, easing, useNativeDriver: ND }), Animated.timing(v, { toValue: 0, duration, easing, useNativeDriver: ND })]
      : [Animated.timing(v, { toValue: 1, duration, easing, useNativeDriver: ND }), Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: ND })];
    const loop = Animated.loop(Animated.sequence(steps));
    const start = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(start);
      loop.stop();
    };
  }, [on, duration, delay, pingPong, easing, v]);
  return v;
}

export type HeroArtKind = "success" | "moitech" | "mahal";

const ART: Record<HeroArtKind, { center?: IconName; color: string; orbit: IconName[]; rising: IconName[] }> = {
  // Login: the brand medal with stars going round it and sparkles.
  success: { color: "#f59e0b", orbit: ["star", "star-four-points", "star", "star-four-points"], rising: [] },
  // Moitech: a gift with hearts and rupees rising out of it.
  moitech: { center: "gift-open-outline", color: "#6366f1", orbit: [], rising: ["heart", "currency-inr", "heart", "hand-heart", "currency-inr"] },
  // Mahal: a hall with booking things going round it and lights twinkling.
  mahal: { center: "office-building", color: "#f59e0b", orbit: ["calendar-check", "silverware-fork-knife", "party-popper", "flower-tulip"], rising: [] },
};

/** A small sparkle that twinkles (grows and fades) on its own timing. */
function Sparkle({ on, x, y, size, delay }: { on: boolean; x: number; y: number; size: number; delay: number }) {
  const v = useLoop(on, 900, { delay });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: x,
        top: y,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.15] }) }],
      }}
    >
      <MaterialCommunityIcons name="star-four-points" size={size} color="#fff7d6" />
    </Animated.View>
  );
}

/** An icon that rises from the centre, drifts sideways and fades, again and again. */
function Riser({ on, name, delay, dx, box }: { on: boolean; name: IconName; delay: number; dx: number; box: number }) {
  const v = useLoop(on, 2400, { delay, pingPong: false, easing: Easing.out(Easing.quad) });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: box / 2 - 10,
        top: box / 2 - 10,
        opacity: v.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 0.8, 0] }),
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -box * 0.62] }) },
          { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
          { scale: v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.4, 1, 0.8] }) },
        ],
      }}
    >
      <MaterialCommunityIcons name={name} size={20} color={name === "currency-inr" ? "#fde68a" : "#fff"} />
    </Animated.View>
  );
}

/**
 * The picture in the middle of a screen's coloured header. `kind` picks the scene for the screen. The logo pops in
 * once; the orbit, sparkles and rising icons loop only while the screen is showing.
 */
export function HeroArt({ kind, size }: { kind: HeroArtKind; size: number }) {
  const on = useMotionOn();
  const art = ART[kind];
  const box = size + 70;
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 70, delay: 120, useNativeDriver: ND }).start();
  }, [pop]);
  const spin = useLoop(on, 14000, { pingPong: false, easing: Easing.linear });
  const pulse = useLoop(on, 2200, { pingPong: false, easing: Easing.out(Easing.quad) });
  const bob = useLoop(on, 1800);

  const r = box / 2 - 12;
  return (
    <View style={{ width: box, height: box, alignItems: "center", justifyContent: "center" }}>
      {/* pulsing halo */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          {
            width: size + 26,
            height: size + 26,
            borderRadius: (size + 26) / 2,
            opacity: on ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }) : 0.3,
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.35] }) }],
          },
        ]}
      />

      {/* icons going round */}
      {art.orbit.length ? (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] }]}
        >
          {art.orbit.map((name, i) => {
            const a = (i / art.orbit.length) * Math.PI * 2;
            const s = kind === "success" ? (i % 2 ? 14 : 18) : 16;
            return (
              <View key={`${name}${i}`} style={{ position: "absolute", left: box / 2 + Math.cos(a) * r - s / 2, top: box / 2 + Math.sin(a) * r - s / 2 }}>
                <MaterialCommunityIcons name={name} size={s} color={kind === "success" ? "#fde68a" : "rgba(255,255,255,0.9)"} />
              </View>
            );
          })}
        </Animated.View>
      ) : null}

      {/* rising hearts / rupees */}
      {art.rising.map((name, i) => (
        <Riser key={`${name}${i}`} on={on} name={name} delay={i * 480} dx={(i % 2 ? 1 : -1) * (14 + i * 6)} box={box} />
      ))}

      {/* sparkles */}
      {(kind === "moitech" ? [] : [
        { x: 6, y: box * 0.3, s: 12, d: 0 },
        { x: box - 20, y: box * 0.22, s: 14, d: 300 },
        { x: box * 0.18, y: box - 22, s: 10, d: 600 },
        { x: box * 0.78, y: box - 26, s: 12, d: 900 },
      ]).map((p) => (
        <Sparkle key={`${p.x}`} on={on} x={p.x} y={p.y} size={p.s} delay={p.d} />
      ))}

      {/* the disc in the middle */}
      <Animated.View
        style={[
          styles.disc,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            opacity: pop,
            transform: [
              { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) },
              { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
              { rotate: pop.interpolate({ inputRange: [0, 1], outputRange: ["-30deg", "0deg"] }) },
            ],
          },
        ]}
      >
        {art.center ? (
          <MaterialCommunityIcons name={art.center} size={size * 0.52} color={art.color} />
        ) : (
          <Image source={require("../../../assets/brand-logo.png")} style={{ width: size * 0.58, height: size * 0.63 }} resizeMode="contain" />
        )}
      </Animated.View>
    </View>
  );
}

const BURST = ["#f59e0b", "#ec4899", "#6366f1", "#10b981", "#0ea5e9", "#f43f5e", "#a855f7", "#facc15", "#22c55e", "#fb7185", "#38bdf8", "#f97316"];

/**
 * A one-time "done!" celebration over the screen: a green tick springs in and confetti bursts out. Calls `onDone`
 * when finished (about one second), e.g. to open the app after signing in.
 */
export function SuccessBurst({ title, subtitle, onDone }: { title: string; subtitle?: string; onDone: () => void }) {
  const reduce = useReduceMotion();
  const fade = useRef(new Animated.Value(0)).current;
  const tick = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const finish = () => done.current();
    if (reduce) {
      fade.setValue(1);
      tick.setValue(1);
      const id = setTimeout(finish, 500);
      return () => clearTimeout(id);
    }
    const anim = Animated.sequence([
      Animated.timing(fade, { toValue: 1, duration: 160, useNativeDriver: ND }),
      Animated.parallel([
        Animated.spring(tick, { toValue: 1, friction: 4, tension: 90, useNativeDriver: ND }),
        Animated.timing(burst, { toValue: 1, duration: 750, easing: Easing.out(Easing.cubic), useNativeDriver: ND }),
      ]),
      Animated.delay(250),
    ]);
    anim.start(({ finished }) => finished && finish());
    return () => anim.stop();
  }, [reduce, fade, tick, burst]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.burstWrap, { opacity: fade }]} accessibilityLiveRegion="polite" accessibilityLabel={title}>
      <View style={{ width: 120, height: 120, alignItems: "center", justifyContent: "center" }}>
        {BURST.map((color, i) => {
          const a = (i / BURST.length) * Math.PI * 2;
          const dist = 78 + (i % 3) * 14;
          return (
            <Animated.View
              key={color + i}
              style={{
                position: "absolute",
                width: i % 2 ? 10 : 8,
                height: i % 2 ? 10 : 14,
                borderRadius: i % 2 ? 5 : 2,
                backgroundColor: color,
                opacity: burst.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 1, 0] }),
                transform: [
                  { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(a) * dist] }) },
                  { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(a) * dist] }) },
                  { rotate: burst.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${(i % 2 ? 1 : -1) * 220}deg`] }) },
                ],
              }}
            />
          );
        })}
        <Animated.View style={[styles.tick, { transform: [{ scale: tick }] }]}>
          <MaterialCommunityIcons name="check-bold" size={52} color="#fff" />
        </Animated.View>
      </View>
      <Animated.View style={{ alignItems: "center", opacity: tick, transform: [{ translateY: tick.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
        <Text style={styles.burstTitle}>{title}</Text>
        {subtitle ? <Text style={styles.burstSub}>{subtitle}</Text> : null}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  halo: { position: "absolute", borderWidth: 2, borderColor: "#fff" },
  disc: {
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  burstWrap: { backgroundColor: "rgba(255,255,255,0.94)", alignItems: "center", justifyContent: "center", zIndex: 50, elevation: 50 },
  tick: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#16a34a",
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  burstTitle: { fontSize: 24, fontWeight: "900", color: "#14532d", marginTop: 18, textAlign: "center" },
  burstSub: { fontSize: 15, color: "#3f6212", marginTop: 6, textAlign: "center", paddingHorizontal: 32 },
});

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, LayoutAnimation, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, UIManager, View, useWindowDimensions } from "react-native";
import { Button, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { useAppTheme } from "../hooks/useAppTheme";
import { useAuth } from "../context/AuthContext";
import type { AuthUser } from "../types/auth";
import { FadeIn } from "../components/mahal/MahalUi";

if (Platform.OS === "android") UIManager.setLayoutAnimationEnabledExperimental?.(true);

/** The guides live on the website (same files the web guide uses), so they stay up to date without a new app. */
export const SITE = "https://mysuccess.azurewebsites.net";

type GuideId = "moitech" | "mahal" | "school";
type Step = { title: string; text: string; img?: string; points?: string[] };
type Guide = { id: GuideId; heading: string; summary: string; color: string; sections: { title: string; steps: Step[] }[] };

const PRODUCTS: { id: GuideId; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string }[] = [
  { id: "moitech", label: "Moitech", icon: "hand-heart-outline", color: "#6366f1" },
  { id: "mahal", label: "Mahal", icon: "office-building-outline", color: "#f59e0b" },
  { id: "school", label: "School ERP", icon: "school-outline", color: "#10b981" },
];

export const guideForRole = (userType?: string): GuideId => (userType === "MU" ? "mahal" : "moitech");

/** Screenshot that keeps its own shape (the pictures have different heights). */
function Shot({ uri, onPress, label }: { uri: string; onPress: () => void; label: string }) {
  const { theme } = useAppTheme();
  const [ratio, setRatio] = useState(1280 / 760);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    Image.getSize(uri, (w, h) => h > 0 && setRatio(w / h), () => {});
  }, [uri]);
  if (failed) return null;
  return (
    <Pressable onPress={onPress} accessibilityRole="imagebutton" accessibilityLabel={`Enlarge screenshot: ${label}`} style={({ pressed }) => [styles.shot, { borderColor: theme.colors.border, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      <Image source={{ uri }} style={{ width: "100%", aspectRatio: ratio }} resizeMode="contain" onError={() => setFailed(true)} />
      <View style={styles.zoomTag}>
        <MaterialCommunityIcons name="magnify-plus-outline" size={14} color="#fff" />
        <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>Tap to enlarge</Text>
      </View>
    </Pressable>
  );
}

/** User guide: step-by-step pictures for Moitech, Mahal Management and the School ERP, with the PDF. */
export default function UserGuideScreen() {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const navigation = useNavigation();
  const { user } = useAuth();
  const me = (user ?? {}) as AuthUser;
  const { width, height } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);

  const [id, setId] = useState<GuideId>(guideForRole(me.userType));
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState<number>(0);
  const [zoom, setZoom] = useState<{ uri: string; title: string } | null>(null);

  useLayoutEffect(() => navigation.setOptions({ title: t("userGuide", { defaultValue: "User guide" }) }), [navigation, t]);

  const load = useCallback(async (gid: GuideId) => {
    setLoading(true);
    setError(false);
    try {
      const r = await fetch(`${SITE}/guide/${gid}.json`);
      if (!r.ok) throw new Error(String(r.status));
      setGuide((await r.json()) as Guide);
      setOpen(0);
    } catch {
      setGuide(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(id);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [id, load]);

  const color = PRODUCTS.find((p) => p.id === id)?.color ?? c.primary;
  const pdf = `${SITE}/guide/${id}.pdf`;
  let n = 0;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <View style={[styles.tabs, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        {PRODUCTS.map((p) => {
          const on = p.id === id;
          return (
            <Pressable key={p.id} onPress={() => setId(p.id)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[styles.tab, { backgroundColor: on ? p.color : "transparent", borderColor: on ? p.color : c.border }]}>
              <MaterialCommunityIcons name={p.icon} size={16} color={on ? "#fff" : p.color} />
              <Text style={{ color: on ? "#fff" : c.text, fontWeight: on ? "800" : "600", fontSize: 13 }}>{p.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 60 }} color={color} size="large" />
        ) : error || !guide ? (
          <FadeIn style={{ alignItems: "center", padding: 24 }}>
            <MaterialCommunityIcons name="wifi-off" size={48} color={c.textMuted} />
            <Text style={{ color: c.text, fontWeight: "800", fontSize: 16, marginTop: 8 }}>Could not load the guide</Text>
            <Text style={{ color: c.textMuted, textAlign: "center", marginTop: 4 }}>Check your internet connection and try again, or open the PDF.</Text>
            <Button mode="contained" onPress={() => load(id)} style={{ marginTop: 14, borderRadius: 12 }} buttonColor={color}>Try again</Button>
            <Button icon="file-pdf-box" onPress={() => Linking.openURL(pdf)} style={{ marginTop: 6 }}>Open the PDF</Button>
          </FadeIn>
        ) : (
          <>
            <FadeIn style={[styles.hero, { backgroundColor: color }]}>
              <Text style={styles.heroTitle}>{guide.heading}</Text>
              <Text style={styles.heroText}>{guide.summary}</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                <Pressable onPress={() => Linking.openURL(pdf)} style={({ pressed }) => [styles.heroBtn, { opacity: pressed ? 0.8 : 1 }]} accessibilityRole="button">
                  <MaterialCommunityIcons name="file-pdf-box" size={18} color={color} />
                  <Text style={{ color, fontWeight: "800" }}>Download PDF</Text>
                </Pressable>
                <Pressable onPress={() => Linking.openURL(`${SITE}/user-guide/${id}`)} style={({ pressed }) => [styles.heroBtnGhost, { opacity: pressed ? 0.8 : 1 }]} accessibilityRole="button">
                  <MaterialCommunityIcons name="open-in-new" size={16} color="#fff" />
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Open on website</Text>
                </Pressable>
              </View>
            </FadeIn>

            {guide.sections.map((s, si) => {
              const first = n + 1;
              n += s.steps.length;
              const expanded = open === si;
              return (
                <FadeIn key={s.title} index={si + 1} style={[styles.section, { backgroundColor: c.card, borderColor: expanded ? color : c.border }]}>
                  <Pressable
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.create(220, "easeInEaseOut", "opacity"));
                      setOpen(expanded ? -1 : si);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}
                    style={styles.sectionHead}
                  >
                    <View style={[styles.sectionNo, { backgroundColor: `${color}1f` }]}>
                      <Text style={{ color, fontWeight: "800" }}>{si + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.text, fontWeight: "800", fontSize: 16 }}>{s.title}</Text>
                      <Text style={{ color: c.textMuted, fontSize: 12 }}>Steps {first}–{n}</Text>
                    </View>
                    <MaterialCommunityIcons name={expanded ? "chevron-up" : "chevron-down"} size={24} color={c.textMuted} />
                  </Pressable>
                  {expanded &&
                    s.steps.map((st, i) => {
                      const uri = st.img ? `${SITE}/guide/${id}/${st.img}` : "";
                      return (
                        <View key={st.title} style={[styles.step, { borderTopColor: c.border }]}>
                          <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                            <View style={[styles.stepNo, { backgroundColor: color }]}>
                              <Text style={{ color: "#fff", fontWeight: "800" }}>{first + i}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: c.text, fontWeight: "800", fontSize: 15 }}>{st.title}</Text>
                              <Text style={{ color: c.textMuted, marginTop: 2, lineHeight: 20 }}>{st.text}</Text>
                            </View>
                          </View>
                          {(st.points ?? []).map((p, pi) => (
                            <View key={pi} style={styles.point}>
                              <View style={styles.marker}><Text style={styles.markerText}>{pi + 1}</Text></View>
                              <Text style={{ color: c.text, flex: 1, lineHeight: 20 }}>{p}</Text>
                            </View>
                          ))}
                          {!!uri && <Shot uri={uri} label={st.title} onPress={() => setZoom({ uri, title: st.title })} />}
                        </View>
                      );
                    })}
                </FadeIn>
              );
            })}

            <Text style={{ color: c.textMuted, textAlign: "center", marginTop: 8, fontSize: 12 }}>
              Pictures show the website. The app has the same screens in its menu.
            </Text>
          </>
        )}
      </ScrollView>

      <Modal visible={!!zoom} transparent animationType="fade" onRequestClose={() => setZoom(null)}>
        <View style={styles.zoomBg}>
          {/* Turn the phone sideways for a bigger picture; pinch to zoom on iOS. */}
          <ScrollView maximumZoomScale={4} minimumZoomScale={1} centerContent contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
            {zoom && <Image source={{ uri: zoom.uri }} style={{ width, height: height * 0.8 }} resizeMode="contain" />}
          </ScrollView>
          <View style={styles.zoomBar}>
            <Text style={{ color: "#fff", fontWeight: "700", flex: 1 }} numberOfLines={1}>{zoom?.title}</Text>
            <Pressable onPress={() => setZoom(null)} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10}>
              <MaterialCommunityIcons name="close" size={26} color="#fff" />
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, height: 36, borderRadius: 999, borderWidth: 1 },
  hero: { borderRadius: 20, padding: 18, marginBottom: 14 },
  heroTitle: { color: "#fff", fontSize: 21, fontWeight: "900" },
  heroText: { color: "rgba(255,255,255,0.9)", marginTop: 6, lineHeight: 20 },
  heroBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", paddingHorizontal: 14, height: 38, borderRadius: 999 },
  heroBtnGhost: { flexDirection: "row", alignItems: "center", gap: 6, borderColor: "rgba(255,255,255,0.7)", borderWidth: 1, paddingHorizontal: 14, height: 38, borderRadius: 999 },
  section: { borderRadius: 16, borderWidth: 1, marginBottom: 10, overflow: "hidden" },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  sectionNo: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  step: { borderTopWidth: StyleSheet.hairlineWidth, padding: 14, gap: 8 },
  stepNo: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  point: { flexDirection: "row", gap: 8, alignItems: "flex-start", paddingLeft: 40 },
  marker: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center", marginTop: 1 },
  markerText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  shot: { borderWidth: 1, borderRadius: 12, overflow: "hidden", backgroundColor: "#fff", marginTop: 4 },
  zoomTag: { position: "absolute", right: 8, bottom: 8, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(15,23,42,0.7)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  zoomBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.94)" },
  zoomBar: { position: "absolute", top: 40, left: 16, right: 16, flexDirection: "row", alignItems: "center", gap: 12 },
});

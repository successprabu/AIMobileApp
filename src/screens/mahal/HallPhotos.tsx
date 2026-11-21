import React, { useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useAppTheme } from "../../hooks/useAppTheme";
import { deletePhoto, photoUrl, setCoverPhoto, uploadPhoto } from "../../api/mahal";

export const MAX_PHOTOS = 12;
export type QueuedPhoto = { key: string; full: string; thumb: string };

/** Shrinks a picked photo on the phone: up to 1600px (and a 480px copy for lists), JPEG. */
async function shrink(asset: ImagePicker.ImagePickerAsset): Promise<QueuedPhoto> {
  const landscape = (asset.width ?? 0) >= (asset.height ?? 0);
  const size = (max: number) => (landscape ? { width: Math.min(max, asset.width || max) } : { height: Math.min(max, asset.height || max) });
  const full = await ImageManipulator.manipulateAsync(asset.uri, [{ resize: size(1600) }], { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG });
  const thumb = await ImageManipulator.manipulateAsync(asset.uri, [{ resize: size(480) }], { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG });
  return { key: `${Date.now()}-${asset.uri}`, full: full.uri, thumb: thumb.uri };
}

/** Uploads photos chosen before a new hall was saved. Returns how many failed. */
export async function uploadQueued(mahalId: number, queue: QueuedPhoto[]) {
  let failed = 0;
  for (const q of queue) {
    const r = await uploadPhoto(mahalId, q.full, q.thumb);
    if (!r.ok) failed += 1;
  }
  return failed;
}

/**
 * Hall photos in the add / edit hall screen (same as the website). A saved hall uploads straight away; a new
 * hall keeps them in `queue` and the screen uploads them once the hall is saved. The first photo is the cover.
 */
export default function HallPhotos({ mahalId, photos, onPhotos, queue, onQueue, onMessage }: {
  mahalId: number;
  photos: number[];
  onPhotos: (ids: number[]) => void;
  queue: QueuedPhoto[];
  onQueue: (q: QueuedPhoto[]) => void;
  onMessage: (m: string) => void;
}) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  const [busy, setBusy] = useState("");
  const count = (mahalId ? photos.length : 0) + queue.length;

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: MAX_PHOTOS - count, quality: 1 });
    if (res.canceled || !res.assets?.length) return;
    const assets = res.assets.slice(0, MAX_PHOTOS - count);
    let added = queue;
    for (const [i, a] of assets.entries()) {
      setBusy(assets.length > 1 ? `Adding photo ${i + 1} of ${assets.length}…` : "Adding photo…");
      try {
        const small = await shrink(a);
        if (mahalId) {
          const r = await uploadPhoto(mahalId, small.full, small.thumb);
          if (!r.ok) {
            onMessage(r.message);
            break;
          }
          onPhotos((r.data ?? []).map((p) => p.id));
        } else {
          added = [...added, small];
          onQueue(added);
        }
      } catch {
        onMessage("This photo could not be added.");
      }
    }
    setBusy("");
  };

  const act = async (fn: () => Promise<{ ok: boolean; message: string; data?: { id: number }[] }>, label: string) => {
    setBusy(label);
    const r = await fn();
    setBusy("");
    if (r.ok) onPhotos((r.data ?? []).map((p) => p.id));
    else onMessage(r.message);
  };

  const tiles = mahalId
    ? photos.map((id, i) => ({ key: `p${id}`, id, uri: photoUrl(id, true), cover: i === 0, q: undefined as QueuedPhoto | undefined }))
    : queue.map((q, i) => ({ key: q.key, id: 0, uri: q.thumb, cover: i === 0, q }));

  return (
    <View>
      <Text style={{ color: c.textMuted, marginBottom: 10 }}>
        {count ? `${count} of ${MAX_PHOTOS} photos. The first (star) is shown on the hall card.` : "Add photos of the hall: stage, dining, rooms, outside. Customers see them when they choose your hall."}
      </Text>
      <View style={styles.grid}>
        {tiles.map((t) => (
          <View key={t.key} style={[styles.tile, { borderColor: t.cover ? "#f59e0b" : c.border }]}>
            <Image source={{ uri: t.uri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            {t.cover && (
              <View style={styles.coverTag}>
                <MaterialCommunityIcons name="star" size={12} color="#fff" />
                <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>Cover</Text>
              </View>
            )}
            <View style={styles.actions}>
              {!t.cover && !!t.id && (
                <Pressable onPress={() => act(() => setCoverPhoto(t.id), "Setting cover…")} disabled={!!busy} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Make this the cover photo" hitSlop={6}>
                  <MaterialCommunityIcons name="star-outline" size={16} color="#fff" />
                </Pressable>
              )}
              <Pressable
                onPress={() => (t.id ? act(() => deletePhoto(t.id), "Removing…") : onQueue(queue.filter((x) => x !== t.q)))}
                disabled={!!busy}
                style={styles.iconBtn}
                accessibilityRole="button"
                accessibilityLabel="Remove this photo"
                hitSlop={6}
              >
                <MaterialCommunityIcons name="delete-outline" size={16} color="#fff" />
              </Pressable>
            </View>
          </View>
        ))}
        {count < MAX_PHOTOS && (
          <Pressable onPress={pick} disabled={!!busy} style={[styles.tile, styles.add, { borderColor: c.primary }]} accessibilityRole="button" accessibilityLabel="Add photos">
            {busy ? <ActivityIndicator color={c.primary} /> : <MaterialCommunityIcons name="image-plus" size={26} color={c.primary} />}
            <Text style={{ color: c.primary, fontWeight: "800", fontSize: 12, marginTop: 4 }}>Add photos</Text>
          </Pressable>
        )}
      </View>
      {!!busy && <Text style={{ color: c.textMuted, marginTop: 6, fontSize: 12 }}>{busy}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: { width: "31%", aspectRatio: 4 / 3, borderRadius: 10, overflow: "hidden", borderWidth: 2, backgroundColor: "#0000000d" },
  add: { borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  coverTag: { position: "absolute", top: 4, left: 4, flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: "#f59e0b", borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 },
  actions: { position: "absolute", right: 4, bottom: 4, flexDirection: "row", gap: 4 },
  iconBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(15,23,42,0.7)", alignItems: "center", justifyContent: "center" },
});

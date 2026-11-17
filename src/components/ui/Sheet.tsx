import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { IconButton, Portal, Text } from "react-native-paper";
import { useAppTheme } from "../../hooks/useAppTheme";

/** Bottom sheet that slides up over the screen; tap outside or × to close. */
export default function Sheet({ visible, title, onClose, children }: { visible: boolean; title?: string; onClose: () => void; children: React.ReactNode }) {
  const { theme } = useAppTheme();
  const c = theme.colors;
  return (
    <Portal>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: c.surface }]}>
          <View style={[styles.grabber, { backgroundColor: c.border }]} />
          {!!title && (
            <View style={styles.head}>
              <Text style={{ color: c.text, fontSize: 18, fontWeight: "800", flex: 1 }}>{title}</Text>
              <IconButton icon="close" onPress={onClose} accessibilityLabel="Close" />
            </View>
          )}
          <ScrollView contentContainerStyle={{ padding: 20, paddingTop: title ? 4 : 20, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { maxHeight: "90%", borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 8 },
  head: { flexDirection: "row", alignItems: "center", paddingLeft: 20, paddingRight: 8, paddingTop: 6 },
});

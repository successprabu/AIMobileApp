import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Keyboard,
  Platform,
  type ScrollView,
  type View,
} from "react-native";

type Options = {
  bottomInset?: number;
};

/**
 * Keyboard padding + scroll focused inputs above the keyboard (login / long forms).
 */
export function useKeyboardAwareScroll(options: Options = {}) {
  const { bottomInset = 0 } = options;
  const scrollRef = useRef<ScrollView>(null);
  const anchorRefs = useRef<Record<string, View | null>>({});
  const scrollOffsetRef = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const focusedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const setFieldAnchorRef = useCallback(
    (key: string) => (node: View | null) => {
      anchorRefs.current[key] = node;
    },
    []
  );

  const scrollAnchorIntoView = useCallback(
    (key: string) => {
      const node = anchorRefs.current[key];
      if (!node) {
        scrollRef.current?.scrollToEnd({ animated: true });
        return;
      }

      const kb = keyboardHeight > 0 ? keyboardHeight : 280;
      const windowHeight = Dimensions.get("window").height;
      const visibleBottom = windowHeight - kb - bottomInset - 20;

      node.measureInWindow((_x, winY, _w, height) => {
        const fieldBottom = winY + height;
        if (fieldBottom > visibleBottom) {
          const overlap = fieldBottom - visibleBottom;
          scrollRef.current?.scrollTo({
            y: scrollOffsetRef.current + overlap,
            animated: true,
          });
        }
      });
    },
    [keyboardHeight, bottomInset]
  );

  const onFieldFocus = useCallback(
    (key: string) => {
      focusedKeyRef.current = key;
      requestAnimationFrame(() => scrollAnchorIntoView(key));
      setTimeout(() => scrollAnchorIntoView(key), Platform.OS === "android" ? 180 : 120);
    },
    [scrollAnchorIntoView]
  );

  useEffect(() => {
    if (keyboardHeight > 0 && focusedKeyRef.current) {
      scrollAnchorIntoView(focusedKeyRef.current);
    }
  }, [keyboardHeight, scrollAnchorIntoView]);

  return {
    scrollRef,
    setFieldAnchorRef,
    onFieldFocus,
    onScrollOffset: (y: number) => {
      scrollOffsetRef.current = y;
    },
    scrollPaddingBottom: keyboardHeight > 0 ? keyboardHeight + 32 : 32,
  };
}

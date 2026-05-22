import { useMemo } from "react";
import type { TextInputProps } from "react-native-paper";
import { useAppTheme } from "./useAppTheme";

/** Shared outline/background colors so TextInputs follow light/dark theme. */
export function useThemedInputProps(): Pick<
  TextInputProps,
  "outlineColor" | "activeOutlineColor" | "textColor" | "style"
> {
  const { theme } = useAppTheme();
  const c = theme.colors;
  return useMemo(
    () => ({
      outlineColor: c.border,
      activeOutlineColor: c.primary,
      textColor: c.text,
      style: { backgroundColor: c.inputBg },
    }),
    [c.border, c.primary, c.text, c.inputBg]
  );
}

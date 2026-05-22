import React, { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { Text, TextInput, type TextInputProps } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";
import { useAppTheme } from "../hooks/useAppTheme";
import { useThemedInputProps } from "../hooks/useThemedInputProps";
import {
  fetchTransliterationSuggestions,
  isSuggestionLanguage,
} from "../utils/inputSuggestions";
import SuggestionsList from "./SuggestionsList";
import type { SuggestionField } from "../types/transaction";

type Props = Omit<TextInputProps, "value" | "onChangeText"> & {
  value: string;
  onChangeText: (text: string) => void;
  fieldName: SuggestionField | string;
  enableSuggestions?: boolean;
  suggestionsEnabled?: boolean;
  errorText?: string;
  recordingField: string | null;
  onToggleVoice: (field: string) => void;
};

export default function VoiceTextField({
  value,
  onChangeText,
  fieldName,
  enableSuggestions = false,
  suggestionsEnabled = false,
  errorText,
  recordingField,
  onToggleVoice,
  style,
  ...inputProps
}: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { theme } = useAppTheme();
  const c = theme.colors;
  const themedInput = useThemedInputProps();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestionFields = [
    "villageName",
    "name",
    "initial",
    "remarks",
    "othersRemark",
  ];
  const canSuggest =
    enableSuggestions &&
    suggestionsEnabled &&
    suggestionFields.includes(fieldName) &&
    isSuggestionLanguage(language);

  const loadSuggestions = async (text: string) => {
    if (!canSuggest || !text.trim()) {
      setSuggestions([]);
      setSelectedIndex(-1);
      return;
    }
    const list = await fetchTransliterationSuggestions(text, language);
    setSuggestions(list);
    setSelectedIndex(-1);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = (text: string) => {
    onChangeText(text);
    if (!canSuggest) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadSuggestions(text), 280);
  };

  const selectSuggestion = (s: string) => {
    onChangeText(s);
    setSuggestions([]);
    setSelectedIndex(-1);
  };

  const isRecording = recordingField === fieldName;

  return (
    <View style={styles.wrap}>
      <TextInput
        {...inputProps}
        {...themedInput}
        mode="outlined"
        value={value}
        onChangeText={handleChange}
        error={!!errorText}
        style={[themedInput.style, style]}
        right={
          <TextInput.Icon
            icon={isRecording ? "microphone-off" : "microphone"}
            onPress={() => onToggleVoice(fieldName)}
            forceTextInputFocus={false}
            accessibilityLabel={t("voiceInput")}
          />
        }
      />
      {errorText ? (
        <Text variant="bodySmall" style={styles.error}>
          {errorText}
        </Text>
      ) : null}
      {canSuggest && suggestions.length > 0 ? (
        <SuggestionsList
          suggestions={suggestions}
          selectedIndex={selectedIndex}
          onSelect={selectSuggestion}
        />
      ) : null}
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useAppTheme>["theme"]["colors"]) {
  return StyleSheet.create({
    wrap: { marginBottom: 4 },
    error: { color: c.danger, marginTop: 2, marginLeft: 4 },
  });
}

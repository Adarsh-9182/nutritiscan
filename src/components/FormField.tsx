import { Text, TextInput, View, StyleSheet, type TextInputProps } from "react-native";
import { usePalette } from "@/theme/context";
import { radius, spacing, type } from "@/theme";
export function FormField({ label, ...props }: TextInputProps & { label: string }) {
  const p = usePalette();
  return <View style={{ marginTop: spacing.md }}>
    <Text style={[type.meta, { color: p.text2, marginBottom: 7 }]}>{label}</Text>
    <TextInput {...props} accessibilityLabel={label} placeholderTextColor={p.text3}
      style={[styles.input, { color: p.text, backgroundColor: p.surface2, borderColor: p.border, minHeight: props.multiline ? 88 : 48, textAlignVertical: props.multiline ? "top" : "center" }, props.style]} />
  </View>;
}
const styles = StyleSheet.create({ input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 15 } });

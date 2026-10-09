import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import { usePalette } from "@/theme/context";

export function Brand({ compact = false }: { compact?: boolean }) {
  const p = usePalette();
  return <View style={styles.row}>
    <LinearGradient colors={["#c9fa63", "#6fe8b4"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.mark}>
      <Text style={styles.plus}>+</Text>
    </LinearGradient>
    {!compact && <Text style={[styles.name, { color: p.text }]}>nutriti<Text style={{ fontWeight: "400" }}>scan°</Text></Text>}
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  mark: { width: 37, height: 37, borderRadius: 12, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-7deg" }] },
  plus: { color: "#102015", fontSize: 30, fontWeight: "400", lineHeight: 33 },
  name: { fontSize: 23, fontWeight: "700", letterSpacing: -1 },
});

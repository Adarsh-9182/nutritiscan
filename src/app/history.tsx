import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { ScreenHeader } from "@/components/Screen";
import { FormField } from "@/components/FormField";
import { Button, Card, Chip, Eyebrow, Meta } from "@/components/ui";
import { localDateKey, type MealLog } from "@/domain/journal";
import { useLocalHealth } from "@/lib/localHealth";
import { spacing, type } from "@/theme";
import { usePalette } from "@/theme/context";

export default function History() {
  const p = usePalette();
  const router = useRouter();
  const { day } = useLocalSearchParams<{ day?: string }>();
  const { meals, trash, ready, restoreMeal, error: storageError, retry } = useLocalHealth();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "week" | "removed">("all");
  const [selectedDay, setSelectedDay] = useState(typeof day === "string" ? day : "");
  const [error, setError] = useState("");
  const [working, setWorking] = useState<string | null>(null);
  const entries = useMemo(() => {
    const start = new Date(); start.setHours(0,0,0,0); start.setDate(start.getDate()-6);
    return (filter === "removed" ? trash : meals).filter((meal) => {
      if (selectedDay && localDateKey(new Date(meal.loggedAt)) !== selectedDay) return false;
      if (filter === "week" && Date.parse(meal.loggedAt) < start.getTime()) return false;
      return `${meal.name} ${meal.note ?? ""}`.toLowerCase().includes(query.trim().toLowerCase());
    }).sort((a,b) => Date.parse(b.loggedAt)-Date.parse(a.loggedAt));
  }, [meals, trash, query, filter, selectedDay]);
  const restore = async (meal: MealLog) => {
    setWorking(meal.id); setError("");
    try { await restoreMeal(meal.id); }
    catch { setError("Could not restore this meal. Try again."); }
    finally { setWorking(null); }
  };
  return <View style={{ flex: 1, minHeight: 0, backgroundColor: p.bg }}>
    <ScreenHeader title="Meal history" backTo="/health" />
    <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
      <FormField label="Find a meal" value={query} onChangeText={setQuery} placeholder="Search meals or notes" autoCapitalize="none" />
      <View style={styles.chips}>{(["all", "week", "removed"] as const).map((value) => <Chip key={value} selected={filter === value} onPress={() => { setFilter(value); setSelectedDay(""); }}>{value === "all" ? "All meals" : value === "week" ? "Last 7 days" : `Removed (${trash.length})`}</Chip>)}</View>
      {!!selectedDay && <Pressable accessibilityRole="button" onPress={() => setSelectedDay("")} style={{ marginTop: spacing.md }}><Text style={{ color: p.accentText }}>{selectedDay} · Clear date filter ×</Text></Pressable>}
      <Meta style={{ marginTop: spacing.md }}>{ready ? `${entries.length} ${filter === "removed" ? "removed" : "saved"} meal${entries.length === 1 ? "" : "s"}` : "Loading journal…"}</Meta>
      {!!(error || storageError) && <Text accessibilityRole="alert" style={[type.meta, { color: p.attentionText, marginTop: spacing.sm }]}>{error || storageError}</Text>}
      {!!storageError && <Button title="Retry loading" onPress={() => void retry()} />}
    </View>
    <FlatList data={entries} keyExtractor={(meal) => meal.id} style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }} initialNumToRender={12} keyboardShouldPersistTaps="handled"
      ListEmptyComponent={<Card style={{ padding: spacing.lg }}><Eyebrow>{query || selectedDay ? "NO MATCHES" : filter === "removed" ? "NOTHING REMOVED" : "YOUR JOURNAL STARTS HERE"}</Eyebrow><Meta style={{ marginTop: spacing.sm, lineHeight: 20 }}>{query || selectedDay ? "Try another search or clear your date filter." : filter === "removed" ? "Meals you remove stay here until you clear all your app data. You can restore them at any time." : "Log your first meal to start building a record of your days."}</Meta>{filter !== "removed" && !query && !selectedDay && <Button title="Log a meal" onPress={() => router.push("/scan")} style={{ marginTop: spacing.md }} />}</Card>}
      renderItem={({ item, index }) => {
        const date = new Date(item.loggedAt);
        const showDate = index === 0 || localDateKey(date) !== localDateKey(new Date(entries[index-1].loggedAt));
        return <View>
          {showDate && <Eyebrow style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>{date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}</Eyebrow>}
          <Card style={{ padding: spacing.base, marginBottom: spacing.sm }}>
            <View style={styles.title}><Ionicons name="restaurant-outline" size={18} color={p.accentText} /><Text style={[type.body, { fontWeight: "600", color: p.text, flex: 1 }]}>{item.name}</Text><Meta>{date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</Meta></View>
            <Meta style={{ marginTop: spacing.sm }}>{item.calories === undefined ? "Calories unknown" : `${item.calories} kcal`} · {item.proteinG === undefined ? "Protein unknown" : `${item.proteinG} g protein`}</Meta>
            {(item.carbsG !== undefined || item.fatG !== undefined) && <Meta style={{ marginTop: 3 }}>{item.carbsG === undefined ? "Carbs unknown" : `${item.carbsG} g carbs`} · {item.fatG === undefined ? "Fat unknown" : `${item.fatG} g fat`}</Meta>}
            {!!item.note && <Meta style={{ marginTop: spacing.sm, lineHeight: 18 }}>{item.note}</Meta>}
            <View style={styles.chips}>{filter === "removed" ? <Chip onPress={() => { if (!working) void restore(item); }}>{working === item.id ? "Restoring…" : "Restore meal"}</Chip> : <><Chip onPress={() => router.push({ pathname: "/scan", params: { id: item.id } })}>Edit</Chip><Chip onPress={() => router.push({ pathname: "/scan", params: { copy: item.id } })}>Log again</Chip></>}</View>
          </Card>
        </View>;
      }} />
  </View>;
}
const styles = StyleSheet.create({ chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md }, title: { flexDirection: "row", alignItems: "center", gap: spacing.sm } });

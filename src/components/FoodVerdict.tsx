// ============================================================
// FOOD VERDICT
//
// "Sentence first. Evidence second. Numbers last."
//
// This is where that principle is either honoured or quietly
// abandoned, because a plate of food produces a lot of numbers
// and they are very easy to lead with.
//
// The order on screen is fixed and non-negotiable:
//   1. A SENTENCE that answers "should I eat this?"
//   2. WHY, FOR YOU — every reason tied to this user's own labs
//      or restrictions. A reason that would be true for any human
//      is not worth the line.
//   3. THE NUMBERS, small, at the bottom, for whoever wants them.
//
// The score ring is second, not first, and it is small. A big
// number at the top turns a meal into a grade, and grading
// people's dinner is how a nutrition app becomes something they
// feel judged by and stop opening.
// ============================================================

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScoreRing } from "@/components/charts";
import { ScreenBody, ScreenFooter } from "@/components/Screen";
import { Button, Card, Eyebrow, H1 } from "@/components/ui";
import type { Verdict } from "@/domain/meal";
import { radius, spacing, type } from "@/theme";
import { usePalette } from "@/theme/context";

export function FoodVerdict({
  verdict,
  preview,
  onRescan,
}: {
  verdict: Verdict;
  preview: string | null;
  onRescan: () => void;
}) {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [logged, setLogged] = useState(false);

  const numbers = [
    { label: "kcal", value: verdict.kcal, unit: "" },
    { label: "Protein", value: verdict.protein, unit: "g" },
    { label: "Fibre", value: verdict.fiber, unit: "g" },
    { label: "Iron", value: verdict.iron, unit: "mg", accent: verdict.iron >= 3 },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScreenBody extraBottom={70}>
        {/* The photo, cropped short. It confirms what was read; it
            is not the content. */}
        <View style={[styles.photo, { backgroundColor: p.surface2, marginTop: -spacing.lg, marginHorizontal: -spacing.lg }]}>
          {preview && <Image source={{ uri: preview }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
          <Pressable
            onPress={onRescan}
            style={[styles.rescan, { top: insets.top + spacing.sm }]}
            accessibilityRole="button"
          >
            <Text style={{ color: "#fff", fontSize: 12.5, fontWeight: "600" }}>Rescan</Text>
          </Pressable>
        </View>

        {/* 1 — THE SENTENCE */}
        <Text style={[type.meta, { color: p.text3, marginTop: spacing.base }]}>{verdict.title}</Text>
        <View style={styles.headlineRow}>
          <H1 style={{ flex: 1 }}>{verdict.headline}</H1>
          <ScoreRing score={verdict.score} label="How well this meal fits your goals" />
        </View>

        {/* 2 — WHY, FOR YOU */}
        <Card style={{ padding: spacing.base, marginTop: spacing.lg }}>
          <Eyebrow>Why, for you</Eyebrow>
          <View style={{ gap: 10, marginTop: spacing.md }}>
            {verdict.reasons.map((r) => (
              <View key={r.text} style={styles.reason}>
                <View
                  style={[
                    styles.reasonDot,
                    { backgroundColor: r.tone === "good" ? p.steady : p.attention },
                  ]}
                />
                <Text style={[type.body, { color: p.text2, flex: 1 }]}>{r.text}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* 3 — THE NUMBERS, last and small */}
        <View style={styles.numbers}>
          {numbers.map((n) => (
            <View
              key={n.label}
              style={[
                styles.numberTile,
                n.accent
                  ? { backgroundColor: p.accentSoft, borderColor: p.accentLine }
                  : { backgroundColor: p.surface, borderColor: p.border },
              ]}
            >
              <Text style={[type.eyebrow, { color: p.text3 }]}>{n.label}</Text>
              <Text
                style={[
                  type.num,
                  { fontSize: 17, fontWeight: "700", marginTop: 4, color: n.accent ? p.accentText : p.text },
                ]}
              >
                {n.value}
                <Text style={{ fontSize: 12, fontWeight: "500" }}>{n.unit}</Text>
              </Text>
            </View>
          ))}
        </View>

        {/* Exactly one suggested addition — a list of five swaps is
            a menu the user has to evaluate, which is the work the
            app was supposed to do. */}
        {verdict.suggestion && (
          <Card tone="attention" style={styles.suggestion}>
            <View style={[styles.suggestionIcon, { backgroundColor: p.attentionSoft }]}>
              <Ionicons name="add" size={16} color={p.attentionText} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[type.body, { color: p.text, fontWeight: "600" }]}>
                {verdict.suggestion.what}
              </Text>
              <Text style={[type.meta, { color: p.text2, marginTop: 2 }]}>{verdict.suggestion.why}</Text>
            </View>
          </Card>
        )}

        {/* What was actually on the plate, for anyone checking the
            recognition rather than the verdict. */}
        <View style={{ marginTop: spacing.xl }}>
          <Eyebrow>What I saw</Eyebrow>
          <View style={{ marginTop: spacing.sm }}>
            {verdict.items.map((i, idx) => (
              <View
                key={i.food.id}
                style={[
                  styles.itemRow,
                  idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.border },
                ]}
              >
                <Text style={[type.body, { color: p.text2, flex: 1 }]}>{i.food.name}</Text>
                <Text style={[type.meta, type.num, { color: p.text3 }]}>{i.grams} g</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={[type.meta, { color: p.text3, marginTop: spacing.lg }]}>
          Nutrition figures come from a food database, not from the photo. Portion sizes are an estimate.
        </Text>
      </ScreenBody>

      <ScreenFooter>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Button
            variant="primary"
            title={logged ? "Logged" : "Log this"}
            icon={logged ? "checkmark" : undefined}
            disabled={logged}
            onPress={() => {
              setLogged(true);
              setTimeout(() => router.replace("/health"), 650);
            }}
            style={{ flex: 1 }}
          />
          <Button
            title="Ask"
            onPress={() =>
              router.push({
                pathname: "/ask/[id]",
                params: { id: "new", q: `About the ${verdict.title} I just scanned — ` },
              })
            }
            style={{ paddingHorizontal: 22 }}
          />
        </View>
      </ScreenFooter>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { height: 180 },
  rescan: {
    position: "absolute",
    left: spacing.lg,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headlineRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.base, marginTop: 6 },
  reason: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  reasonDot: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  numbers: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  numberTile: { flex: 1, borderRadius: radius.md, borderWidth: 1, padding: 10 },
  suggestion: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: 14, marginTop: spacing.md },
  suggestionIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  itemRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 10 },
});

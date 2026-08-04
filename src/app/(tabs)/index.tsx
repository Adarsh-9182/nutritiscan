// ============================================================
// ASK · HOME
//
// The most important screen in the product, and the one that
// defines the category. It is a QUESTION FIELD, not a dashboard.
//
// What is deliberately NOT here:
//   - no calorie ring, no six-metric grid, no streak
//   - no "progress" of any kind
//   - no more than ONE pushed insight
//
// The argument: a dashboard asks the user to do the analysis.
// Six numbers on a screen is six judgements they now have to
// make about themselves before breakfast. One sentence that
// already did the analysis, plus a caret, is the whole product.
//
// The vertical order is the priority order, and it is the same
// order a good doctor uses: reassure, then raise the one thing,
// then invite the question.
// ============================================================

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useScrollPadding } from "@/components/Screen";
import { Body, Card, Chip, Display, DotLabel, Eyebrow } from "@/components/ui";
import { SEEDED_CONVERSATIONS, relativeDay } from "@/domain/conversation";
import { SUGGESTED_QUESTIONS, greeting, greetingSubtitle, pickInsight } from "@/domain/insight";
import { DEV } from "@/domain/persona";
import { RECORDS, formatRecordDate, type RecordKind } from "@/domain/records";
import { radius, spacing, type } from "@/theme";
import { usePalette } from "@/theme/context";

const RECORD_ICON: Record<RecordKind, keyof typeof Ionicons.glyphMap> = {
  lab: "document-text-outline",
  prescription: "medkit-outline",
  vaccine: "shield-checkmark-outline",
  imaging: "image-outline",
  note: "document-outline",
};

export default function AskHome() {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pad = useScrollPadding();
  const [draft, setDraft] = useState("");

  const insight = pickInsight();
  const firstName = DEV.name.split(" ")[0];

  const ask = (question: string) => {
    const q = question.trim();
    if (!q) return;
    setDraft("");
    router.push({ pathname: "/ask/[id]", params: { id: "new", q } });
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: p.bg }}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        paddingBottom: pad,
        paddingTop: insets.top + spacing.lg,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Identity bar. Small on purpose: the app does not need to
          announce itself to someone who already opened it. */}
      <View style={styles.identity}>
        <Text style={[type.eyebrow, { color: p.accentText }]}>NutritiScan</Text>
        <Pressable
          onPress={() => router.push("/you")}
          accessibilityRole="button"
          accessibilityLabel="Your profile and settings"
          style={[styles.avatar, { backgroundColor: p.surface2, borderColor: p.border }]}
        >
          <Text style={{ color: p.text2, fontSize: 12, fontWeight: "700" }}>{DEV.initials}</Text>
        </Pressable>
      </View>

      {/* The greeting. Plain, not performed. */}
      <Display>{greeting(firstName)}</Display>
      <Body style={{ marginTop: 8, maxWidth: 320 }}>{greetingSubtitle(insight ? 1 : 0)}</Body>

      {/* TODAY'S READ — the only thing pushed at the user. Renders
          nothing at all when nothing clears the bar, rather than
          filling the slot with a number they already know. */}
      {insight && (
        <Card tone="accent" style={{ marginTop: spacing.xl, padding: spacing.base }}>
          <DotLabel tone="accent">Today&apos;s read</DotLabel>
          <Text style={[type.body, { color: p.text, marginTop: 10 }]}>{insight.text}</Text>
          <Pressable
            onPress={() => router.push(insight.action.href as never)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.inlineAction, pressed && { opacity: 0.7 }]}
          >
            <Text style={{ color: p.accentText, fontSize: 13.5, fontWeight: "600" }}>
              {insight.action.label}
            </Text>
            <Ionicons name="arrow-forward" size={15} color={p.accentText} />
          </Pressable>
        </Card>
      )}

      {/* The ask field. The caret is the real interaction. */}
      <View style={[styles.askBar, { backgroundColor: p.surface, borderColor: p.border }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask anything"
          placeholderTextColor={p.text3}
          style={[styles.input, { color: p.text }]}
          returnKeyType="send"
          onSubmitEditing={() => ask(draft)}
          accessibilityLabel="Ask anything about your health"
        />
        {/* One control, never two competing primary actions: the
            button swaps from mic to send the moment there is
            something to send. */}
        <Pressable
          onPress={() => (draft.trim() ? ask(draft) : router.push("/ask/voice"))}
          accessibilityRole="button"
          accessibilityLabel={draft.trim() ? "Send question" : "Ask by voice"}
          style={({ pressed }) => [
            styles.askButton,
            { backgroundColor: p.accent, transform: [{ scale: pressed ? 0.95 : 1 }] },
          ]}
        >
          <Ionicons name={draft.trim() ? "arrow-up" : "mic"} size={19} color={p.accentInk} />
        </Pressable>
      </View>

      {/* Suggested questions. Three, chosen to show the three
          things this product does that a tracker can't. */}
      <View style={styles.chipWrap}>
        {SUGGESTED_QUESTIONS.map((q) => (
          <Chip key={q.label} tone="neutral" onPress={() => router.push(q.href as never)}>
            {q.label}
          </Chip>
        ))}
      </View>

      {/* Earlier conversations */}
      <View style={{ marginTop: spacing.xxl }}>
        <Eyebrow>Earlier</Eyebrow>
        <View style={{ marginTop: spacing.sm }}>
          {SEEDED_CONVERSATIONS.map((c, i) => (
            <Pressable
              key={c.id}
              onPress={() => router.push({ pathname: "/ask/[id]", params: { id: c.id } })}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.convoRow,
                {
                  borderBottomColor: p.border,
                  borderBottomWidth:
                    i === SEEDED_CONVERSATIONS.length - 1 ? 0 : StyleSheet.hairlineWidth,
                },
                pressed && { opacity: 0.6 },
              ]}
            >
              <Ionicons name="sparkles-outline" size={16} color={p.text3} />
              <Text style={[type.body, { color: p.text, flex: 1 }]} numberOfLines={1}>
                {c.title}
              </Text>
              <Text style={[type.meta, { color: p.text3 }]}>{relativeDay(c.updatedAt)}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Health timeline. A strip, not a screen. Its job here is to
          prove the app remembers — every row states what the app
          already did with the document, which is the difference
          between storage and an assistant. */}
      <View style={{ marginTop: spacing.xxl }}>
        <View style={styles.sectionHead}>
          <Eyebrow>Your timeline</Eyebrow>
          <Pressable onPress={() => router.push("/records")} accessibilityRole="button">
            <Text style={{ color: p.accentText, fontSize: 13, fontWeight: "600" }}>All records</Text>
          </Pressable>
        </View>

        <Card>
          {RECORDS.slice(0, 3).map((r, i) => (
            <Pressable
              key={r.id}
              onPress={() => r.href && router.push(r.href as never)}
              disabled={!r.href}
              style={({ pressed }) => [
                styles.timelineRow,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.border },
                pressed && r.href ? { backgroundColor: p.surface2 } : null,
              ]}
            >
              <View style={[styles.timelineIcon, { backgroundColor: p.surface2, borderColor: p.border }]}>
                <Ionicons name={RECORD_ICON[r.kind]} size={15} color={p.text3} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[type.body, { color: p.text, fontWeight: "600" }]} numberOfLines={1}>
                  {r.title}
                </Text>
                <Text style={[type.meta, { color: p.text3, marginTop: 2 }]} numberOfLines={1}>
                  {formatRecordDate(r.date)} · {r.did}
                </Text>
              </View>
              {r.href && <Ionicons name="chevron-forward" size={15} color={p.text3} />}
            </Pressable>
          ))}
        </Card>
      </View>

      <Text style={[type.meta, { color: p.text3, marginTop: spacing.xxl }]}>
        NutritiScan is an educational companion, not a doctor. It explains, it never diagnoses.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineAction: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.md },
  askBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 8,
    paddingLeft: spacing.base,
    marginTop: spacing.base,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 8 },
  askButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  convoRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 14 },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: spacing.sm,
  },
  timelineRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

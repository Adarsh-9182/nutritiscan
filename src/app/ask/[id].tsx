// ============================================================
// CONVERSATION
//
// "Trust comes from showing the receipts: every answer carries
// the sources it used and ends in one testable action, not a wall
// of advice."
//
// Two things here are load-bearing.
//
// 1. THE ANSWER IS NOT IN A BUBBLE. The user's question is; the
//    answer is plain prose on the page. Bubbles frame both
//    parties as equal chat participants. This is not a chat with
//    a peer — it is an explanation, and explanations are typeset,
//    not messaged.
//
// 2. EVIDENCE SITS DIRECTLY UNDER THE CLAIM, before any chart or
//    action, because provenance the reader has to scroll for is
//    provenance they won't check.
// ============================================================

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LineChart } from "@/components/charts";
import { ScreenHeader } from "@/components/Screen";
import { ThinkingDots } from "@/components/states";
import { Badge, Card, Chip } from "@/components/ui";
import { conversationById, type Turn } from "@/domain/conversation";
import { askDemoBrain } from "@/lib/brain";
import { layout, radius, spacing, type } from "@/theme";
import { usePalette } from "@/theme/context";

export default function Conversation() {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, q } = useLocalSearchParams<{ id: string; q?: string }>();

  const seeded = conversationById(String(id));
  const [turns, setTurns] = useState<Turn[]>(seeded?.turns ?? []);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const askedSeed = useRef(false);

  const send = (text: string) => {
    const question = text.trim();
    if (!question || thinking) return;
    setDraft("");
    setTurns((t) => [...t, { id: `u-${Date.now()}`, role: "user", text: question }]);
    setThinking(true);

    // The reply is composed by the on-device brain, which answers
    // only from what is actually recorded. See src/lib/brain.ts.
    setTimeout(() => {
      setTurns((t) => [...t, askDemoBrain(question)]);
      setThinking(false);
    }, 750);
  };

  // A question arriving via ?q= is asked once, on mount. The ref
  // guard matters because the effect can re-run in development
  // and the user would otherwise watch their question be asked
  // twice.
  useEffect(() => {
    if (!q || askedSeed.current) return;
    askedSeed.current = true;
    send(String(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: p.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScreenHeader
        backTo="/"
        title={seeded?.title ?? (q ? String(q).slice(0, 32) : "New question")}
        trailing={seeded?.basis ? <Text style={[type.meta, { color: p.text3 }]}>{seeded.basis}</Text> : undefined}
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: layout.tabBarHeight + insets.bottom + 90,
        }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {turns.map((turn) => (
          <TurnView key={turn.id} turn={turn} onAsk={send} onGo={(href) => router.push(href as never)} />
        ))}

        {thinking && (
          <View style={styles.thinking}>
            <ThinkingDots label="Reading your health memory" />
            <Text style={[type.meta, { color: p.text3 }]}>Reading your health memory</Text>
          </View>
        )}
      </ScrollView>

      {/* Reply */}
      <View
        style={[
          styles.replyBar,
          {
            backgroundColor: p.bg,
            borderTopColor: p.border,
            bottom: layout.tabBarHeight + insets.bottom,
          },
        ]}
      >
        <View style={[styles.replyField, { backgroundColor: p.surface, borderColor: p.border }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Reply"
            placeholderTextColor={p.text3}
            style={[styles.input, { color: p.text }]}
            returnKeyType="send"
            onSubmitEditing={() => send(draft)}
            accessibilityLabel="Reply"
          />
          <Pressable
            onPress={() => send(draft)}
            disabled={!draft.trim() || thinking}
            accessibilityRole="button"
            accessibilityLabel="Send"
            style={[
              styles.sendButton,
              { backgroundColor: draft.trim() ? p.accent : p.surface3 },
            ]}
          >
            <Ionicons name="arrow-up" size={17} color={draft.trim() ? p.accentInk : p.text3} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function TurnView({
  turn,
  onAsk,
  onGo,
}: {
  turn: Turn;
  onAsk: (q: string) => void;
  onGo: (href: string) => void;
}) {
  const p = usePalette();

  if (turn.role === "user") {
    return (
      <View style={styles.userRow}>
        <View style={[styles.userBubble, { backgroundColor: p.accentSoft }]}>
          <Text style={[type.body, { color: p.text }]}>{turn.text}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ marginTop: spacing.lg }}>
      <RichText text={turn.text} />

      {/* Evidence, directly under the claim. */}
      {turn.evidence && turn.evidence.length > 0 && (
        <View style={styles.evidenceRow}>
          {turn.evidence.map((e) => (
            <Pressable key={e.label} onPress={() => e.href && onGo(e.href)} disabled={!e.href}>
              <Badge tone={e.source === "labs" ? "evidence" : "neutral"}>{e.label}</Badge>
            </Pressable>
          ))}
        </View>
      )}

      {turn.chart && (
        <Card style={{ padding: spacing.base, marginTop: spacing.base }}>
          <LineChart
            label={turn.chart.label}
            unit={turn.chart.unit}
            points={turn.chart.points}
            markAt={turn.chart.markAt}
          />
        </Card>
      )}

      {turn.followUps && (
        <View style={styles.followRow}>
          {turn.followUps.map((f) => (
            <Chip
              key={f.label}
              tone="neutral"
              onPress={() => (f.href ? onGo(f.href) : f.ask && onAsk(f.ask))}
            >
              {f.label}
            </Chip>
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * A deliberately small renderer for the subset the brain emits:
 * **bold**, bullet lines, and blank-line paragraphs.
 *
 * No HTML, no markdown library — this text is composed from user
 * data, and building Text nodes directly means the worst case is
 * ugly type rather than injected markup.
 */
function RichText({ text }: { text: string }) {
  const p = usePalette();

  return (
    <View style={{ gap: 8 }}>
      {text.split("\n").map((line, i) => {
        if (!line.trim()) return null;
        const bullet = /^\s*[-*]\s+/.test(line);
        const body = bullet ? line.replace(/^\s*[-*]\s+/, "") : line;

        return (
          <View key={i} style={bullet ? styles.bulletRow : undefined}>
            {bullet && <Text style={{ color: p.text3, marginTop: 1 }}>•</Text>}
            <Text style={[type.body, { color: p.text2, flex: bullet ? 1 : undefined }]}>
              {body.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                part.startsWith("**") ? (
                  <Text key={j} style={{ color: p.text, fontWeight: "700" }}>
                    {part.slice(2, -2)}
                  </Text>
                ) : (
                  part
                ),
              )}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: { alignItems: "flex-end", marginTop: spacing.xl },
  userBubble: {
    maxWidth: "85%",
    borderRadius: radius.lg,
    borderBottomRightRadius: radius.xs,
    paddingHorizontal: spacing.base,
    paddingVertical: 10,
  },
  evidenceRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.md },
  followRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.base },
  bulletRow: { flexDirection: "row", gap: 8 },
  thinking: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: spacing.xl },
  replyBar: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  replyField: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 6,
    paddingLeft: spacing.base,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 8 },
  sendButton: { width: 36, height: 36, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
});

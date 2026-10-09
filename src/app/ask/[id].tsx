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
import type { Turn } from "@/domain/conversation";
import { askDemoBrain } from "@/lib/brain";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { askCompanion, CHAT_CONSENT_KEY, loadChats, saveChat } from "@/lib/companion";
import { radius, spacing, type } from "@/theme";
import { usePalette } from "@/theme/context";

export default function Conversation() {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, q } = useLocalSearchParams<{ id: string; q?: string }>();

  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const askedSeed = useRef(false);

  const [consent, setConsent] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const pending = useRef(false);
  const turnsRef = useRef<Turn[]>([]);
  const chatId = String(id);
  useEffect(() => {
    let active = true;
    Promise.all([loadChats(), AsyncStorage.getItem(CHAT_CONSENT_KEY)]).then(([chats, approved]) => {
      if (!active) return;
      const saved = chats.find((chat) => chat.id === chatId)?.turns ?? [];
      setTurns(saved); turnsRef.current = saved; setConsent(approved === "true"); setLoaded(true);
    }).catch(() => { if (active) setError("Saved conversations could not be loaded. Nothing was overwritten."); });
    return () => { active = false; request.current?.abort(); };
  }, [chatId]);
  const persist = async (next: Turn[]) => {
    await saveChat({ id: chatId, title: next.find((t) => t.role === "user")?.text.slice(0, 80) ?? "Health conversation", updatedAt: new Date().toISOString(), turns: next });
    turnsRef.current = next; setTurns(next);
  };
  const send = async (text: string) => {
    const question = text.trim();
    if (!question || pending.current || !loaded) return;
    const urgent = /(can.?t breathe|cannot breathe|chest pain|suicid|kill myself|stroke|severe bleeding|unconscious|passing out)/i.test(question);
    if (!consent && !urgent) { setDraft(question); return; }
    pending.current = true; setThinking(true); setError(""); setDraft("");
    const next: Turn[] = [...turnsRef.current, { id: `u-${Date.now()}`, role: "user", text: question }];
    const controller = new AbortController(); request.current = controller;
    const timer = setTimeout(() => controller.abort(), 65000);
    try {
      await persist(next);
      const answer = urgent ? askDemoBrain(question) : await askCompanion(next, controller.signal);
      if (!controller.signal.aborted) await persist([...next, answer]);
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "The answer could not be received. Please try again.");
      else setError("The request timed out. Please try again.");
    } finally { clearTimeout(timer); pending.current = false; setThinking(false); }
  };
  const approve = async () => {
    try { await AsyncStorage.setItem(CHAT_CONSENT_KEY, "true"); setConsent(true); }
    catch { setError("Your choice could not be saved. Please retry."); }
  };
  useEffect(() => {
    if (!q || !loaded || !consent || askedSeed.current || turnsRef.current.length) return;
    askedSeed.current = true; void send(String(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, loaded, consent]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: p.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScreenHeader
        backTo="/"
        title={q ? String(q).slice(0, 32) : "Health question"}
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: 110,
        }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!consent && <Card style={{ padding: 18, marginTop: 20 }}>
          <Text style={[type.h3, { color: p.text }]}>Choose before you chat</Text>
          <Text style={[type.body, { color: p.text2, marginTop: 8 }]}>Your messages will go to NutritiScan’s server and its configured AI provider. Local profile and journal entries are not sent. When signed in to a shared account, the record tools use your confirmed shared records. Only share information you are comfortable processing this way. For adults 18+.</Text>
          <Pressable onPress={approve} accessibilityRole="button" style={{ padding: 13, borderRadius: 99, backgroundColor: p.accent, alignItems: "center", marginTop: 14 }}><Text style={{ color: p.accentInk, fontWeight: "700" }}>I’m 18+ · Allow AI chat</Text></Pressable>
          <Pressable onPress={() => router.push("/you")} accessibilityRole="button" style={{ padding: 12 }}><Text style={{ color: p.text2, textAlign: "center" }}>Keep using my local journal</Text></Pressable>
        </Card>}
        {error ? <Text accessibilityRole="alert" style={[type.meta, { color: p.attentionText, marginTop: 14 }]}>{error}</Text> : null}
        {turns.map((turn) => (
          <TurnView key={turn.id} turn={turn} onAsk={send} onGo={(href) => router.push(href as never)} />
        ))}

        {thinking && (
          <View style={styles.thinking}>
            <ThinkingDots label="Reviewing your question" />
            <Text style={[type.meta, { color: p.text3 }]}>Reviewing your question</Text>
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
            bottom: insets.bottom,
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
            disabled={!draft.trim() || thinking || !loaded}
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

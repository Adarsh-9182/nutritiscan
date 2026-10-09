import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Brand } from "@/components/Brand";
import { Card, Eyebrow, Meta } from "@/components/ui";
import { loadChats, type SavedChat } from "@/lib/companion";
import { useLocalHealth } from "@/lib/localHealth";
import { radius, spacing, type } from "@/theme";
import { usePalette } from "@/theme/context";

const TOOLS = [
  { title: "Reports", detail: "Upload & review", icon: "document-text-outline", href: "/cloud-health" },
  { title: "Health history", detail: "Your saved timeline", icon: "pulse-outline", href: "/records" },
  { title: "Nutrition", detail: "Your daily journal", icon: "leaf-outline", href: "/health" },
  { title: "Doctor summary", detail: "Prepare for a visit", icon: "medical-outline", href: "/doctor-summary" },
] as const;

export default function AskHome() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useLocalHealth();
  const [draft, setDraft] = useState("");
  const [chats, setChats] = useState<SavedChat[]>([]);
  const [error, setError] = useState("");
  useFocusEffect(useCallback(() => { let active = true; loadChats().then((items) => { if (active) setChats(items); }).catch(() => { if (active) setError("Saved conversations could not be loaded."); }); return () => { active = false; }; }, []));
  const ask = (question?: string) => router.push({ pathname: "/ask/[id]", params: { id: `chat-${Date.now()}`, ...(question?.trim() ? { q: question.trim() } : {}) } });

  return <ScrollView style={{ flex: 1, height: 0, backgroundColor: p.bg }} contentContainerStyle={{ paddingHorizontal: 22, paddingTop: insets.top + 22, paddingBottom: 32 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <View style={styles.identity}>
      <Brand />
      <Pressable accessibilityRole="button" accessibilityLabel="Your profile" onPress={() => router.push("/you")} style={[styles.avatar, { borderColor: p.border, backgroundColor: p.surface }]}><Ionicons name="person-outline" size={18} color={p.text2} /></Pressable>
    </View>
    <View style={[styles.badge, { borderColor: p.accentLine, backgroundColor: p.accentSoft }]}><View style={[styles.dot, { backgroundColor: p.accent }]} /><Text style={{ color: p.accentText, fontSize: 11 }}>YOUR PERSONAL HEALTH COMPANION</Text></View>
    <Text style={[styles.headline, { color: p.text }]}>{profile?.name ? `${profile.name.split(" ")[0]}, your health.` : "Your health."}{"\n"}A clearer picture.</Text>
    <Text style={[styles.serif, { color: p.accentText }]}>One conversation away.</Text>
    <Text style={[type.body, { color: p.text2, marginTop: 16, maxWidth: 340 }]}>Ask a question, understand your records, and keep the next step in sight.</Text>
    <Card style={{ marginTop: 28, padding: 16 }}>
      <TextInput value={draft} onChangeText={setDraft} multiline placeholder="What would you like to understand?" placeholderTextColor={p.text3} style={{ color: p.text, fontSize: 16, lineHeight: 24, minHeight: 64, textAlignVertical: "top" }} accessibilityLabel="Your health question" maxLength={6000} />
      <View style={styles.composerActions}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Upload a health report" onPress={() => router.push("/cloud-health" as never)} style={[styles.iconButton, { backgroundColor: p.surface2 }]}><Ionicons name="attach" size={20} color={p.text2} /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Voice question" onPress={() => router.push("/ask/voice")} style={[styles.iconButton, { backgroundColor: p.surface2 }]}><Ionicons name="mic-outline" size={18} color={p.text2} /></Pressable>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Start a conversation" onPress={() => ask(draft)}>
          <LinearGradient colors={["#c9fa63", "#6fe8b4"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.askButton}><Text style={{ fontWeight: "700", color: "#102015", fontSize: 13 }}>Let’s talk</Text><Ionicons name="arrow-forward" size={17} color="#102015" /></LinearGradient>
        </Pressable>
      </View>
    </Card>
    <View style={{ flexDirection: "row", gap: 6, alignItems: "center", marginTop: 12 }}><Ionicons name="shield-checkmark-outline" size={13} color={p.steadyText} /><Meta style={{ fontSize: 11 }}>You choose what to share. Educational support.</Meta></View>
    <Eyebrow style={{ marginTop: 32, marginBottom: 14 }}>A little more clarity</Eyebrow>
    <View style={styles.grid}>{TOOLS.map((tool) => <Pressable key={tool.title} accessibilityRole="button" onPress={() => router.push(tool.href as never)} style={[styles.tool, { backgroundColor: p.surface, borderColor: p.border }]}>
      <Ionicons name={tool.icon} size={22} color={p.steadyText} />
      <Text style={[type.h3, { color: p.text, marginTop: 17, fontSize: 14 }]}>{tool.title}</Text><Meta style={{ marginTop: 3, fontSize: 11 }}>{tool.detail}</Meta>
    </Pressable>)}</View>
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 32, marginBottom: 14 }}><Eyebrow>Recent conversations</Eyebrow><Pressable accessibilityRole="button" onPress={() => ask()}><Text style={{ color: p.accentText, fontSize: 12 }}>+ New</Text></Pressable></View>
    {chats.length === 0 ? <Card style={{ padding: 18 }}><Meta>Your conversations will appear here. Start with whatever is on your mind.</Meta></Card> : chats.slice(0, 4).map((chat) => <Pressable key={chat.id} accessibilityRole="button" onPress={() => router.push({ pathname: "/ask/[id]", params: { id: chat.id } })} style={[styles.chat, { borderBottomColor: p.border }]}><Ionicons name="chatbubble-outline" color={p.text3} size={16} /><Text style={{ color: p.text2, flex: 1, fontSize: 14 }} numberOfLines={1}>{chat.title}</Text><Ionicons name="arrow-forward" size={15} color={p.text3} /></Pressable>)}
    {error ? <Meta style={{ color: p.attentionText, marginTop: 12 }}>{error}</Meta> : null}
  </ScrollView>;
}
const styles = StyleSheet.create({
  identity: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 36 },
  avatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  badge: { flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "flex-start", borderWidth: 1, borderRadius: 99, paddingHorizontal: 11, paddingVertical: 7 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  headline: { fontSize: 38, fontWeight: "600", lineHeight: 43, letterSpacing: -1.6, marginTop: 23 },
  serif: { fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", fontStyle: "italic", fontSize: 30, lineHeight: 38, marginTop: 5 },
  composerActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  askButton: { flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 18, height: 42, borderRadius: 99 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tool: { width: "48%", flexGrow: 1, borderWidth: 1, borderRadius: radius.lg, padding: 17 },
  chat: { flexDirection: "row", gap: spacing.md, alignItems: "center", paddingVertical: 16, borderBottomWidth: 1 },
});

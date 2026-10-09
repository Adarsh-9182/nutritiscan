import AsyncStorage from "@react-native-async-storage/async-storage";
import { getHealthToken, healthRequest } from "./healthApi";
import type { Turn } from "@/domain/conversation";

import { WEB_ORIGIN } from "./serviceOrigin";
export { WEB_ORIGIN } from "./serviceOrigin";
export const CHAT_CONSENT_KEY = "nutritiscan.chat-consent.v1";
export type SavedChat = { id: string; title: string; updatedAt: string; turns: Turn[] };
const CHAT_KEY = "nutritiscan.conversations.v1";
let queue: Promise<unknown> = Promise.resolve();

export async function loadChats(): Promise<SavedChat[]> {
  await queue;
  const raw = await AsyncStorage.getItem(CHAT_KEY);
  if (!raw) return [];
  const chats: unknown = JSON.parse(raw);
  if (!Array.isArray(chats) || !chats.every((c) => c && typeof c.id === "string" && typeof c.title === "string" && Array.isArray(c.turns))) throw new Error("Saved conversations could not be read.");
  return chats as SavedChat[];
}
export function saveChat(chat: SavedChat) {
  const action = queue.then(async () => {
    const raw = await AsyncStorage.getItem(CHAT_KEY);
    const chats: SavedChat[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(chats)) throw new Error("Saved conversations could not be read.");
    await AsyncStorage.setItem(CHAT_KEY, JSON.stringify([chat, ...chats.filter((c) => c.id !== chat.id)].slice(0, 100)));
  });
  queue = action.catch(() => {});
  return action;
}
export async function clearChats() { await queue; await AsyncStorage.removeItem(CHAT_KEY); await AsyncStorage.removeItem(CHAT_CONSENT_KEY); }

export async function askCompanion(turns: Turn[], signal: AbortSignal): Promise<Turn> {
  if (await AsyncStorage.getItem(CHAT_CONSENT_KEY) !== "true") throw new Error("Chat consent was revoked. Open a new conversation to choose again.");
  const remoteId = [...turns].reverse().find((turn) => turn.sharedConversationId)?.sharedConversationId;
  const token = await getHealthToken();
  if (token) {
    const result = await healthRequest("chat", { method: "POST", signal, body: JSON.stringify({ message: turns[turns.length - 1].text, conversation_id: remoteId }) });
    return { id: `a-${Date.now()}`, role: "assistant", text: `${result.text}\n\n${result.uncertainty}`, sharedConversationId: result.conversation_id,
      evidence: result.citations?.map((c: { label: string; date: string }) => ({ label: `${c.label} · ${c.date || "Date not recorded"}`, source: "labs", href: "/cloud-health" })),
      chart: result.chart ? { label: result.chart.label, unit: result.chart.unit, points: result.chart.points.map((p: { date: string; value: number }) => ({ t: p.date, v: p.value })) } : undefined };
  }
  if (remoteId) throw new Error("Sign in to your shared health account again to continue this records conversation.");
  const response = await fetch(`${WEB_ORIGIN}/api/mobile/chat`, {
    method: "POST", signal, headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ consent: true, messages: turns.slice(-40).map((turn) => ({ id: turn.id, role: turn.role, parts: [{ type: "text", text: turn.text }] })) }),
  });
  if (!response.ok) throw new Error(response.status === 429 ? "Too many messages. Wait a moment and try again." : "The health chat is unavailable. Your question is saved; please try again.");
  const result = await response.json();
  if (typeof result.text !== "string" || !result.text.trim()) throw new Error("No complete answer was received. Please try again.");
  return { id: `a-${Date.now()}`, role: "assistant", text: result.mode === "demo" ? `${result.text}\n\n_Demonstration answer: the live AI service is unavailable. No personal medical assessment was made._` : result.text };
}

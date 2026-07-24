import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Screen } from "@/components/Screen";
import { streamChat } from "@/lib/ai";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { colors, radius, spacing, type } from "@/theme";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "What should I eat today?",
  "Plan a high-protein dinner",
  "How can I sleep better?",
  "Am I drinking enough water?",
];

export default function Chat() {
  const { profile } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  // Resume the most recent conversation on mount
  useEffect(() => {
    (async () => {
      const { data: conversation } = await supabase
        .from("conversations")
        .select("id")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!conversation) return;
      const { data: rows } = await supabase
        .from("messages")
        .select("id, role, content")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true });
      if (rows?.length) {
        setConversationId(conversation.id);
        setMessages(rows as ChatMessage[]);
      }
    })();
  }, []);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  function newConversation() {
    if (streaming) return;
    setConversationId(null);
    setMessages([]);
  }

  function send(text: string) {
    const message = text.trim();
    if (!message || streaming) return;

    const userMsg: ChatMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content: message,
    };
    const assistantId = `local-${Date.now()}-assistant`;
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setInput("");
    setStreaming(true);
    scrollToEnd();

    const appendToAssistant = (text: string, replace = false) =>
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: replace ? text : m.content + text }
            : m,
        ),
      );

    streamChat(message, conversationId, {
      onMeta: (id) => setConversationId(id),
      onText: (delta) => {
        appendToAssistant(delta);
        scrollToEnd();
      },
      onDone: () => {
        setStreaming(false);
        scrollToEnd();
      },
      onError: (msg) => {
        setStreaming(false);
        appendToAssistant(
          `I couldn't respond just now (${msg}). Please try again.`,
          true,
        );
      },
    });
  }

  const empty = messages.length === 0;

  return (
    <Screen padded={false} keyboardAvoiding>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Your AI</Text>
          <Text style={styles.headerSubtitle}>
            Nutritionist · Coach · Wellness partner
          </Text>
        </View>
        <Pressable
          onPress={newConversation}
          hitSlop={8}
          style={styles.newChatButton}
        >
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {empty ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="sparkles" size={28} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>
            {profile?.display_name
              ? `Hi ${profile.display_name}.`
              : "Hi there."}
          </Text>
          <Text style={styles.emptyBody}>
            Ask me anything about food, training, sleep, or your goals. I
            remember what matters, so you never have to repeat yourself.
          </Text>
          <View style={styles.suggestions}>
            {SUGGESTIONS.map((s) => (
              <Pressable
                key={s}
                style={styles.suggestion}
                onPress={() => send(s)}
              >
                <Text style={styles.suggestionText}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={scrollToEnd}
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.role === "user" ? styles.bubbleUser : styles.bubbleAssistant,
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  item.role === "user" && { color: colors.textInverse },
                ]}
              >
                {item.content || "…"}
              </Text>
            </View>
          )}
        />
      )}

      {/* Composer */}
      <View style={styles.composer}>
        <TextInput
          style={styles.composerInput}
          value={input}
          onChangeText={setInput}
          placeholder="Ask anything…"
          placeholderTextColor={colors.textTertiary}
          multiline
          editable={!streaming}
        />
        <Pressable
          onPress={() => send(input)}
          disabled={!input.trim() || streaming}
          style={[
            styles.sendButton,
            (!input.trim() || streaming) && { opacity: 0.4 },
          ]}
        >
          <Ionicons name="arrow-up" size={20} color={colors.textInverse} />
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerTitle: {
    ...type.heading,
    color: colors.text,
  },
  headerSubtitle: {
    ...type.caption,
    color: colors.textTertiary,
  },
  newChatButton: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    ...type.title,
    color: colors.text,
  },
  emptyBody: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  suggestions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  suggestion: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  suggestionText: {
    ...type.captionMedium,
    color: colors.text,
  },
  messageList: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  bubble: {
    maxWidth: "85%",
    borderRadius: radius.xl,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  bubbleUser: {
    alignSelf: "flex-end",
    backgroundColor: colors.bubbleUser,
    borderBottomRightRadius: radius.sm,
  },
  bubbleAssistant: {
    alignSelf: "flex-start",
    backgroundColor: colors.bubbleAssistant,
    borderBottomLeftRadius: radius.sm,
  },
  bubbleText: {
    ...type.body,
    color: colors.text,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  composerInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 12,
    ...type.body,
    color: colors.text,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});

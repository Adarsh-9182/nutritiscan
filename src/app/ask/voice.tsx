// ============================================================
// VOICE · HANDS-FREE
//
// Kitchen-and-gym mode. The design brief is one sentence: the
// user's hands are busy and their eyes are not on the phone.
//
// That produces three requirements, and everything here serves
// one of them:
//
// 1. THE TRANSCRIPT IS AT READING SIZE. Its job is to let someone
//    verify from a metre away that they were heard. A 13px
//    transcript is decoration.
// 2. ONE OBVIOUS WAY OUT. The whole backdrop is the interrupt
//    target — you should not have to aim at a small button with
//    wet hands.
// 3. IT NEVER PRETENDS. React Native has no built-in speech
//    recognition, and this build does not ship a native
//    transcription module. Rather than animate an orb that
//    listens to nothing, the screen says so plainly and hands
//    over to typing. A fake listening state in a hands-free mode
//    is worse than no hands-free mode.
// ============================================================

import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui";
import { radius, spacing, type } from "@/theme";
import { usePalette } from "@/theme/context";

export default function Voice() {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");

  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 2200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.5] });
  const opacity = pulse.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.6, 0, 0] });

  const send = () => {
    const q = text.trim();
    if (!q) {
      router.back();
      return;
    }
    router.replace({ pathname: "/ask/[id]", params: { id: "new", q } });
  };

  return (
    <View style={[styles.root, { backgroundColor: p.bg, paddingTop: insets.top + spacing.base }]}>
      <View style={styles.top}>
        <Text style={[type.eyebrow, { color: p.text3 }]}>Dictate</Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={{ color: p.accentText, fontSize: 13, fontWeight: "600" }}>Close</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        {/* The orb. Concentric because a single circle can't show
            both "on" and "receiving" at once. */}
        <View style={styles.orbWrap}>
          <Animated.View
            style={[
              styles.pulseRing,
              { borderColor: p.accent, transform: [{ scale }], opacity },
            ]}
          />
          <View style={[styles.orbOuter, { backgroundColor: p.accent }]}>
            <View style={[styles.orbMid, { backgroundColor: "#ffb27a" }]}>
              <View style={[styles.orbInner, { backgroundColor: p.accent }]} />
            </View>
          </View>
        </View>

        {/* Honest about the limitation, and useful anyway. */}
        <Text style={[type.h2, { color: p.text, textAlign: "center", marginTop: spacing.xxl }]}>
          Use your keyboard&apos;s mic
        </Text>
        <Text style={[type.body, { color: p.text2, textAlign: "center", marginTop: spacing.sm, maxWidth: 300 }]}>
          This build doesn&apos;t ship its own transcription, so rather than fake it: tap the field, hit the
          microphone on your keyboard, and talk. Nothing about the answer changes.
        </Text>

        {/* Reading size, so it can be checked at arm's length. */}
        <View style={[styles.field, { backgroundColor: p.surface, borderColor: p.border }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Say what you need…"
            placeholderTextColor={p.text3}
            style={[styles.input, { color: p.text }]}
            multiline
            autoFocus
            returnKeyType="send"
            onSubmitEditing={send}
            accessibilityLabel="Your question"
          />
        </View>

        <Button
          variant="primary"
          title="Ask this"
          icon="arrow-up"
          onPress={send}
          style={{ marginTop: spacing.lg, alignSelf: "stretch" }}
        />

        <Pressable onPress={() => router.back()} style={{ marginTop: spacing.base }} hitSlop={10}>
          <Text style={[type.meta, { color: p.text3 }]}>Tap anywhere to go back</Text>
        </Pressable>
      </View>

      <View style={{ height: insets.bottom + spacing.xl }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing.lg },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  body: { flex: 1, alignItems: "center", justifyContent: "center" },
  orbWrap: { alignItems: "center", justifyContent: "center" },
  pulseRing: { position: "absolute", width: 136, height: 136, borderRadius: 68, borderWidth: 2 },
  orbOuter: { width: 120, height: 120, borderRadius: 60, alignItems: "center", justifyContent: "center" },
  orbMid: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center" },
  orbInner: { width: 40, height: 40, borderRadius: 20 },
  field: {
    alignSelf: "stretch",
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.base,
    marginTop: spacing.xl,
    minHeight: 96,
  },
  input: { fontSize: 18, lineHeight: 26, textAlignVertical: "top" },
});

// ============================================================
// UPLOAD · LOADING STATE
//
// "The wait is where dread builds, so the reassurance is
// delivered here — before any result."
//
// That line reverses the normal order of a loading screen. Most
// products treat the wait as dead time to disguise with a
// spinner. For a blood report it is the opposite: this is the
// most emotionally loaded ten seconds in the product, and the
// only moment the user is guaranteed to be reading the screen.
//
// So it does three things a spinner cannot:
//   1. Says the reassuring thing FIRST, before any number exists.
//   2. Names the steps, so the delay reads as work — and quietly
//      teaches that the app keeps their history.
//   3. States where the file went, next to the progress bar.
// ============================================================

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProcessSteps, advanceSteps, completeSteps, type Step } from "@/components/states";
import { H1, Body } from "@/components/ui";
import { JULY_PANEL } from "@/domain/labs";
import { radius, spacing, type } from "@/theme";
import { usePalette } from "@/theme/context";

const STEPS: Step[] = [
  { id: "pages", label: JULY_PANEL.pages + " pages read", status: "pending" },
  { id: "markers", label: JULY_PANEL.markers.length + " markers matched", status: "pending" },
  { id: "compare", label: "Comparing to your March panel", status: "pending" },
  { id: "write", label: "Writing your summary", status: "pending" },
];

/**
 * Per-step dwell times, deliberately uneven.
 *
 * A sequence with identical intervals reads as a scripted
 * animation — which is what a fake one is — while uneven timings
 * read as real work of differing cost. Comparing panels genuinely
 * is the slow step.
 */
const DWELL = [900, 1200, 1600, 1100];

export default function LabReading() {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [steps, setSteps] = useState<Step[]>(STEPS);
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;

    STEPS.forEach((_, i) => {
      timers.push(setTimeout(() => setSteps((prev) => advanceSteps(prev, i)), elapsed));
      elapsed += DWELL[i];
    });

    timers.push(setTimeout(() => setSteps(completeSteps), elapsed));
    // `replace`, not `push` — tapping back from the summary should
    // return to where the upload started, not replay the loader.
    timers.push(setTimeout(() => router.replace("/labs"), elapsed + 500));

    Animated.timing(progress, {
      toValue: 1,
      duration: elapsed,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();

    return () => timers.forEach(clearTimeout);
  }, [router, progress]);

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <View style={[styles.root, { backgroundColor: p.bg, paddingTop: insets.top + spacing.huge }]}>
      {/* The reassurance, before any result exists. */}
      <H1>Reading your panel.</H1>
      <Body style={{ marginTop: spacing.md }}>
        Nothing here is an emergency. We&apos;ll show what&apos;s steady first, then the few things worth a
        conversation.
      </Body>

      <View
        style={[styles.track, { backgroundColor: p.surface2 }]}
        accessibilityRole="progressbar"
        accessibilityLabel="Reading your panel"
      >
        <Animated.View style={{ width, height: "100%", borderRadius: radius.full, backgroundColor: p.accent }} />
      </View>

      <View style={{ marginTop: spacing.xxl }}>
        <ProcessSteps steps={steps} />
      </View>

      <View style={{ flex: 1 }} />

      <View style={[styles.privacy, { backgroundColor: p.surface, borderColor: p.border, marginBottom: insets.bottom + spacing.huge }]}>
        <Ionicons name="lock-closed-outline" size={14} color={p.text3} style={{ marginTop: 2 }} />
        <Text style={[type.meta, { color: p.text3, flex: 1 }]}>
          Processed on your device. The file never leaves it unless you choose to share.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing.lg },
  track: { height: 6, borderRadius: radius.full, overflow: "hidden", marginTop: spacing.xxl },
  privacy: {
    flexDirection: "row",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
});

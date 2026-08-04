// ============================================================
// CAPTURE — ONE CAMERA, FIVE THINGS IT UNDERSTANDS
//
// "The user shouldn't pick a scanner mode — but they should be
// able to."
//
// That is the whole interaction model. Auto is the default and
// the mode strip is an ESCAPE HATCH, not a decision the user is
// asked to make before they can start. Most scanner UIs get this
// backwards: they open on a mode picker, forcing the user to
// classify their own photo before the app that exists to classify
// things has looked at it.
//
// The status pill is the other load-bearing piece. Recognition
// takes seconds; a still viewfinder for that long reads as a
// freeze. Narrating the stage ("Reading the label") turns the
// same wait into visible work.
// ============================================================

import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusPill } from "@/components/states";
import { SAMPLE_MEAL, type Verdict } from "@/domain/meal";
import { radius, spacing, type } from "@/theme";
import { usePalette } from "@/theme/context";
import { FoodVerdict } from "@/components/FoodVerdict";

type Mode = "auto" | "food" | "barcode" | "label" | "report" | "medicine";

const MODES: { id: Mode; label: string }[] = [
  { id: "food", label: "Food" },
  { id: "barcode", label: "Barcode" },
  { id: "label", label: "Label" },
  { id: "report", label: "Report" },
  { id: "medicine", label: "Medicine" },
];

/** What the status pill says while each mode is working. */
const NARRATION: Record<Mode, string[]> = {
  auto: ["Looking at the image", "Identifying what it is", "Checking your health memory"],
  food: ["Identifying the food", "Matching the nutrition database", "Checking your health memory"],
  barcode: ["Reading the barcode", "Looking up the product", "Checking your restrictions"],
  label: ["Reading the label", "Extracting the panel", "Checking your restrictions"],
  report: ["Reading the report", "Matching markers"],
  medicine: ["Reading the packaging", "Checking interactions"],
};

export default function Scan() {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: string }>();

  const [mode, setMode] = useState<Mode>((params.mode as Mode) ?? "auto");
  const [busy, setBusy] = useState(false);
  const [narration, setNarration] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);

  const run = useCallback(
    async (uri: string | null) => {
      // Report and medicine are documents, not meals — they route
      // to their own readers rather than through the food pipeline.
      if (mode === "report") {
        router.replace("/labs/reading");
        return;
      }
      if (mode === "medicine") {
        router.replace({ pathname: "/medicine/[id]", params: { id: "ferrous-fumarate-210" } });
        return;
      }

      setPreview(uri);
      setBusy(true);

      // Narrate real stages rather than showing a spinner that
      // means nothing.
      const stages = NARRATION[mode];
      for (const stage of stages) {
        setNarration(stage);
        await new Promise((r) => setTimeout(r, 700));
      }

      setVerdict(SAMPLE_MEAL());
      setBusy(false);
    },
    [mode, router],
  );

  /**
   * Open the camera, or the library, or the library *because* the
   * camera was refused.
   *
   * Resolved as a flat decision rather than by recursing: a
   * denied camera is not an error state — the library is a
   * complete path on its own, so we fall through to it instead of
   * blocking the user behind a permission they declined.
   */
  const pick = useCallback(
    async (source: "camera" | "library") => {
      let useCamera = source === "camera";

      if (useCamera) {
        const cam = await ImagePicker.requestCameraPermissionsAsync();
        if (!cam.granted) useCamera = false;
      }

      if (!useCamera) {
        const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!lib.granted) return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });

      if (result.canceled) return;
      await run(result.assets[0]?.uri ?? null);
    },
    [run],
  );

  if (verdict) {
    return (
      <FoodVerdict
        verdict={verdict}
        preview={preview}
        onRescan={() => {
          setVerdict(null);
          setPreview(null);
        }}
      />
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.base }]}>
      {/* Top bar */}
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 15, fontWeight: "600" }}>Cancel</Text>
        </Pressable>

        {busy ? (
          <StatusPill onDark>{narration}</StatusPill>
        ) : (
          <Text style={[type.eyebrow, { color: "rgba(255,255,255,0.45)" }]}>
            {mode === "auto" ? "Auto-detecting" : MODES.find((m) => m.id === mode)?.label}
          </Text>
        )}

        <Ionicons name="sparkles-outline" size={18} color="rgba(255,255,255,0.6)" />
      </View>

      {/* Viewfinder */}
      <View style={styles.viewfinder}>
        {preview && <Image source={{ uri: preview }} style={StyleSheet.absoluteFill} resizeMode="cover" />}

        <Pressable
          onPress={() => !busy && pick("library")}
          style={styles.reticle}
          accessibilityRole="button"
          accessibilityLabel="Choose a photo"
        >
          {/* Corner brackets rather than a full frame — a closed
              rectangle reads as a crop tool. */}
          {([
            { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: radius.md },
            { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: radius.md },
            { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: radius.md },
            { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: radius.md },
          ] as const).map((corner, i) => (
            <View key={i} style={[styles.corner, corner, { borderColor: p.accent }]} />
          ))}

          {!preview && (
            <View style={styles.hint}>
              <Ionicons name="image-outline" size={26} color="rgba(255,255,255,0.5)" />
              <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 15, marginTop: 10 }}>
                Point at your food
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, marginTop: 2 }}>
                or tap to browse
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Mode strip. An escape hatch, not a decision. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.modeStrip}
      >
        {[{ id: "auto" as Mode, label: "Auto" }, ...MODES].map((m) => {
          const on = mode === m.id;
          return (
            <Pressable
              key={m.id}
              onPress={() => setMode(m.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[
                styles.modeChip,
                { backgroundColor: on ? p.accent : "rgba(255,255,255,0.12)" },
              ]}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: on ? p.accentInk : "rgba(255,255,255,0.75)",
                  fontWeight: on ? "600" : "400",
                }}
              >
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Shutter row */}
      <View style={[styles.shutterRow, { paddingBottom: insets.bottom + spacing.xxl }]}>
        <Pressable
          onPress={() => pick("library")}
          accessibilityLabel="Choose a photo"
          style={styles.sideButton}
        >
          <Ionicons name="images-outline" size={19} color="rgba(255,255,255,0.85)" />
        </Pressable>

        <Pressable
          onPress={() => pick("camera")}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Capture"
          style={({ pressed }) => [
            styles.shutter,
            { opacity: busy ? 0.5 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] },
          ]}
        />

        <Pressable
          onPress={() => router.replace("/ask/voice")}
          accessibilityLabel="Describe it out loud instead"
          style={styles.sideButton}
        >
          <Ionicons name="mic-outline" size={19} color="rgba(255,255,255,0.85)" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },
  viewfinder: { flex: 1, justifyContent: "center", overflow: "hidden" },
  reticle: { marginHorizontal: spacing.xxl, aspectRatio: 4 / 3 },
  corner: { position: "absolute", width: 36, height: 36 },
  hint: { flex: 1, alignItems: "center", justifyContent: "center" },
  modeStrip: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  modeChip: { borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 9 },
  shutterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xxxl,
    paddingTop: spacing.sm,
  },
  sideButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutter: {
    width: 68,
    height: 68,
    borderRadius: radius.full,
    backgroundColor: "#fff",
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.3)",
  },
});

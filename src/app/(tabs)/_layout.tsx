// ============================================================
// TAB BAR
//
// Three destinations and one action. That count is the product
// argument, not a layout constraint:
//
//   Ask    — where you go with a question (the default)
//   Health — where you go to look at yourself over time
//   You    — where your records and your settings live
//
// Everything else is reached by ASKING or by SCANNING, which is
// why Scan is a raised action button rather than a fourth tab. A
// tab implies a place you browse; the camera is something you do.
//
// Plan, Records, Labs and Medicine deliberately have no tab —
// they are destinations you arrive at from an answer. That is
// what keeps the home screen a question field rather than a menu.
//
// Built on the SDK 57 HEADLESS tabs API (`expo-router/ui`)
// rather than the drop-in `<Tabs>` navigator, which is deprecated
// in 57 and cannot render a button that breaks out of the bar's
// bounds. TabSlot renders the active screen; TabList is our own
// markup, so the raised scan button is just a positioned View.
//
// LAYOUT: four equal slots — Ask, [scan], Health, You. The scan
// button takes the second slot rather than the true centre,
// which is what gives all four targets even spacing.
// ============================================================

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { TabList, TabSlot, TabTrigger, Tabs } from "expo-router/ui";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { elevation, layout, radius } from "@/theme";
import { usePalette } from "@/theme/context";

type TabDef = {
  name: string;
  href: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
};

const TABS: TabDef[] = [
  { name: "index", href: "/", label: "Ask", icon: "chatbubble-outline", iconActive: "chatbubble" },
  { name: "health", href: "/health", label: "Health", icon: "pulse-outline", iconActive: "pulse" },
  { name: "you", href: "/you", label: "You", icon: "person-outline", iconActive: "person" },
];

export default function TabsLayout() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <Tabs style={{ flex: 1, backgroundColor: p.bg }}>
      {/*
        TabSlot has to be height-constrained, not just present.
        Left unwrapped it sizes to its content, so a screen with a
        long ScrollView grows past the viewport and pushes the bar
        below the fold — the tabs are still in the tree and still
        focusable, they are simply off-screen, which is the worst
        version of the bug because nothing errors.
      */}
      <View style={styles.slotFill}>
        <TabSlot />
      </View>

      {/*
        `asChild` makes TabList clone the single View below rather
        than wrapping it, so the bar's styling lives on that child.

        TabList itself gets NO style prop: with `asChild` it
        forwards what it is given straight onto the child, and
        expo-router rejects an array there ("pass a flattened
        style"). Styling the child directly sidesteps the whole
        question — and the scan button, which overflows the bar
        upward, needs the child to be the positioning context
        anyway.
      */}
      <TabList asChild>
        {/*
          StyleSheet.flatten is required, not stylistic. `asChild`
          makes expo-router clone this View through its Slot, and
          the Slot refuses an ARRAY style prop on the child —
          it throws "pass a flattened style" at runtime, which a
          typecheck does not catch. Flattening to one object here
          is the fix.
        */}
        <View
          style={StyleSheet.flatten([
            styles.bar,
            {
              backgroundColor: p.bgElevated,
              borderTopColor: p.border,
              height: layout.tabBarHeight + insets.bottom,
              paddingBottom: insets.bottom,
            },
          ])}
        >
          <TabTrigger name="index" href="/" asChild>
            <TabItem tab={TABS[0]} />
          </TabTrigger>

          {/* Slot 2 — the raised scan action. Not a TabTrigger:
              the scanner is a modal route outside the tab set, so
              it pushes rather than switching tabs. */}
          <View style={styles.slot}>
            <Pressable
              onPress={() => router.push("/scan")}
              accessibilityRole="button"
              accessibilityLabel="Scan food, a label, a report or a medicine"
              style={({ pressed }) => [
                styles.fab,
                elevation.accent,
                { backgroundColor: p.accent, transform: [{ scale: pressed ? 0.95 : 1 }] },
              ]}
            >
              <Ionicons name="scan-outline" size={25} color={p.accentInk} />
            </Pressable>
          </View>

          <TabTrigger name="health" href="/health" asChild>
            <TabItem tab={TABS[1]} />
          </TabTrigger>

          <TabTrigger name="you" href="/you" asChild>
            <TabItem tab={TABS[2]} />
          </TabTrigger>
        </View>
      </TabList>
    </Tabs>
  );
}

/**
 * A tab button.
 *
 * `TabTrigger asChild` clones this and injects `isFocused` plus
 * the press handler, so the component only has to render — it
 * never reads the router itself.
 */
function TabItem({
  tab,
  isFocused,
  ...pressable
}: {
  tab: TabDef;
  isFocused?: boolean;
} & React.ComponentProps<typeof Pressable>) {
  const p = usePalette();
  const color = isFocused ? p.accentText : p.text3;

  return (
    <Pressable
      {...pressable}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      accessibilityLabel={tab.label}
      style={styles.slot}
    >
      <Ionicons name={isFocused ? tab.iconActive : tab.icon} size={21} color={color} />
      <Text style={[styles.label, { color, fontWeight: isFocused ? "700" : "500" }]}>{tab.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /** Gives the active screen the space left over above the bar. */
  slotFill: { flex: 1, minHeight: 0 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  slot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    height: "100%",
  },
  fab: {
    position: "absolute",
    top: -20,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 10.5, letterSpacing: 0.1 },
});

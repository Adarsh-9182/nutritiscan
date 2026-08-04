import type { ReactNode } from "react";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import { radius } from "@/theme";
import { usePalette } from "@/theme/context";

// ============================================================
// PHONE FRAME (web only)
//
// This product is phone-shaped by design: one column, one thing
// to read at a time, a thumb-reachable tab bar. Stretched to
// 1440px in a desktop browser it stops being that product — the
// insight card becomes a banner, the conversation runs to 180
// characters a line, and the tab bar floats a foot from anything
// you'd point at.
//
// So on a wide web viewport the app renders inside a phone-width
// column instead. This is NOT a device mock-up with a notch drawn
// on it: it is the real app at the width it was designed for,
// centred, so a browser can be used to review it honestly.
//
// On native this component is a passthrough — there is no frame
// on a phone, because the phone IS the frame.
// ============================================================

/** Below this the browser window is already phone-shaped; no frame needed. */
const FRAME_BREAKPOINT = 620;

/** iPhone 14/15 logical width. The column the design was drawn at. */
const PHONE_WIDTH = 393;
const PHONE_HEIGHT = 852;

export function PhoneFrame({ children }: { children: ReactNode }) {
  const p = usePalette();
  const { width, height } = useWindowDimensions();

  // Native, or a narrow browser window: render the app directly.
  if (Platform.OS !== "web" || width < FRAME_BREAKPOINT) {
    return <View style={styles.fill}>{children}</View>;
  }

  // Leave a margin so the column never touches the viewport edges
  // on a short laptop screen.
  const frameHeight = Math.min(PHONE_HEIGHT, height - 48);

  return (
    <View style={[styles.backdrop, { backgroundColor: p.bgElevated }]}>
      <View
        style={[
          styles.frame,
          {
            width: PHONE_WIDTH,
            height: frameHeight,
            backgroundColor: p.bg,
            borderColor: p.border,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center" },
  frame: {
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: "hidden",
    // A soft lift so the column reads as the app rather than as a
    // panel painted onto the page.
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 50,
  },
});

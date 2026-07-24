// Design system — premium dark. Deep charcoal canvas, one emerald accent that
// glows, macro colors borrowed from the product's visual language. 8pt grid.

export const colors = {
  // Base — layered charcoals for depth
  background: "#0B0D11",
  backgroundElevated: "#0E1116",
  surface: "#15181F",
  surfaceMuted: "#1B1F27",
  surfaceHover: "#20242E",
  border: "rgba(255,255,255,0.09)",
  borderStrong: "rgba(255,255,255,0.16)",

  // Text
  text: "#F3F6F1",
  textSecondary: "#9BA3B0",
  textTertiary: "#646B78",
  textInverse: "#05130D", // text that sits on the accent

  // Brand — emerald that glows
  primary: "#34D399",
  primaryBright: "#6EE7B7",
  primaryDeep: "#10B981",
  primarySoft: "rgba(52,211,153,0.12)",
  primaryPressed: "#10B981",
  onAccent: "#05130D",
  glow: "rgba(52,211,153,0.45)",

  // Macros
  protein: "#818CF8",
  carbs: "#FBBF24",
  fat: "#FB7185",
  fiber: "#34D399",

  // Semantic
  success: "#34D399",
  warning: "#FBBF24",
  danger: "#FB7185",

  // Chat
  bubbleUser: "#34D399",
  bubbleAssistant: "#1B1F27",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 28,
  full: 999,
} as const;

// Elevation — soft, deep shadows tuned for a dark canvas.
export const elevation = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
  },
  glow: {
    shadowColor: "#34D399",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 22,
    elevation: 10,
  },
} as const;

// tabular figures keep numbers from jittering as they animate/update
const tnum = { fontVariant: ["tabular-nums" as const] };

export const type = {
  hero: {
    fontSize: 56,
    fontWeight: "800" as const,
    letterSpacing: -2,
    ...tnum,
  },
  largeTitle: { fontSize: 32, fontWeight: "700" as const, letterSpacing: -0.8 },
  title: { fontSize: 24, fontWeight: "700" as const, letterSpacing: -0.4 },
  heading: { fontSize: 18, fontWeight: "600" as const, letterSpacing: -0.2 },
  body: { fontSize: 16, fontWeight: "400" as const, lineHeight: 23 },
  bodyMedium: { fontSize: 16, fontWeight: "500" as const },
  caption: { fontSize: 13, fontWeight: "400" as const },
  captionMedium: { fontSize: 13, fontWeight: "600" as const },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 1.4,
    textTransform: "uppercase" as const,
  },
  num: { ...tnum },
} as const;

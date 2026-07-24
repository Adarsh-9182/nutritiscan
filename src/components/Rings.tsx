import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
} from "react-native-svg";
import { colors, type } from "../theme";

// Rotate the whole SVG so progress arcs start at 12 o'clock. Done on the
// container (not an inner <G rotation>) so it renders cleanly on web too.
const startTop = { transform: [{ rotate: "-90deg" as const }] };

const clamp = (n: number) => Math.max(0, Math.min(1, n));

interface RingProps {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0..1
  color?: string;
  colorBright?: string;
  trackColor?: string;
  children?: ReactNode;
}

/** Hero progress ring — gradient stroke, a soft bloom, and a faint wide halo
 *  behind the arc to read as a glow without relying on SVG blur filters. */
export function ProgressRing({
  size = 236,
  strokeWidth = 16,
  progress,
  color = colors.primary,
  colorBright = colors.primaryBright,
  trackColor = "rgba(255,255,255,0.12)",
  children,
}: RingProps) {
  const p = clamp(progress);
  const r = (size - strokeWidth - 12) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - p);
  const gid = `g${Math.round(r)}${strokeWidth}`;

  return (
    <View style={{ width: size, height: size }}>
      <Svg
        width={size}
        height={size}
        style={[StyleSheet.absoluteFill, startTop]}
      >
        <Defs>
          <LinearGradient id={`${gid}s`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colorBright} />
            <Stop offset="1" stopColor={color} />
          </LinearGradient>
          <RadialGradient id={`${gid}b`} cx="50%" cy="50%" r="50%">
            <Stop offset="0.55" stopColor={color} stopOpacity={0} />
            <Stop offset="0.85" stopColor={color} stopOpacity={0.18} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        <Circle cx={c} cy={c} r={r} fill={`url(#${gid}b)`} />
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {p > 0.01 && (
          <Circle
            cx={c}
            cy={c}
            r={r}
            stroke={color}
            strokeOpacity={0.3}
            strokeWidth={strokeWidth + 10}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            fill="none"
          />
        )}
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke={`url(#${gid}s)`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          fill="none"
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

interface GaugeProps {
  label: string;
  value: string;
  progress: number;
  color?: string;
  size?: number;
}

/** Small labelled gauge for a secondary metric. */
export function Gauge({
  label,
  value,
  progress,
  color = colors.primary,
  size = 66,
}: GaugeProps) {
  const strokeWidth = 6;
  const p = clamp(progress);
  const r = (size - strokeWidth) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - p);

  return (
    <View style={styles.gauge}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} style={startTop}>
          <Circle
            cx={c}
            cy={c}
            r={r}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={c}
            cy={c}
            r={r}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            fill="none"
          />
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Text style={styles.gaugeValue}>{value}</Text>
        </View>
      </View>
      <Text style={styles.gaugeLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  gauge: { alignItems: "center", gap: 8 },
  gaugeValue: {
    ...type.num,
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  gaugeLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
});

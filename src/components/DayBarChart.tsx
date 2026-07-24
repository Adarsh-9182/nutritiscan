import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, type } from "../theme";

interface Bar {
  label: string;
  value: number;
}

interface Props {
  data: Bar[];
  /** Draws a goal line and includes it in the scale. */
  target?: number | null;
  /** Formats the direct label on the latest bar and the goal label. */
  formatValue?: (value: number) => string;
}

const PLOT_HEIGHT = 110;

/**
 * One-series daily bar chart. Bars share the single brand hue (identity is
 * carried by the weekday labels, never by color); days without data show a
 * baseline stub so "zero" reads differently from "missing chart".
 */
export function DayBarChart({ data, target, formatValue }: Props) {
  const fmt = formatValue ?? ((v: number) => String(Math.round(v)));
  const maxValue = Math.max(target ?? 0, ...data.map((d) => d.value), 1);
  const scaleMax = maxValue * 1.12;
  const goalBottom = target ? (target / scaleMax) * PLOT_HEIGHT : 0;
  const lastIndex = data.length - 1;

  return (
    <View>
      <View style={styles.plot}>
        {target ? (
          <View style={[styles.goalLine, { bottom: goalBottom }]}>
            <Text style={styles.goalLabel}>Goal {fmt(target)}</Text>
          </View>
        ) : null}
        <View style={styles.bars}>
          {data.map((bar, i) => {
            const height = Math.max(
              (bar.value / scaleMax) * PLOT_HEIGHT,
              bar.value > 0 ? 4 : 0,
            );
            return (
              <View key={bar.label + i} style={styles.column}>
                {i === lastIndex && bar.value > 0 ? (
                  <Text style={styles.valueLabel}>{fmt(bar.value)}</Text>
                ) : null}
                {bar.value > 0 ? (
                  <View style={[styles.bar, { height }]} />
                ) : (
                  <View style={styles.emptyStub} />
                )}
              </View>
            );
          })}
        </View>
      </View>
      <View style={styles.labels}>
        {data.map((bar, i) => (
          <Text
            key={bar.label + i}
            style={[styles.dayLabel, i === lastIndex && styles.dayLabelToday]}
          >
            {bar.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: {
    height: PLOT_HEIGHT,
    justifyContent: "flex-end",
  },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    height: PLOT_HEIGHT,
  },
  column: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.xs,
  },
  bar: {
    width: "100%",
    maxWidth: 28,
    backgroundColor: colors.primary,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  emptyStub: {
    width: "100%",
    maxWidth: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.surfaceMuted,
  },
  goalLine: {
    position: "absolute",
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.textTertiary,
    zIndex: 1,
  },
  goalLabel: {
    position: "absolute",
    right: 0,
    bottom: 2,
    fontSize: 10,
    fontWeight: "500",
    color: colors.textTertiary,
  },
  valueLabel: {
    ...type.captionMedium,
    color: colors.text,
  },
  labels: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  dayLabel: {
    flex: 1,
    textAlign: "center",
    ...type.caption,
    color: colors.textTertiary,
  },
  dayLabelToday: {
    ...type.captionMedium,
    color: colors.text,
  },
});

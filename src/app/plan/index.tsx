// ============================================================
// MEAL PLAN
//
// "Constraint chips double as controls: tap one to loosen it and
// the week regenerates."
//
// This is where most meal-planner UIs quietly cheat. They show
// constraints as decorative badges, because making them real
// means the plan has to be a function of them — and once it is,
// you have to handle the case where they contradict each other.
//
// Here the chips are real (see src/domain/plan.ts): the week is
// computed from the active set on every render, deterministically.
// Turning off "Gluten-free" genuinely widens the pool and
// genuinely changes Tuesday.
//
// Two details that follow from that:
//   - EVERY CONSTRAINT STATES WHY IT EXISTS, traced to a marker or
//     a stated goal. A constraint you can turn off but can't
//     interrogate is still an instruction from the app.
//   - AN ALLERGY CONSTRAINT IS LOCKED. Gluten-free is not a
//     preference to be optimised away. The chip renders, explains
//     itself, and refuses.
// ============================================================

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Meter } from "@/components/charts";
import { ScreenBody, ScreenHeader } from "@/components/Screen";
import { Badge, Body, Button, Card, Eyebrow } from "@/components/ui";
import { CONSTRAINTS, buildGrocery, buildWeek, dayIron, dayProtein, mealMarker, type Constraint } from "@/domain/plan";
import { PROTEIN_TARGET } from "@/domain/persona";
import { useConstraints } from "@/lib/planStore";
import { radius, spacing, type } from "@/theme";
import { usePalette } from "@/theme/context";

export default function MealPlan() {
  const p = usePalette();
  const router = useRouter();
  const [active, toggle] = useConstraints();
  const [dayIndex, setDayIndex] = useState(0);
  const [explaining, setExplaining] = useState<Constraint | null>(null);

  // Recomputed from the constraint set, never stored. This is what
  // makes the chips controls rather than labels.
  const week = useMemo(() => buildWeek(active), [active]);
  const grocery = useMemo(() => buildGrocery(week), [week]);
  const day = week[Math.min(dayIndex, week.length - 1)];

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScreenHeader
        backTo="/health"
        title="This week"
        trailing={
          <Text style={[type.meta, { color: p.text3 }]}>
            {active.size} constraint{active.size === 1 ? "" : "s"}
          </Text>
        }
      />

      <ScreenBody>
        {/* Constraints. The chip toggles; the "?" explains. Two
            separate targets so an accidental tap can't silently
            drop a health constraint. */}
        <Card style={{ padding: spacing.base, marginTop: spacing.base }}>
          <Eyebrow>Built around</Eyebrow>
          <View style={styles.chipWrap}>
            {CONSTRAINTS.map((c) => {
              const on = active.has(c.id);
              return (
                <View key={c.id} style={styles.chipGroup}>
                  <Pressable
                    onPress={() => (c.locked ? setExplaining(c) : toggle(c.id))}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={[
                      styles.chipMain,
                      {
                        backgroundColor: on ? p.accentSoft : "transparent",
                        borderColor: on ? p.accentLine : p.border,
                      },
                    ]}
                  >
                    {c.locked && <Ionicons name="lock-closed" size={11} color={on ? p.accentText : p.text3} />}
                    <Text
                      style={{
                        fontSize: 13,
                        color: on ? p.accentText : p.text3,
                        fontWeight: on ? "600" : "400",
                        textDecorationLine: on ? "none" : "line-through",
                      }}
                    >
                      {c.label}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setExplaining(c)}
                    accessibilityRole="button"
                    accessibilityLabel={`Why ${c.label}?`}
                    style={[
                      styles.chipInfo,
                      {
                        backgroundColor: on ? p.accentSoft : "transparent",
                        borderColor: on ? p.accentLine : p.border,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 12, color: on ? p.accentText : p.text3 }}>?</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>

          {active.size === 0 && (
            <Text style={[type.meta, { color: p.text3, marginTop: spacing.md }]}>
              Nothing is guiding this plan right now — it&apos;s just food. Switch a constraint back on and it
              becomes yours again.
            </Text>
          )}
        </Card>

        {/* Day strip */}
        <View style={styles.dayStrip}>
          {week.map((d, i) => (
            <Pressable
              key={d.date}
              onPress={() => setDayIndex(i)}
              accessibilityRole="button"
              accessibilityState={{ selected: i === dayIndex }}
              style={[
                styles.dayPill,
                {
                  backgroundColor: i === dayIndex ? p.accent : "transparent",
                  borderColor: i === dayIndex ? "transparent" : p.border,
                },
              ]}
            >
              <Text style={{ fontSize: 11, color: i === dayIndex ? p.accentInk : p.text3 }}>{d.weekday}</Text>
              <Text
                style={[
                  type.num,
                  { fontSize: 15, fontWeight: "700", color: i === dayIndex ? p.accentInk : p.text3 },
                ]}
              >
                {d.date}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* The day's meals */}
        <View style={{ gap: spacing.md, marginTop: spacing.base }}>
          {day.meals.map((meal) => {
            const tag = mealMarker(meal, active);
            return (
              <Card key={`${day.date}-${meal.id}`} style={styles.mealCard}>
                <Text style={[type.meta, type.num, { color: p.text3, width: 44 }]}>{meal.time}</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[type.h3, { color: p.text }]}>{meal.name}</Text>
                  <Text style={[type.meta, { color: p.text2, marginTop: 4 }]}>
                    {meal.protein} g protein · {meal.iron} mg iron · {meal.minutes} min
                  </Text>
                  <Text style={[type.meta, { color: p.text3, marginTop: 2 }]}>{meal.note}</Text>
                </View>
                {tag && (
                  <Pressable
                    onPress={() => router.push({ pathname: "/labs/[marker]", params: { marker: tag.marker } })}
                  >
                    <Badge tone="attention">{tag.label}</Badge>
                  </Pressable>
                )}
              </Card>
            );
          })}
        </View>

        {/* The day's totals against the target */}
        <Card style={{ padding: spacing.base, marginTop: spacing.md }}>
          <Meter value={dayProtein(day)} target={PROTEIN_TARGET} label="Protein today" />
          <Text style={[type.meta, { color: p.text2, marginTop: spacing.md }]}>
            {dayIron(day)} mg of iron across the day — the useful target is 14 mg while your ferritin sits
            low.
          </Text>
        </Card>

        <Pressable onPress={() => router.push("/plan/grocery")} style={{ marginTop: spacing.base }}>
          <Card style={styles.listCard}>
            <View style={{ flex: 1 }}>
              <Text style={[type.h3, { color: p.text }]}>Turn the week into a list</Text>
              <Text style={[type.meta, { color: p.text3, marginTop: 2 }]}>
                {grocery.items.length} items · {grocery.days} days
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={p.accentText} />
          </Card>
        </Pressable>

        <Text style={[type.meta, { color: p.text3, marginTop: spacing.xl }]}>
          Plans are built from general nutrition guidance and the goals you set. They are not a therapeutic
          diet — if a clinician has given you one, theirs wins.
        </Text>
      </ScreenBody>

      {/* Why this constraint exists */}
      <Modal
        visible={!!explaining}
        transparent
        animationType="slide"
        onRequestClose={() => setExplaining(null)}
      >
        <Pressable style={[styles.backdrop, { backgroundColor: p.overlay }]} onPress={() => setExplaining(null)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: p.bgElevated, borderColor: p.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            {explaining && (
              <>
                <View style={styles.sheetHead}>
                  <Text style={[type.h3, { color: p.text }]}>{explaining.label}</Text>
                  <Pressable onPress={() => setExplaining(null)} hitSlop={12} accessibilityLabel="Close">
                    <Ionicons name="close" size={20} color={p.text3} />
                  </Pressable>
                </View>

                <Body>{explaining.because}</Body>

                {explaining.marker && (
                  <Pressable
                    onPress={() => {
                      const marker = explaining.marker!;
                      setExplaining(null);
                      router.push({ pathname: "/labs/[marker]", params: { marker } });
                    }}
                    style={styles.inlineAction}
                  >
                    <Text style={{ color: p.accentText, fontSize: 13.5, fontWeight: "600" }}>
                      See the marker
                    </Text>
                    <Ionicons name="arrow-forward" size={15} color={p.accentText} />
                  </Pressable>
                )}

                {explaining.locked ? (
                  <View style={[styles.lockNote, { backgroundColor: p.surface, borderColor: p.border }]}>
                    <Ionicons name="lock-closed-outline" size={14} color={p.text3} style={{ marginTop: 2 }} />
                    <Text style={[type.meta, { color: p.text3, flex: 1 }]}>
                      This one is locked. It came from a restriction you recorded, not from a goal — so the
                      planner treats it as a fact about you rather than a preference to optimise.
                    </Text>
                  </View>
                ) : (
                  <Button
                    title={
                      active.has(explaining.id)
                        ? "Loosen this and rebuild the week"
                        : "Apply this and rebuild the week"
                    }
                    onPress={() => {
                      toggle(explaining.id);
                      setExplaining(null);
                    }}
                    style={{ marginTop: spacing.lg }}
                  />
                )}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  chipGroup: { flexDirection: "row" },
  chipMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderTopLeftRadius: radius.full,
    borderBottomLeftRadius: radius.full,
    borderWidth: 1,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 8,
  },
  chipInfo: {
    width: 26,
    alignItems: "center",
    justifyContent: "center",
    borderTopRightRadius: radius.full,
    borderBottomRightRadius: radius.full,
    borderWidth: 1,
    borderLeftWidth: 0,
  },
  dayStrip: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.base },
  dayPill: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 9,
  },
  mealCard: { flexDirection: "row", gap: spacing.md, padding: spacing.md, alignItems: "flex-start" },
  listCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.base },
  backdrop: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    paddingBottom: spacing.huge,
  },
  sheetHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  inlineAction: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.base },
  lockNote: {
    flexDirection: "row",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
});

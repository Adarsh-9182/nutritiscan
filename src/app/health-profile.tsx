// ============================================================
// HEALTH MEMORY — WHAT THE ASSISTANT KNOWS
//
// This screen exists because of one question users ask about
// every AI product and almost never get answered: WHAT DOES IT
// ACTUALLY KNOW ABOUT ME?
//
// So it shows exactly that — fact by fact, each with WHERE IT
// CAME FROM. A fact you told it, a fact it read out of a
// document, and a fact it derived are three different things with
// three different reliabilities, and collapsing them into one
// list is how "you're gluten sensitive" ends up sitting next to
// something the model inferred on a Tuesday.
//
// "Not recorded" is shown as a first-class value rather than
// hidden. An empty field is information: it tells the user why an
// answer was vague, and it is the most direct invitation to
// improve it.
// ============================================================

import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ScreenBody, ScreenHeader, Section } from "@/components/Screen";
import { Badge, Body, Card } from "@/components/ui";
import { JULY_PANEL, attentionMarkers } from "@/domain/labs";
import { DEV, PROTEIN_TARGET, SLEEP, hoursLabel } from "@/domain/persona";
import { spacing, type } from "@/theme";
import { usePalette } from "@/theme/context";

/** Where a fact came from — and therefore how much to trust it. */
type Origin = "you" | "document" | "device" | "derived";

const ORIGIN_LABEL: Record<Origin, string> = {
  you: "You told us",
  document: "From a document",
  device: "Connected source",
  derived: "Worked out",
};

const ORIGIN_TONE: Record<Origin, "steady" | "evidence" | "neutral"> = {
  you: "steady",
  document: "evidence",
  device: "evidence",
  derived: "neutral",
};

type Fact = { label: string; value: string; origin: Origin; href?: string };

export default function HealthProfile() {
  const p = usePalette();
  const router = useRouter();

  const bmi = +(DEV.weightKg / Math.pow(DEV.heightCm / 100, 2)).toFixed(1);
  const sleepNow = SLEEP.points[SLEEP.points.length - 1].v;

  const groups: { title: string; facts: Fact[] }[] = [
    {
      title: "Body",
      facts: [
        { label: "Age", value: String(DEV.age), origin: "you" },
        { label: "Height", value: `${DEV.heightCm} cm`, origin: "you" },
        { label: "Weight", value: `${DEV.weightKg} kg`, origin: "device" },
        { label: "BMI", value: String(bmi), origin: "derived" },
      ],
    },
    {
      title: "Goals",
      facts: DEV.goals.map((g) => ({
        label: g.label,
        value: g.marker ? "Tied to a marker" : "No marker",
        origin: "you" as Origin,
        href: g.marker ? `/labs/${g.marker}` : undefined,
      })),
    },
    {
      title: "Constraints",
      facts: [
        { label: "Restrictions", value: DEV.restrictions.join(", ") || "None recorded", origin: "you" },
        { label: "Conditions", value: DEV.conditions.join(", ") || "None recorded", origin: "you" },
        {
          label: "Medicines",
          value: "Ferrous fumarate 210 mg",
          origin: "document",
          href: "/medicine/ferrous-fumarate-210",
        },
      ],
    },
    {
      title: "Habits",
      facts: [
        { label: "Sleep", value: `${hoursLabel(sleepNow)} a night`, origin: "device" },
        { label: "Protein target", value: `${PROTEIN_TARGET} g/day`, origin: "you" },
        { label: "Training", value: "Not recorded", origin: "you" },
        { label: "Resting heart rate", value: "Not recorded", origin: "device" },
      ],
    },
    {
      title: "Labs the assistant reasons from",
      facts: attentionMarkers(JULY_PANEL).map((m) => ({
        label: m.name,
        value: `${m.value} ${m.unit}`,
        origin: "document" as Origin,
        href: `/labs/${m.id}`,
      })),
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScreenHeader backTo="/you" title="Health profile" />

      <ScreenBody>
        <Body style={{ marginTop: spacing.base }}>
          This is what the assistant knows about you, and where each fact came from. It reasons only from
          what&apos;s here — anything marked{" "}
          <Text style={{ color: p.text }}>not recorded</Text> is a gap it will say it can&apos;t fill rather
          than guess at.
        </Body>

        {groups.map((group) => (
          <Section key={group.title} title={group.title}>
            <Card>
              {group.facts.map((f, i) => {
                const missing = /not recorded|none recorded/i.test(f.value);
                return (
                  <Pressable
                    key={f.label}
                    onPress={() => f.href && router.push(f.href as never)}
                    disabled={!f.href}
                    style={({ pressed }) => [
                      styles.row,
                      i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.border },
                      pressed && f.href ? { backgroundColor: p.surface2 } : null,
                    ]}
                  >
                    <Text style={[type.body, { color: p.text2, flex: 1 }]}>{f.label}</Text>
                    <Text style={[type.meta, { color: missing ? p.text3 : p.text }]}>{f.value}</Text>
                    <Badge tone={ORIGIN_TONE[f.origin]}>{ORIGIN_LABEL[f.origin]}</Badge>
                  </Pressable>
                );
              })}
            </Card>
          </Section>
        ))}

        <Text style={[type.meta, { color: p.text3, marginTop: spacing.xl }]}>
          A shortened version of this profile is what makes answers personal. Your documents are not sent
          anywhere — only the values read out of them.
        </Text>
      </ScreenBody>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: 12,
    flexWrap: "wrap",
  },
});

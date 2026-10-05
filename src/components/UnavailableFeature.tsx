import { ScreenBody, ScreenHeader } from "@/components/Screen";
import { Button, Card, Eyebrow, H1, Meta } from "@/components/ui";
import { spacing } from "@/theme";
import { usePalette } from "@/theme/context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

export function UnavailableFeature({ title, description }: { title: string; description: string }) {
  const p = usePalette();
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScreenHeader backTo="/" title={title} />
      <ScreenBody>
        <Card style={{ alignItems: "flex-start", padding: spacing.lg, marginTop: spacing.xl }}>
          <Ionicons name="construct-outline" size={24} color={p.accentText} />
          <Eyebrow tone="accent" style={{ marginTop: spacing.md }}>Not connected yet</Eyebrow>
          <H1 style={{ fontSize: 23, marginTop: spacing.sm }}>{title} isn&apos;t ready</H1>
          <Meta style={{ marginTop: spacing.sm, lineHeight: 20 }}>{description}</Meta>
          <Button title="Back to your journal" variant="primary" icon="arrow-back" onPress={() => router.replace("/")} style={{ marginTop: spacing.lg, alignSelf: "stretch" }} />
        </Card>
      </ScreenBody>
    </View>
  );
}

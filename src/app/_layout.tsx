import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { SessionProvider, useSession } from "@/lib/session";
import { colors } from "@/theme";

function RootNavigator() {
  const { session, profile, loading } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "onboarding";

    if (!session) {
      // Signed out — the only place to be is the auth flow.
      if (!inAuthGroup) router.replace("/(auth)/welcome");
    } else if (!profile) {
      // Session established but the profile row is still loading. Wait, so we
      // don't flash the wrong screen for a returning (already-onboarded) user.
      return;
    } else if (!profile.onboarding_completed) {
      // Authenticated but not onboarded — including right after sign in / sign
      // up, when we're still sitting on an (auth) screen. Move to onboarding.
      if (!inOnboarding) router.replace("/onboarding");
    } else if (inAuthGroup || inOnboarding) {
      // Fully set up — get out of the auth/onboarding flow into the app.
      router.replace("/(tabs)");
    }
  }, [session, profile, loading, segments, router]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="report"
        options={{
          headerShown: true,
          title: "Medical Report",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </SessionProvider>
  );
}

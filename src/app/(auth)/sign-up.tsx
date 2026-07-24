import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { supabase } from "@/lib/supabase";
import { colors, spacing, type } from "@/theme";

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!email.trim() || password.length < 8) {
      Alert.alert(
        "Check your details",
        "Enter a valid email and a password of at least 8 characters.",
      );
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      Alert.alert("Couldn't create account", error.message);
      return;
    }
    if (!data.session) {
      // Email confirmation is enabled on the project
      Alert.alert(
        "Confirm your email",
        "We sent you a confirmation link. Tap it, then sign in.",
      );
      router.replace("/(auth)/sign-in");
    }
    // With auto-confirm, the root layout redirects to onboarding.
  }

  return (
    <Screen keyboardAvoiding>
      <View style={styles.content}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>
          Less than a minute. Then your AI takes it from there.
        </Text>

        <View style={styles.form}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="you@example.com"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="At least 8 characters"
          />
          <Button
            label="Create Account"
            onPress={handleSignUp}
            loading={loading}
          />
          <Button
            label="I already have an account"
            variant="ghost"
            onPress={() => router.replace("/(auth)/sign-in")}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: spacing.xxl,
  },
  title: {
    ...type.largeTitle,
    color: colors.text,
  },
  subtitle: {
    ...type.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  form: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
});

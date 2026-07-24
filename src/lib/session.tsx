import { Session } from "@supabase/supabase-js";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "./supabase";

export interface Profile {
  id: string;
  display_name: string | null;
  age: number | null;
  sex: "male" | "female" | "other" | null;
  height_cm: number | null;
  weight_kg: number | null;
  unit_system: "metric" | "imperial";
  goal_direction: "lose" | "maintain" | "gain" | null;
  goal_weight_kg: number | null;
  weekly_pace_kg: number | null;
  activity_level:
    | "sedentary"
    | "light"
    | "moderate"
    | "active"
    | "very_active"
    | null;
  food_preference:
    | "vegetarian"
    | "eggetarian"
    | "vegan"
    | "non_vegetarian"
    | null;
  goals: string[];
  sleep_time: string | null;
  wake_time: string | null;
  medical_conditions: string | null;
  allergies: string | null;
  target_calories: number | null;
  target_protein_g: number | null;
  target_water_ml: number | null;
  target_sleep_min: number | null;
  onboarding_completed: boolean;
}

interface SessionState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const SessionContext = createContext<SessionState>({
  session: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    setProfile(data ?? null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user.id);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          await loadProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, [loadProfile]);

  return (
    <SessionContext.Provider
      value={{ session, profile, loading, refreshProfile }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}

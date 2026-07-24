-- Onboarding depth: weight-goal flow + unit preference.
-- Cal AI / MyFitnessPal parity — direction, target weight, and pace let the
-- Nutrition Engine compute a precise deficit/surplus instead of a flat guess.
-- Canonical storage stays metric; unit_system only controls display + input.

alter table public.profiles
  add column if not exists unit_system text not null default 'metric'
    check (unit_system in ('metric', 'imperial')),
  add column if not exists goal_direction text
    check (goal_direction in ('lose', 'maintain', 'gain')),
  add column if not exists goal_weight_kg numeric(5, 1)
    check (goal_weight_kg between 25 and 350),
  -- Magnitude of weekly weight change in kg (e.g. 0.25 / 0.5 / 0.75).
  -- Direction is carried by goal_direction; this is always non-negative.
  add column if not exists weekly_pace_kg numeric(3, 2)
    check (weekly_pace_kg between 0 and 1.5);

-- Medical Report Engine — the longitudinal health-memory spine.
-- Phase 1's flagship, and the foundation every later phase reasons over:
-- a report is an event; each biomarker is a row queryable over time so that
-- trends ("your LDL over the last year") fall out of a simple index.

-- ============================================================
-- MEDICAL REPORTS — one row per uploaded/scanned report
-- ============================================================
create table public.medical_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,              -- "Complete Blood Count", "Lipid Panel"
  report_date date,                 -- date printed on the report, if visible
  summary text,                     -- plain-language overall summary
  flags text,                       -- notable items worth discussing with a doctor
  confidence text check (confidence in ('high', 'medium', 'low')),
  created_at timestamptz not null default now()
);

create index medical_reports_user_created_idx
  on public.medical_reports (user_id, created_at desc);

alter table public.medical_reports enable row level security;

create policy "Users manage own reports"
  on public.medical_reports for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- BIOMARKERS — one row per extracted measurement.
-- value is text on purpose: results are not always numeric
-- ("Positive", "<0.01", "Trace"). ref_low/ref_high hold the numeric
-- range when there is one; ref_text holds it otherwise.
-- measured_at is denormalised from the report so time-series
-- queries never need a join.
-- ============================================================
create table public.biomarkers (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.medical_reports (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,               -- "Hemoglobin", "LDL Cholesterol"
  category text,                    -- "Hematology", "Lipids", "Metabolic"
  value text not null,
  unit text,                        -- "g/dL", "mg/dL"
  ref_low numeric,
  ref_high numeric,
  ref_text text,
  status text not null default 'unknown' check (
    status in ('low', 'normal', 'high', 'critical', 'unknown')
  ),
  explanation text,                 -- plain-language, safe, never diagnostic
  measured_at date,
  created_at timestamptz not null default now()
);

-- The Phase 2-4 spine: pull any marker's history for one user, newest first.
create index biomarkers_user_name_measured_idx
  on public.biomarkers (user_id, name, measured_at desc);

create index biomarkers_report_idx on public.biomarkers (report_id);

alter table public.biomarkers enable row level security;

create policy "Users manage own biomarkers"
  on public.biomarkers for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

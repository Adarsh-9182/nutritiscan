-- Health Engine — water, weight, and sleep logs.
-- Same philosophy as meals: every log is an event; history is never lost.

create table public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount_ml int not null check (amount_ml between 1 and 3000),
  logged_at timestamptz not null default now()
);

create index water_logs_user_logged_idx on public.water_logs (user_id, logged_at desc);

alter table public.water_logs enable row level security;

create policy "Users manage own water logs"
  on public.water_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  weight_kg numeric(5, 1) not null check (weight_kg between 25 and 350),
  logged_at timestamptz not null default now()
);

create index weight_logs_user_logged_idx on public.weight_logs (user_id, logged_at desc);

alter table public.weight_logs enable row level security;

create policy "Users manage own weight logs"
  on public.weight_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- One row per night; sleep_date is the local date the user woke up.
create table public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slept_min int not null check (slept_min between 0 and 1080),
  sleep_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, sleep_date)
);

create index sleep_logs_user_date_idx on public.sleep_logs (user_id, sleep_date desc);

alter table public.sleep_logs enable row level security;

create policy "Users manage own sleep logs"
  on public.sleep_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

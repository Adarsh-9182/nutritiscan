-- Nutrition Engine — meal log.
-- Every logged meal is an event; history is never lost.

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  -- Detected items as [{name, portion, calories, protein_g, carbs_g, fat_g}]
  items jsonb not null default '[]',
  calories int not null check (calories >= 0),
  protein_g numeric(6, 1) not null default 0 check (protein_g >= 0),
  carbs_g numeric(6, 1) not null default 0 check (carbs_g >= 0),
  fat_g numeric(6, 1) not null default 0 check (fat_g >= 0),
  confidence text check (confidence in ('high', 'medium', 'low')),
  source text not null default 'scan' check (source in ('scan', 'manual', 'chat')),
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index meals_user_logged_idx on public.meals (user_id, logged_at desc);

alter table public.meals enable row level security;

create policy "Users manage own meals"
  on public.meals for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

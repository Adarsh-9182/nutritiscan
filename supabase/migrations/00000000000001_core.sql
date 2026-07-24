-- NutritiScan core schema
-- Philosophy: the database is the user's second brain. Store events, never lose history.

-- ============================================================
-- PROFILES (User Engine)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  age int check (age between 13 and 120),
  sex text check (sex in ('male', 'female', 'other')),
  height_cm numeric(5, 1) check (height_cm between 90 and 250),
  weight_kg numeric(5, 1) check (weight_kg between 25 and 350),
  activity_level text check (
    activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')
  ),
  food_preference text check (
    food_preference in ('vegetarian', 'eggetarian', 'vegan', 'non_vegetarian')
  ),
  goals text[] not null default '{}',
  sleep_time text,   -- 'HH:MM' 24h
  wake_time text,    -- 'HH:MM' 24h
  medical_conditions text,
  allergies text,
  -- Computed daily targets (Nutrition Engine writes these at onboarding / weight change)
  target_calories int,
  target_protein_g int,
  target_water_ml int,
  target_sleep_min int default 480,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users read own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users insert own profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "Users update own profile"
  on public.profiles for update using (auth.uid() = id);

-- ============================================================
-- CONVERSATIONS + MESSAGES (Conversation Memory — Level 1)
-- ============================================================
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.conversations enable row level security;

create policy "Users manage own conversations"
  on public.conversations for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

alter table public.messages enable row level security;

create policy "Users manage own messages"
  on public.messages for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- MEMORIES (Long-Term Memory — Level 3)
-- The AI writes here via the save_memory tool. One fact per row.
-- ============================================================
create table public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null check (
    category in ('preference', 'habit', 'health', 'goal', 'context')
  ),
  content text not null,
  created_at timestamptz not null default now()
);

create index memories_user_idx on public.memories (user_id, created_at desc);

alter table public.memories enable row level security;

create policy "Users manage own memories"
  on public.memories for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- DAILY BRIEFINGS (Daily Memory — Level 2)
-- One AI-generated briefing per user per local date, cached.
-- ============================================================
create table public.daily_briefings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  briefing_date date not null,
  content text not null,
  created_at timestamptz not null default now(),
  unique (user_id, briefing_date)
);

alter table public.daily_briefings enable row level security;

create policy "Users read own briefings"
  on public.daily_briefings for select using (auth.uid() = user_id);

-- ============================================================
-- Auto-create profile row on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at maintenance
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger conversations_touch before update on public.conversations
  for each row execute function public.touch_updated_at();

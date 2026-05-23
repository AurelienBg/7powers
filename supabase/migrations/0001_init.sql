-- 7Powers — Initial schema
-- Tables: projects, power_assessments, coach_messages
-- Auth: Supabase Auth (auth.users)
-- Strategy: RLS on every table; each user only sees their own data.

-- ============================================================
-- Enums
-- ============================================================

create type project_sector as enum (
  'defi',
  'ai',
  'saas',
  'web3-other'
);

create type project_stage as enum (
  'origination',
  'takeoff',
  'stability'
);

create type power_type as enum (
  'scale',
  'network',
  'counter',
  'switching',
  'branding',
  'cornered',
  'process'
);

create type coach_role as enum (
  'user',
  'assistant',
  'system'
);

-- ============================================================
-- projects
-- ============================================================

create table public.projects (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 120),
  sector       project_sector not null,
  stage        project_stage  not null,
  description  text,
  -- TAM / SAM / SOM + sources, free-form JSON for v1
  market_size  jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index projects_user_id_idx on public.projects(user_id);
create index projects_created_at_idx on public.projects(created_at desc);

-- ============================================================
-- power_assessments
-- One row per (project, power_type). Updated in place.
-- ============================================================

create table public.power_assessments (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  power         power_type not null,
  -- answers_json shape:
  --   { q1: 0-5, q2: 0-5, q3: 0-5, q4: 0-5, q5: 0-5, benefit: text, barrier: text, notes: text }
  answers       jsonb not null default '{}'::jsonb,
  -- 0-100, computed client-side via usePowerScore composable
  score         numeric(5, 2),
  -- action_items: array of { title: text, why: text, eta: text }
  action_items  jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (project_id, power)
);

create index power_assessments_project_id_idx on public.power_assessments(project_id);

-- ============================================================
-- coach_messages
-- Full chat history per project, with the current power as context.
-- ============================================================

create table public.coach_messages (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  power_context  power_type,
  role           coach_role not null,
  content        text not null,
  created_at     timestamptz not null default now()
);

create index coach_messages_project_id_idx on public.coach_messages(project_id, created_at);

-- ============================================================
-- updated_at trigger
-- ============================================================

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger projects_touch_updated_at
  before update on public.projects
  for each row execute function public.touch_updated_at();

create trigger power_assessments_touch_updated_at
  before update on public.power_assessments
  for each row execute function public.touch_updated_at();

-- ============================================================
-- Row-Level Security
-- Hard rule: every row is scoped to its owner user.
-- Child tables check ownership via the parent project.
-- ============================================================

alter table public.projects             enable row level security;
alter table public.power_assessments    enable row level security;
alter table public.coach_messages       enable row level security;

-- projects ---------------------------------------------------
create policy "projects: owner can select"
  on public.projects for select
  using (user_id = auth.uid());

create policy "projects: owner can insert"
  on public.projects for insert
  with check (user_id = auth.uid());

create policy "projects: owner can update"
  on public.projects for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "projects: owner can delete"
  on public.projects for delete
  using (user_id = auth.uid());

-- power_assessments ------------------------------------------
create policy "power_assessments: via project owner"
  on public.power_assessments for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = power_assessments.project_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = power_assessments.project_id
        and p.user_id = auth.uid()
    )
  );

-- coach_messages ---------------------------------------------
create policy "coach_messages: via project owner"
  on public.coach_messages for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = coach_messages.project_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = coach_messages.project_id
        and p.user_id = auth.uid()
    )
  );

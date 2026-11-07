-- Hive Network — initial schema, RLS, storage, guardrails
-- Run in Supabase: Dashboard → SQL Editor → paste this whole file → Run.

-- PROFILES -------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('student','alumni','admin')),
  full_name text,
  photo_url text,
  major text,
  class_year int,                 -- students
  grad_year int,                  -- alumni
  company text,
  job_title text,
  bio text,
  hometown text,
  clubs text[] default '{}',
  fun_facts text[] default '{}',
  hobbies text[] default '{}',
  languages text[] default '{}',
  favorite_spot text,
  path_story jsonb default '[]',  -- [{ "year": 2015, "title": "...", "kind": "education|job|internship|pivot|milestone" }]
  path_tags text[] default '{}',  -- 'transferred','first-gen','switched-majors','no-internship','state-gov'
  ask_me_about text[] default '{}',
  fields text[] default '{}',
  skills text[] default '{}',
  background_tags text[] default '{}',
  goal text,
  goal_field text,
  help_types text[] default '{}', -- 'coffee_chat','mock_interview','resume_review','quick_question','referral'
  monthly_limit int default 2,
  calendly_url text check (calendly_url is null or calendly_url ~* '^https://(www\.)?calendly\.com/'),
  linkedin_url text,
  resume_path text,               -- private 'resumes' bucket (students) — never selectable by clients
  resume_text text,               -- extracted text, used by AI only (server side)
  onboarded boolean default false,
  verified boolean default false,
  is_sample boolean default false,
  created_at timestamptz default now()
);

-- LAUNCH PLANS ---------------------------------------------------------
create table public.launch_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles on delete cascade,
  goal text,
  steps jsonb not null,           -- [{ "order":1, "alumni_id":"...", "step_title":"Learn the path", "why":"..." }]
  created_at timestamptz default now()
);

-- 1:1 REQUESTS + REFERRAL REQUESTS -------------------------------------
create table public.requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles on delete cascade,
  alumni_id uuid references public.profiles on delete cascade,
  type text not null check (type in ('coffee_chat','mock_interview','resume_review','quick_question','referral')),
  calendly_event_uri text,
  calendly_invitee_uri text,
  scheduled_at timestamptz,
  message text,
  share_resume boolean default true,
  ai_snapshot jsonb,
  ai_prep jsonb,
  status text default 'pending' check (status in ('pending','scheduled','declined','canceled','completed')),
  open_to_refer boolean default false,
  created_at timestamptz default now()
);
create index on public.requests (alumni_id, created_at);
create index on public.requests (student_id);

-- KUDOS ----------------------------------------------------------------
create table public.kudos (
  id uuid primary key default gen_random_uuid(),
  alumni_id uuid references public.profiles on delete cascade,
  student_id uuid references public.profiles on delete cascade,
  request_id uuid references public.requests on delete set null,
  note text,
  created_at timestamptz default now()
);

-- AI MATCHES -----------------------------------------------------------
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles on delete cascade,
  alumni_id uuid references public.profiles on delete cascade,
  score int check (score between 0 and 100),
  reasons text[] default '{}',
  hidden boolean default false,
  created_at timestamptz default now(),
  unique (student_id, alumni_id)
);

-- HELPER FUNCTIONS (security definer so RLS policies can call them) ---
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- "Sac State account": student with @csus.edu email, verified alum, or admin
create or replace function public.is_sac_state_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (
        (p.role = 'student' and lower(coalesce(auth.jwt()->>'email','')) like '%@csus.edu')
        or (p.role = 'alumni' and p.verified)
        or p.role = 'admin'
      )
  );
$$;

-- PUBLIC PREVIEW of alumni (the ONLY thing anonymous visitors can read) --
create view public.alumni_public as
select
  id,
  split_part(full_name, ' ', 1) || ' ' || left(split_part(full_name, ' ', 2), 1) || '.' as display_name,
  photo_url, job_title, company, major, grad_year,
  fields, path_tags, help_types,
  (select string_agg(step->>'title', ' → ') from jsonb_array_elements(path_story) step) as path_line,
  verified, is_sample
from public.profiles
where role = 'alumni' and verified = true;
grant select on public.alumni_public to anon, authenticated;

-- AUTH TRIGGERS --------------------------------------------------------
-- Students must sign up with @csus.edu. Alumni using the email fallback pass
-- role 'alumni' in metadata; they stay unverified until an admin approves them.
create or replace function public.enforce_csus_email()
returns trigger as $$
begin
  if new.raw_app_meta_data->>'provider' = 'email'
     and coalesce(new.raw_user_meta_data->>'role', 'student') <> 'alumni'
     and lower(new.email) not like '%@csus.edu' then
    raise exception 'Students must use a csus.edu email';
  end if;
  return new;
end; $$ language plpgsql security definer;

create trigger csus_email_only
before insert on auth.users
for each row execute function public.enforce_csus_email();

-- Create a profile row for every new user. Role comes from signup metadata;
-- LinkedIn (OIDC) signups are always alumni. Nobody can sign up as admin.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r text := case
    when new.raw_app_meta_data->>'provider' = 'linkedin_oidc' then 'alumni'
    when new.raw_user_meta_data->>'role' = 'alumni' then 'alumni'
    else 'student' end;
begin
  insert into public.profiles (id, role, full_name, photo_url)
  values (
    new.id, r,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'picture'
  )
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Only admins can change role / verified (blocks self-promotion).
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin()
     and (new.role is distinct from old.role or new.verified is distinct from old.verified) then
    raise exception 'Only admins can change role or verification';
  end if;
  return new;
end; $$;

create trigger profiles_protect_fields
before update on public.profiles
for each row execute function public.protect_profile_fields();

-- REQUEST GUARDRAILS ---------------------------------------------------
-- monthly limit, one open request per student→alum pair, referrals only after
-- a completed 1:1 where the alum turned on "open to refer".
create or replace function public.check_request_rules()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  lim int;
  used int;
begin
  if new.type = 'referral' then
    if not exists (
      select 1 from public.requests
      where student_id = new.student_id and alumni_id = new.alumni_id
        and status = 'completed' and open_to_refer
    ) then
      raise exception 'Referral requests need a completed chat where the alum is open to refer';
    end if;
  else
    if exists (
      select 1 from public.requests
      where student_id = new.student_id and alumni_id = new.alumni_id
        and type <> 'referral' and status in ('pending','scheduled')
    ) then
      raise exception 'You already have an open request with this alum';
    end if;
    select monthly_limit into lim from public.profiles where id = new.alumni_id;
    select count(*) into used from public.requests
      where alumni_id = new.alumni_id and type <> 'referral'
        and status not in ('declined','canceled')
        and created_at >= date_trunc('month', now());
    if used >= coalesce(lim, 2) then
      raise exception 'This alum has reached their monthly limit — try another alum or next month';
    end if;
  end if;
  return new;
end; $$;

create trigger requests_rules
before insert on public.requests
for each row execute function public.check_request_rules();

-- ROW LEVEL SECURITY ---------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.launch_plans enable row level security;
alter table public.requests     enable row level security;
alter table public.kudos        enable row level security;
alter table public.matches      enable row level security;

-- profiles: anonymous users get NOTHING (they use alumni_public).
-- Clients may never select resume_path / resume_text (column-level grants).
revoke all on public.profiles from anon;
revoke select on public.profiles from authenticated;
grant select (
  id, role, full_name, photo_url, major, class_year, grad_year, company, job_title,
  bio, hometown, clubs, fun_facts, hobbies, languages, favorite_spot, path_story,
  path_tags, ask_me_about, fields, skills, background_tags, goal, goal_field,
  help_types, monthly_limit, calendly_url, linkedin_url, onboarded, verified,
  is_sample, created_at
) on public.profiles to authenticated;

create policy "read own profile" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "sac state members read alumni" on public.profiles
  for select to authenticated using (role = 'alumni' and public.is_sac_state_member());
create policy "alumni read students who requested them" on public.profiles
  for select to authenticated using (
    exists (select 1 from public.requests r where r.student_id = profiles.id and r.alumni_id = auth.uid())
  );
create policy "admins read all" on public.profiles
  for select to authenticated using (public.is_admin());
create policy "update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "admins update any profile" on public.profiles
  for update to authenticated using (public.is_admin());

-- matches & launch plans: owning student only
create policy "own matches" on public.matches
  for all to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "own launch plans" on public.launch_plans
  for all to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());

-- requests: only the two people involved
create policy "participants read requests" on public.requests
  for select to authenticated using (student_id = auth.uid() or alumni_id = auth.uid());
create policy "students create requests" on public.requests
  for insert to authenticated with check (student_id = auth.uid() and public.is_sac_state_member());
create policy "participants update requests" on public.requests
  for update to authenticated using (student_id = auth.uid() or alumni_id = auth.uid());

-- kudos: anyone can read; students can thank an alum after a completed chat
grant select on public.kudos to anon;
create policy "anyone reads kudos" on public.kudos
  for select to anon, authenticated using (true);
create policy "students add kudos after completed chat" on public.kudos
  for insert to authenticated with check (
    student_id = auth.uid() and exists (
      select 1 from public.requests r
      where r.student_id = auth.uid() and r.alumni_id = kudos.alumni_id and r.status = 'completed'
    )
  );

-- STORAGE --------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('resumes', 'resumes', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

-- resumes: students upload/read only inside their own folder: resumes/<user id>/...
-- Alumni get access ONLY through server-generated signed URLs.
create policy "students manage own resume" on storage.objects
  for all to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

-- avatars: public read; users upload into their own folder
create policy "anyone reads avatars" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "users upload own avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users update own avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

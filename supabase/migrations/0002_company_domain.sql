-- Hive Network — company logos.
-- Run in Supabase: Dashboard → SQL Editor → paste → Run.

alter table public.profiles add column if not exists company_domain text;  -- e.g. "intuit.com" → logo via Google's favicon service

-- Re-create the public preview so logged-out visitors also see company logos.
-- (drop + create, because CREATE OR REPLACE VIEW can't insert a column mid-list)
drop view if exists public.alumni_public;
create view public.alumni_public as
select
  id,
  split_part(full_name, ' ', 1) || ' ' || left(split_part(full_name, ' ', 2), 1) || '.' as display_name,
  photo_url, job_title, company, company_domain, major, grad_year,
  fields, path_tags, help_types,
  (select string_agg(step->>'title', ' → ') from jsonb_array_elements(path_story) step) as path_line,
  verified, is_sample
from public.profiles
where role = 'alumni' and verified = true;
grant select on public.alumni_public to anon, authenticated;

-- Logged-in clients use explicit column grants on profiles (resume fields stay hidden).
grant select (company_domain) on public.profiles to authenticated;

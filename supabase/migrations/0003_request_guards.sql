-- Hive Network — limit what each person can change on a request.
-- Run in Supabase: Dashboard → SQL Editor → paste → Run. Safe to re-run.
-- The service role (seed scripts) has no auth.uid() and is not restricted.

create or replace function public.guard_request_insert()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null then
    -- A new request always starts unbooked, however it was submitted.
    new.status := 'pending';
    new.open_to_refer := false;
    new.ai_snapshot := null;
    new.ai_prep := null;
    new.calendly_event_uri := null;
    new.calendly_invitee_uri := null;
  end if;
  return new;
end; $$;

drop trigger if exists requests_guard_insert on public.requests;
create trigger requests_guard_insert
before insert on public.requests
for each row execute function public.guard_request_insert();

create or replace function public.guard_request_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.student_id is distinct from old.student_id or new.alumni_id is distinct from old.alumni_id then
    raise exception 'A request cannot be moved to someone else';
  end if;

  if auth.uid() = old.student_id then
    if new.open_to_refer is distinct from old.open_to_refer or new.ai_snapshot is distinct from old.ai_snapshot then
      raise exception 'Only the alum can change this';
    end if;
    if (new.type = 'referral') is distinct from (old.type = 'referral') then
      raise exception 'A chat cannot be turned into a referral request';
    end if;
    if new.status is distinct from old.status
       and not (old.status = 'pending' and new.status in ('scheduled', 'canceled')) then
      raise exception 'Students can only book or cancel an unbooked request';
    end if;

  elsif auth.uid() = old.alumni_id then
    if new.type is distinct from old.type
       or new.message is distinct from old.message
       or new.share_resume is distinct from old.share_resume
       or new.ai_prep is distinct from old.ai_prep
       or new.calendly_event_uri is distinct from old.calendly_event_uri
       or new.calendly_invitee_uri is distinct from old.calendly_invitee_uri then
      raise exception 'Alumni can only update status, referral, and snapshot';
    end if;
    if new.status is distinct from old.status
       and not ((old.status in ('pending', 'scheduled') and new.status = 'completed')
             or (old.status = 'pending' and new.status = 'declined')) then
      raise exception 'That status change is not allowed';
    end if;
    if new.open_to_refer and new.status <> 'completed' then
      raise exception 'Open to refer needs a completed chat';
    end if;
  end if;

  return new;
end; $$;

drop trigger if exists requests_guard_update on public.requests;
create trigger requests_guard_update
before update on public.requests
for each row execute function public.guard_request_update();

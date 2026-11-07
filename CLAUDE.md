# Hive Network — Project Brief & Rules for Claude

> This file is the single source of truth for the project. Read it fully before writing code.
> Context: built at **Capital Hacks 5.0** (Sac State, Nov 6–8, 2026). Pitching **Sunday Nov 8, morning** (final submissions/pitches 9am–2pm). We have ~11 working hours. **Working demo > perfect code.**

---

## 1. What we're building

**Hive Network** — a Sac State–only alumni network that turns a student's career goal into a **plan of alumni conversations**, then makes every conversation easy: booking, prep, and follow-through to a referral.

Most mentorship sites are just a directory you scroll through. Hive Network lets students **browse every alum** *and* gets them to the right people fast:

1. **Browse all alumni** — anyone can preview every alum; **full profiles unlock after logging in with a Sac State (@csus.edu) account.**
2. **Get AI Matches** — AI ranks your **top alumni matches with a score and reasons**, using your goal, skills, background, **hometown, clubs, and interests**.
3. **Get to know them as people** — every profile has an **About me** (hometown, clubs, fun facts, favorite Sac State spot) and a **Path Story**: a visual timeline of how they got from Sac State to where they are.
4. **Turn matches into a Launch Plan** — your 1–3 matches in a suggested order (who to talk to first), and why.
5. **Book a 1:1 chat** — coffee chat, mock interview, resume review, or quick question, at a time the alum has open.
6. **Show up prepared, follow through** — AI writes your first message and prep questions; after a great chat, the alum can mark you **"open to refer."**

**Pitch line:** "Sac State students don't lack talent — they lack connections and don't know who to ask. Hive Network matches you with alumni who share your goals and your story — down to your hometown and clubs — prepares you for every conversation, and turns great conversations into referrals."

### The problem (validated)
- Sac State's **student body president** told us the core problem: Sac State doesn't get many placements at top companies.
- Many students (first-gen, transfer, commuters) lack professional connections and don't know **who** to reach out to or **what to say**.
- Sac State has **280,000+ alumni** (Alumni Association figure), many at strong companies and in state government next door at the Capitol.
- Existing tools are directories or job boards: the Alumni Association's Career Network (advice from alumni), Handshake (job listings), U-Mentor (faculty/staff mentors). Other campuses have coffee-chat directories. **None start from the student's goal, show alumni journeys, offer group sessions, or lead to referrals.**

### Track
Tech or Open Tech (Wildcard).

---

## 2. Users & roles

| Role | Login | Can do |
|---|---|---|
| **Visitor** (not logged in) | none | Browse **all alumni as preview cards** (photo, first name + last initial, role, company, fields, one-line path, journey chips). Clicking a card → "Log in with your Sac State account to see the full profile." |
| `student` | Email + password, **@csus.edu emails only** | Set goal, get Launch Plan, browse alumni Path Stories, book 1:1 chats, get AI outreach + prep, track chats, request referrals after a completed chat |
| `alumni` | **LinkedIn (OIDC)** — fallback: any email (demo only) | Create profile + Path Story (AI-assisted), add their **Calendly link**, set help types + monthly limit, see booked chats with resume + AI snapshot, mark completed, toggle "open to refer" |
| `admin` | Team members | Verify alumni (Pending → Verified) |

**Full profiles are gated:** the full alumni profile (full name, bio, hometown, clubs, fun facts, Path Story, LinkedIn, Calendly booking) is visible **only to logged-in users with a Sac State account** (students via @csus.edu, plus verified alumni and admins). Enforce this in **both** the UI (`src/proxy.ts` redirect to `/login?next=/alumni/[id]`) **and** the database (RLS — anonymous users can only read the limited `alumni_public` view).

Alumni start `verified = false` ("Pending"). Admin approves → **"Verified Hornet Alum ✓"** badge. LinkedIn OIDC only gives name/email/photo (not education), so alumni self-report grad year/major and admins verify. Pitch: "In production, the Sac State Alumni Association verifies."

---

## 3. Features

### MVP (build in this order)
1. **Auth** — students: **email + password with an @csus.edu email** (Supabase email auth; DB trigger blocks non-csus.edu signups). Alumni: **LinkedIn OIDC** (free) with email + password as the demo fallback. Role chosen at onboarding. *Why not magic links for the demo:* Supabase's free built-in email sender only allows ~2 auth emails per hour per project, which would break a live demo. For the hackathon, turn **off** "Confirm email" in Supabase Auth settings and pre-create demo accounts. (Production: turn confirmation back on with a custom SMTP provider so only real csus.edu inbox owners can sign up — slides only.)
2. **Bio / "About me" for everyone (students and alumni)** — a friendly, personal section, not just a resume:
   - **Hometown** (e.g., "Stockton, CA")
   - **Clubs & organizations** at Sac State (e.g., ACM, SHPE, Hmong Student Association, Greek life, ASI)
   - **Fun facts** (2–3 short ones, e.g., "Ran the Sac State half marathon," "Can cook pho from scratch")
   - **Hobbies/interests**, **languages spoken**
   - **Favorite Sac State spot / memory** (e.g., "Library 3rd floor," "Arboretum")
   - Short free-text **bio** (2–4 sentences)
   These fields feed the AI matches ("You're both from Stockton and were both in ACM").
3. **Student onboarding** — major, class year, **career goal** (free text + target field), background tags (first-gen, transfer, commuter), **About me** fields, **resume upload (private storage)** + **AI skill extraction**.
4. **Alumni onboarding with AI** — alum pastes LinkedIn "About"/experience or resume text → AI drafts their **profile + Path Story timeline** (e.g., "Transferred from Sac City College → Sac State Statistics → Data internship at a state agency → Data Analyst at Company"), field tags, "ask me about" topics, suggested help types. Alum adds **About me** fields (hometown, clubs, fun facts…), their **Calendly scheduling link** (e.g., `https://calendly.com/maria-lopez/20min` — a free Calendly account works), and a **monthly limit**. Show a short help tip: "Create a free Calendly account → make a 20-minute event → paste its link here."
5. **All Alumni directory (public preview)** — **anyone, even logged out,** can browse **every alum** as a preview card: photo, first name + last initial, role, company, fields, one-line path, journey chips. Filters: field, company, major, grad year range, journey (Transferred, First-gen, Switched majors, Got in without an internship, State government), help type. Search box. Clicking a card when logged out → login prompt with "Log in with your Sac State account to see the full profile," then redirect back.
6. **✨ AI Matches (logged-in students)** — a "Your top matches" section at the top of the directory and on the student home page: AI picks **1–3 best-fit alumni** for this student (quality over quantity — only show strong matches; if just 1 or 2 alumni are a strong fit, show 1 or 2) using goal + target field + skills + background (first-gen, transfer) + **hometown, clubs, languages, interests**. Each match shows a **match score (e.g., 92%)** and **2–3 reasons** ("Same goal: SWE," "Both transferred from Sac City," "Both in ACM"). Buttons: **View profile**, **Not a fit** (hide + rematch), **Refresh matches**. Below the matches, the **full list of all alumni** is still shown.
7. **Full alumni profile page (login required)** — header (photo, full name, role, company, grad year, major, LinkedIn), **About me** (bio, hometown, clubs, fun facts, hobbies, languages, favorite Sac State spot), **Path Story timeline**, "ask me about," how I can help, **"Why you match"** box (if this alum is one of the student's matches), **Book a 1:1** button.
8. **Launch Plan** — button on the matches section: **"Turn my matches into a plan."** AI puts the student's 1–3 matches in a suggested order (e.g., "Step 1 — Learn the path," "Step 2 — Get interview-ready," "Step 3 — Get referral-ready"; fewer steps if fewer matches) with a one-line why each, and shows progress (✓ when a chat with that alum is completed). *(Build after #9–#13 work if short on time.)*
9. **Book a 1:1 — with an embedded Calendly** — on `/alumni/[id]/book`:
   1. Student picks a chat type (coffee chat, mock interview, resume review, quick question).
   2. "Share my resume with Maria" toggle (default ON).
   3. **AI outreach message** drafted (student can edit) — this is the note the alum will see.
   4. Click **Continue** → a `requests` row is created with `status = 'pending'` (enforce monthly limit + one open request per student→alum pair **before** showing the calendar).
   5. **The alum's Calendly opens embedded right on the page** (inline widget, not a new tab), **pre-filled** with the student's name, csus.edu email, and the outreach message (as the answer to the alum's first Calendly question, if they set one). Pass the request id via UTM (`utm_content = request id`).
   6. When the student picks a time, listen for Calendly's **`event_scheduled`** browser event → update the request to `status = 'scheduled'` and save `calendly_event_uri` + `calendly_invitee_uri` → show "✅ You're booked! Check your csus.edu email for the calendar invite" → show **AI chat prep**.
   - Calendly sends both people the calendar invite and handles time zones, rescheduling, and cancellations. We do **not** need the Calendly API or webhooks for the MVP.
   - If an alum has no Calendly link yet, show "This alum hasn't set up booking yet — send a message instead" (creates a `quick_question` request).
10. **AI chat prep** — for every 1:1: 30-second intro, 5 tailored questions (based on the alum's Path Story and the student's goal), "research first" list.
11. **Alumni inbox** — each request card: student name/major/year/tags, **student's goal**, request type + status (**Scheduled via Calendly** / Pending — not booked yet) + message, **View resume** (signed URL, only if shared), **✨ AI snapshot** (headline, 3-line summary, relevance to this alum), buttons: **Mark completed** (after the chat) and **Open to refer**. (Time changes/cancellations happen in Calendly.)
12. **My chats (student)** — status of each 1:1, time, prep link; after completion → leave a short note of thanks (shown on the alum's profile as a kudos).
13. **Referral path** — alum marks a 1:1 "Completed" and can toggle **"Open to refer."** Student sees **Request referral** → creates a `referral` request in the alum's inbox.

### Stretch (only after MVP works end-to-end)
14. **AI follow-up** — student pastes quick notes after a chat → AI writes a summary, thank-you message, and next steps; updates Launch Plan progress.
15. **Impact dashboard** (admin) — chats booked/completed, referrals made.

### Slides only (do NOT build)
Google Calendar/Zoom integration, in-app messaging, leaderboards, Alumni Association verification workflow.

---

## 4. Pages / routes

| Route | Content |
|---|---|
| `/` | Landing (logged out, with a teaser of the alumni directory). Logged in: student → **AI Matches** + Launch Plan + upcoming chats; alum → inbox summary + upcoming chats |
| `/login` | Student (csus.edu email + password) + Alumni (LinkedIn, or email + password fallback) |
| `/onboarding` | Role-specific setup (goal + resume for students; AI profile + Path Story + Calendly link for alumni) |
| `/plan` | Student's Launch Plan built from matches (generate / regenerate / swap) |
| `/alumni` | **Public**: all alumni as preview cards + filters/search. Logged-in students also see **Your top matches** at the top |
| `/alumni/[id]` | **Login required (Sac State account)**: full profile — About me, Path Story, Why you match, Book a 1:1. Logged out → redirect to `/login?next=/alumni/[id]` |
| `/alumni/[id]/book` | Booking flow: type → resume toggle → AI outreach → **embedded Calendly** (pre-filled) → booked ✅ → AI prep |
| `/chats` | Student: my 1:1s, prep, kudos, request referral |
| `/inbox` | Alumni: incoming requests with resume + AI snapshot |
| `/profile` | Edit own profile incl. **About me** (hometown, clubs, fun facts…) |
| `/admin` | Verify alumni |

---

## 5. Tech stack & conventions

### FREE-ONLY RULE (for the hackathon demo)
Use **only free tiers** — no credit cards, no paid plans:
| Need | Free choice |
|---|---|
| Code hosting | GitHub (free) |
| Website hosting | **Vercel Hobby** (free) — use the free `*.vercel.app` URL, no custom domain |
| Database, login, file storage | **Supabase Free** plan |
| Student login | Supabase email + password (no emails sent) |
| Alumni login | **LinkedIn OIDC** (free developer app) + email/password fallback |
| AI | **Gemini API free tier** (Google AI Studio key) |
| Scheduling | **Calendly Free** inline embed (`react-calendly`, free/open-source) |
| UI | Tailwind + shadcn/ui (free/open-source) |
If any step asks for a credit card or a paid upgrade, **stop and use the fallback** instead.


- **Next.js (App Router) + TypeScript**, `src/` directory, import alias `@/*`
- **Tailwind CSS + shadcn/ui** for all UI components
- **Supabase**: Auth, Postgres, Storage (private `resumes` bucket, public `avatars` bucket)
- **AI (free)**: **Google Gemini API free tier** — free API key from **Google AI Studio**, no credit card. Use the `@google/genai` SDK and a **Gemini Flash / Flash-Lite model that the official pricing page marks "Free of charge"** (put the model name in `GEMINI_MODEL` so it's easy to change). Call it ONLY from server code (`src/lib/ai/client.ts` wrapper, used by `src/lib/ai/*` route handlers/server actions). All AI functions return **JSON** (use the SDK's JSON response mode) validated with **zod**.
  - Free tier has **rate limits (roughly 10–15 requests/minute and a daily cap, per project)**. So: **cache every AI result in the database** and reuse it; never call AI on page load if a cached result exists; add retry with backoff on HTTP 429; **pre-generate AI results for all seeded data** (matches, snapshots, prep) so the demo never waits on the API.
  - Free-tier prompts may be used by Google to improve its products — don't send real student resumes during the hackathon; use sample resumes.
  - Keep `client.ts` provider-agnostic so another model can be swapped in later.
- **Scheduling**: **Calendly inline embed** via the `react-calendly` package (`InlineWidget` + `useCalendlyEventListener` → `onEventScheduled`). Pre-fill with `prefill={{ name, email, customAnswers: { a1: outreachMessage } }}` and `utm={{ utmContent: requestId }}`. Add URL option `hide_gdpr_banner=1`. Use Calendly's **free plan** (one event type per alum is enough); skip custom embed colors (paid). Only accept `calendly.com` URLs in the alum's `calendly_url` field. Calendly API/webhooks = future (slides only).
- **Hosting**: Vercel
- **Visual identity — our own, not a copy of any other site:** a **hive / launch** theme. Sac State **green `#043927`** + **gold `#C4B581`**, hexagon accents (hex-shaped avatars or badges), Path Story drawn as a vertical timeline with hexagon nodes, rocket/launch motif on the Launch Plan. Clean white background, rounded-2xl cards, large readable text. Avoid coffee-cup branding.
- Shared UI in `src/components/ui` (shadcn) and `src/components/*`.
- Every seeded/fake record shows a small **"Sample data"** label.
- Never commit `.env.local`. Commit `.env.example`.

### Environment variables (`.env.example`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server only (seeding, signed URLs)
GEMINI_API_KEY=                   # server only — free key from Google AI Studio
GEMINI_MODEL=                     # a free-tier Flash/Flash-Lite model name
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Folder structure
- Auth & onboarding: `src/app/(auth)/*`, `src/app/onboarding`
- Student side: `src/app/alumni/*` (directory, matches, full profile, booking), `src/app/plan`, `src/app/chats`
- Alumni side: `src/app/inbox`, `src/app/profile`, `src/app/admin`
- Backend: `supabase/*` (migrations, seed, sample-data.json), `src/lib/supabase/*`, `src/lib/ai/client.ts`, `src/lib/ai/alumni.ts`, `src/lib/ai/student.ts`
- Components: `src/components/ui` (shadcn), `src/components/student-side/*`, `src/components/alumni-side/*`
- Git: commit to `main` after every working feature with a clear message; push often.

---

## 6. Database (Supabase SQL — `supabase/migrations/0001_init.sql`)

```sql
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
  clubs text[] default '{}',        -- Sac State clubs/orgs
  fun_facts text[] default '{}',
  hobbies text[] default '{}',
  languages text[] default '{}',
  favorite_spot text,             -- favorite Sac State spot/memory
  path_story jsonb default '[]',  -- alumni: [{ "year": 2015, "title": "Transferred from Sac City College", "kind": "education|job|internship|pivot|milestone" }]
  path_tags text[] default '{}',  -- alumni journey chips: 'transferred','first-gen','switched-majors','no-internship','state-gov'
  ask_me_about text[] default '{}',
  fields text[] default '{}',     -- 'Software Engineering','Data/ML','Product','Design','Business','Healthcare','Public Sector/State Gov', ...
  skills text[] default '{}',
  background_tags text[] default '{}', -- students & alumni: 'first-gen','transfer','commuter', languages, hometown
  goal text,                      -- students: career goal
  goal_field text,
  help_types text[] default '{}', -- 'coffee_chat','mock_interview','resume_review','quick_question','referral'
  monthly_limit int default 2,
  calendly_url text,              -- alum's Calendly scheduling link (embedded on the booking page)
  linkedin_url text,
  resume_path text,               -- private 'resumes' bucket (students)
  verified boolean default false,
  is_sample boolean default false,
  created_at timestamptz default now()
);

-- LAUNCH PLANS (student goal -> 1-3 matched alumni in order) ---------------------
create table public.launch_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles on delete cascade,
  goal text,
  steps jsonb not null,           -- [{ "order":1, "alumni_id":"...", "step_title":"Learn the path", "why":"..." }, ...]
  created_at timestamptz default now()
);

-- 1:1 REQUESTS + REFERRAL REQUESTS -------------------------------------
create table public.requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles on delete cascade,
  alumni_id uuid references public.profiles on delete cascade,
  type text not null check (type in ('coffee_chat','mock_interview','resume_review','quick_question','referral')),
  calendly_event_uri text,       -- saved from Calendly's event_scheduled browser event
  calendly_invitee_uri text,
  message text,                   -- AI-drafted, student-edited outreach
  share_resume boolean default true,
  ai_snapshot jsonb,              -- cached for alum's inbox
  ai_prep jsonb,                  -- cached for student
  status text default 'pending' check (status in ('pending','scheduled','declined','canceled','completed')),
  open_to_refer boolean default false,
  created_at timestamptz default now()
);

-- KUDOS (student thanks shown on alum profile) -------------------------
create table public.kudos (
  id uuid primary key default gen_random_uuid(),
  alumni_id uuid references public.profiles on delete cascade,
  student_id uuid references public.profiles on delete cascade,
  request_id uuid references public.requests on delete set null,
  note text,
  created_at timestamptz default now()
);

-- AI MATCHES (cached per student) --------------------------------------
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles on delete cascade,
  alumni_id uuid references public.profiles on delete cascade,
  score int check (score between 0 and 100),
  reasons text[] default '{}',    -- 2-3 short reasons shown on cards and profile
  hidden boolean default false,   -- student clicked "Not a fit"
  created_at timestamptz default now(),
  unique (student_id, alumni_id)
);

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

-- STUDENT EMAIL RULE: email/password signups must be @csus.edu ----------
-- Exception: alumni using the email fallback (they sign up with role 'alumni'
-- in user metadata). They stay verified = false and can't see anything until
-- an admin approves them, so this can't be used to get student access.
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
```
(Full-profile access must check: student role **with an @csus.edu email**, OR alumni with `verified = true`, OR admin. Demo alumni can also be created directly by the seed script.)

### Security (Row Level Security)
- Enable RLS on all tables.
- `profiles`: **anonymous users cannot read `profiles` at all** — they only get `alumni_public`. Logged-in Sac State users (students with @csus.edu, verified alumni, admins) can read full alumni profiles (never `resume_path` — use explicit column lists). Users update only their own row; only admins set `verified`.
- `matches`: only the owning student can read/update.
- **UI gate too:** Next.js 16 proxy (`src/proxy.ts`, formerly "middleware") protects `/alumni/[id]`, `/plan`, `/chats`, `/inbox`, `/profile` → redirect to `/login?next=...` when logged out.
- `launch_plans`: only the owning student.
- `requests`: visible only to `student_id` or `alumni_id`; student creates; alum updates status/open_to_refer.
- `kudos`: read by all; insert only by a student with a completed request with that alum.
- **Resumes**: private bucket. Signed URL generated server-side only for an alum with a matching request where `share_resume = true`.

---

## 7. AI features (server-side, JSON out, zod-validated)

Always instruct the model: return ONLY valid JSON matching the schema; use only facts from the inputs; warm, professional, concise.

| # | Function (file) | Input | Output JSON |
|---|---|---|---|
| 1 | `extractSkills` (alumni.ts/shared) | student resume text | `{ skills[], summary }` |
| 2 | `buildAlumniProfile` (alumni.ts) | LinkedIn About/experience or resume text | `{ bio, path_story:[{year,title,kind}], path_tags[], fields[], ask_me_about[3], suggested_help_types[] }` |
| 3 | `applicantSnapshot` (alumni.ts) | student profile + goal + resume text (if shared) + alum profile + request/session | `{ headline, summary[3], relevance_to_you }` |
| 4 | `matchAlumni` (student.ts) | student goal + target field + skills + background + hometown + clubs + languages + interests; list of alumni with the same fields | `{ matches:[{ alumni_id, score (0-100), reasons[2-3] }] }` — **1 to 3 matches only** (return fewer if fewer are a strong fit; never pad with weak matches), reasons must be specific and true ("Both transferred from Sac City," "Same goal: SWE," "Both in ACM"); exclude hidden alumni → cache in `matches` |
| 4b | `launchPlan` (student.ts) | student goal + the student's current matches | `{ steps:[{order, alumni_id, step_title, why}] }` — one step per match (1–3), ordered "learn the path" → "get ready" → "referral-ready" |
| 5 | `draftOutreach` (student.ts) | student + alum + request type | `{ message }` — short, specific, references the alum's Path Story; never asks for a referral on first contact |
| 6 | `chatPrep` (student.ts) | student + alum + request type | `{ intro_30s, questions[5], research_first[] }` |
| 7 | *(stretch)* `followUp` (student.ts) | student notes + alum | `{ summary, thank_you_message, next_steps[] }` |

Tip for `matchAlumni`: pre-filter to ~20 candidates with simple scoring (field overlap, shared tags/hometown/clubs) before calling the AI, so the prompt stays small and fast.

Show a loading state for every AI call; let users edit AI text before saving. Cache results in the DB columns listed above.

---

## 8. Key UI designs

**Your top matches (top of `/alumni` and student home, logged in)**
```
✨ Your top matches (1–3)                                  [Refresh]
⬡ Jordan K. · SWE @ Company · '23        92% match
   • Same goal: software engineering  • Both transferred from Sac City  • Both in ACM
   [View profile]  [Not a fit]
⬡ Maria L. · Data Analyst @ Company · '19  88% match
   • Both from Stockton  • Both first-gen  • Switched into tech from data
   [View profile]  [Not a fit]
[ 🚀 Turn my matches into a Launch Plan ]
────────────── All alumni (142) ──────────────   [filters] [search]
```

**Preview card (public, logged out)** — photo, "Maria L.", role @ company, '19, field chips, one-line path, journey chips. Click → "🔒 Log in with your Sac State account to see Maria's full profile." [Log in with csus.edu]

**Full profile "About me" block (logged in)**
```
About Maria
"I grew up in Stockton, transferred from Sac City, and was the first in my family to finish college..."
📍 Hometown: Stockton, CA        🗣 Languages: English, Spanish
🐝 Clubs at Sac State: SHPE, Data Science Club
⭐ Fun facts: Ran the Sac State half marathon · Makes a mean tamale
☕ Favorite Sac State spot: Library 3rd floor
✨ Why you match: Both from Stockton · Both first-gen · Same goal: tech
```

**Launch Plan (student home)**
```
🚀 Your Launch Plan — Goal: "Land a SWE internship by summer"
 ⬡ Step 1 · Learn the path        Jordan Kim (Sac State '23, SWE @ Company)   ✓ Done
   Why: Also a transfer student; landed an internship junior year without prior experience.
 ⬡ Step 2 · Get interview-ready   Maria Lopez (Sac State '19, Data → SWE)     [Book mock interview]
 ⬡ Step 3 · Get referral-ready    Sam Patel (Sac State '15, Eng Manager)       [Book a chat]
 [Regenerate plan]  [Swap an alum]
```

**Alumni card (All Alumni directory — logged-in version adds full name + "View profile")**
```
⬡[Photo] Maria Lopez  ✓ Verified Alum                     [Sample data]
         Sac City → Sac State Statistics → State agency → Data Analyst @ Company
Journey: 🔁 Transferred · 🐝 First-gen · 🏛 Started in state government
"Ask me about breaking into data roles without a CS degree."
Offers: Coffee chat · Mock interview · Resume review · Referrals
[ View path ]
```

**Path Story (alum profile)** — vertical timeline with hexagon nodes, one per step, year on the left.

**Inbox request card (alum view)**
```
Alex Rivera · CS junior · 🐝 First-gen 🔁 Transfer
Goal: Land a SWE internship by summer
Wants: Mock interview · ✅ Scheduled via Calendly
"Hi Maria — I saw you transferred from Sac City too..."
📄 View resume
✨ AI snapshot: Strong in Python + React; built a campus app; targeting SWE internships.
   Relevant to you: you made a similar pivot into tech from data.
[Mark completed]  [Open to refer]
```

---

## 9. Seed data (`scripts/seed.ts` with service role, or `supabase/seed.sql`)
- **10 alumni** across fields, each with a 4–6 step **Path Story** — include a **state government** alum, a **first-gen transfer** alum, someone who **switched majors**, someone who **got in without an internship**, a PM, a SWE, an eng manager, a nurse/healthcare, a designer, a finance alum. full **About me** (hometown — include a few shared hometowns like Stockton, Elk Grove, Sacramento; Sac State clubs like ACM, SHPE, Hmong Student Association, Women in Engineering, ASI; 2–3 fun facts; languages; favorite spot), a Calendly link each (for the demo, 1–2 team members create free Calendly accounts; other sample alumni can reuse a team demo link), varied help types, 1–2 kudos each. `is_sample = true`, `verified = true`.
- **3 students**, including demo student **Alex Rivera** (first-gen transfer CS junior from Stockton, ACM member, goal: SWE internship by summer) with a sample resume and About me — make sure 2–3 seeded alumni share his hometown/clubs/background so the AI matches look great in the demo.
- A few existing requests in different statuses so pages aren't empty.
- Claude writes this as `supabase/sample-data.json`, and the seed script loads it.

---

## 10. Guardrails
- **Spam protection:** enforce `monthly_limit`; one pending request per student→alum pair; referral requests only after a completed 1:1 where the alum set `open_to_refer`.
- **Privacy:** resumes private; shared only with the chosen alum via signed URLs; students choose per request.
- **Respect alumni time:** 1:1 default 15–20 min; alumni control help types and limits.
- Label sample data in the UI.
- **Reference, not copy:** UC Davis's Expresso (expressodavis.org) is a good reference for the overall feel (clean mentor cards, filters by field, profiles with an about section, booking by availability — we embed Calendly). Use it for inspiration only — our own name, copy, layout details, hive/rocket visual identity, and features (AI Matches, Path Stories, Launch Plan, referral path).

---

## 11. Build order & schedule (one person + Claude Code)

One person builds everything with Claude Code, **in this order**. Finish and test each step before starting the next. Commit after each one.

| # | Task | Target time |
|---|---|---|
| 1 | **Foundation:** Next.js + TypeScript + Tailwind + shadcn/ui, Supabase client, `.env.example`, database migration + RLS + `alumni_public` view, Hive Network layout/nav | by ~4:30pm |
| 2 | **Login:** csus.edu email + password for students; email + password fallback for alumni (LinkedIn later, only if time); `proxy.ts` login gate | by ~5:00pm |
| 3 | **Sample data + seed script:** Claude writes `supabase/sample-data.json` (10 alumni with Path Stories + About me sharing hometowns/clubs with demo student Alex, 3 students, a few requests) and a seed script that loads it | by ~5:45pm |
| 4 | **Public All Alumni directory:** preview cards, filters, search, 🔒 login prompt | by ~6:30pm |
| 5 | **Full alumni profile (login required):** About me, Path Story timeline, Book a 1:1 button | by ~7:15pm |
| 6 | **Onboarding** for both roles with About me fields; alumni: AI profile + Path Story builder (AI #2) + Calendly link; students: goal + resume upload + AI skill extraction (AI #1) | by ~8:15pm |
| 7 | **✨ AI Matches** (AI #4): 1–3 alumni, score + reasons, Not a fit, Refresh; "Why you match" on profiles | by ~9:00pm |
| 8 | **Book a 1:1:** type, resume toggle, AI outreach (AI #5), **embedded Calendly** pre-filled, booked ✅, AI chat prep (AI #6) | by ~10:00pm |
| 9 | **Alumni inbox:** resume (signed URL) + AI snapshot (AI #3), Mark completed, Open to refer | by ~10:45pm |
| 10 | **My chats + referral:** status, prep, kudos, Request referral → shows in alum inbox | by ~11:30pm |
| — | **Feature freeze at 11:30pm.** Run the whole demo once start to finish. | |
| 11 | *(If time)* **Launch Plan** (AI #4b), admin verify page, LinkedIn login | Sun before 10am |
| 12 | **Pre-generate AI results** for all seed data (matches, snapshots, prep) so the demo never waits on the free Gemini rate limit | Sun ~9:00am |
| 13 | **Deploy to Vercel** (free Hobby), add env vars, test the live site | Sun ~9:30am |
| 14 | **Slides, Devpost write-up, backup demo video** (record the full demo once it works) | Sun 10–11:30am |
| 15 | **Rehearse 3+ times, submit, pitch** | Sun 11:30am–2pm |

**Accounts to create while Claude is working (all free):** Supabase (turn OFF "Confirm email"), Google AI Studio API key, Calendly (20-minute event for the demo alum), Vercel (sign in with GitHub). Text the **student body president** for permission to quote her.

**If you fall behind, cut in this order:** Launch Plan → kudos → admin page (approve alumni directly in Supabase) → LinkedIn login → AI skill extraction. **Never cut:** directory, login gate, AI Matches, booking with embedded Calendly, inbox with AI snapshot.

---

## 12. Demo script (~2 min) — build toward this
1. Open with the student body president's insight (with permission).
2. Logged out: show the **All Alumni** directory — click Maria → "🔒 Log in with your Sac State account." Log in as **Alex** (first-gen transfer CS junior from Stockton).
3. **✨ Your top matches** appear: "Maria L. — 88% · Both from Stockton · Both first-gen · Both transferred." Click **Turn my matches into a Launch Plan** → his matches in a suggested order.
4. Open **Maria's full profile** — About me (hometown, clubs, fun facts) and Path Story — "Sac City → Sac State → state agency → tech." Clicks **Book mock interview** → AI drafts a message that references her path → **Maria's Calendly appears right on the page, already filled in with Alex's info** → picks Tue 6pm → "✅ You're booked!" → **AI prep** appears.
5. Switch to **Maria's inbox** → the chat shows **Scheduled via Calendly** with Alex's goal, resume, and **AI snapshot**.
6. Fast-forward: Maria marks the chat completed and toggles **Open to refer** → Alex's plan shows ✓ Step 2 → **Request referral**.
7. Close: "From not knowing who to ask to a referral — a plan, a path, and the right people, all inside the Sac State community."

---

## 13. How to work (instructions for Claude)
- Follow the **build order in section 11**, one step at a time. Never start the next step until the human says **"next step."**
- Prefer simple, working code over abstractions. Follow the free-only rule.
- If a third-party setup (LinkedIn OAuth, etc.) blocks progress for more than ~30 minutes, use the fallback (seeded/email demo alumni) and move on.
- Before ending a step, run `npm run build` (and fix errors) so the app always compiles.
- **Commit after each step** with a message like `step 4: public alumni directory`, then push to `main`.

### ✅ CHECKPOINT — required at the end of EVERY step
Always finish a step with a checkpoint in exactly this format, then **stop and wait**:

```
✅ CHECKPOINT — Step N: <step name>  (time now vs. target in section 11)

What I built:
- <short bullet list of features/files>

What YOU need to do first (if anything):
- <accounts, keys to paste into .env.local, Supabase settings, SQL to run — exact clicks/commands>

How to test it (2–5 minutes):
1. Run: npm run dev  → open http://localhost:3000/<page>
2. <click this / log in as this demo account / type this>
3. You should see: <exact expected result>

Known issues / shortcuts taken:
- <anything incomplete, faked, or using sample data>

Committed & pushed: <commit message>

Progress: Step N of 15 done. Next up: Step N+1 — <name> (target: <time>).
Reply "next step" to continue, or tell me what to fix.
```

- If the human reports a bug, fix it, then give the checkpoint again for that step.
- If a step is falling behind its target time, say so in the checkpoint and suggest what to cut (see the cut list in section 11).

---

@AGENTS.md

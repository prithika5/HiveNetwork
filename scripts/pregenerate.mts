/**
 * Pre-generates every AI result for the sample data so the live demo never waits on
 * Gemini's free-tier rate limit: matches + Launch Plans (students), snapshots (alum inbox),
 * chat prep (student chats).
 *
 *   npm run seed:ai             # fill anything missing or stale
 *   npm run seed:ai -- --force  # regenerate everything
 *
 * - Uses the same match/plan code as the app (src/lib/match-engine.ts).
 * - Strict mode: if Gemini fails, nothing is cached for that item (no silent fallbacks),
 *   so the next run retries it. Each item is independent; one failure doesn't stop the rest.
 * - Calls are spaced out (AI_GAP_MS, default 6500ms) to stay under ~10 requests/minute.
 */
import { createClient } from "@supabase/supabase-js";
import { chatPrep, type PersonForChat } from "@/lib/ai/student";
import { applicantSnapshot } from "@/lib/ai/alumni";
import { aiErrorMessage } from "@/lib/ai/client";
import { buildPlanFor, generateMatchesFor, readPlanInputs } from "@/lib/match-engine";

const FORCE = process.argv.includes("--force");
const STRICT = { fallback: false } as const;

function gapMs() {
  const raw = process.env.AI_GAP_MS?.trim();
  const n = raw ? Number(raw) : NaN;
  if (raw && (!Number.isFinite(n) || n < 0)) console.warn(`⚠ Ignoring invalid AI_GAP_MS="${raw}" — using 6500ms`);
  return Number.isFinite(n) && n >= 0 ? n : 6500;
}
const GAP_MS = gapMs();

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let calls = 0;
const failures: string[] = [];

/** Spaces out AI work and records (instead of throwing) failures. Returns undefined on failure. */
async function step<T>(label: string, aiCalls: number, fn: () => Promise<T>): Promise<T | undefined> {
  if (calls > 0) await new Promise((r) => setTimeout(r, GAP_MS));
  calls += aiCalls;
  const t = Date.now();
  try {
    const out = await fn();
    console.log(`  ✓ ${label} (${Date.now() - t}ms)`);
    return out;
  } catch (e) {
    const msg = aiErrorMessage(e);
    console.log(`  ✗ ${label} — ${msg}`);
    failures.push(`${label}: ${msg}`);
    return undefined;
  }
}

type StudentRow = { id: string; full_name: string; onboarded: boolean; goal: string | null };
const SNAP_STUDENT_COLS = "id, full_name, major, class_year, goal, skills, background_tags, hometown, clubs, bio, resume_text";
const ALUM_COLS = "id, full_name, major, grad_year, job_title, company, bio, hometown, clubs, path_tags, ask_me_about, path_story, verified";

type SnapStudent = {
  id: string;
  full_name: string;
  major: string | null;
  class_year: number | null;
  goal: string | null;
  skills: string[] | null;
  background_tags: string[] | null;
  hometown: string | null;
  clubs: string[] | null;
  bio: string | null;
  resume_text: string | null;
};
type Alum = {
  id: string;
  full_name: string;
  major: string | null;
  grad_year: number | null;
  job_title: string | null;
  company: string | null;
  bio: string | null;
  hometown: string | null;
  clubs: string[] | null;
  path_tags: string[] | null;
  ask_me_about: string[] | null;
  path_story: { year: number; title: string }[] | null;
  verified: boolean;
};

async function main() {
  const { data: studentRows, error } = await db.from("profiles").select("id, full_name, onboarded, goal").eq("role", "student").eq("is_sample", true);
  if (error) throw new Error(error.message);
  const students = (studentRows ?? []) as StudentRow[];
  console.log(`Pre-generating AI for ${students.length} sample students${FORCE ? " (force)" : ""} — ${GAP_MS}ms between calls\n`);

  // 1. Matches + Launch Plans ------------------------------------------------
  console.log("✨ Matches & 🚀 Launch Plans");
  for (const s of students) {
    if (!s.onboarded || !s.goal) {
      console.log(`  · ${s.full_name}: skipped (not onboarded / no goal — the app wouldn't show matches)`);
      continue;
    }

    // Cached matches are reusable only if every matched alum still exists and is verified.
    const [{ data: cached }, current] = await Promise.all([
      db.from("matches").select("alumni_id").eq("student_id", s.id).eq("hidden", false),
      readPlanInputs(db, s.id),
    ]);
    const cachedCount = cached?.length ?? 0;
    const stale = cachedCount > 0 && current.length < Math.min(cachedCount, 3);
    let matchesChanged = false;

    if (cachedCount && !stale && !FORCE) {
      console.log(`  · ${s.full_name}: ${cachedCount} matches cached`);
    } else {
      if (stale) console.log(`  · ${s.full_name}: cached matches point to unverified/removed alumni — regenerating`);
      const res = await step(`${s.full_name}: matches`, 1, () => generateMatchesFor(db, s.id, STRICT));
      if (!res) continue; // keep old matches & plan; next run retries
      matchesChanged = true;
      if (!res.length) console.log("     → no strong matches");
    }

    const { data: plan } = await db.from("launch_plans").select("id").eq("student_id", s.id).limit(1).maybeSingle();
    if (plan && !matchesChanged && !FORCE) {
      console.log(`  · ${s.full_name}: Launch Plan cached`);
    } else if ((await readPlanInputs(db, s.id)).length) {
      await step(`${s.full_name}: Launch Plan`, 1, () => buildPlanFor(db, s.id, STRICT));
    } else if (plan) {
      // Matches regenerated to zero → an old plan would point at the wrong alumni.
      await db.from("launch_plans").delete().eq("student_id", s.id);
      console.log(`  · ${s.full_name}: removed stale Launch Plan (no matches)`);
    }
  }

  // 2. Snapshots + chat prep for every sample request ------------------------
  const ids = students.map((s) => s.id);
  const [{ data: reqRows, error: rErr }, { data: snapStudents }, { data: alumniRows }] = await Promise.all([
    db
      .from("requests")
      .select("id, student_id, alumni_id, type, message, share_resume, ai_snapshot, ai_prep")
      .in("student_id", ids)
      .not("status", "in", "(declined,canceled)"),
    db.from("profiles").select(SNAP_STUDENT_COLS).in("id", ids),
    db.from("profiles").select(ALUM_COLS).eq("role", "alumni"), // all alumni — inbox AI doesn't depend on verification
  ]);
  if (rErr) throw new Error(rErr.message);
  const studentById = new Map(((snapStudents ?? []) as SnapStudent[]).map((s) => [s.id, s]));
  const alumById = new Map(((alumniRows ?? []) as Alum[]).map((a) => [a.id, a]));
  const requests = reqRows ?? [];

  console.log(`\n📋 Snapshots & 📝 chat prep for ${requests.length} requests`);
  for (const r of requests) {
    const s = studentById.get(r.student_id);
    const a = alumById.get(r.alumni_id);
    if (!s || !a) {
      console.log(`  ⚠ request ${r.id}: skipped (${!s ? "student" : "alum"} profile not found)`);
      failures.push(`request ${r.id}: missing profile`);
      continue;
    }
    const label = `${s.full_name} → ${a.full_name} (${r.type})`;
    const alumPerson: PersonForChat = { ...a, clubs: a.clubs ?? [], path_tags: a.path_tags ?? [], ask_me_about: a.ask_me_about ?? [], path_story: a.path_story ?? [] };
    const studentPerson: PersonForChat = { ...s, skills: s.skills ?? [], clubs: s.clubs ?? [], background_tags: s.background_tags ?? [] };
    let did = false;

    if (!r.ai_snapshot || FORCE) {
      did = true;
      await step(`${label}: snapshot`, 1, async () => {
        const snapshot = await applicantSnapshot({
          student: {
            full_name: s.full_name,
            major: s.major,
            class_year: s.class_year,
            goal: s.goal,
            skills: s.skills ?? [],
            background_tags: s.background_tags ?? [],
            hometown: s.hometown,
            clubs: s.clubs ?? [],
            bio: s.bio,
          },
          resumeText: r.share_resume ? s.resume_text : null,
          alum: {
            full_name: a.full_name,
            job_title: a.job_title,
            company: a.company,
            path_story: a.path_story ?? [],
            ask_me_about: a.ask_me_about ?? [],
            hometown: a.hometown,
            clubs: a.clubs ?? [],
          },
          request: { type: r.type, message: r.message },
        });
        const { error: e } = await db.from("requests").update({ ai_snapshot: snapshot }).eq("id", r.id); // save immediately
        if (e) throw new Error(e.message);
      });
    }
    if (r.type !== "referral" && (!r.ai_prep || FORCE)) {
      did = true;
      await step(`${label}: chat prep`, 1, async () => {
        const prep = await chatPrep(studentPerson, alumPerson, r.type);
        const { error: e } = await db.from("requests").update({ ai_prep: prep }).eq("id", r.id);
        if (e) throw new Error(e.message);
      });
    }
    if (!did) console.log(`  · ${label}: cached`);
  }

  if (failures.length) {
    console.log(`\n⚠ Finished with ${failures.length} failure(s) after ${calls} AI calls — nothing was cached for these, so re-run \`npm run seed:ai\` to retry:`);
    failures.forEach((f) => console.log(`   - ${f}`));
    process.exitCode = 1;
  } else {
    console.log(`\n✅ Done — ${calls} AI calls. The demo's AI results are cached.`);
  }
}

main().catch((e) => {
  console.error("\n❌ Pre-generation failed:", e.message ?? e);
  process.exit(1);
});

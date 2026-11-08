/**
 * Pre-generates every AI result for the sample data so the live demo never waits on
 * Gemini's free-tier rate limit: matches + Launch Plans (students), snapshots (alum inbox),
 * chat prep (student chats).
 *
 *   npm run seed:ai           # fill anything missing
 *   npm run seed:ai -- --force  # regenerate everything
 *
 * Calls are spaced out to stay under ~10 requests/minute.
 */
import { createClient } from "@supabase/supabase-js";
import { chatPrep, launchPlan, matchAlumni, type MatchCandidate, type MatchStudent, type PersonForChat } from "@/lib/ai/student";
import { applicantSnapshot } from "@/lib/ai/alumni";

const FORCE = process.argv.includes("--force");
const GAP_MS = Number(process.env.AI_GAP_MS ?? 6500);

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let calls = 0;
async function ai<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (calls++ > 0) await new Promise((r) => setTimeout(r, GAP_MS));
  const t = Date.now();
  const out = await fn();
  console.log(`  ✓ ${label} (${Date.now() - t}ms)`);
  return out;
}

function must<T>(label: string, res: { data: T | null; error: { message: string } | null }): T {
  if (res.error || res.data == null) throw new Error(`${label}: ${res.error?.message ?? "no data"}`);
  return res.data;
}

type Profile = Record<string, unknown> & { id: string; full_name: string; help_types: string[]; path_story: { year: number; title: string }[] };

async function main() {
  const students = must<Profile[]>("students", await db.from("profiles").select("*").eq("role", "student").eq("is_sample", true));
  const alumni = must<Profile[]>("alumni", await db.from("profiles").select("*").eq("role", "alumni").eq("verified", true));
  const byId = new Map(alumni.map((a) => [a.id, a]));
  console.log(`Pre-generating AI for ${students.length} sample students and their requests${FORCE ? " (force)" : ""}…\n`);

  // 1. Matches + Launch Plans ------------------------------------------------
  console.log("✨ Matches & 🚀 Launch Plans");
  for (const s of students) {
    const { count } = await db.from("matches").select("id", { count: "exact", head: true }).eq("student_id", s.id).eq("hidden", false);
    let matches: { alumni_id: string; score: number; reasons: string[] }[];
    if (count && !FORCE) {
      matches = must("read matches", await db.from("matches").select("alumni_id, score, reasons").eq("student_id", s.id).eq("hidden", false).order("score", { ascending: false }));
      console.log(`  · ${s.full_name}: ${count} matches cached`);
    } else {
      const { data: hidden } = await db.from("matches").select("alumni_id").eq("student_id", s.id).eq("hidden", true);
      const hiddenIds = new Set((hidden ?? []).map((h) => h.alumni_id));
      matches = await ai(`${s.full_name}: matches`, () =>
        matchAlumni(s as unknown as MatchStudent, alumni.filter((a) => !hiddenIds.has(a.id)) as unknown as MatchCandidate[]),
      );
      await db.from("matches").delete().eq("student_id", s.id).eq("hidden", false);
      if (matches.length) must("save matches", await db.from("matches").insert(matches.map((m) => ({ ...m, student_id: s.id }))).select("id"));
      console.log(`     → ${matches.map((m) => `${byId.get(m.alumni_id)?.full_name} ${m.score}%`).join(", ")}`);
    }

    const { count: plans } = await db.from("launch_plans").select("id", { count: "exact", head: true }).eq("student_id", s.id);
    if (plans && !FORCE) {
      console.log(`  · ${s.full_name}: Launch Plan cached`);
    } else if (matches.length && s.goal) {
      const steps = await ai(`${s.full_name}: Launch Plan`, () =>
        launchPlan(
          String(s.goal),
          matches.slice(0, 3).map((m) => {
            const a = byId.get(m.alumni_id)!;
            return {
              alumni_id: m.alumni_id,
              reasons: m.reasons,
              full_name: a.full_name,
              job_title: a.job_title as string | null,
              company: a.company as string | null,
              help_types: a.help_types,
              path: a.path_story.map((p) => p.title).join(" → "),
            };
          }),
        ),
      );
      must("save plan", await db.from("launch_plans").insert({ student_id: s.id, goal: s.goal, steps }).select("id"));
    }
  }

  // 2. Snapshots + chat prep for every sample request ------------------------
  const studentById = new Map(students.map((s) => [s.id, s]));
  const requests = must<Record<string, unknown>[]>(
    "requests",
    await db.from("requests").select("*").in("student_id", students.map((s) => s.id)).not("status", "in", "(declined,canceled)"),
  );
  console.log(`\n📋 Snapshots & 📝 chat prep for ${requests.length} requests`);
  for (const r of requests) {
    const s = studentById.get(r.student_id as string)!;
    const a = byId.get(r.alumni_id as string);
    if (!a) continue;
    const label = `${s.full_name} → ${a.full_name} (${r.type})`;
    const patch: Record<string, unknown> = {};

    if (!r.ai_snapshot || FORCE) {
      patch.ai_snapshot = await ai(`${label}: snapshot`, () =>
        applicantSnapshot({
          student: s as never,
          resumeText: r.share_resume ? ((s.resume_text as string | null) ?? null) : null,
          alum: a as never,
          request: { type: r.type as string, message: r.message as string | null },
        }),
      );
    }
    if (r.type !== "referral" && (!r.ai_prep || FORCE)) {
      patch.ai_prep = await ai(`${label}: chat prep`, () => chatPrep(s as unknown as PersonForChat, a as unknown as PersonForChat, r.type as string));
    }
    if (Object.keys(patch).length) must("save request AI", await db.from("requests").update(patch).eq("id", r.id as string).select("id"));
    else console.log(`  · ${label}: cached`);
  }

  console.log(`\n✅ Done — ${calls} AI calls. The demo's AI results are cached.`);
}

main().catch((e) => {
  console.error("\n❌ Pre-generation failed:", e.message ?? e);
  process.exit(1);
});

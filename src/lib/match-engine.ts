import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { launchPlan, matchAlumni, type AIOptions, type MatchCandidate, type MatchResult, type MatchStudent, type PlanStep } from "@/lib/ai/student";

/**
 * Match + Launch Plan logic shared by the app (cookie-based client, RLS as the student)
 * and scripts/pregenerate.mts (service-role client). One implementation, two callers.
 */

const STUDENT_COLS = "role, onboarded, bio, goal, goal_field, major, skills, background_tags, hometown, clubs, languages, hobbies";
const ALUM_COLS = "id, full_name, job_title, company, major, grad_year, fields, path_tags, ask_me_about, skills, hometown, clubs, languages, hobbies, path_story";

export class NeedsProfileError extends Error {
  constructor() {
    super("Add your career goal in your profile first.");
  }
}

async function loadStudent(db: SupabaseClient, studentId: string) {
  const { data, error } = await db.from("profiles").select(STUDENT_COLS).eq("id", studentId).single();
  if (error || !data) throw new Error(`Couldn't load student: ${error?.message ?? "not found"}`);
  if (data.role !== "student") throw new Error("Matches are for students.");
  if (!data.onboarded || !data.goal) throw new NeedsProfileError();
  return data as MatchStudent & { goal: string };
}

/** Runs AI #4 and replaces the student's non-hidden matches (hidden "Not a fit" rows are kept and excluded). */
export async function generateMatchesFor(db: SupabaseClient, studentId: string, opts: AIOptions = {}): Promise<MatchResult[]> {
  const student = await loadStudent(db, studentId);
  const [{ data: alumni, error: aErr }, { data: hidden }] = await Promise.all([
    db.from("profiles").select(ALUM_COLS).eq("role", "alumni").eq("verified", true),
    db.from("matches").select("alumni_id").eq("student_id", studentId).eq("hidden", true),
  ]);
  if (aErr) throw new Error(aErr.message);
  const hiddenIds = new Set((hidden ?? []).map((h) => h.alumni_id));
  const candidates = (alumni ?? [])
    .filter((a) => !hiddenIds.has(a.id))
    .map((a) => ({ ...a, path_story: a.path_story ?? [] })) as unknown as MatchCandidate[];

  // AI first: if it throws (strict mode), the existing matches are left untouched.
  const results = await matchAlumni(student, candidates, opts);

  const { error: delErr } = await db.from("matches").delete().eq("student_id", studentId).eq("hidden", false);
  if (delErr) throw new Error(delErr.message);
  if (results.length) {
    const { error } = await db
      .from("matches")
      .upsert(results.map((r) => ({ student_id: studentId, ...r, hidden: false })), { onConflict: "student_id,alumni_id" });
    if (error) throw new Error(error.message);
  }
  return results;
}

type MatchRow = {
  alumni_id: string;
  reasons: string[];
  alum: { full_name: string; job_title: string | null; company: string | null; help_types: string[] | null; path_story: { title: string }[] | null; verified: boolean } | null;
};

/** Current top-3 non-hidden matches whose alum still exists and is verified. */
export async function readPlanInputs(db: SupabaseClient, studentId: string) {
  const { data, error } = await db
    .from("matches")
    .select("alumni_id, reasons, score, alum:profiles!matches_alumni_id_fkey(full_name, job_title, company, help_types, path_story, verified)")
    .eq("student_id", studentId)
    .eq("hidden", false)
    .order("score", { ascending: false })
    .limit(3);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as MatchRow[])
    .map((m) => ({ ...m, alum: Array.isArray(m.alum) ? m.alum[0] : m.alum }))
    .filter((m): m is MatchRow & { alum: NonNullable<MatchRow["alum"]> } => !!m.alum && m.alum.verified)
    .map((m) => ({
      alumni_id: m.alumni_id,
      reasons: m.reasons ?? [],
      full_name: m.alum.full_name,
      job_title: m.alum.job_title,
      company: m.alum.company,
      help_types: m.alum.help_types ?? [],
      path: (m.alum.path_story ?? []).map((p) => p.title).join(" → "),
    }));
}

/** Builds a fresh Launch Plan from current matches (generating them if there are none) and replaces old plans. */
export async function buildPlanFor(db: SupabaseClient, studentId: string, opts: AIOptions = {}): Promise<PlanStep[]> {
  const student = await loadStudent(db, studentId);
  let inputs = await readPlanInputs(db, studentId);
  if (!inputs.length) {
    await generateMatchesFor(db, studentId, opts);
    inputs = await readPlanInputs(db, studentId);
  }
  if (!inputs.length) throw new Error("No strong matches yet — add more to your profile and try again.");

  const steps = await launchPlan(student.goal, inputs, opts);
  const { error: delErr } = await db.from("launch_plans").delete().eq("student_id", studentId);
  if (delErr) throw new Error(delErr.message);
  const { error } = await db.from("launch_plans").insert({ student_id: studentId, goal: student.goal, steps });
  if (error) throw new Error(error.message);
  return steps;
}

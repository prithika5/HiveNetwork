import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { matchAlumni, type MatchCandidate, type MatchStudent } from "@/lib/ai/student";

export type MatchCard = {
  alumni_id: string;
  score: number;
  reasons: string[];
  full_name: string;
  photo_url: string | null;
  job_title: string | null;
  company: string | null;
  grad_year: number | null;
  is_sample: boolean;
};

export type MatchesState =
  | { status: "not-student" }
  | { status: "needs-profile" }
  | { status: "empty" } // onboarded but nothing cached yet → client triggers generation
  | { status: "ready"; matches: MatchCard[] };

const ALUM_COLS =
  "id, full_name, photo_url, job_title, company, major, grad_year, fields, path_tags, ask_me_about, skills, hometown, clubs, languages, hobbies, path_story, verified, is_sample";

/** Cached matches for the logged-in student (never calls AI). */
export async function getMatchesState(): Promise<MatchesState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "not-student" };
  const { data: me } = await supabase.from("profiles").select("role, onboarded, goal").eq("id", user.id).maybeSingle();
  if (me?.role !== "student") return { status: "not-student" };
  if (!me.onboarded || !me.goal) return { status: "needs-profile" };
  const matches = await readMatches(supabase, user.id);
  return matches.length ? { status: "ready", matches } : { status: "empty" };
}

async function readMatches(supabase: SupabaseClient, studentId: string): Promise<MatchCard[]> {
  const { data } = await supabase
    .from("matches")
    .select("alumni_id, score, reasons, alum:profiles!matches_alumni_id_fkey(full_name, photo_url, job_title, company, grad_year, is_sample)")
    .eq("student_id", studentId)
    .eq("hidden", false)
    .order("score", { ascending: false })
    .limit(3);
  return (data ?? [])
    .filter((m) => m.alum)
    .map((m) => {
      const alum = (Array.isArray(m.alum) ? m.alum[0] : m.alum) as Omit<MatchCard, "alumni_id" | "score" | "reasons">;
      return { alumni_id: m.alumni_id, score: m.score, reasons: m.reasons, ...alum };
    });
}

/** Runs AI #4 for the logged-in student, replaces their cached (non-hidden) matches, returns them. */
export async function generateMatches(): Promise<MatchCard[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please log in.");

  const [{ data: me }, { data: alumni }, { data: hidden }] = await Promise.all([
    supabase
      .from("profiles")
      .select("role, bio, goal, goal_field, major, skills, background_tags, hometown, clubs, languages, hobbies")
      .eq("id", user.id)
      .single(),
    supabase.from("profiles").select(ALUM_COLS).eq("role", "alumni").eq("verified", true),
    supabase.from("matches").select("alumni_id").eq("student_id", user.id).eq("hidden", true),
  ]);
  if (me?.role !== "student") throw new Error("Matches are for students.");

  const hiddenIds = new Set((hidden ?? []).map((h) => h.alumni_id));
  const candidates = (alumni ?? []).filter((a) => !hiddenIds.has(a.id)) as unknown as MatchCandidate[];
  const results = await matchAlumni(me as MatchStudent, candidates);

  await supabase.from("matches").delete().eq("student_id", user.id).eq("hidden", false);
  if (results.length) {
    const { error } = await supabase
      .from("matches")
      .upsert(results.map((r) => ({ student_id: user.id, ...r, hidden: false })), { onConflict: "student_id,alumni_id" });
    if (error) throw new Error(error.message);
  }
  return readMatches(supabase, user.id);
}

/** "Not a fit": hide this alum for good, then rematch without them. */
export async function hideAndRematch(alumniId: string): Promise<MatchCard[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please log in.");
  await supabase
    .from("matches")
    .upsert({ student_id: user.id, alumni_id: alumniId, hidden: true, score: 0, reasons: [] }, { onConflict: "student_id,alumni_id" });
  return generateMatches();
}

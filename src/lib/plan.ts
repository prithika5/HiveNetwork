import "server-only";
import { createClient } from "@/lib/supabase/server";
import { generateMatches } from "@/lib/matches";
import { launchPlan, type PlanStep } from "@/lib/ai/student";

export type PlanView = {
  goal: string | null;
  created_at: string;
  steps: (PlanStep & {
    alum: { full_name: string; job_title: string | null; company: string | null; grad_year: number | null; photo_url: string | null; is_sample: boolean } | null;
    chat: { id: string; status: string; type: string } | null; // latest non-referral request with this alum
  })[];
};

async function me() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please log in.");
  return { supabase, user };
}

/** Latest cached plan, decorated with live progress (✓ when a chat with that alum is completed). */
export async function getPlan(): Promise<PlanView | null> {
  const { supabase, user } = await me();
  const { data: plan } = await supabase
    .from("launch_plans")
    .select("goal, steps, created_at")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!plan) return null;
  const steps = plan.steps as PlanStep[];
  const ids = steps.map((s) => s.alumni_id);
  const [{ data: alumni }, { data: chats }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, job_title, company, grad_year, photo_url, is_sample").in("id", ids),
    supabase
      .from("requests")
      .select("id, alumni_id, status, type, created_at")
      .eq("student_id", user.id)
      .in("alumni_id", ids)
      .neq("type", "referral")
      .not("status", "in", "(declined,canceled)")
      .order("created_at", { ascending: false }),
  ]);
  return {
    goal: plan.goal,
    created_at: plan.created_at,
    steps: steps
      .sort((a, b) => a.order - b.order)
      .map((s) => {
        const mine = (chats ?? []).filter((c) => c.alumni_id === s.alumni_id);
        const chat = mine.find((c) => c.status === "completed") ?? mine[0] ?? null;
        return { ...s, alum: alumni?.find((a) => a.id === s.alumni_id) ?? null, chat: chat ? { id: chat.id, status: chat.status, type: chat.type } : null };
      }),
  };
}

/** Builds a new plan from the student's current matches (generating matches first if needed). */
export async function buildPlan(): Promise<void> {
  const { supabase, user } = await me();
  const { data: profile } = await supabase.from("profiles").select("role, goal").eq("id", user.id).single();
  if (profile?.role !== "student") throw new Error("Launch Plans are for students.");
  if (!profile.goal) throw new Error("Add your career goal in your profile first.");

  const read = () =>
    supabase
      .from("matches")
      .select("alumni_id, reasons, score, alum:profiles!matches_alumni_id_fkey(full_name, job_title, company, help_types, path_story)")
      .eq("student_id", user.id)
      .eq("hidden", false)
      .order("score", { ascending: false })
      .limit(3);
  let { data: matches } = await read();
  if (!matches?.length) {
    await generateMatches();
    ({ data: matches } = await read());
  }
  if (!matches?.length) throw new Error("No strong matches yet — add more to your profile and try again.");

  const steps = await launchPlan(
    profile.goal,
    matches.map((m) => {
      const a = (Array.isArray(m.alum) ? m.alum[0] : m.alum) as { full_name: string; job_title: string | null; company: string | null; help_types: string[]; path_story: { title: string }[] };
      return {
        alumni_id: m.alumni_id,
        full_name: a.full_name,
        job_title: a.job_title,
        company: a.company,
        reasons: m.reasons,
        help_types: a.help_types,
        path: (a.path_story ?? []).map((p) => p.title).join(" → "),
      };
    }),
  );
  const { error } = await supabase.from("launch_plans").insert({ student_id: user.id, goal: profile.goal, steps });
  if (error) throw new Error(error.message);
}

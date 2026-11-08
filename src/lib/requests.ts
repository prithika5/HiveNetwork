import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PersonForChat } from "@/lib/ai/student";

const STUDENT_COLS = "full_name, major, class_year, goal, bio, hometown, clubs, skills, background_tags";
const ALUM_COLS = "full_name, major, grad_year, job_title, company, bio, hometown, clubs, path_tags, ask_me_about, path_story";

/** Loads both sides of a chat for the AI prompts (RLS decides what's visible). */
export async function loadChatPeople(supabase: SupabaseClient, studentId: string, alumniId: string) {
  const [{ data: student }, { data: alum }] = await Promise.all([
    supabase.from("profiles").select(STUDENT_COLS).eq("id", studentId).single(),
    supabase.from("profiles").select(ALUM_COLS).eq("id", alumniId).eq("role", "alumni").single(),
  ]);
  if (!student || !alum) throw new Error("Couldn't load profiles for this chat.");
  return { student: student as PersonForChat, alum: alum as PersonForChat };
}

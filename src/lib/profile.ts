import { createClient } from "@/lib/supabase/server";

/** The logged-in user's own editable profile (never includes resume_path / resume_text). */
export type OwnProfile = {
  id: string;
  role: "student" | "alumni" | "admin";
  full_name: string | null;
  major: string | null;
  class_year: number | null;
  grad_year: number | null;
  company: string | null;
  job_title: string | null;
  bio: string | null;
  hometown: string | null;
  clubs: string[];
  fun_facts: string[];
  hobbies: string[];
  languages: string[];
  favorite_spot: string | null;
  path_story: { year: number; title: string; kind: string }[];
  path_tags: string[];
  ask_me_about: string[];
  fields: string[];
  skills: string[];
  background_tags: string[];
  goal: string | null;
  goal_field: string | null;
  help_types: string[];
  monthly_limit: number | null;
  calendly_url: string | null;
  linkedin_url: string | null;
  onboarded: boolean;
  verified: boolean;
  hasResume: boolean;
};

const COLS =
  "id, role, full_name, major, class_year, grad_year, company, job_title, bio, hometown, clubs, fun_facts, hobbies, languages, favorite_spot, path_story, path_tags, ask_me_about, fields, skills, background_tags, goal, goal_field, help_types, monthly_limit, calendly_url, linkedin_url, onboarded, verified";

export async function getOwnProfile(): Promise<OwnProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data }, { data: files }] = await Promise.all([
    supabase.from("profiles").select(COLS).eq("id", user.id).maybeSingle(),
    supabase.storage.from("resumes").list(user.id),
  ]);
  if (!data) return null;
  return { ...(data as Omit<OwnProfile, "hasResume">), hasResume: (files ?? []).some((f) => f.name === "resume.pdf") };
}

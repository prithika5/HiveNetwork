import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";

/** What every visitor may see (from the alumni_public view). */
export type AlumniPreview = {
  id: string;
  display_name: string;
  photo_url: string | null;
  job_title: string | null;
  company: string | null;
  major: string | null;
  grad_year: number | null;
  fields: string[];
  path_tags: string[];
  help_types: string[];
  path_line: string | null;
  verified: boolean;
  is_sample: boolean;
  /** Only present when the viewer is logged in with a Sac State account. */
  full_name?: string;
  ask_me_about?: string[];
};

export type Directory = { alumni: AlumniPreview[]; unlocked: boolean };

/**
 * Loads all alumni previews. If the viewer is a logged-in Sac State member, RLS lets
 * them read full names + "ask me about" too, which we merge in (unlocked = true).
 */
export async function getDirectory(): Promise<Directory> {
  if (!supabaseConfigured) return { alumni: [], unlocked: false };
  const supabase = await createClient();
  const { data: previews, error } = await supabase
    .from("alumni_public")
    .select("id, display_name, photo_url, job_title, company, major, grad_year, fields, path_tags, help_types, path_line, verified, is_sample")
    .order("grad_year", { ascending: false });
  if (error) throw new Error(error.message);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  let unlocked = false;
  const extra = new Map<string, { full_name: string; ask_me_about: string[] }>();
  if (user) {
    const { data: full } = await supabase.from("profiles").select("id, full_name, ask_me_about").eq("role", "alumni");
    if (full && full.length > 0) {
      unlocked = true;
      for (const p of full) extra.set(p.id, { full_name: p.full_name ?? "", ask_me_about: p.ask_me_about ?? [] });
    }
  }
  return {
    unlocked,
    alumni: (previews ?? []).map((a) => ({ ...a, ...(extra.get(a.id) ?? {}) }) as AlumniPreview),
  };
}

/** Full alumni profile — only readable by logged-in Sac State members (enforced by RLS). */
export type PathStep = { year: number; title: string; kind: string };
export type AlumniProfile = {
  id: string;
  full_name: string;
  photo_url: string | null;
  job_title: string | null;
  company: string | null;
  major: string | null;
  grad_year: number | null;
  bio: string | null;
  hometown: string | null;
  clubs: string[];
  fun_facts: string[];
  hobbies: string[];
  languages: string[];
  favorite_spot: string | null;
  path_story: PathStep[];
  path_tags: string[];
  ask_me_about: string[];
  fields: string[];
  help_types: string[];
  calendly_url: string | null;
  linkedin_url: string | null;
  verified: boolean;
  is_sample: boolean;
};

const PROFILE_COLUMNS =
  "id, full_name, photo_url, job_title, company, major, grad_year, bio, hometown, clubs, fun_facts, hobbies, languages, favorite_spot, path_story, path_tags, ask_me_about, fields, help_types, calendly_url, linkedin_url, verified, is_sample";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getAlumniProfile(id: string): Promise<AlumniProfile | null> {
  if (!supabaseConfigured || !UUID.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", id).eq("role", "alumni").maybeSingle();
  if (!data) return null;
  return { ...data, path_story: [...((data.path_story as PathStep[]) ?? [])].sort((a, b) => a.year - b.year) } as AlumniProfile;
}

/** Does this alum exist publicly? (Lets us tell "locked" apart from "not found".) */
export async function alumniExists(id: string): Promise<boolean> {
  if (!supabaseConfigured || !UUID.test(id)) return false;
  const supabase = await createClient();
  const { data } = await supabase.from("alumni_public").select("id").eq("id", id).maybeSingle();
  return !!data;
}

export async function getKudos(alumniId: string): Promise<{ id: string; note: string; created_at: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("kudos")
    .select("id, note, created_at")
    .eq("alumni_id", alumniId)
    .order("created_at", { ascending: false })
    .limit(6);
  return data ?? [];
}

/** The viewer's cached AI match for this alum, if any (Step 7 fills the matches table). */
export async function getMatchFor(alumniId: string): Promise<{ score: number; reasons: string[] } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("matches")
    .select("score, reasons")
    .eq("student_id", user.id)
    .eq("alumni_id", alumniId)
    .eq("hidden", false)
    .maybeSingle();
  return data ?? null;
}

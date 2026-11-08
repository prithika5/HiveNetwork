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

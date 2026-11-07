import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";

export type Role = "student" | "alumni" | "admin";
export type CurrentUser = {
  id: string;
  email: string;
  role: Role;
  fullName: string | null;
  photoUrl: string | null;
  onboarded: boolean;
  verified: boolean;
};

/** Logged-in user + their profile, or null. Safe to call before Supabase is configured. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!supabaseConfigured) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, photo_url, onboarded, verified")
    .eq("id", user.id)
    .maybeSingle();
  return {
    id: user.id,
    email: user.email ?? "",
    role: (profile?.role as Role) ?? "student",
    fullName: profile?.full_name ?? null,
    photoUrl: profile?.photo_url ?? null,
    onboarded: profile?.onboarded ?? false,
    verified: profile?.verified ?? false,
  };
}

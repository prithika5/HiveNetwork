"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Admins approve/unapprove alumni. RLS + the protect_profile_fields trigger enforce admin-only. */
export async function setVerifiedAction(alumniId: string, verified: boolean): Promise<{ ok: boolean; error?: string }> {
  if (!z.string().uuid().safeParse(alumniId).success) return { ok: false, error: "Invalid id." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please log in." };
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return { ok: false, error: "Admins only." };
  const { error } = await supabase.from("profiles").update({ verified }).eq("id", alumniId).eq("role", "alumni");
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  revalidatePath("/alumni");
  return { ok: true };
}

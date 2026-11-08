"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const Uuid = z.string().uuid();

async function me() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please log in again.");
  return { supabase, user };
}

type R = { ok: true } | { ok: false; error: string };

/** Thank-you note → shown on the alum's profile. RLS only allows it after a completed chat. */
export async function sendKudosAction(requestId: string, note: string): Promise<R> {
  const text = note.trim();
  if (!Uuid.safeParse(requestId).success) return { ok: false, error: "Invalid chat." };
  if (text.length < 5 || text.length > 400) return { ok: false, error: "Keep your note between 5 and 400 characters." };
  try {
    const { supabase, user } = await me();
    const { data: req } = await supabase
      .from("requests")
      .select("id, alumni_id, status")
      .eq("id", requestId)
      .eq("student_id", user.id)
      .single();
    if (!req || req.status !== "completed") return { ok: false, error: "You can thank an alum after your chat is completed." };
    const { data: existing } = await supabase.from("kudos").select("id").eq("request_id", req.id).eq("student_id", user.id).maybeSingle();
    if (existing) return { ok: false, error: "You already thanked them for this chat 💛" };
    const { error } = await supabase.from("kudos").insert({ alumni_id: req.alumni_id, student_id: user.id, request_id: req.id, note: text });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/chats");
    revalidatePath(`/alumni/${req.alumni_id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Creates a referral request. The DB only allows it after a completed chat where the alum is open to refer. */
export async function requestReferralAction(alumniId: string, message: string): Promise<R> {
  const text = message.trim();
  if (!Uuid.safeParse(alumniId).success) return { ok: false, error: "Invalid alum." };
  if (text.length < 20 || text.length > 1500) return { ok: false, error: "Add a short note (which role, and a link if you have one)." };
  if (/\[(role|company|job link)\]/i.test(text)) return { ok: false, error: "Fill in the [role], [company], and [job link] parts so it's easy to say yes." };
  try {
    const { supabase, user } = await me();
    const { data: open } = await supabase
      .from("requests")
      .select("id")
      .eq("student_id", user.id)
      .eq("alumni_id", alumniId)
      .eq("type", "referral")
      .eq("status", "pending")
      .maybeSingle();
    if (open) return { ok: false, error: "You already have a referral request waiting with this alum." };
    const { error } = await supabase
      .from("requests")
      .insert({ student_id: user.id, alumni_id: alumniId, type: "referral", message: text, share_resume: true, status: "pending" });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/chats");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Student withdraws a request that was never booked. */
export async function cancelRequestAction(requestId: string): Promise<R> {
  if (!Uuid.safeParse(requestId).success) return { ok: false, error: "Invalid chat." };
  try {
    const { supabase, user } = await me();
    const { error, count } = await supabase
      .from("requests")
      .update({ status: "canceled" }, { count: "exact" })
      .eq("id", requestId)
      .eq("student_id", user.id)
      .eq("status", "pending");
    if (error) return { ok: false, error: error.message };
    if (!count) return { ok: false, error: "Only requests that aren't booked yet can be canceled here — use Calendly for booked chats." };
    revalidatePath("/chats");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

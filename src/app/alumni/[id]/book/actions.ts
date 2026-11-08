"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { chatPrep, draftOutreach, type ChatPrep } from "@/lib/ai/student";
import { loadChatPeople } from "@/lib/requests";

const BOOKABLE = ["coffee_chat", "mock_interview", "resume_review", "quick_question"] as const;
const Uuid = z.string().uuid();

async function requireStudent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please log in again.");
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "student") throw new Error("Only students can book 1:1s.");
  return { supabase, user };
}

export async function draftOutreachAction(alumniId: string, type: string): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  try {
    if (!Uuid.safeParse(alumniId).success || !(BOOKABLE as readonly string[]).includes(type)) throw new Error("Invalid request.");
    const { supabase, user } = await requireStudent();
    const { student, alum } = await loadChatPeople(supabase, user.id, alumniId);
    const { message } = await draftOutreach(student, alum, type);
    return { ok: true, message };
  } catch {
    return { ok: false, error: "AI is busy right now (free tier limit) — write a quick note yourself, or try again in a minute." };
  }
}

const StartInput = z.object({
  alumniId: Uuid,
  type: z.enum(BOOKABLE),
  message: z.string().trim().min(10, "Add a short note so they know why you're reaching out.").max(1500),
  shareResume: z.boolean(),
});

/**
 * Creates the pending request BEFORE the calendar is shown, so the DB can enforce the
 * monthly limit + one-open-request rule. Re-uses an existing unbooked request with this alum.
 */
export async function startBookingAction(input: z.infer<typeof StartInput>): Promise<{ ok: true; requestId: string } | { ok: false; error: string }> {
  const parsed = StartInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  const { alumniId, type, message, shareResume } = parsed.data;
  try {
    const { supabase, user } = await requireStudent();
    const { data: open } = await supabase
      .from("requests")
      .select("id, status")
      .eq("student_id", user.id)
      .eq("alumni_id", alumniId)
      .neq("type", "referral")
      .in("status", ["pending", "scheduled"])
      .maybeSingle();

    if (open?.status === "scheduled") return { ok: false, error: "You already have a chat booked with this alum — see My chats." };
    if (open) {
      const { error } = await supabase
        .from("requests")
        .update({ type, message, share_resume: shareResume, ai_prep: null })
        .eq("id", open.id);
      if (error) return { ok: false, error: error.message };
      return { ok: true, requestId: open.id };
    }

    const { data, error } = await supabase
      .from("requests")
      .insert({ student_id: user.id, alumni_id: alumniId, type, message, share_resume: shareResume, status: "pending" })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message }; // DB guardrail messages are human-readable
    revalidatePath("/chats");
    return { ok: true, requestId: data.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

const CalendlyUri = z.string().url().refine((u) => /^https:\/\/([a-z0-9-]+\.)?calendly\.com\//i.test(u), "Not a Calendly URI");

/** Called from Calendly's `event_scheduled` browser event. */
export async function markScheduledAction(requestId: string, eventUri: string, inviteeUri: string): Promise<{ ok: boolean; error?: string }> {
  if (!Uuid.safeParse(requestId).success || !CalendlyUri.safeParse(eventUri).success || !CalendlyUri.safeParse(inviteeUri).success) {
    return { ok: false, error: "Invalid booking data." };
  }
  const { supabase, user } = await requireStudent();
  const { error } = await supabase
    .from("requests")
    .update({ status: "scheduled", calendly_event_uri: eventUri, calendly_invitee_uri: inviteeUri })
    .eq("id", requestId)
    .eq("student_id", user.id)
    .eq("status", "pending");
  if (error) return { ok: false, error: error.message };
  revalidatePath("/chats");
  return { ok: true };
}

/** AI #6 — cached on the request so it's generated once. */
export async function chatPrepAction(requestId: string): Promise<{ ok: true; prep: ChatPrep } | { ok: false; error: string }> {
  try {
    if (!Uuid.safeParse(requestId).success) throw new Error("Invalid request.");
    const { supabase, user } = await requireStudent();
    const { data: req } = await supabase
      .from("requests")
      .select("id, alumni_id, type, ai_prep")
      .eq("id", requestId)
      .eq("student_id", user.id)
      .single();
    if (!req) throw new Error("Request not found.");
    if (req.ai_prep) return { ok: true, prep: req.ai_prep as ChatPrep };

    const { student, alum } = await loadChatPeople(supabase, user.id, req.alumni_id);
    const prep = await chatPrep(student, alum, req.type);
    await supabase.from("requests").update({ ai_prep: prep }).eq("id", req.id);
    return { ok: true, prep };
  } catch {
    return { ok: false, error: "AI prep is busy right now — you can open it again from My chats in a minute." };
  }
}

/** No Calendly link yet → send a quick question instead. */
export async function sendMessageInsteadAction(alumniId: string, message: string, shareResume: boolean) {
  return startBookingAction({ alumniId, type: "quick_question", message, shareResume });
}

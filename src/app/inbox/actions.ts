"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applicantSnapshot, type ApplicantSnapshot } from "@/lib/ai/alumni";

const Uuid = z.string().uuid();

/** Loads a request the logged-in alum owns (RLS + explicit check). */
async function ownRequest(requestId: string) {
  if (!Uuid.safeParse(requestId).success) throw new Error("Invalid request.");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please log in again.");
  const { data: req } = await supabase
    .from("requests")
    .select("id, student_id, alumni_id, type, status, message, share_resume, open_to_refer, ai_snapshot")
    .eq("id", requestId)
    .eq("alumni_id", user.id)
    .maybeSingle();
  if (!req) throw new Error("Request not found.");
  return { supabase, user, req };
}

/** Private resume → short-lived signed URL, only if the student chose to share it with this alum. */
export async function resumeUrlAction(requestId: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const { req } = await ownRequest(requestId);
    if (!req.share_resume) return { ok: false, error: "This student didn't share their resume." };
    const admin = createAdminClient();
    const { data: student } = await admin.from("profiles").select("resume_path").eq("id", req.student_id).single();
    if (!student?.resume_path) return { ok: false, error: "No resume on file." };
    const { data, error } = await admin.storage.from("resumes").createSignedUrl(student.resume_path, 60 * 10);
    if (error || !data) return { ok: false, error: "Couldn't open the resume." };
    return { ok: true, url: data.signedUrl };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** AI #3 — cached in requests.ai_snapshot. */
export async function snapshotAction(requestId: string): Promise<{ ok: true; snapshot: ApplicantSnapshot } | { ok: false; error: string }> {
  try {
    const { supabase, user, req } = await ownRequest(requestId);
    if (req.ai_snapshot) return { ok: true, snapshot: req.ai_snapshot as ApplicantSnapshot };
    const admin = createAdminClient();
    const [{ data: student }, { data: alum }] = await Promise.all([
      admin
        .from("profiles")
        .select("full_name, major, class_year, goal, skills, background_tags, hometown, clubs, bio, resume_text")
        .eq("id", req.student_id)
        .single(),
      supabase.from("profiles").select("full_name, job_title, company, path_story, ask_me_about, hometown, clubs").eq("id", user.id).single(),
    ]);
    if (!student || !alum) throw new Error("Couldn't load profiles.");
    const { resume_text, ...studentInfo } = student;
    const snapshot = await applicantSnapshot({
      student: studentInfo,
      resumeText: req.share_resume ? resume_text : null,
      alum,
      request: { type: req.type, message: req.message },
    });
    await supabase.from("requests").update({ ai_snapshot: snapshot }).eq("id", req.id);
    return { ok: true, snapshot };
  } catch {
    return { ok: false, error: "AI snapshot is busy (free tier limit) — try again in a minute." };
  }
}

export async function markCompletedAction(requestId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { supabase, req } = await ownRequest(requestId);
    if (!["pending", "scheduled"].includes(req.status)) return { ok: false, error: "This chat is already closed." };
    const { error } = await supabase.from("requests").update({ status: "completed" }).eq("id", req.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/inbox");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function setOpenToReferAction(requestId: string, open: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    const { supabase, req } = await ownRequest(requestId);
    if (req.status !== "completed" || req.type === "referral") return { ok: false, error: "Mark the chat completed first." };
    const { error } = await supabase.from("requests").update({ open_to_refer: open }).eq("id", req.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/inbox");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function declineAction(requestId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { supabase, req } = await ownRequest(requestId);
    if (req.status !== "pending") return { ok: false, error: "Only pending requests can be declined." };
    const { error } = await supabase.from("requests").update({ status: "declined" }).eq("id", req.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/inbox");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

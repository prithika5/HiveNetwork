"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { extractText, getDocumentProxy } from "unpdf";
import { createClient } from "@/lib/supabase/server";
import { buildAlumniProfile, extractSkills, type DraftAlumniProfile } from "@/lib/ai/alumni";
import { BACKGROUND_TAGS, FIELDS, HELP_TYPE_KEYS, PATH_KINDS, PATH_TAGS } from "@/lib/options";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please log in again.");
  return { supabase, user };
}

const text = (max = 200) => z.string().trim().max(max);
const list = (max = 12) => z.array(z.string().trim().min(1).max(120)).max(max);
const year = z.coerce.number().int().min(1950).max(2035).nullable();

const AboutMe = z.object({
  full_name: text(80).min(1, "Add your name"),
  bio: text(1200),
  hometown: text(80),
  clubs: list(),
  fun_facts: list(5),
  hobbies: list(),
  languages: list(),
  favorite_spot: text(120),
});

const StudentInput = AboutMe.extend({
  major: text(80).min(1, "Add your major"),
  class_year: year,
  goal: text(300).min(1, "Tell us your career goal"),
  goal_field: z.enum(FIELDS, { error: "Pick your target field." }),
  background_tags: z.array(z.enum(BACKGROUND_TAGS, { error: "Pick background options from the list." })),
  skills: list(20),
});
export type StudentInput = z.infer<typeof StudentInput>;

const AlumniInput = AboutMe.extend({
  major: text(80).min(1, "Add your Sac State major"),
  grad_year: year,
  job_title: text(100).min(1, "Add your current role"),
  company: text(100),
  path_story: z
    .array(z.object({ year: z.coerce.number().int().min(1950).max(2035), title: text(140).min(1, "Each Path Story step needs a description."), kind: z.enum(PATH_KINDS, { error: "Pick a type for each Path Story step." }) }))
    .max(10),
  path_tags: z.array(z.enum(PATH_TAGS, { error: "Pick journey tags from the list." })),
  fields: z.array(z.enum(FIELDS, { error: "Pick fields from the list." })).min(1, "Pick at least one field you work in."),
  ask_me_about: list(3),
  help_types: z.array(z.enum(HELP_TYPE_KEYS, { error: "Pick help types from the list." })).min(1, "Pick at least one way you can help."),
  monthly_limit: z.coerce.number({ error: "Chats per month must be a number." }).int().min(1, "Allow at least 1 chat per month.").max(20, "Keep it to 20 chats per month or fewer."),
  calendly_url: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https:\/\/(www\.)?calendly\.com\/\S+$/i.test(v), "Calendly links must start with https://calendly.com/"),
  linkedin_url: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https:\/\/(www\.)?linkedin\.com\/\S+$/i.test(v), "LinkedIn links must start with https://linkedin.com/"),
});
export type AlumniInput = z.infer<typeof AlumniInput>;

type Result = { ok: true } | { ok: false; error: string };
const firstIssue = (e: z.ZodError) => e.issues[0]?.message ?? "Please check the form.";
const nullIfEmpty = (v: string) => (v === "" ? null : v);

export async function saveStudentProfile(input: StudentInput): Promise<Result> {
  const parsed = StudentInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { supabase, user } = await requireUser();
  const d = parsed.data;
  const { error } = await supabase
    .from("profiles")
    .update({
      ...d,
      hometown: nullIfEmpty(d.hometown),
      favorite_spot: nullIfEmpty(d.favorite_spot),
      bio: nullIfEmpty(d.bio),
      onboarded: true,
    })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  // Profile changed → old AI matches are stale (Step 7 regenerates them).
  await supabase.from("matches").delete().eq("student_id", user.id).eq("hidden", false);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveAlumniProfile(input: AlumniInput): Promise<Result> {
  const parsed = AlumniInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { supabase, user } = await requireUser();
  const d = parsed.data;
  const { error } = await supabase
    .from("profiles")
    .update({
      ...d,
      company: nullIfEmpty(d.company),
      hometown: nullIfEmpty(d.hometown),
      favorite_spot: nullIfEmpty(d.favorite_spot),
      bio: nullIfEmpty(d.bio),
      calendly_url: nullIfEmpty(d.calendly_url),
      linkedin_url: nullIfEmpty(d.linkedin_url),
      path_story: [...d.path_story].sort((a, b) => a.year - b.year),
      onboarded: true,
    })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Upload a PDF resume to the private bucket, extract its text, and ask AI for skills. */
export async function uploadResume(
  formData: FormData,
): Promise<{ ok: true; skills: string[]; summary: string; aiError?: string } | { ok: false; error: string }> {
  const file = formData.get("resume");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a PDF file." };
  if (file.type !== "application/pdf") return { ok: false, error: "Resumes must be a PDF." };
  if (file.size > 4 * 1024 * 1024) return { ok: false, error: "Keep your resume under 4 MB." };

  const { supabase, user } = await requireUser();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const path = `${user.id}/resume.pdf`;
  const up = await supabase.storage.from("resumes").upload(path, bytes, { contentType: "application/pdf", upsert: true });
  if (up.error) return { ok: false, error: `Upload failed: ${up.error.message}` };

  let resumeText = "";
  try {
    const pdf = await getDocumentProxy(bytes);
    resumeText = (await extractText(pdf, { mergePages: true })).text.trim();
  } catch {
    // Unreadable PDF — still keep the upload.
  }
  await supabase.from("profiles").update({ resume_path: path, resume_text: resumeText || null }).eq("id", user.id);

  if (!resumeText) return { ok: true, skills: [], summary: "", aiError: "Saved! We couldn't read text from this PDF — add your skills below." };
  try {
    const { skills, summary } = await extractSkills(resumeText);
    return { ok: true, skills, summary };
  } catch {
    return { ok: true, skills: [], summary: "", aiError: "Resume saved, but AI is busy right now — add your skills below or try again in a minute." };
  }
}

export async function draftAlumniProfile(
  source: string,
): Promise<{ ok: true; draft: DraftAlumniProfile } | { ok: false; error: string }> {
  await requireUser();
  if (source.trim().length < 80) return { ok: false, error: "Paste a bit more — your LinkedIn About + experience works best." };
  try {
    return { ok: true, draft: await buildAlumniProfile(source) };
  } catch {
    return { ok: false, error: "AI is busy right now (free tier limit). Wait a minute and try again, or fill the form in yourself." };
  }
}

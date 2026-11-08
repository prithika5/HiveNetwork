import "server-only";
import { z } from "zod";
import { generateJSON } from "./client";
import { FIELDS, HELP_TYPE_KEYS, PATH_KINDS, PATH_TAGS } from "@/lib/options";

/** Keep only values from an allowed list (models occasionally invent labels). */
const oneOf = <T extends readonly string[]>(allowed: T) =>
  z.array(z.string()).transform((xs) => xs.filter((x): x is T[number] => (allowed as readonly string[]).includes(x)));

// AI #1 ------------------------------------------------------------------
const SkillsSchema = z.object({
  skills: z.array(z.string()).transform((xs) => [...new Set(xs.map((s) => s.trim()).filter(Boolean))].slice(0, 15)),
  summary: z.string(),
});
export type ExtractedSkills = z.infer<typeof SkillsSchema>;

export function extractSkills(resumeText: string) {
  return generateJSON(
    `Extract the student's concrete skills from this resume.
Return JSON: { "skills": string[] (up to 15 short skill names — languages, tools, frameworks, domains; no soft-skill fluff), "summary": string (one sentence describing the student) }.

RESUME:
"""${resumeText.slice(0, 12000)}"""`,
    SkillsSchema,
  );
}

// AI #2 ------------------------------------------------------------------
const AlumniProfileSchema = z.object({
  job_title: z.string().nullable().catch(null),
  company: z.string().nullable().catch(null),
  major: z.string().nullable().catch(null),
  grad_year: z.number().int().min(1950).max(2035).nullable().catch(null),
  bio: z.string(),
  path_story: z
    .array(
      z.object({
        year: z.coerce.number().int(),
        title: z.string(),
        kind: z.string().transform((k) => ((PATH_KINDS as readonly string[]).includes(k) ? k : "milestone")),
      }),
    )
    .transform((steps) => steps.sort((a, b) => a.year - b.year).slice(0, 8)),
  path_tags: oneOf(PATH_TAGS),
  fields: oneOf(FIELDS),
  ask_me_about: z.array(z.string()).transform((xs) => xs.slice(0, 3)),
  suggested_help_types: oneOf(HELP_TYPE_KEYS),
});
export type DraftAlumniProfile = z.infer<typeof AlumniProfileSchema>;

export function buildAlumniProfile(text: string) {
  return generateJSON(
    `A Sac State (California State University, Sacramento) alum pasted their LinkedIn "About"/experience or resume below.
Draft their Hive Network profile. Use ONLY facts in the text — if something is unknown use null or leave it out.

Return JSON:
{
  "job_title": string | null,            // current role
  "company": string | null,              // current employer
  "major": string | null,                // Sac State major, subject only (e.g. "Nursing", not "B.S. Nursing")
  "grad_year": number | null,            // Sac State graduation year
  "bio": string,                         // 2–4 warm first-person sentences, written as the alum
  "path_story": [{ "year": number, "title": string, "kind": "education" | "internship" | "job" | "pivot" | "milestone" }],
                                          // 4–6 steps, oldest first, short titles like "Transferred to Sac State — Statistics"
  "path_tags": string[],                 // only tags the text clearly supports:
                                          //   "transferred" = attended a community college or another school before Sac State
                                          //   "first-gen" = says they're the first in their family to go to college
                                          //   "switched-majors" = changed their MAJOR in college (a later career change does NOT count)
                                          //   "no-internship" = says they got their first job without an internship
                                          //   "state-gov" = worked for the State of California or a state agency
  "fields": string[],                    // 1–3 from: ${FIELDS.join(", ")}
  "ask_me_about": string[],              // exactly 3 short topics students could ask them about
  "suggested_help_types": string[]       // from: ${HELP_TYPE_KEYS.join(", ")}
}

TEXT:
"""${text.slice(0, 12000)}"""`,
    AlumniProfileSchema,
  );
}

// AI #3 ------------------------------------------------------------------
const SnapshotSchema = z.object({
  headline: z.string(),
  summary: z.array(z.string()).transform((s) => s.slice(0, 3)),
  relevance_to_you: z.string(),
});
export type ApplicantSnapshot = z.infer<typeof SnapshotSchema>;

export function applicantSnapshot(input: {
  student: { full_name: string; major: string | null; class_year: number | null; goal: string | null; skills: string[]; background_tags: string[]; hometown: string | null; clubs: string[]; bio: string | null };
  resumeText: string | null;
  alum: { full_name: string; job_title: string | null; company: string | null; path_story: { year: number; title: string }[]; ask_me_about: string[]; hometown: string | null; clubs: string[] };
  request: { type: string; message: string | null };
}) {
  const { student, resumeText, alum, request } = input;
  return generateJSON(
    `Give a busy Sac State alum a quick snapshot of the student who requested a ${request.type.replace("_", " ")} with them.

STUDENT
- ${student.full_name}, ${student.major ?? ""} (class of ${student.class_year ?? "?"})
- Goal: ${student.goal ?? "—"}
- Skills: ${student.skills.join(", ") || "—"} · Background: ${student.background_tags.join(", ") || "—"}
- Hometown: ${student.hometown ?? "—"} · Clubs: ${student.clubs.join(", ") || "—"}
- Bio: ${student.bio ?? "—"}
- Their note: ${request.message ?? "—"}
${resumeText ? `- Resume:\n"""${resumeText.slice(0, 8000)}"""` : "- Resume: not shared"}

ALUM (the reader, "you")
- ${alum.full_name}, ${[alum.job_title, alum.company].filter(Boolean).join(" @ ")}
- Path: ${alum.path_story.map((s) => `${s.year} ${s.title}`).join(" → ")}
- Hometown: ${alum.hometown ?? "—"} · Clubs: ${alum.clubs.join(", ") || "—"} · Ask me about: ${alum.ask_me_about.join("; ")}

Return JSON:
{
  "headline": string,          // ≤ 12 words, e.g. "Transfer CS junior building real apps, targeting SWE internships"
  "summary": string[],         // exactly 3 short lines: strengths/projects, what they want from this chat, one thing to know
  "relevance_to_you": string   // one sentence, addressed to the alum as "you", on why YOU specifically can help (shared path, hometown, club, skills)
}`,
    SnapshotSchema,
  );
}

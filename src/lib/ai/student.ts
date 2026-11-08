import "server-only";
import { z } from "zod";
import { generateJSON } from "./client";

export type MatchStudent = {
  bio: string | null;
  goal: string | null;
  goal_field: string | null;
  major: string | null;
  skills: string[];
  background_tags: string[];
  hometown: string | null;
  clubs: string[];
  languages: string[];
  hobbies: string[];
};

export type MatchCandidate = {
  id: string;
  full_name: string;
  job_title: string | null;
  company: string | null;
  major: string | null;
  grad_year: number | null;
  fields: string[];
  path_tags: string[];
  ask_me_about: string[];
  skills: string[];
  hometown: string | null;
  clubs: string[];
  languages: string[];
  hobbies: string[];
  path_story: { year: number; title: string }[];
};

export type MatchResult = { alumni_id: string; score: number; reasons: string[] };

const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/,?\s*(ca|california)\.?$/, "").trim();
const lowerSet = (xs: string[]) => new Set(xs.map((x) => x.toLowerCase().trim()));

/**
 * Cheap, explainable pre-score. Also produces the list of TRUE shared facts that the AI
 * is allowed to cite as reasons (so it can't invent "both in ACM").
 */
export function preScore(s: MatchStudent, a: MatchCandidate): { points: number; shared: string[] } {
  const shared: string[] = [];
  let points = 0;

  if (s.goal_field && a.fields.includes(s.goal_field)) {
    points += 4;
    shared.push(`Same field: ${s.goal_field}`);
  }
  if (s.hometown && norm(s.hometown) === norm(a.hometown)) {
    points += 2.5;
    shared.push(`Both from ${a.hometown?.replace(/,?\s*CA$/, "")}`);
  }
  const clubs = lowerSet(s.clubs);
  for (const c of a.clubs) {
    if (clubs.has(c.toLowerCase().trim())) {
      points += 2;
      shared.push(`Both in ${c}`);
    }
  }
  if (s.background_tags.includes("transfer") && a.path_tags.includes("transferred")) {
    points += 2;
    shared.push("Both transfer students");
  }
  if (s.background_tags.includes("first-gen") && a.path_tags.includes("first-gen")) {
    points += 2;
    shared.push("Both first-gen college students");
  }
  const langs = lowerSet(s.languages);
  for (const l of a.languages) {
    if (l.toLowerCase() !== "english" && langs.has(l.toLowerCase())) {
      points += 0.75;
      shared.push(`Both speak ${l}`);
    }
  }
  const skills = lowerSet(s.skills);
  const common = a.skills.filter((k) => skills.has(k.toLowerCase()));
  if (common.length) {
    points += Math.min(common.length, 2) * 0.5;
    shared.push(`Shared skills: ${common.slice(0, 3).join(", ")}`);
  }
  if (s.major && a.major && s.major.toLowerCase() === a.major.toLowerCase()) {
    points += 1;
    shared.push(`Same major: ${a.major}`);
  }
  return { points, shared };
}

const MatchSchema = z.object({
  matches: z
    .array(
      z.object({
        key: z.string(),
        score: z.coerce.number(),
        reasons: z.array(z.string()),
      }),
    )
    .max(5),
});

/** Fallback when the AI is unavailable: top pre-scored alumni with their shared facts as reasons. */
export function localMatches(
  ranked: { a: MatchCandidate; points: number; shared: string[] }[],
): MatchResult[] {
  const best = ranked[0]?.points ?? 0;
  return ranked
    .filter((r) => r.points >= 4 && r.shared.length >= 2)
    .slice(0, 3)
    .map((r) => ({
      alumni_id: r.a.id,
      score: Math.round(Math.min(95, 62 + (r.points / Math.max(best, 1)) * 30)),
      reasons: r.shared.slice(0, 3),
    }));
}

/** AI #4 — pick 1–3 strong matches with a score and 2–3 specific, true reasons. */
export async function matchAlumni(student: MatchStudent, candidates: MatchCandidate[]): Promise<MatchResult[]> {
  const ranked = candidates
    .map((a) => ({ a, ...preScore(student, a) }))
    .sort((x, y) => y.points - x.points)
    .slice(0, 20);
  if (ranked.length === 0) return [];

  const keyed = ranked.map((r, i) => ({ key: `A${i + 1}`, ...r }));
  const byKey = new Map(keyed.map((k) => [k.key, k]));

  const prompt = `Match a Sac State student with the alumni who can help them most.

STUDENT
- Goal: ${student.goal ?? "—"} (target field: ${student.goal_field ?? "—"})
- Major: ${student.major ?? "—"}
- Skills: ${student.skills.join(", ") || "—"}
- Background: ${student.background_tags.join(", ") || "—"}
- Bio: ${student.bio ?? "—"}
- Hometown: ${student.hometown ?? "—"} · Clubs: ${student.clubs.join(", ") || "—"} · Languages: ${student.languages.join(", ") || "—"} · Interests: ${student.hobbies.join(", ") || "—"}

ALUMNI (each has "shared" = facts verified to be true between this alum and the student)
${JSON.stringify(
  keyed.map((k) => ({
    key: k.key,
    name: k.a.full_name,
    role: [k.a.job_title, k.a.company].filter(Boolean).join(" @ "),
    sac_state: `${k.a.major ?? ""} ${k.a.grad_year ?? ""}`.trim(),
    fields: k.a.fields,
    journey: k.a.path_tags,
    path: k.a.path_story.map((p) => p.title).join(" → "),
    ask_me_about: k.a.ask_me_about,
    shared: k.shared,
  })),
)}

RULES
- Return 1 to 3 matches — ONLY alumni who are a genuinely strong fit for the student's goal. Never pad with weak matches.
- Order by fit. score is 0–100 (a strong match is 75–95).
- Each match has 2–3 reasons, max 7 words each, specific and TRUE. Prefer facts from "shared"; you may also cite a clear goal fit visible in the alum's role/path (e.g. "Same goal: software engineering") or a fact stated in BOTH the student's bio and the alum's path (e.g. both attended Sac City).
- Style: "Both from Stockton", "Both in ACM", "Both transferred from Sac City", "Same goal: SWE".

Return JSON: { "matches": [ { "key": "A1", "score": 92, "reasons": ["…", "…"] } ] }`;

  try {
    const { matches } = await generateJSON(prompt, MatchSchema);
    const seen = new Set<string>();
    const out: MatchResult[] = [];
    for (const m of matches) {
      const k = byKey.get(m.key);
      if (!k || seen.has(k.a.id)) continue;
      seen.add(k.a.id);
      const reasons = m.reasons.map((r) => r.trim()).filter(Boolean).slice(0, 3);
      out.push({
        alumni_id: k.a.id,
        score: Math.max(0, Math.min(100, Math.round(m.score))),
        reasons: reasons.length >= 2 ? reasons : [...reasons, ...k.shared].slice(0, 3),
      });
    }
    if (out.length) return out.sort((x, y) => y.score - x.score).slice(0, 3);
  } catch (err) {
    console.warn("[matchAlumni] AI unavailable, using local scoring:", (err as Error).message);
  }
  return localMatches(ranked);
}

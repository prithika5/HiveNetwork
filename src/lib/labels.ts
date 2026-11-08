/** Display labels shared across the app. */
export const JOURNEY: Record<string, { label: string; icon: string }> = {
  transferred: { label: "Transferred", icon: "🔁" },
  "first-gen": { label: "First-gen", icon: "🐝" },
  "switched-majors": { label: "Switched majors", icon: "🔀" },
  "no-internship": { label: "Got in without an internship", icon: "🚀" },
  "state-gov": { label: "State government", icon: "🏛" },
};

export const HELP_TYPES: Record<string, string> = {
  coffee_chat: "Coffee chat",
  mock_interview: "Mock interview",
  resume_review: "Resume review",
  quick_question: "Quick question",
  referral: "Referrals",
};

export const shortYear = (y?: number | null) => (y ? `'${String(y).slice(-2)}` : "");

export const BACKGROUND_CHIPS: Record<string, string> = { "first-gen": "🐝 First-gen", transfer: "🔁 Transfer", commuter: "🚗 Commuter" };

/** "junior", "senior"… from expected graduation year (academic year rolls over in July). */
export function classStanding(classYear: number | null | undefined, now = new Date()) {
  if (!classYear) return "";
  const seniorsGrad = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
  const left = classYear - seniorsGrad;
  return left <= 0 ? "senior" : left === 1 ? "junior" : left === 2 ? "sophomore" : "freshman";
}

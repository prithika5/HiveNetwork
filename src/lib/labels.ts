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

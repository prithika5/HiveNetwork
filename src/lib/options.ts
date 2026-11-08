/** Fixed option lists used by onboarding, filters, and AI prompts. */
export const FIELDS = [
  "Software Engineering",
  "Data/ML",
  "Product",
  "Design",
  "Business",
  "Finance",
  "Healthcare",
  "Public Sector/State Gov",
  "IT/Cloud",
  "Hardware/Embedded",
] as const;

export const PATH_TAGS = ["transferred", "first-gen", "switched-majors", "no-internship", "state-gov"] as const;
export const BACKGROUND_TAGS = ["first-gen", "transfer", "commuter"] as const;
export const HELP_TYPE_KEYS = ["coffee_chat", "mock_interview", "resume_review", "quick_question", "referral"] as const;
export const PATH_KINDS = ["education", "internship", "job", "pivot", "milestone"] as const;

export const BACKGROUND_LABELS: Record<string, string> = {
  "first-gen": "🐝 First-gen college student",
  transfer: "🔁 Transfer student",
  commuter: "🚗 Commuter",
};

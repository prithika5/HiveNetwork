import type { PathStep } from "@/lib/alumni";

const KIND: Record<string, { icon: string; label: string }> = {
  education: { icon: "🎓", label: "Education" },
  internship: { icon: "🧪", label: "Internship" },
  job: { icon: "💼", label: "Job" },
  pivot: { icon: "🔀", label: "Pivot" },
  milestone: { icon: "⭐", label: "Milestone" },
};

/** Vertical timeline: year on the left, hexagon node, step on the right. Latest step highlighted. */
export function PathStory({ steps }: { steps: PathStep[] }) {
  if (steps.length === 0) return <p className="text-muted-foreground">No Path Story yet.</p>;
  return (
    <ol className="relative">
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        const k = KIND[s.kind] ?? KIND.milestone;
        return (
          <li key={i} className="grid grid-cols-[3.5rem_2.75rem_1fr] items-start gap-x-3 sm:grid-cols-[4rem_3rem_1fr]">
            <span className="pt-2.5 text-right text-sm font-semibold tabular-nums text-muted-foreground">{s.year}</span>
            <div className="relative flex h-full flex-col items-center">
              <div
                className={`hex z-10 flex h-11 w-11 shrink-0 items-center justify-center text-lg sm:h-12 sm:w-12 ${last ? "bg-hive-green" : "bg-hive-gold-light"}`}
                title={k.label}
              >
                <span aria-hidden>{k.icon}</span>
              </div>
              {!last && <div className="w-0.5 flex-1 bg-hive-gold/60" />}
            </div>
            <div className={`pb-7 pt-2 ${last ? "font-semibold text-hive-green" : ""}`}>
              <p className="text-base leading-snug">{s.title}</p>
              <p className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">{k.label}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

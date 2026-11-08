import type { PathStep } from "@/lib/alumni";

/** Clean vertical timeline with small dots; the latest step gets the honey dot. */
export function PathStory({ steps }: { steps: PathStep[] }) {
  if (steps.length === 0) return <p className="text-sm text-stone">No path yet</p>;
  return (
    <ol className="border-l border-line">
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        return (
          <li key={i} className={`relative pl-6 ${last ? "" : "pb-6"}`}>
            <span className={`absolute -left-[5px] top-1.5 size-[9px] rounded-full ${last ? "bg-honey" : "border border-stone-300 bg-white"}`} />
            <p className={`text-[15px] leading-snug ${last ? "font-medium text-ink" : "text-ink"}`}>{s.title}</p>
            <p className="mt-0.5 text-xs text-stone">{s.year}</p>
          </li>
        );
      })}
    </ol>
  );
}

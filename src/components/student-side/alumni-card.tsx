import { HexAvatar } from "@/components/hex-avatar";
import { SampleBadge } from "@/components/sample-badge";
import { HELP_TYPES, JOURNEY, shortYear } from "@/lib/labels";
import type { AlumniPreview } from "@/lib/alumni";

/** One alum in the directory. Pure display — the parent decides what clicking does. */
export function AlumniCard({ alum, unlocked }: { alum: AlumniPreview; unlocked: boolean }) {
  const name = unlocked && alum.full_name ? alum.full_name : alum.display_name;
  const steps = (alum.path_line ?? "").split(" → ").filter(Boolean);
  return (
    <div className="flex h-full flex-col rounded-2xl border bg-white p-5 text-left shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:border-hive-gold group-hover:shadow-md">
      <div className="flex items-start gap-4">
        <HexAvatar src={alum.photo_url} name={name} size={60} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-lg font-semibold text-hive-green">{name}</h3>
            {alum.verified && (
              <span className="rounded-full bg-hive-green/10 px-2 py-0.5 text-[11px] font-semibold text-hive-green">
                ✓ Verified Alum
              </span>
            )}
          </div>
          <p className="text-sm font-medium leading-snug">
            {alum.job_title}
            {alum.company && <span className="text-muted-foreground"> @ {alum.company}</span>}
          </p>
          <p className="text-sm text-muted-foreground">
            Sac State {shortYear(alum.grad_year)} · {alum.major}
          </p>
        </div>
      </div>

      {steps.length > 0 && (
        <p className="mt-4 line-clamp-2 text-sm text-foreground/80">
          {steps.map((s, i) => (
            <span key={i}>
              {i > 0 && <span className="mx-1 text-hive-gold">→</span>}
              {s}
            </span>
          ))}
        </p>
      )}

      {alum.path_tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {alum.path_tags.map((t) => (
            <span key={t} className="rounded-full bg-hive-gold-light px-2.5 py-1 text-xs font-medium text-hive-green">
              {JOURNEY[t]?.icon} {JOURNEY[t]?.label ?? t}
            </span>
          ))}
        </div>
      )}

      {unlocked && alum.ask_me_about?.[0] && (
        <p className="mt-3 text-sm italic text-muted-foreground">“Ask me about {alum.ask_me_about[0].toLowerCase()}.”</p>
      )}

      <div className="mt-auto pt-4">
        <div className="flex flex-wrap gap-1.5">
          {alum.fields.map((f) => (
            <span key={f} className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground">
              {f}
            </span>
          ))}
        </div>
        {alum.help_types.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Offers:</span>{" "}
            {alum.help_types.map((h) => HELP_TYPES[h] ?? h).join(" · ")}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-hive-green">{unlocked ? "View path →" : "🔒 View full profile"}</p>
          {alum.is_sample && <SampleBadge />}
        </div>
      </div>
    </div>
  );
}

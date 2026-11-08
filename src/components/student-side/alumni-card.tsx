import { GraduationCap, Lock } from "lucide-react";
import { Avatar } from "@/components/hex-avatar";
import { CompanyLogo } from "@/components/company-logo";
import { SampleBadge } from "@/components/sample-badge";
import { JOURNEY } from "@/lib/labels";
import type { AlumniPreview } from "@/lib/alumni";

/** Directory card — photo, name, role, company, year, ≤3 tags, one button. Parent decides what clicking does. */
export function AlumniCard({ alum, unlocked }: { alum: AlumniPreview; unlocked: boolean }) {
  const name = unlocked && alum.full_name ? alum.full_name : alum.display_name;
  const tags = [...alum.fields, ...alum.path_tags.map((t) => JOURNEY[t]?.label ?? t)];
  const shown = tags.slice(0, 3);
  const extra = tags.length - shown.length;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-line bg-white p-5 text-left transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_6px_20px_-12px_rgba(28,25,23,0.25)]">
      <div className="flex items-start justify-between">
        <Avatar src={alum.photo_url} name={name} size={64} />
        {alum.is_sample && <SampleBadge />}
      </div>

      <h3 className="mt-4 text-lg font-semibold tracking-tight text-ink">{name}</h3>
      <p className="mt-0.5 line-clamp-1 text-sm text-stone">{alum.job_title}</p>

      <div className="mt-3 space-y-1.5 text-sm text-stone">
        {alum.company && (
          <p className="flex items-center gap-2">
            <CompanyLogo domain={alum.company_domain} name={alum.company} size={18} />
            <span className="line-clamp-1 text-ink">{alum.company}</span>
          </p>
        )}
        {alum.grad_year && (
          <p className="flex items-center gap-2">
            <GraduationCap className="size-[18px] text-stone" strokeWidth={1.6} />
            Sac State &apos;{String(alum.grad_year).slice(-2)}
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {shown.map((t) => (
          <span key={t} className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-ink">
            {t}
          </span>
        ))}
        {extra > 0 && <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone">+{extra}</span>}
      </div>

      <div className="mt-auto pt-5">
        <span className="flex h-9 w-full items-center justify-center gap-1.5 rounded-full border border-line text-sm font-medium text-ink transition-colors group-hover:border-ink">
          {!unlocked && <Lock className="size-3.5" strokeWidth={2} />}
          View profile
        </span>
      </div>
    </div>
  );
}

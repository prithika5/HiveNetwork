"use client";

import { safe } from "@/lib/safe";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buildPlanAction, swapAlumAction } from "@/app/plan/actions";
import { ArrowLeftRight, Check, RefreshCw } from "lucide-react";
import { Avatar } from "@/components/hex-avatar";
import { CompanyLogo } from "@/components/company-logo";
import { HornetIcon } from "@/components/hive-logo";
import { SampleBadge } from "@/components/sample-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { HELP_TYPES } from "@/lib/labels";
import type { PlanView } from "@/lib/plan";
import { cn } from "@/lib/utils";

export function LaunchPlan({ plan, compact = false }: { plan: PlanView | null; compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const started = useRef(false);

  function run(kind: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(kind);
    setError(null);
    start(async () => {
      const res = await safe(fn());
      if (!res.ok) setError(res.error ?? "Something went wrong.");
      router.refresh();
      setBusy(null);
    });
  }

  // Arriving from "Turn my matches into a Launch Plan" with no plan yet → build it.
  useEffect(() => {
    if (!plan && !compact && !started.current) {
      started.current = true;
      run("build", buildPlanAction);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, compact]);

  if (!plan) {
    if (compact) return null;
    return busy === "build" ? (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl border border-line bg-white" />
        ))}
      </div>
    ) : (
      <div className="rounded-2xl border border-line bg-white p-12 text-center">
        <HornetIcon className="mx-auto h-10 w-10" />
        {error && <p className="mt-3 text-sm text-stone">{error}</p>}
        <Button className="mt-5 h-10 rounded-full px-5" onClick={() => run("build", buildPlanAction)}>
          Build plan
        </Button>
      </div>
    );
  }

  const done = plan.steps.filter((s) => s.chat?.status === "completed").length;
  const pct = Math.round((done / plan.steps.length) * 100);

  return (
    <section className={cn("rounded-2xl border border-line bg-white p-6 transition-opacity sm:p-8", busy && "opacity-60")}>
      <p className="text-xs font-medium text-stone">{compact ? "Your plan" : "Goal"}</p>
      <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">{plan.goal}</h2>
      <div className="mt-4 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100">
          <div className="h-full rounded-full bg-honey transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-stone">
          {done}/{plan.steps.length}
        </span>
      </div>

      <ol className="mt-6 divide-y divide-line">
        {plan.steps.map((s) => {
          const complete = s.chat?.status === "completed";
          const booked = s.chat?.status === "scheduled";
          const first = s.alum?.full_name.split(" ")[0] ?? "them";
          return (
            <li key={s.alumni_id} className="py-4 first:pt-0 last:pb-0">
              <p className="mb-2.5 text-xs font-medium text-stone">
                Step {s.order} · {s.step_title}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                <Avatar src={s.alum?.photo_url} name={s.alum?.full_name} size={44} />
                <div className="min-w-0 flex-1 basis-48">
                  <div className="flex items-center gap-2">
                    <Link href={`/alumni/${s.alumni_id}`} className="font-semibold tracking-tight text-ink hover:underline">
                      {s.alum?.full_name ?? "Alum"}
                    </Link>
                    {s.alum?.is_sample && <SampleBadge />}
                  </div>
                  {s.alum?.company && (
                    <p className="flex items-center gap-1.5 text-sm text-stone">
                      <CompanyLogo domain={s.alum.company_domain} name={s.alum.company} size={14} />
                      {s.alum.company}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-stone">{s.why}</p>
                </div>
                <div className="flex items-center gap-2">
                  {complete ? (
                    <span className="flex items-center gap-1 rounded-full bg-honey-soft px-2.5 py-1 text-xs font-medium text-ink">
                      <Check className="size-3.5" strokeWidth={2} /> Done
                    </span>
                  ) : booked ? (
                    <Link href="/chats" className="rounded-full bg-honey-soft px-2.5 py-1 text-xs font-medium text-ink">
                      Booked
                    </Link>
                  ) : (
                    <Link href={`/alumni/${s.alumni_id}/book?type=${s.chat_type}`} className={buttonVariants({ className: "h-9 rounded-full px-4" })}>
                      {HELP_TYPES[s.chat_type] ?? "Book"}
                    </Link>
                  )}
                  {!compact && !complete && !booked && (
                    <button
                      type="button"
                      title={`Swap ${first}`}
                      aria-label={`Swap ${first}`}
                      disabled={!!busy}
                      onClick={() => run(s.alumni_id, () => swapAlumAction(s.alumni_id))}
                      className="flex size-9 items-center justify-center rounded-full border border-line text-stone transition-colors hover:text-ink disabled:opacity-50"
                    >
                      <ArrowLeftRight className="size-4" strokeWidth={1.8} />
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 border-t border-line pt-4">
        {compact ? (
          <Link href="/plan" className="text-sm text-stone hover:text-ink">
            Open plan →
          </Link>
        ) : (
          <button type="button" disabled={!!busy} onClick={() => run("build", buildPlanAction)} className="flex items-center gap-1.5 text-sm text-stone hover:text-ink disabled:opacity-50">
            <RefreshCw className={cn("size-3.5", busy === "build" && "animate-spin")} strokeWidth={1.8} />
            Regenerate
          </button>
        )}
      </div>
      {error && <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    </section>
  );
}

"use client";

import { safe } from "@/lib/safe";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buildPlanAction, swapAlumAction } from "@/app/plan/actions";
import { HexAvatar } from "@/components/hex-avatar";
import { SampleBadge } from "@/components/sample-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { HELP_TYPES, shortYear } from "@/lib/labels";
import type { PlanView } from "@/lib/plan";
import { cn } from "@/lib/utils";

const BOOK_LABEL: Record<string, string> = {
  coffee_chat: "Book a coffee chat",
  mock_interview: "Book mock interview",
  resume_review: "Book resume review",
  quick_question: "Ask a quick question",
};

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
    return (
      <div className="rounded-3xl border bg-white p-10 text-center shadow-sm">
        {busy === "build" ? (
          <>
            <p className="animate-bounce text-5xl">🚀</p>
            <p className="mt-4 animate-pulse text-lg font-semibold text-hive-green">Building your Launch Plan from your matches…</p>
          </>
        ) : (
          <>
            <p className="text-5xl">🚀</p>
            <p className="mt-3 text-muted-foreground">{error ?? "No plan yet."}</p>
            <Button className="mt-5 h-11 px-6 text-base" onClick={() => run("build", buildPlanAction)}>
              Build my Launch Plan
            </Button>
          </>
        )}
      </div>
    );
  }

  const done = plan.steps.filter((s) => s.chat?.status === "completed").length;
  const pct = Math.round((done / plan.steps.length) * 100);

  return (
    <section className={cn("overflow-hidden rounded-3xl border bg-white shadow-sm", busy && "opacity-70")}>
      <div className="relative bg-hive-green p-6 text-white sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-hive-gold">🚀 Your Launch Plan</p>
        <h2 className="mt-1 text-2xl font-bold sm:text-3xl">“{plan.goal}”</h2>
        <div className="mt-5 flex items-center gap-3">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-hive-gold transition-all" style={{ width: `${Math.max(pct, 4)}%` }} />
          </div>
          <span className="text-sm font-semibold">
            {done}/{plan.steps.length} done
          </span>
        </div>
      </div>

      <ol className="p-4 sm:p-8">
        {plan.steps.map((s, i) => {
          const complete = s.chat?.status === "completed";
          const booked = s.chat?.status === "scheduled";
          const last = i === plan.steps.length - 1;
          const first = s.alum?.full_name.split(" ")[0] ?? "them";
          return (
            <li key={s.alumni_id} className="grid grid-cols-[3rem_1fr] gap-x-4 sm:grid-cols-[3.5rem_1fr]">
              <div className="flex flex-col items-center">
                <div className={cn("hex flex h-12 w-12 shrink-0 items-center justify-center text-lg font-bold sm:h-14 sm:w-14", complete ? "bg-hive-green text-hive-gold" : "bg-hive-gold-light text-hive-green")}>
                  {complete ? "✓" : s.order}
                </div>
                {!last && <div className={cn("w-0.5 flex-1", complete ? "bg-hive-green" : "bg-hive-gold/50")} />}
              </div>
              <div className={cn("pb-8", last && "pb-2")}>
                <p className="text-xs font-semibold uppercase tracking-wide text-hive-gold">
                  Step {s.order} · {s.step_title}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3 rounded-2xl border p-4">
                  <HexAvatar src={s.alum?.photo_url} name={s.alum?.full_name} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/alumni/${s.alumni_id}`} className="font-semibold text-hive-green hover:underline">
                        {s.alum?.full_name ?? "Alum"}
                      </Link>
                      {s.alum?.is_sample && <SampleBadge />}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Sac State {shortYear(s.alum?.grad_year)} · {s.alum?.job_title}
                      {s.alum?.company && ` @ ${s.alum.company}`}
                    </p>
                    <p className="mt-1.5 text-sm">
                      <span className="font-semibold">Why:</span> {s.why}
                    </p>
                  </div>
                  <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-col sm:items-end">
                    {complete ? (
                      <span className="rounded-full bg-hive-green px-3 py-1 text-sm font-semibold text-white">✓ Done</span>
                    ) : booked ? (
                      <Link href="/chats" className="rounded-full bg-hive-gold-light px-3 py-1 text-sm font-semibold text-hive-green">
                        ✅ Booked — prep →
                      </Link>
                    ) : (
                      <Link href={`/alumni/${s.alumni_id}/book?type=${s.chat_type}`} className={buttonVariants({ size: "sm", className: "h-9 px-3" })}>
                        {BOOK_LABEL[s.chat_type] ?? `Book ${HELP_TYPES[s.chat_type] ?? "a chat"}`}
                      </Link>
                    )}
                    {!compact && !complete && !booked && (
                      <button
                        type="button"
                        disabled={!!busy}
                        onClick={() => run(s.alumni_id, () => swapAlumAction(s.alumni_id))}
                        className="text-xs font-medium text-muted-foreground hover:text-hive-green"
                      >
                        {busy === s.alumni_id ? "Swapping…" : `Swap ${first}`}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-3 border-t px-4 py-4 sm:px-8">
        {compact ? (
          <Link href="/plan" className="text-sm font-semibold text-hive-green hover:underline">
            Open full Launch Plan →
          </Link>
        ) : (
          <>
            <Button variant="outline" className="h-10 px-4" disabled={!!busy} onClick={() => run("build", buildPlanAction)}>
              {busy === "build" ? "Rebuilding…" : "↻ Regenerate plan"}
            </Button>
            <p className="text-xs text-muted-foreground">Built from your current AI matches. “Swap” replaces an alum with your next-best match.</p>
          </>
        )}
      </div>
      {error && <p className="mx-4 mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive sm:mx-8">{error}</p>}
    </section>
  );
}

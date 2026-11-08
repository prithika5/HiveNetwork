"use client";

import { safe } from "@/lib/safe";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { RefreshCw, X } from "lucide-react";
import { notAFitAction, refreshMatchesAction } from "@/app/alumni/actions";
import { Avatar } from "@/components/hex-avatar";
import { CompanyLogo } from "@/components/company-logo";
import { HornetIcon } from "@/components/hive-logo";
import { SampleBadge } from "@/components/sample-badge";
import { buttonVariants } from "@/components/ui/button";
import type { MatchCard, MatchesState } from "@/lib/matches";

function Skeletons() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-64 animate-pulse rounded-2xl border border-line bg-white" />
      ))}
    </div>
  );
}

export function TopMatches({ initial }: { initial: MatchesState }) {
  const [matches, setMatches] = useState<MatchCard[] | null>(initial.status === "ready" ? initial.matches : null);
  const [busy, setBusy] = useState<string | null>(null); // "refresh" | alumni id
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const started = useRef(false);

  function run(kind: string, action: () => ReturnType<typeof refreshMatchesAction>) {
    setBusy(kind);
    setError(null);
    startTransition(async () => {
      const res = await safe(action());
      if (res.ok) setMatches(res.matches);
      else setError(res.error);
      setBusy(null);
    });
  }

  // First visit after onboarding: nothing cached yet → generate once.
  useEffect(() => {
    if (initial.status === "empty" && !started.current) {
      started.current = true;
      run("refresh", refreshMatchesAction);
    }
  }, [initial.status]);

  if (initial.status === "not-student") return null;

  if (initial.status === "needs-profile") {
    return (
      <section className="rounded-2xl border border-line bg-white p-10 text-center">
        <HornetIcon className="mx-auto h-10 w-10" />
        <p className="mt-3 font-medium text-ink">Add your goal to get matched</p>
        <Link href="/onboarding" className={buttonVariants({ className: "mt-5 h-10 rounded-full px-5" })}>
          Finish profile
        </Link>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-ink">Your top matches</h2>
        <button
          type="button"
          title="Refresh matches"
          aria-label="Refresh matches"
          disabled={!!busy}
          onClick={() => run("refresh", refreshMatchesAction)}
          className="flex size-9 items-center justify-center rounded-full border border-line bg-white text-stone transition-colors hover:text-ink disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${busy === "refresh" ? "animate-spin" : ""}`} strokeWidth={1.8} />
        </button>
      </div>

      {busy === "refresh" && !matches?.length ? (
        <Skeletons />
      ) : matches && matches.length > 0 ? (
        <>
          <ul className="grid gap-5 md:grid-cols-3">
            {matches.map((m) => (
              <li key={m.alumni_id} className={`relative flex flex-col rounded-2xl border border-honey/50 bg-white p-5 transition-opacity ${busy === m.alumni_id ? "opacity-50" : ""}`}>
                <div className="flex items-start justify-between">
                  <Avatar src={m.photo_url} name={m.full_name} size={64} />
                  <span className="rounded-full bg-honey-soft px-2.5 py-1 text-xs font-medium text-ink">✨ {m.score}% match</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Link href={`/alumni/${m.alumni_id}`} className="text-lg font-semibold tracking-tight text-ink hover:underline">
                    {m.full_name}
                  </Link>
                  {m.is_sample && <SampleBadge />}
                </div>
                <p className="mt-0.5 line-clamp-1 text-sm text-stone">{m.job_title}</p>
                {m.company && (
                  <p className="mt-2 flex items-center gap-2 text-sm text-ink">
                    <CompanyLogo domain={m.company_domain} name={m.company} size={18} />
                    <span className="line-clamp-1">{m.company}</span>
                  </p>
                )}
                <ul className="mb-5 mt-3 space-y-1 text-sm text-stone">
                  {m.reasons.slice(0, 2).map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                <div className="mt-auto flex items-center gap-2">
                  <Link href={`/alumni/${m.alumni_id}`} className={buttonVariants({ className: "h-9 flex-1 rounded-full" })}>
                    View profile
                  </Link>
                  <button
                    type="button"
                    title="Not a fit"
                    aria-label={`Not a fit: ${m.full_name}`}
                    disabled={!!busy}
                    onClick={() => run(m.alumni_id, () => notAFitAction(m.alumni_id))}
                    className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line text-stone transition-colors hover:text-ink disabled:opacity-50"
                  >
                    <X className="size-4" strokeWidth={1.8} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <Link href="/plan" className={buttonVariants({ variant: "outline", className: "mt-5 h-10 rounded-full bg-white px-5" })}>
            Build my plan
          </Link>
        </>
      ) : (
        <div className="rounded-2xl border border-line bg-white p-10 text-center">
          <HornetIcon className="mx-auto h-10 w-10" />
          <p className="mt-3 text-stone">No strong matches yet</p>
          <Link href="/profile" className={buttonVariants({ variant: "outline", className: "mt-5 h-10 rounded-full bg-white px-5" })}>
            Edit profile
          </Link>
        </div>
      )}
      {error && <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    </section>
  );
}

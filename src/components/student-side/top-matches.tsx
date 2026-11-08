"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { notAFitAction, refreshMatchesAction } from "@/app/alumni/actions";
import { HexAvatar } from "@/components/hex-avatar";
import { SampleBadge } from "@/components/sample-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { shortYear } from "@/lib/labels";
import type { MatchCard, MatchesState } from "@/lib/matches";

function Loading() {
  return (
    <div className="space-y-3">
      <p className="animate-pulse text-sm font-medium text-hive-green">✨ Finding alumni who share your goal — and your story…</p>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/70" />
      ))}
    </div>
  );
}

function ScoreHex({ score }: { score: number }) {
  return (
    <div className="hex flex h-16 w-16 shrink-0 flex-col items-center justify-center bg-hive-green text-white">
      <span className="text-lg font-bold leading-none">{score}%</span>
      <span className="text-[10px] uppercase tracking-wide text-hive-gold">match</span>
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
      const res = await action();
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

  return (
    <section className="rounded-3xl border border-hive-gold/60 bg-gradient-to-br from-hive-gold-light to-white p-5 sm:p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-hive-green">✨ Your top matches</h2>
          <p className="text-sm text-hive-green/70">Picked by AI from your goal, skills, background, hometown, and clubs.</p>
        </div>
        {initial.status !== "needs-profile" && (
          <Button variant="outline" className="h-10 bg-white px-4" disabled={!!busy} onClick={() => run("refresh", refreshMatchesAction)}>
            {busy === "refresh" ? "Refreshing…" : "↻ Refresh"}
          </Button>
        )}
      </div>

      {initial.status === "needs-profile" ? (
        <div className="rounded-2xl bg-white p-6 text-center">
          <p className="font-medium">Tell us your goal and a bit about you to get matched.</p>
          <Link href="/onboarding" className={buttonVariants({ className: "mt-4 h-11 px-6 text-base" })}>
            Finish my profile →
          </Link>
        </div>
      ) : busy === "refresh" && !matches?.length ? (
        <Loading />
      ) : matches && matches.length > 0 ? (
        <>
          <ul className="space-y-3">
            {matches.map((m) => (
              <li
                key={m.alumni_id}
                className={`flex flex-col gap-4 rounded-2xl border bg-white p-4 shadow-sm transition-opacity sm:flex-row sm:items-center sm:p-5 ${busy === m.alumni_id ? "opacity-50" : ""}`}
              >
                <div className="flex flex-1 items-start gap-4">
                  <HexAvatar src={m.photo_url} name={m.full_name} size={56} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/alumni/${m.alumni_id}`} className="text-lg font-semibold text-hive-green hover:underline">
                        {m.full_name}
                      </Link>
                      {m.is_sample && <SampleBadge />}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {m.job_title}
                      {m.company && ` @ ${m.company}`} · Sac State {shortYear(m.grad_year)}
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {m.reasons.map((r) => (
                        <li key={r} className="rounded-full bg-hive-gold-light px-2.5 py-1 text-xs font-medium text-hive-green">
                          • {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                  <ScoreHex score={m.score} />
                  <div className="flex gap-2">
                    <Link href={`/alumni/${m.alumni_id}`} className={buttonVariants({ size: "sm", className: "h-9 px-3" })}>
                      View profile
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 px-3 text-muted-foreground"
                      disabled={!!busy}
                      onClick={() => run(m.alumni_id, () => notAFitAction(m.alumni_id))}
                    >
                      {busy === m.alumni_id ? "Rematching…" : "Not a fit"}
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Link href="/plan" className={buttonVariants({ className: "mt-5 h-12 w-full text-base sm:w-auto sm:px-6" })}>
            🚀 Turn my matches into a Launch Plan
          </Link>
        </>
      ) : (
        <div className="rounded-2xl bg-white p-6 text-center text-muted-foreground">
          No strong matches yet — try adding more about your goal, clubs, and background in{" "}
          <Link href="/profile" className="font-semibold text-hive-green underline">
            your profile
          </Link>
          .
        </div>
      )}
      {error && <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    </section>
  );
}

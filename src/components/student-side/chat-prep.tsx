"use client";

import { useEffect, useState } from "react";
import { chatPrepAction } from "@/app/alumni/[id]/book/actions";
import { Button } from "@/components/ui/button";
import type { ChatPrep } from "@/lib/ai/student";

/** Shows AI chat prep for a request — loads (and caches) it on mount if not provided. */
export function ChatPrepCard({ requestId, initial, alumFirstName }: { requestId: string; initial?: ChatPrep | null; alumFirstName: string }) {
  const [prep, setPrep] = useState<ChatPrep | null>(initial ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initial);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await chatPrepAction(requestId);
    if (res.ok) setPrep(res.prep);
    else setError(res.error);
    setLoading(false);
  }

  useEffect(() => {
    if (initial) return;
    let cancelled = false;
    chatPrepAction(requestId).then((res) => {
      if (cancelled) return;
      if (res.ok) setPrep(res.prep);
      else setError(res.error);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [requestId, initial]);

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-bold text-hive-green">📝 Your chat prep</h2>
      <p className="mt-1 text-sm text-muted-foreground">Tailored to {alumFirstName}&apos;s Path Story and your goal.</p>
      {loading ? (
        <div className="mt-6 space-y-3">
          <p className="animate-pulse text-sm font-medium text-hive-green">✨ Writing your intro and questions…</p>
          <div className="h-20 animate-pulse rounded-xl bg-secondary" />
          <div className="h-40 animate-pulse rounded-xl bg-secondary" />
        </div>
      ) : error ? (
        <div className="mt-4 rounded-lg bg-secondary p-4 text-sm">
          {error}{" "}
          <Button variant="outline" size="sm" className="ml-2" onClick={load}>
            Try again
          </Button>
        </div>
      ) : prep ? (
        <div className="mt-6 space-y-6">
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">⏱ Your 30-second intro</h3>
            <p className="rounded-xl bg-hive-gold-light p-4 leading-relaxed text-hive-green">“{prep.intro_30s}”</p>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">❓ 5 questions to ask</h3>
            <ol className="space-y-2">
              {prep.questions.map((q, i) => (
                <li key={i} className="flex gap-3">
                  <span className="hex flex h-7 w-7 shrink-0 items-center justify-center bg-hive-green text-xs font-bold text-white">{i + 1}</span>
                  <span className="pt-0.5">{q}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">🔎 Research first</h3>
            <ul className="flex flex-wrap gap-2">
              {prep.research_first.map((r, i) => (
                <li key={i} className="rounded-lg border px-3 py-1.5 text-sm">
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}

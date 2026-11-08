"use client";

import { safe } from "@/lib/safe";
import { useEffect, useState } from "react";
import { chatPrepAction } from "@/app/alumni/[id]/book/actions";
import { Button } from "@/components/ui/button";
import type { ChatPrep } from "@/lib/ai/student";

const label = "mb-2.5 text-xs font-medium text-stone";

/** Shows AI chat prep for a request — loads (and caches) it on mount if not provided. */
export function ChatPrepCard({ requestId, initial }: { requestId: string; initial?: ChatPrep | null; alumFirstName?: string }) {
  const [prep, setPrep] = useState<ChatPrep | null>(initial ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initial);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await safe(chatPrepAction(requestId));
    if (res.ok) setPrep(res.prep);
    else setError(res.error);
    setLoading(false);
  }

  useEffect(() => {
    if (initial) return;
    let cancelled = false;
    safe(chatPrepAction(requestId)).then((res) => {
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
    <section className="rounded-2xl border border-line bg-white p-6 sm:p-8">
      <h2 className="text-lg font-semibold tracking-tight text-ink">Chat prep</h2>
      {loading ? (
        <div className="mt-5 space-y-3">
          <div className="h-20 animate-pulse rounded-xl bg-stone-100" />
          <div className="h-40 animate-pulse rounded-xl bg-stone-100" />
        </div>
      ) : error ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-stone">
          {error}
          <Button variant="outline" className="h-9 rounded-full px-4" onClick={load}>
            Retry
          </Button>
        </div>
      ) : prep ? (
        <div className="mt-5 space-y-6">
          <div>
            <h3 className={label}>30-second intro</h3>
            <p className="text-[15px] leading-relaxed text-ink">{prep.intro_30s}</p>
          </div>
          <div>
            <h3 className={label}>Questions</h3>
            <ol className="space-y-2.5">
              {prep.questions.map((q, i) => (
                <li key={i} className="flex gap-3 text-[15px] leading-snug text-ink">
                  <span className="w-4 shrink-0 text-stone">{i + 1}</span>
                  <span>{q}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h3 className={label}>Research first</h3>
            <ul className="flex flex-wrap gap-1.5">
              {prep.research_first.map((r, i) => (
                <li key={i} className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-ink">
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

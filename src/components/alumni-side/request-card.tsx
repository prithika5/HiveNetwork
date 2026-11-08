"use client";

import { safe } from "@/lib/safe";
import { useEffect, useState, useTransition } from "react";
import { declineAction, markCompletedAction, resumeUrlAction, setOpenToReferAction, snapshotAction } from "@/app/inbox/actions";
import { HexAvatar } from "@/components/hex-avatar";
import { SampleBadge } from "@/components/sample-badge";
import { Button } from "@/components/ui/button";
import { BACKGROUND_CHIPS, HELP_TYPES, classStanding } from "@/lib/labels";
import type { ApplicantSnapshot } from "@/lib/ai/alumni";
import { cn } from "@/lib/utils";

export type InboxRequest = {
  id: string;
  type: string;
  status: string;
  message: string | null;
  share_resume: boolean;
  open_to_refer: boolean;
  ai_snapshot: ApplicantSnapshot | null;
  created_at: string;
  student: { full_name: string; major: string | null; class_year: number | null; background_tags: string[]; goal: string | null; is_sample: boolean };
};

const STATUS: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "✅ Scheduled via Calendly", cls: "bg-hive-green text-white" },
  pending: { label: "⏳ Pending — not booked yet", cls: "bg-hive-gold-light text-hive-green" },
  completed: { label: "✓ Completed", cls: "bg-secondary text-hive-green" },
  declined: { label: "Declined", cls: "bg-secondary text-muted-foreground" },
  canceled: { label: "Canceled", cls: "bg-secondary text-muted-foreground" },
};

export function RequestCard({ req }: { req: InboxRequest }) {
  const [status, setStatus] = useState(req.status);
  const [openToRefer, setOpenToRefer] = useState(req.open_to_refer);
  const [snapshot, setSnapshot] = useState<ApplicantSnapshot | null>(req.ai_snapshot);
  const [snapLoading, setSnapLoading] = useState(!req.ai_snapshot);
  const [snapError, setSnapError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const isReferral = req.type === "referral";
  const s = req.student;
  const first = s.full_name.split(" ")[0];

  // Generate the AI snapshot once if it isn't cached yet.
  useEffect(() => {
    if (req.ai_snapshot) return;
    let cancelled = false;
    safe(snapshotAction(req.id)).then((res) => {
      if (cancelled) return;
      if (res.ok) setSnapshot(res.snapshot);
      else setSnapError(res.error);
      setSnapLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [req.id, req.ai_snapshot]);

  function retrySnapshot() {
    setSnapLoading(true);
    setSnapError(null);
    safe(snapshotAction(req.id)).then((res) => {
      if (res.ok) setSnapshot(res.snapshot);
      else setSnapError(res.error);
      setSnapLoading(false);
    });
  }

  async function openResume() {
    const win = window.open("", "_blank"); // open synchronously so popup blockers allow it
    const res = await safe(resumeUrlAction(req.id));
    if (res.ok && win) win.location.href = res.url;
    else {
      win?.close();
      setError(res.ok ? "Popup blocked — allow popups for this site." : res.error);
    }
  }

  function act(fn: () => Promise<{ ok: boolean; error?: string }>, onOk: () => void) {
    setError(null);
    start(async () => {
      const res = await safe(fn());
      if (res.ok) onOk();
      else setError(res.error ?? "Something went wrong.");
    });
  }

  const st = STATUS[status] ?? STATUS.pending;
  const standing = classStanding(s.class_year);

  return (
    <article className={cn("rounded-2xl border bg-white p-5 shadow-sm sm:p-6", isReferral && "border-2 border-hive-gold")}>
      <div className="flex flex-wrap items-start gap-4">
        <HexAvatar name={s.full_name} size={52} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-hive-green">{s.full_name}</h3>
            <span className="text-sm text-muted-foreground">
              · {s.major}
              {standing && ` ${standing}`}
            </span>
            {s.background_tags.map((t) => (
              <span key={t} className="rounded-full bg-hive-gold-light px-2 py-0.5 text-xs font-medium text-hive-green">
                {BACKGROUND_CHIPS[t] ?? t}
              </span>
            ))}
            {s.is_sample && <SampleBadge />}
          </div>
          {s.goal && (
            <p className="mt-1 text-sm">
              <span className="font-semibold">Goal:</span> {s.goal}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold">{isReferral ? "🤝 Referral request" : `Wants: ${HELP_TYPES[req.type] ?? req.type}`}</span>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", st.cls)}>{isReferral && status === "pending" ? "Awaiting your reply" : isReferral && status === "completed" ? "✓ Referred" : st.label}</span>
            <span className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
          </div>
        </div>
      </div>

      {req.message && <p className="mt-4 rounded-xl bg-secondary p-4 text-sm leading-relaxed">“{req.message}”</p>}

      <div className="mt-4 rounded-xl border border-hive-gold/50 bg-hive-gold-light/50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-hive-green">✨ AI snapshot</p>
        {snapLoading ? (
          <p className="mt-2 animate-pulse text-sm text-hive-green">Reading {first}&apos;s profile{req.share_resume ? " and resume" : ""}…</p>
        ) : snapshot ? (
          <div className="mt-2 space-y-2 text-sm">
            <p className="font-semibold text-hive-green">{snapshot.headline}</p>
            <ul className="list-disc space-y-0.5 pl-5">
              {snapshot.summary.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
            <p className="text-hive-green">
              <span className="font-semibold">Relevant to you:</span> {snapshot.relevance_to_you}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm">
            {snapError}{" "}
            <button onClick={retrySnapshot} className="font-semibold text-hive-green underline">
              Try again
            </button>
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {req.share_resume ? (
          <Button variant="outline" className="h-9 px-3" onClick={openResume}>
            📄 View resume
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">Resume not shared</span>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {status === "pending" && !isReferral && (
            <Button variant="ghost" className="h-9 px-3 text-muted-foreground" disabled={pending} onClick={() => act(() => declineAction(req.id), () => setStatus("declined"))}>
              Decline
            </Button>
          )}
          {(status === "pending" || status === "scheduled") && (
            <Button className="h-9 px-4" disabled={pending} onClick={() => act(() => markCompletedAction(req.id), () => setStatus("completed"))}>
              {isReferral ? "✓ Mark as referred" : "✓ Mark completed"}
            </Button>
          )}
          {status === "completed" && !isReferral && (
            <label className={cn("flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium", openToRefer && "border-hive-green bg-hive-green text-white")}>
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#C4B581]"
                checked={openToRefer}
                disabled={pending}
                onChange={(e) => {
                  const v = e.target.checked;
                  act(() => setOpenToReferAction(req.id, v), () => setOpenToRefer(v));
                }}
              />
              🤝 Open to refer {first}
            </label>
          )}
        </div>
      </div>
      {error && <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    </article>
  );
}

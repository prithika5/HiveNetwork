"use client";

import { safe } from "@/lib/safe";
import { useEffect, useState, useTransition } from "react";
import { declineAction, markCompletedAction, resumeUrlAction, setOpenToReferAction, snapshotAction } from "@/app/inbox/actions";
import { ChevronDown, FileText } from "lucide-react";
import { Avatar } from "@/components/hex-avatar";
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
  student: { full_name: string; photo_url?: string | null; major: string | null; class_year: number | null; background_tags: string[]; goal: string | null; is_sample: boolean };
};

const STATUS: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "Scheduled", cls: "bg-honey-soft text-ink" },
  pending: { label: "Not booked", cls: "bg-stone-100 text-stone" },
  completed: { label: "Completed", cls: "bg-stone-100 text-ink" },
  declined: { label: "Declined", cls: "bg-stone-100 text-stone" },
  canceled: { label: "Canceled", cls: "bg-stone-100 text-stone" },
};

export function RequestCard({ req }: { req: InboxRequest }) {
  const [status, setStatus] = useState(req.status);
  const [openToRefer, setOpenToRefer] = useState(req.open_to_refer);
  const [snapshot, setSnapshot] = useState<ApplicantSnapshot | null>(req.ai_snapshot);
  const [snapLoading, setSnapLoading] = useState(!req.ai_snapshot);
  const [snapError, setSnapError] = useState<string | null>(null);
  const [snapOpen, setSnapOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const isReferral = req.type === "referral";
  const s = req.student;

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
  const pillLabel = isReferral && status === "pending" ? "Awaiting reply" : isReferral && status === "completed" ? "Referred" : st.label;

  return (
    <article className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <Avatar src={s.photo_url} name={s.full_name} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold tracking-tight text-ink">{s.full_name}</h3>
            {s.is_sample && <SampleBadge />}
            <span className={cn("ml-auto rounded-full px-2.5 py-1 text-xs font-medium", st.cls)}>{pillLabel}</span>
          </div>
          <p className="text-sm text-stone">
            {s.major}
            {standing && ` · ${standing}`}
            {s.background_tags.length > 0 && ` · ${s.background_tags.map((t) => BACKGROUND_CHIPS[t]?.replace(/^\S+\s/, "") ?? t).join(", ")}`}
          </p>
        </div>
      </div>

      {s.goal && <p className="mt-4 text-[15px] text-ink">{s.goal}</p>}
      <p className="mt-1 text-sm font-medium text-stone">{isReferral ? "Referral request" : HELP_TYPES[req.type] ?? req.type}</p>
      {req.message && <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-stone" title={req.message}>{req.message}</p>}

      <button
        type="button"
        aria-expanded={snapOpen}
        onClick={() => setSnapOpen(!snapOpen)}
        className="mt-4 flex w-full items-center justify-between border-t border-line pt-4 text-sm font-medium text-ink"
      >
        ✨ AI snapshot
        <ChevronDown className={cn("size-4 text-stone transition-transform", snapOpen && "rotate-180")} strokeWidth={1.8} />
      </button>
      {snapOpen &&
        (snapLoading ? (
          <div className="mt-3 h-24 animate-pulse rounded-xl bg-stone-100" />
        ) : snapshot ? (
          <div className="mt-3 space-y-2 text-sm text-stone">
            <p className="font-medium text-ink">{snapshot.headline}</p>
            <ul className="list-disc space-y-0.5 pl-5">
              {snapshot.summary.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
            <p>{snapshot.relevance_to_you}</p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-stone">
            {snapError}{" "}
            <button onClick={retrySnapshot} className="font-medium text-ink underline">
              Retry
            </button>
          </p>
        ))}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {req.share_resume && (
          <Button variant="outline" className="h-9 rounded-full bg-white px-4" onClick={openResume}>
            <FileText className="size-4" strokeWidth={1.6} />
            View resume
          </Button>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-3">
          {status === "pending" && !isReferral && (
            <button type="button" className="text-sm text-stone hover:text-ink disabled:opacity-50" disabled={pending} onClick={() => act(() => declineAction(req.id), () => setStatus("declined"))}>
              Decline
            </button>
          )}
          {(status === "pending" || status === "scheduled") && (
            <Button className="h-9 rounded-full px-4" disabled={pending} onClick={() => act(() => markCompletedAction(req.id), () => setStatus("completed"))}>
              {isReferral ? "Mark referred" : "Mark done"}
            </Button>
          )}
          {status === "completed" && !isReferral && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                className="size-4 accent-[#292524]"
                checked={openToRefer}
                disabled={pending}
                onChange={(e) => {
                  const v = e.target.checked;
                  act(() => setOpenToReferAction(req.id, v), () => setOpenToRefer(v));
                }}
              />
              Open to refer
            </label>
          )}
        </div>
      </div>
      {error && <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    </article>
  );
}

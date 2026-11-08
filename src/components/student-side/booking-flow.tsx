"use client";

import { safe } from "@/lib/safe";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { InlineWidget, useCalendlyEventListener } from "react-calendly";
import { CheckCircle2, Coffee, FileText, MessageCircle, Mic, RefreshCw, Send } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { draftOutreachAction, markScheduledAction, sendMessageInsteadAction, startBookingAction } from "@/app/alumni/[id]/book/actions";
import { ChatPrepCard } from "./chat-prep";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { HELP_TYPES } from "@/lib/labels";
import { cn } from "@/lib/utils";

type Alum = { id: string; first: string; full_name: string; calendly_url: string | null; help_types: string[] };
type Student = { name: string; email: string; hasResume: boolean };
type Stage = "compose" | "calendar" | "booked" | "sent";

const TYPE_ICON: Record<string, LucideIcon> = { coffee_chat: Coffee, mock_interview: Mic, resume_review: FileText, quick_question: MessageCircle };
const card = "rounded-2xl border border-line bg-white p-6 sm:p-8";

function StepLabel({ n, title }: { n: number; title: string }) {
  return (
    <h2 className="mb-5 flex items-center gap-3 text-lg font-semibold tracking-tight text-ink">
      <span className="flex size-6 items-center justify-center rounded-full bg-stone-100 text-xs font-medium text-stone">{n}</span>
      {title}
    </h2>
  );
}

export function BookingFlow({ alum, student, initialType, existing }: { alum: Alum; student: Student; initialType?: string; existing?: { id: string; type: string; message: string } }) {
  const bookable = alum.help_types.filter((h) => h !== "referral");
  const canSchedule = !!alum.calendly_url;
  const [type, setType] = useState<string>(existing?.type ?? (initialType && bookable.includes(initialType) ? initialType : bookable[0] ?? "coffee_chat"));
  const [shareResume, setShareResume] = useState(student.hasResume);
  const [message, setMessage] = useState(existing?.message ?? "");
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("compose");
  const [requestId, setRequestId] = useState<string | null>(existing?.id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const draftedFor = useRef<string | null>(existing ? existing.type : null);

  async function draft(forType: string) {
    draftedFor.current = forType;
    setDrafting(true);
    setDraftError(null);
    const res = await safe(draftOutreachAction(alum.id, forType));
    if (res.ok) setMessage(res.message);
    else setDraftError(res.error);
    setDrafting(false);
  }

  // Auto-draft the first time.
  useEffect(() => {
    if (draftedFor.current === null) void draft(type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onContinue() {
    setError(null);
    startTransition(async () => {
      const res = canSchedule
        ? await safe(startBookingAction({ alumniId: alum.id, type: type as "coffee_chat", message, shareResume }))
        : await safe(sendMessageInsteadAction(alum.id, message, shareResume));
      if (!res.ok) return setError(res.error);
      setRequestId(res.requestId);
      setStage(canSchedule ? "calendar" : "sent");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  useCalendlyEventListener({
    onEventScheduled: async (e) => {
      if (!requestId) return;
      setStage("booked");
      const res = await safe(markScheduledAction(requestId, e.data.payload.event.uri, e.data.payload.invitee.uri));
      if (!res.ok) setError(`Booked in Calendly, but we couldn't update your chat: ${res.error}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  });

  if (stage === "booked" || stage === "sent") {
    return (
      <div className="space-y-5">
        <div className={cn(card, "text-center")}>
          <CheckCircle2 className="mx-auto size-8 text-honey" strokeWidth={1.6} />
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">{stage === "booked" ? "You're booked" : `Sent to ${alum.first}`}</h2>
          {stage === "booked" && <p className="mt-1 text-sm text-stone">Check your email for the invite.</p>}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/chats" className={buttonVariants({ className: "h-10 rounded-full px-5" })}>
              My chats
            </Link>
            <Link href="/alumni" className={buttonVariants({ variant: "outline", className: "h-10 rounded-full bg-white px-5" })}>
              Browse alumni
            </Link>
          </div>
        </div>
        {error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        {requestId && stage === "booked" && <ChatPrepCard requestId={requestId} />}
      </div>
    );
  }

  if (stage === "calendar" && alum.calendly_url) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between rounded-2xl border border-line bg-white px-5 py-4">
          <span className="text-sm font-medium text-ink">{HELP_TYPES[type]}</span>
          <button type="button" onClick={() => setStage("compose")} className="text-sm text-stone hover:text-ink">
            Edit
          </button>
        </div>
        <section className="overflow-hidden rounded-2xl border border-line bg-white">
          <InlineWidget
            url={alum.calendly_url}
            styles={{ height: "720px", minWidth: "280px" }}
            prefill={{ name: student.name, email: student.email, customAnswers: { a1: message } }}
            utm={{ utmContent: requestId ?? undefined, utmSource: "hive-network" }}
            pageSettings={{ hideGdprBanner: true }}
          />
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className={card}>
        <StepLabel n={1} title="Chat type" />
        {canSchedule ? (
          <div className="grid grid-cols-2 gap-3">
            {bookable.map((h) => {
              const Icon = TYPE_ICON[h] ?? MessageCircle;
              return (
                <button
                  key={h}
                  type="button"
                  aria-pressed={type === h}
                  onClick={() => {
                    setType(h);
                    if (draftedFor.current !== h && !drafting) void draft(h);
                  }}
                  className={cn("flex items-center gap-2.5 rounded-xl border p-4 text-left text-sm font-medium text-ink transition-colors", type === h ? "border-ink" : "border-line hover:border-stone-400")}
                >
                  <Icon className="size-[18px] shrink-0" strokeWidth={1.6} />
                  {HELP_TYPES[h]}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-stone">No calendar yet. Send a note instead.</p>
        )}

        <label className={cn("mt-5 flex cursor-pointer items-center justify-between gap-3 border-t border-line pt-5 text-sm text-ink", !student.hasResume && "cursor-default text-stone")}>
          <span>
            Share my resume
            {!student.hasResume && (
              <Link href="/profile" className="ml-2 underline">
                Add one
              </Link>
            )}
          </span>
          <input type="checkbox" className="size-4 accent-[#292524]" checked={shareResume} disabled={!student.hasResume} onChange={(e) => setShareResume(e.target.checked)} />
        </label>
      </section>

      <section className={card}>
        <div className="flex items-start justify-between">
          <StepLabel n={2} title="Your note" />
          <button
            type="button"
            title="Redraft with AI"
            aria-label="Redraft with AI"
            disabled={drafting}
            onClick={() => draft(type)}
            className="flex size-8 items-center justify-center rounded-full text-stone transition-colors hover:text-ink disabled:opacity-50"
          >
            <RefreshCw className={cn("size-4", drafting && "animate-spin")} strokeWidth={1.8} />
          </button>
        </div>
        {drafting ? (
          <div className="h-40 animate-pulse rounded-xl bg-stone-100" />
        ) : (
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} aria-label={`Your note to ${alum.first}`} className="rounded-xl text-[15px] leading-relaxed" placeholder={`Hi ${alum.first} — …`} />
        )}
        {draftError && <p className="mt-3 text-sm text-stone">{draftError}</p>}
        {error && <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <Button onClick={onContinue} disabled={pending || drafting || message.trim().length < 10} className="mt-5 h-11 w-full rounded-full text-[15px] sm:w-auto sm:px-7">
          {pending ? "One sec…" : canSchedule ? "Pick a time" : (<><Send className="size-4" /> Send</>)}
        </Button>
      </section>
    </div>
  );
}

"use client";

import { safe } from "@/lib/safe";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { InlineWidget, useCalendlyEventListener } from "react-calendly";
import { draftOutreachAction, markScheduledAction, sendMessageInsteadAction, startBookingAction } from "@/app/alumni/[id]/book/actions";
import { ChatPrepCard } from "./chat-prep";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { HELP_TYPES } from "@/lib/labels";
import { cn } from "@/lib/utils";

type Alum = { id: string; first: string; full_name: string; calendly_url: string | null; help_types: string[] };
type Student = { name: string; email: string; hasResume: boolean };
type Stage = "compose" | "calendar" | "booked" | "sent";

const TYPE_ICON: Record<string, string> = { coffee_chat: "☕", mock_interview: "🎤", resume_review: "📄", quick_question: "💬" };
const TYPE_BLURB: Record<string, string> = {
  coffee_chat: "15–20 min to learn their path",
  mock_interview: "Practice with real feedback",
  resume_review: "Get eyes on your resume",
  quick_question: "One focused question",
};

function StepLabel({ n, title, done }: { n: number; title: string; done?: boolean }) {
  return (
    <h2 className="mb-4 flex items-center gap-3 text-lg font-bold text-hive-green">
      <span className={cn("hex flex h-8 w-8 items-center justify-center text-sm", done ? "bg-hive-green text-white" : "bg-hive-gold-light")}>{done ? "✓" : n}</span>
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
  const calendarRef = useRef<HTMLDivElement>(null);

  async function draft(forType: string) {
    draftedFor.current = forType;
    setDrafting(true);
    setDraftError(null);
    const res = await safe(draftOutreachAction(alum.id, forType));
    if (res.ok) setMessage(res.message);
    else setDraftError(res.error);
    setDrafting(false);
  }

  // Auto-draft the first time (and when switching type, if they haven't edited much).
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
      setTimeout(() => calendarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
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
      <div className="space-y-6">
        <div className="rounded-2xl border-2 border-hive-green bg-hive-green p-6 text-white sm:p-8">
          <p className="text-3xl">{stage === "booked" ? "✅" : "📨"}</p>
          <h2 className="mt-2 text-2xl font-bold">{stage === "booked" ? "You're booked!" : `Sent to ${alum.first}!`}</h2>
          <p className="mt-1 text-white/80">
            {stage === "booked"
              ? `Check your ${student.email.split("@")[1] ?? "csus.edu"} email for the calendar invite. Calendly handles reschedules and time zones.`
              : `${alum.first} will see your note in their inbox.`}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/chats" className={buttonVariants({ className: "h-10 bg-hive-gold px-4 text-hive-green hover:bg-hive-gold/90" })}>
              Go to My chats →
            </Link>
            <Link href="/alumni" className={buttonVariants({ variant: "outline", className: "h-10 border-white/40 bg-transparent px-4 text-white hover:bg-white/10 hover:text-white" })}>
              Browse more alumni
            </Link>
          </div>
        </div>
        {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        {requestId && stage === "booked" && <ChatPrepCard requestId={requestId} alumFirstName={alum.first} />}
      </div>
    );
  }

  const locked = stage === "calendar";

  return (
    <div className="space-y-6">
      <section className={cn("rounded-2xl border bg-white p-6 shadow-sm sm:p-8", locked && "opacity-60")}>
        <StepLabel n={1} title="What kind of chat?" done={locked} />
        {canSchedule ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {bookable.map((h) => (
              <button
                key={h}
                type="button"
                disabled={locked}
                onClick={() => {
                  setType(h);
                  if (draftedFor.current !== h && !drafting) void draft(h);
                }}
                className={cn(
                  "rounded-xl border-2 p-4 text-left transition-colors",
                  type === h ? "border-hive-green bg-secondary" : "border-border hover:border-hive-green/50",
                )}
              >
                <p className="font-semibold">
                  {TYPE_ICON[h]} {HELP_TYPES[h]}
                </p>
                <p className="text-sm text-muted-foreground">{TYPE_BLURB[h]}</p>
              </button>
            ))}
          </div>
        ) : (
          <p className="rounded-xl bg-hive-gold-light p-4 text-hive-green">
            {alum.first} hasn&apos;t set up booking yet — send a message instead and they&apos;ll get back to you.
          </p>
        )}

        <label className={cn("mt-6 flex items-start gap-3 rounded-xl border p-4", !student.hasResume && "opacity-60")}>
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-[#043927]"
            checked={shareResume}
            disabled={!student.hasResume || locked}
            onChange={(e) => setShareResume(e.target.checked)}
          />
          <span>
            <span className="font-medium">Share my resume with {alum.first}</span>
            <span className="block text-sm text-muted-foreground">
              {student.hasResume ? "Only they can open it, through a private link." : <>No resume yet — <Link href="/profile" className="underline">add one</Link>.</>}
            </span>
          </span>
        </label>
      </section>

      <section className={cn("rounded-2xl border bg-white p-6 shadow-sm sm:p-8", locked && "opacity-60")}>
        <StepLabel n={2} title={`Your note to ${alum.first}`} done={locked} />
        <div className="relative">
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} disabled={drafting || locked} className="text-base leading-relaxed" placeholder={drafting ? "" : `Hi ${alum.first} — …`} />
          {drafting && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/80">
              <p className="animate-pulse font-medium text-hive-green">✨ Drafting a note that references {alum.first}&apos;s path…</p>
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">✨ AI-drafted — edit it so it sounds like you. This is what {alum.first} sees.</p>
          {!locked && (
            <Button variant="ghost" size="sm" disabled={drafting} onClick={() => draft(type)}>
              ↻ Redraft
            </Button>
          )}
        </div>
        {draftError && <p className="mt-2 rounded-lg bg-secondary p-3 text-sm">{draftError}</p>}
        {error && <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        {!locked && (
          <Button onClick={onContinue} disabled={pending || drafting || message.trim().length < 10} className="mt-5 h-12 w-full text-base sm:w-auto sm:px-8">
            {pending ? "One sec…" : canSchedule ? "Continue → pick a time" : `Send to ${alum.first}`}
          </Button>
        )}
      </section>

      {locked && alum.calendly_url && (
        <section ref={calendarRef} className="scroll-mt-20 rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 px-2">
            <StepLabel n={3} title={`Pick a time on ${alum.first}'s calendar`} />
            <button type="button" onClick={() => setStage("compose")} className="mb-4 text-sm font-medium text-muted-foreground hover:text-hive-green">
              ← Edit note
            </button>
          </div>
          <InlineWidget
            url={alum.calendly_url}
            styles={{ height: "720px", minWidth: "280px" }}
            prefill={{ name: student.name, email: student.email, customAnswers: { a1: message } }}
            utm={{ utmContent: requestId ?? undefined, utmSource: "hive-network" }}
            pageSettings={{ hideGdprBanner: true, primaryColor: "043927" }}
          />
        </section>
      )}
    </div>
  );
}

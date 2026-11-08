"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { cancelRequestAction, requestReferralAction, sendKudosAction } from "@/app/chats/actions";
import { ChatPrepCard } from "./chat-prep";
import { HexAvatar } from "@/components/hex-avatar";
import { SampleBadge } from "@/components/sample-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { HELP_TYPES } from "@/lib/labels";
import type { ChatPrep } from "@/lib/ai/student";
import { cn } from "@/lib/utils";

export type StudentChat = {
  id: string;
  type: string;
  status: string;
  message: string | null;
  open_to_refer: boolean;
  ai_prep: ChatPrep | null;
  created_at: string;
  alum: { id: string; full_name: string; photo_url: string | null; job_title: string | null; company: string | null; is_sample: boolean };
  thanked: boolean;
  referralStatus: string | null; // status of a referral request with this alum, if any
};

const STATUS: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "✅ Booked via Calendly — check your email", cls: "bg-hive-green text-white" },
  pending: { label: "⏳ Not booked yet", cls: "bg-hive-gold-light text-hive-green" },
  completed: { label: "✓ Completed", cls: "bg-secondary text-hive-green" },
  declined: { label: "Declined", cls: "bg-secondary text-muted-foreground" },
  canceled: { label: "Canceled", cls: "bg-secondary text-muted-foreground" },
};

export function ChatItem({ chat }: { chat: StudentChat }) {
  const first = chat.alum.full_name.split(" ")[0];
  const isReferral = chat.type === "referral";
  const [status, setStatus] = useState(chat.status);
  const [showPrep, setShowPrep] = useState(false);
  const [thanked, setThanked] = useState(chat.thanked);
  const [kudosOpen, setKudosOpen] = useState(false);
  const [kudos, setKudos] = useState("");
  const [referral, setReferral] = useState(chat.referralStatus);
  const [refOpen, setRefOpen] = useState(false);
  const [refNote, setRefNote] = useState(
    `Hi ${first} — thank you again for our chat! I'm applying for [role] at [company] ([job link]). Would you be open to referring me? Happy to send anything that makes it easy.`,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, onOk: () => void) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.ok) onOk();
      else setError(res.error ?? "Something went wrong.");
    });
  }

  const st = isReferral
    ? status === "completed"
      ? { label: "🎉 Referred!", cls: "bg-hive-green text-white" }
      : status === "pending"
        ? { label: `⏳ Waiting on ${first}`, cls: "bg-hive-gold-light text-hive-green" }
        : STATUS[status]
    : STATUS[status] ?? STATUS.pending;

  return (
    <article className={cn("rounded-2xl border bg-white p-5 shadow-sm sm:p-6", isReferral && "border-2 border-hive-gold")}>
      <div className="flex flex-wrap items-start gap-4">
        <HexAvatar src={chat.alum.photo_url} name={chat.alum.full_name} size={52} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/alumni/${chat.alum.id}`} className="text-lg font-semibold text-hive-green hover:underline">
              {chat.alum.full_name}
            </Link>
            {chat.alum.is_sample && <SampleBadge />}
          </div>
          <p className="text-sm text-muted-foreground">
            {chat.alum.job_title}
            {chat.alum.company && ` @ ${chat.alum.company}`}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold">{isReferral ? "🤝 Referral request" : HELP_TYPES[chat.type]}</span>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", st.cls)}>{st.label}</span>
            <span className="text-xs text-muted-foreground">requested {new Date(chat.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
          </div>
        </div>
      </div>

      {chat.message && <p className="mt-4 line-clamp-3 rounded-xl bg-secondary p-4 text-sm leading-relaxed">“{chat.message}”</p>}

      {!isReferral && (
        <div className="mt-4 flex flex-wrap gap-2">
          {status === "pending" && (
            <>
              <Link href={`/alumni/${chat.alum.id}/book`} className={buttonVariants({ className: "h-9 px-4" })}>
                📅 Finish booking
              </Link>
              <Button variant="ghost" className="h-9 px-3 text-muted-foreground" disabled={pending} onClick={() => run(() => cancelRequestAction(chat.id), () => setStatus("canceled"))}>
                Cancel request
              </Button>
            </>
          )}
          {["pending", "scheduled", "completed"].includes(status) && (
            <Button variant="outline" className="h-9 px-4" onClick={() => setShowPrep(!showPrep)}>
              {showPrep ? "Hide prep" : "📝 View chat prep"}
            </Button>
          )}
          {status === "completed" &&
            (thanked ? (
              <span className="flex h-9 items-center rounded-lg bg-hive-gold-light px-3 text-sm font-medium text-hive-green">💛 Thanks sent</span>
            ) : (
              <Button variant="outline" className="h-9 px-4" onClick={() => setKudosOpen(!kudosOpen)}>
                💛 Say thanks
              </Button>
            ))}
          {status === "completed" && chat.open_to_refer && !referral && (
            <Button className="h-9 bg-hive-gold px-4 text-hive-green hover:bg-hive-gold/90" onClick={() => setRefOpen(!refOpen)}>
              🤝 Request referral
            </Button>
          )}
          {status === "completed" && referral && (
            <span className="flex h-9 items-center rounded-lg bg-hive-green px-3 text-sm font-medium text-white">
              {referral === "completed" ? "🎉 Referred!" : "🤝 Referral requested"}
            </span>
          )}
        </div>
      )}

      {status === "completed" && chat.open_to_refer && !referral && !refOpen && (
        <p className="mt-3 text-sm font-medium text-hive-green">✨ {first} marked you as open to refer!</p>
      )}

      {kudosOpen && !thanked && (
        <div className="mt-4 rounded-xl border p-4">
          <p className="mb-2 text-sm font-semibold">A quick thank-you for {first} (shown on their profile)</p>
          <Textarea value={kudos} onChange={(e) => setKudos(e.target.value)} rows={3} placeholder={`${first} walked me through exactly how…`} />
          <Button className="mt-3 h-9 px-4" disabled={pending} onClick={() => run(() => sendKudosAction(chat.id, kudos), () => setThanked(true))}>
            Send thanks
          </Button>
        </div>
      )}

      {refOpen && !referral && (
        <div className="mt-4 rounded-xl border-2 border-hive-gold p-4">
          <p className="mb-2 text-sm font-semibold">Your referral request — be specific so it&apos;s easy for {first} to say yes</p>
          <Textarea value={refNote} onChange={(e) => setRefNote(e.target.value)} rows={4} className="text-base" />
          <Button className="mt-3 h-10 px-5" disabled={pending} onClick={() => run(() => requestReferralAction(chat.alum.id, refNote), () => { setReferral("pending"); setRefOpen(false); })}>
            {pending ? "Sending…" : `Send to ${first}`}
          </Button>
        </div>
      )}

      {showPrep && (
        <div className="mt-4">
          <ChatPrepCard requestId={chat.id} initial={chat.ai_prep} alumFirstName={first} />
        </div>
      )}
      {error && <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    </article>
  );
}

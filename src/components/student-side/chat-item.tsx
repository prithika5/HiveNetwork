"use client";

import { safe } from "@/lib/safe";
import Link from "next/link";
import { useState, useTransition } from "react";
import { cancelRequestAction, requestReferralAction, sendKudosAction } from "@/app/chats/actions";
import { ChatPrepCard } from "./chat-prep";
import { ChevronDown, Heart } from "lucide-react";
import { Avatar } from "@/components/hex-avatar";
import { CompanyLogo } from "@/components/company-logo";
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
  alum: { id: string; full_name: string; photo_url: string | null; job_title: string | null; company: string | null; company_domain?: string | null; is_sample: boolean };
  thanked: boolean;
  referralStatus: string | null; // status of a referral request with this alum, if any
};

const STATUS: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "Booked", cls: "bg-honey-soft text-ink" },
  pending: { label: "Not booked", cls: "bg-stone-100 text-stone" },
  completed: { label: "Done", cls: "bg-stone-100 text-ink" },
  declined: { label: "Declined", cls: "bg-stone-100 text-stone" },
  canceled: { label: "Canceled", cls: "bg-stone-100 text-stone" },
};

const ghost = "h-9 rounded-full bg-white px-4";

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
      const res = await safe(fn());
      if (res.ok) onOk();
      else setError(res.error ?? "Something went wrong.");
    });
  }

  const st = isReferral
    ? status === "completed"
      ? { label: "Referred", cls: "bg-honey-soft text-ink" }
      : status === "pending"
        ? { label: "Waiting", cls: "bg-stone-100 text-stone" }
        : STATUS[status]
    : STATUS[status] ?? STATUS.pending;
  const hasPlaceholders = /\[(role|company|job link)\]/i.test(refNote);

  return (
    <article className="rounded-2xl border border-line bg-white p-5">
      <div className="flex items-center gap-4">
        <Avatar src={chat.alum.photo_url} name={chat.alum.full_name} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link href={`/alumni/${chat.alum.id}`} className="truncate font-semibold tracking-tight text-ink hover:underline">
              {chat.alum.full_name}
            </Link>
            {chat.alum.is_sample && <SampleBadge />}
          </div>
          <p className="flex items-center gap-1.5 text-sm text-stone">
            {isReferral ? "Referral" : HELP_TYPES[chat.type]}
            {chat.alum.company && (
              <>
                <span>·</span>
                <CompanyLogo domain={chat.alum.company_domain} name={chat.alum.company} size={14} />
                <span className="truncate">{chat.alum.company}</span>
              </>
            )}
          </p>
        </div>
        <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-medium", st.cls)}>{st.label}</span>
      </div>

      {!isReferral && ["pending", "scheduled", "completed"].includes(status) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {status === "pending" && (
            <Link href={`/alumni/${chat.alum.id}/book`} className={buttonVariants({ className: "h-9 rounded-full px-4" })}>
              Finish booking
            </Link>
          )}
          <Button variant="outline" className={ghost} onClick={() => setShowPrep(!showPrep)}>
            Prep
            <ChevronDown className={cn("size-3.5 transition-transform", showPrep && "rotate-180")} strokeWidth={2} />
          </Button>
          {status === "completed" &&
            (thanked ? (
              <span className="flex h-9 items-center gap-1.5 px-2 text-sm text-stone">
                <Heart className="size-3.5" strokeWidth={1.8} />
                Thanked
              </span>
            ) : (
              <Button variant="outline" className={ghost} onClick={() => setKudosOpen(!kudosOpen)}>
                Say thanks
              </Button>
            ))}
          {status === "completed" && chat.open_to_refer && !referral && (
            <Button className="h-9 rounded-full px-4" onClick={() => setRefOpen(!refOpen)}>
              Request referral
            </Button>
          )}
          {status === "completed" && referral && <span className="flex h-9 items-center px-2 text-sm text-stone">{referral === "completed" ? "Referred" : "Referral requested"}</span>}
          {status === "pending" && (
            <button type="button" className="ml-auto text-sm text-stone hover:text-ink disabled:opacity-50" disabled={pending} onClick={() => run(() => cancelRequestAction(chat.id), () => setStatus("canceled"))}>
              Cancel
            </button>
          )}
        </div>
      )}

      {kudosOpen && !thanked && (
        <div className="mt-4 border-t border-line pt-4">
          <Textarea value={kudos} onChange={(e) => setKudos(e.target.value)} rows={3} aria-label={`Thank-you note for ${first}`} className="rounded-xl" placeholder={`Thanks for…`} />
          <Button className="mt-3 h-9 rounded-full px-4" disabled={pending} onClick={() => run(() => sendKudosAction(chat.id, kudos), () => setThanked(true))}>
            Send
          </Button>
        </div>
      )}

      {refOpen && !referral && (
        <div className="mt-4 border-t border-line pt-4">
          <Textarea value={refNote} onChange={(e) => setRefNote(e.target.value)} rows={4} aria-label={`Referral request to ${first}`} className="rounded-xl text-[15px]" />
          <div className="mt-3 flex items-center gap-3">
            <Button className="h-9 rounded-full px-4" disabled={pending || hasPlaceholders} onClick={() => run(() => requestReferralAction(chat.alum.id, refNote), () => { setReferral("pending"); setRefOpen(false); })}>
              {pending ? "Sending…" : "Send"}
            </Button>
            {hasPlaceholders && <span className="text-xs text-stone">Fill in the [brackets]</span>}
          </div>
        </div>
      )}

      {showPrep && (
        <div className="mt-4">
          <ChatPrepCard requestId={chat.id} initial={chat.ai_prep} />
        </div>
      )}
      {error && <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    </article>
  );
}

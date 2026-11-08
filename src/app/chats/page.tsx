import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ChatItem, type StudentChat } from "@/components/student-side/chat-item";
import { buttonVariants } from "@/components/ui/button";

async function Chats() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/chats");
  if (user.role !== "student") redirect(user.role === "alumni" ? "/inbox" : "/");

  const supabase = await createClient();
  const [{ data }, { data: kudos }] = await Promise.all([
    supabase
      .from("requests")
      .select(
        "id, alumni_id, type, status, message, open_to_refer, ai_prep, created_at, alum:profiles!requests_alumni_id_fkey(id, full_name, photo_url, job_title, company, is_sample)",
      )
      .eq("student_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("kudos").select("request_id").eq("student_id", user.id),
  ]);
  const rows = (data ?? []).map((r) => ({ ...r, alum: Array.isArray(r.alum) ? r.alum[0] : r.alum }));
  const thanked = new Set((kudos ?? []).map((k) => k.request_id));
  const referralByAlum = new Map<string, string>();
  for (const r of rows) if (r.type === "referral" && r.status !== "canceled") referralByAlum.set(r.alumni_id, r.status);

  const chats: StudentChat[] = rows
    .filter((r) => r.alum)
    .map((r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      message: r.message,
      open_to_refer: r.open_to_refer,
      ai_prep: r.ai_prep,
      created_at: r.created_at,
      alum: r.alum,
      thanked: thanked.has(r.id),
      referralStatus: r.type === "referral" ? null : (referralByAlum.get(r.alumni_id) ?? null),
    }));

  const upcoming = chats.filter((c) => c.type !== "referral" && ["pending", "scheduled"].includes(c.status));
  const referrals = chats.filter((c) => c.type === "referral");
  const past = chats.filter((c) => c.type !== "referral" && !["pending", "scheduled"].includes(c.status));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-hive-green">My chats</h1>
      <p className="mt-1 text-muted-foreground">Your 1:1s, prep, and the path from a great conversation to a referral.</p>

      {chats.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed p-12 text-center">
          <p className="text-lg font-medium">No chats yet.</p>
          <p className="mt-1 text-muted-foreground">Start with your AI matches — they&apos;re the alumni most likely to say yes.</p>
          <Link href="/alumni" className={buttonVariants({ className: "mt-5 h-11 px-6 text-base" })}>
            ✨ See my matches
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Upcoming ({upcoming.length})</h2>
            {upcoming.length ? upcoming.map((c) => <ChatItem key={c.id} chat={c} />) : <p className="text-muted-foreground">Nothing booked right now.</p>}
          </section>
          {referrals.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">🤝 Referrals ({referrals.length})</h2>
              {referrals.map((c) => (
                <ChatItem key={c.id} chat={c} />
              ))}
            </section>
          )}
          {past.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Past ({past.length})</h2>
              {past.map((c) => (
                <ChatItem key={c.id} chat={c} />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default function ChatsPage() {
  return (
    <Suspense fallback={<div className="mx-auto mt-10 h-[600px] max-w-4xl animate-pulse rounded-2xl bg-secondary" />}>
      <Chats />
    </Suspense>
  );
}

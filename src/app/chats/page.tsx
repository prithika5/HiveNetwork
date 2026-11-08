import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { HornetIcon } from "@/components/hive-logo";
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
        "id, alumni_id, type, status, message, open_to_refer, ai_prep, created_at, alum:profiles!requests_alumni_id_fkey(id, full_name, photo_url, job_title, company, company_domain, is_sample)",
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

  const groups = [
    { title: "Upcoming", items: upcoming },
    { title: "Referrals", items: referrals },
    { title: "Past", items: past },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight text-ink">Chats</h1>
      {chats.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-12 text-center">
          <HornetIcon className="mx-auto h-10 w-10" />
          <p className="mt-3 text-stone">No chats yet</p>
          <Link href="/alumni" className={buttonVariants({ className: "mt-5 h-10 rounded-full px-5" })}>
            See matches
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map((g) => (
            <section key={g.title}>
              <h2 className="mb-3 text-sm font-medium text-stone">{g.title}</h2>
              <div className="space-y-3">
                {g.items.map((c) => (
                  <ChatItem key={c.id} chat={c} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ChatsSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-3 px-5 py-12">
      <div className="mb-8 h-10 w-32 animate-pulse rounded-xl bg-stone-100" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-28 animate-pulse rounded-2xl border border-line bg-white" />
      ))}
    </div>
  );
}

export default function ChatsPage() {
  return (
    <Suspense fallback={<ChatsSkeleton />}>
      <Chats />
    </Suspense>
  );
}

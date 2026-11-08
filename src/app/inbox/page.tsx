import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RequestCard, type InboxRequest } from "@/components/alumni-side/request-card";

async function Inbox() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/inbox");
  if (user.role !== "alumni") redirect(user.role === "student" ? "/chats" : "/");

  const supabase = await createClient();
  const [{ data }, { data: me }] = await Promise.all([
    supabase
      .from("requests")
      .select(
        "id, type, status, message, share_resume, open_to_refer, ai_snapshot, created_at, student:profiles!requests_student_id_fkey(full_name, major, class_year, background_tags, goal, is_sample)",
      )
      .eq("alumni_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("monthly_limit, calendly_url").eq("id", user.id).single(),
  ]);
  const requests = (data ?? []).map((r) => ({ ...r, student: Array.isArray(r.student) ? r.student[0] : r.student })) as InboxRequest[];

  const active = requests.filter((r) => r.status === "pending" || r.status === "scheduled");
  const past = requests.filter((r) => !active.includes(r));
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const usedThisMonth = requests.filter((r) => r.type !== "referral" && !["declined", "canceled"].includes(r.status) && new Date(r.created_at) >= monthStart).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-hive-green">Your inbox</h1>
          <p className="mt-1 text-muted-foreground">Hornets who asked for your time. Every card has a ✨ AI snapshot so you can prep in 30 seconds.</p>
        </div>
        <div className="flex gap-3 text-center">
          <div className="rounded-2xl border bg-white px-4 py-2">
            <p className="text-2xl font-bold text-hive-green">{active.length}</p>
            <p className="text-xs text-muted-foreground">open</p>
          </div>
          <div className="rounded-2xl border bg-white px-4 py-2">
            <p className="text-2xl font-bold text-hive-green">
              {usedThisMonth}/{me?.monthly_limit ?? 2}
            </p>
            <p className="text-xs text-muted-foreground">chats this month</p>
          </div>
        </div>
      </div>

      {!user.verified && (
        <p className="mb-6 rounded-xl bg-hive-gold-light p-4 text-sm text-hive-green">
          Your profile is <strong>pending verification</strong> — students will see you once our team approves it.
        </p>
      )}
      {!me?.calendly_url && (
        <p className="mb-6 rounded-xl bg-secondary p-4 text-sm">
          📅 Add your Calendly link in <Link href="/profile" className="font-semibold text-hive-green underline">your profile</Link> so students can book a time with you.
        </p>
      )}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Needs your attention ({active.length})</h2>
        {active.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">No open requests right now. 🐝</p>
        ) : (
          active.map((r) => <RequestCard key={r.id} req={r} />)
        )}
      </section>

      {past.length > 0 && (
        <section className="mt-10 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Past chats ({past.length})</h2>
          {past.map((r) => (
            <RequestCard key={r.id} req={r} />
          ))}
        </section>
      )}
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={<div className="mx-auto mt-10 h-[600px] max-w-4xl animate-pulse rounded-2xl bg-secondary" />}>
      <Inbox />
    </Suspense>
  );
}

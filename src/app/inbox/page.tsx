import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { HornetIcon } from "@/components/hive-logo";
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
        "id, type, status, message, share_resume, open_to_refer, ai_snapshot, created_at, student:profiles!requests_student_id_fkey(full_name, photo_url, major, class_year, background_tags, goal, is_sample)",
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
    <div className="mx-auto max-w-3xl px-5 py-12">
      <div className="mb-8 flex items-end justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Inbox</h1>
        <p className="text-sm text-stone">
          {usedThisMonth}/{me?.monthly_limit ?? 2} this month
        </p>
      </div>

      {!user.verified && <p className="mb-5 rounded-2xl border border-honey/40 bg-honey-soft/50 px-5 py-3 text-sm text-ink">Pending verification</p>}
      {!me?.calendly_url && (
        <Link href="/profile" className="mb-5 block rounded-2xl border border-line bg-white px-5 py-3 text-sm text-ink hover:border-stone-400">
          Add your Calendly link →
        </Link>
      )}

      {active.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-12 text-center">
          <HornetIcon className="mx-auto h-10 w-10" />
          <p className="mt-3 text-stone">All caught up</p>
        </div>
      ) : (
        <div className="space-y-4">
          {active.map((r) => (
            <RequestCard key={r.id} req={r} />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-sm font-medium text-stone">Past</h2>
          <div className="space-y-4">
            {past.map((r) => (
              <RequestCard key={r.id} req={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function InboxSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-5 py-12">
      <div className="h-10 w-40 animate-pulse rounded-xl bg-stone-100" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-48 animate-pulse rounded-2xl border border-line bg-white" />
      ))}
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={<InboxSkeleton />}>
      <Inbox />
    </Suspense>
  );
}

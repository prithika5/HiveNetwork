import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { HexAvatar } from "@/components/hex-avatar";
import { SampleBadge } from "@/components/sample-badge";
import { VerifyButton } from "@/components/alumni-side/verify-button";

async function Stats() {
  // Aggregate counts only (no personal data) — service role, after the admin check in the parent.
  const db = createAdminClient();
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const [students, alumni, booked, completed, referralsAsked, referred, kudos] = await Promise.all([
    count(db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student")),
    count(db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "alumni").eq("verified", true)),
    count(db.from("requests").select("id", { count: "exact", head: true }).neq("type", "referral").in("status", ["scheduled", "completed"])),
    count(db.from("requests").select("id", { count: "exact", head: true }).neq("type", "referral").eq("status", "completed")),
    count(db.from("requests").select("id", { count: "exact", head: true }).eq("type", "referral")),
    count(db.from("requests").select("id", { count: "exact", head: true }).eq("type", "referral").eq("status", "completed")),
    count(db.from("kudos").select("id", { count: "exact", head: true })),
  ]);
  const tiles = [
    ["Students", students],
    ["Verified alumni", alumni],
    ["1:1s booked", booked],
    ["1:1s completed", completed],
    ["Referrals requested", referralsAsked],
    ["Referrals made", referred],
    ["Kudos", kudos],
  ] as const;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {tiles.map(([label, n]) => (
        <div key={label} className="rounded-2xl border bg-white p-4">
          <p className="text-3xl font-bold tabular-nums text-hive-green">{n}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      ))}
    </div>
  );
}

async function Admin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") redirect("/");

  const supabase = await createClient();
  const { data: alumni } = await supabase
    .from("profiles")
    .select("id, full_name, photo_url, job_title, company, major, grad_year, linkedin_url, verified, is_sample, onboarded, created_at")
    .eq("role", "alumni")
    .order("verified", { ascending: true })
    .order("created_at", { ascending: false });
  const pending = (alumni ?? []).filter((a) => !a.verified);
  const verified = (alumni ?? []).filter((a) => a.verified);

  const Row = ({ a }: { a: NonNullable<typeof alumni>[number] }) => (
    <li className="flex flex-wrap items-center gap-4 rounded-2xl border bg-white p-4">
      <HexAvatar src={a.photo_url} name={a.full_name} size={44} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/alumni/${a.id}`} className="font-semibold text-hive-green hover:underline">
            {a.full_name ?? "(no name yet)"}
          </Link>
          {a.is_sample && <SampleBadge />}
          {!a.onboarded && <span className="text-xs text-muted-foreground">· hasn&apos;t finished onboarding</span>}
        </div>
        <p className="text-sm text-muted-foreground">
          {[a.job_title, a.company].filter(Boolean).join(" @ ") || "—"} · Sac State {a.major ?? "?"} {a.grad_year ?? ""}
          {a.linkedin_url && (
            <>
              {" · "}
              <a href={a.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-[#0A66C2] hover:underline">
                LinkedIn ↗
              </a>
            </>
          )}
        </p>
      </div>
      <VerifyButton id={a.id} verified={a.verified} />
    </li>
  );

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Impact</h2>
        <Suspense fallback={<div className="h-24 animate-pulse rounded-2xl bg-secondary" />}>
          <Stats />
        </Suspense>
      </section>
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Pending verification ({pending.length})</h2>
        {pending.length ? (
          <ul className="space-y-3">{pending.map((a) => <Row key={a.id} a={a} />)}</ul>
        ) : (
          <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">Everyone&apos;s verified. 🐝</p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">Check their LinkedIn shows Sac State. In production, the Sac State Alumni Association verifies.</p>
      </section>
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Verified alumni ({verified.length})</h2>
        <ul className="space-y-3">{verified.map((a) => <Row key={a.id} a={a} />)}</ul>
      </section>
    </div>
  );
}

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-hive-green">Admin</h1>
      <Suspense fallback={<div className="h-[500px] animate-pulse rounded-2xl bg-secondary" />}>
        <Admin />
      </Suspense>
    </div>
  );
}

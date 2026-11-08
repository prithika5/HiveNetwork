import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getAlumniProfile } from "@/lib/alumni";
import { getCurrentUser } from "@/lib/auth";
import { getOwnProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { HexAvatar } from "@/components/hex-avatar";
import { BookingFlow } from "@/components/student-side/booking-flow";
import { buttonVariants } from "@/components/ui/button";

async function Booking({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ type?: string }> }) {
  const [{ id }, { type }] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/alumni/${id}/book`);
  const alum = await getAlumniProfile(id);
  if (!alum) notFound();
  const first = alum.full_name.split(" ")[0];

  if (user.role !== "student") {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-hive-green">1:1s are booked by students</h1>
        <Link href={`/alumni/${id}`} className={buttonVariants({ variant: "outline", className: "mt-6 h-10 px-4" })}>
          ← Back to {first}&apos;s profile
        </Link>
      </div>
    );
  }

  const supabase = await createClient();
  const [me, { data: open }] = await Promise.all([
    getOwnProfile(),
    supabase
      .from("requests")
      .select("id, type, status, message")
      .eq("student_id", user.id)
      .eq("alumni_id", id)
      .neq("type", "referral")
      .in("status", ["pending", "scheduled"])
      .maybeSingle(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href={`/alumni/${id}`} className="text-sm font-medium text-muted-foreground hover:text-hive-green">
        ← {first}&apos;s profile
      </Link>
      <div className="mb-8 mt-4 flex items-center gap-4">
        <HexAvatar src={alum.photo_url} name={alum.full_name} size={64} />
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-hive-green">Book a 1:1 with {first}</h1>
          <p className="text-muted-foreground">
            {alum.job_title}
            {alum.company && ` @ ${alum.company}`} · Sac State {alum.grad_year}
          </p>
        </div>
      </div>

      {open?.status === "scheduled" ? (
        <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
          <p className="text-3xl">✅</p>
          <h2 className="mt-2 text-xl font-bold text-hive-green">You already have a chat booked with {first}</h2>
          <p className="mt-1 text-muted-foreground">Prep, time changes, and follow-ups live in My chats.</p>
          <Link href="/chats" className={buttonVariants({ className: "mt-5 h-11 px-6 text-base" })}>
            Go to My chats →
          </Link>
        </div>
      ) : (
        <BookingFlow
          alum={{ id: alum.id, first, full_name: alum.full_name, calendly_url: alum.calendly_url, help_types: alum.help_types }}
          student={{ name: me?.full_name ?? user.fullName ?? "", email: user.email, hasResume: !!me?.hasResume }}
          initialType={type}
          existing={open ? { id: open.id, type: open.type, message: open.message ?? "" } : undefined}
        />
      )}
    </div>
  );
}

export default function BookPage({ params, searchParams }: PageProps<"/alumni/[id]/book">) {
  return (
    <Suspense fallback={<div className="mx-auto mt-10 h-[600px] max-w-3xl animate-pulse rounded-2xl bg-secondary" />}>
      <Booking params={params} searchParams={searchParams as Promise<{ type?: string }>} />
    </Suspense>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getAlumniProfile } from "@/lib/alumni";
import { getCurrentUser } from "@/lib/auth";
import { getOwnProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { CheckCircle2, ChevronLeft } from "lucide-react";
import { Avatar } from "@/components/hex-avatar";
import { CompanyLogo } from "@/components/company-logo";
import { HornetIcon } from "@/components/hive-logo";
import { BookingFlow } from "@/components/student-side/booking-flow";
import { ChatPrepCard } from "@/components/student-side/chat-prep";
import type { ChatPrep } from "@/lib/ai/student";
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
      <div className="mx-auto max-w-md px-5 py-28 text-center">
        <HornetIcon className="mx-auto h-10 w-10" />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">Students only</h1>
        <Link href={`/alumni/${id}`} className={buttonVariants({ variant: "outline", className: "mt-6 h-10 rounded-full bg-white px-5" })}>
          Back
        </Link>
      </div>
    );
  }

  const supabase = await createClient();
  const [me, { data: open }] = await Promise.all([
    getOwnProfile(),
    supabase
      .from("requests")
      .select("id, type, status, message, ai_prep")
      .eq("student_id", user.id)
      .eq("alumni_id", id)
      .neq("type", "referral")
      .in("status", ["pending", "scheduled"])
      .maybeSingle(),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <Link href={`/alumni/${id}`} className="inline-flex items-center gap-1 text-sm text-stone hover:text-ink">
        <ChevronLeft className="size-4" strokeWidth={1.8} />
        {first}
      </Link>
      <div className="mb-8 mt-6 flex items-center gap-4">
        <Avatar src={alum.photo_url} name={alum.full_name} size={56} />
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Book with {first}</h1>
          {alum.company && (
            <p className="mt-1 flex items-center gap-2 text-sm text-stone">
              <CompanyLogo domain={alum.company_domain} name={alum.company} size={16} />
              {alum.company}
            </p>
          )}
        </div>
      </div>

      {open?.status === "scheduled" ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-line bg-white p-8 text-center">
            <CheckCircle2 className="mx-auto size-8 text-honey" strokeWidth={1.6} />
            <h2 className="mt-3 text-xl font-semibold tracking-tight text-ink">You&apos;re booked</h2>
            <Link href="/chats" className={buttonVariants({ className: "mt-5 h-10 rounded-full px-5" })}>
              My chats
            </Link>
          </div>
          <ChatPrepCard requestId={open.id} initial={(open.ai_prep as ChatPrep | null) ?? null} />
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
    <Suspense fallback={<div className="mx-auto mt-10 h-[600px] max-w-2xl animate-pulse rounded-2xl border border-line bg-white" />}>
      <Booking params={params} searchParams={searchParams as Promise<{ type?: string }>} />
    </Suspense>
  );
}

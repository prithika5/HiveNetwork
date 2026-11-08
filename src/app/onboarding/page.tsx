import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getOwnProfile } from "@/lib/profile";
import { StudentForm } from "@/components/onboarding/student-form";
import { AlumniForm } from "@/components/onboarding/alumni-form";

async function Onboarding({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [profile, { next }] = await Promise.all([getOwnProfile(), searchParams]);
  if (!profile) redirect("/login?next=/onboarding");
  if (profile.role === "admin") redirect("/");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
  const first = profile.full_name?.split(" ")[0];

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight text-ink">Welcome{first ? `, ${first}` : ""}</h1>
      {profile.role === "student" ? <StudentForm profile={profile} mode="onboarding" next={safeNext} /> : <AlumniForm profile={profile} mode="onboarding" />}
    </div>
  );
}

export default function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  return (
    <Suspense fallback={<div className="mx-auto mt-12 h-[600px] max-w-2xl animate-pulse rounded-2xl border border-line bg-white" />}>
      <Onboarding searchParams={searchParams as Promise<{ next?: string }>} />
    </Suspense>
  );
}

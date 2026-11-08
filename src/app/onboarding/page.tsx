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
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm font-semibold uppercase tracking-wide text-hive-gold">Welcome to the hive{first ? `, ${first}` : ""} 🐝</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-hive-green sm:text-4xl">
        {profile.role === "student" ? "Let's find your people" : "Help a Hornet launch"}
      </h1>
      <p className="mb-8 mt-2 text-lg text-muted-foreground">
        {profile.role === "student"
          ? "Tell us where you're headed and a bit about you. We'll match you with alumni who share your goal — and your story."
          : "Set up your profile and Path Story in a few minutes. AI does the first draft."}
      </p>
      {profile.role === "student" ? <StudentForm profile={profile} mode="onboarding" next={safeNext} /> : <AlumniForm profile={profile} mode="onboarding" />}
    </div>
  );
}

export default function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  return (
    <Suspense fallback={<div className="mx-auto mt-10 h-[600px] max-w-3xl animate-pulse rounded-2xl bg-secondary" />}>
      <Onboarding searchParams={searchParams as Promise<{ next?: string }>} />
    </Suspense>
  );
}

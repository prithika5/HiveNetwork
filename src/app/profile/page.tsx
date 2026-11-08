import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getOwnProfile } from "@/lib/profile";
import { StudentForm } from "@/components/onboarding/student-form";
import { AlumniForm } from "@/components/onboarding/alumni-form";

async function ProfileEditor({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const [profile, { saved }] = await Promise.all([getOwnProfile(), searchParams]);
  if (!profile) redirect("/login?next=/profile");
  if (profile.role === "admin") redirect("/admin");
  if (!profile.onboarded) redirect("/onboarding");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-hive-green">Your profile</h1>
          {profile.role === "alumni" && (
            <p className="mt-1 text-sm text-muted-foreground">
              Status: {profile.verified ? <strong className="text-hive-green">Verified Hornet Alum ✓</strong> : <strong>Pending verification</strong>}
            </p>
          )}
        </div>
        {profile.role === "alumni" && (
          <Link href={`/alumni/${profile.id}`} className="text-sm font-semibold text-hive-green hover:underline">
            View my public profile →
          </Link>
        )}
      </div>
      {saved && <p className="mb-6 rounded-xl bg-hive-gold-light p-4 font-medium text-hive-green">✅ Saved!</p>}
      {profile.role === "student" ? <StudentForm profile={profile} mode="edit" /> : <AlumniForm profile={profile} mode="edit" />}
    </div>
  );
}

export default function ProfilePage({ searchParams }: PageProps<"/profile">) {
  return (
    <Suspense fallback={<div className="mx-auto mt-10 h-[600px] max-w-3xl animate-pulse rounded-2xl bg-secondary" />}>
      <ProfileEditor searchParams={searchParams as Promise<{ saved?: string }>} />
    </Suspense>
  );
}

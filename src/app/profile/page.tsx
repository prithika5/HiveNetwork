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
    <div className="mx-auto max-w-2xl px-5 py-12">
      <div className="mb-8 flex items-end justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Profile</h1>
        {profile.role === "alumni" && (
          <Link href={`/alumni/${profile.id}`} className="text-sm text-stone hover:text-ink">
            {profile.verified ? "View public" : "Pending · Preview"}
          </Link>
        )}
      </div>
      {saved && <p className="mb-5 rounded-2xl border border-honey/40 bg-honey-soft/50 px-5 py-3 text-sm text-ink">Saved</p>}
      {profile.role === "student" ? <StudentForm profile={profile} mode="edit" /> : <AlumniForm profile={profile} mode="edit" />}
    </div>
  );
}

export default function ProfilePage({ searchParams }: PageProps<"/profile">) {
  return (
    <Suspense fallback={<div className="mx-auto mt-12 h-[600px] max-w-2xl animate-pulse rounded-2xl border border-line bg-white" />}>
      <ProfileEditor searchParams={searchParams as Promise<{ saved?: string }>} />
    </Suspense>
  );
}

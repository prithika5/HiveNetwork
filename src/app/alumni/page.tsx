import { Suspense } from "react";
import type { Metadata } from "next";
import { getDirectory } from "@/lib/alumni";
import { getCurrentUser } from "@/lib/auth";
import { AlumniDirectory } from "@/components/student-side/alumni-directory";
import { TopMatches } from "@/components/student-side/top-matches";
import { getMatchesState } from "@/lib/matches";

export const metadata: Metadata = { title: "All alumni — Hive Network" };

async function DirectoryLoader() {
  const [{ alumni, unlocked }, user] = await Promise.all([getDirectory(), getCurrentUser()]);
  return <AlumniDirectory alumni={alumni} unlocked={unlocked} loggedIn={!!user} />;
}

async function MatchesLoader() {
  const state = await getMatchesState();
  if (state.status === "not-student") return null;
  return (
    <div className="mb-10">
      <TopMatches initial={state} />
    </div>
  );
}

function DirectorySkeleton() {
  return (
    <div>
      <div className="mb-6 h-12 animate-pulse rounded-xl bg-secondary" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-72 animate-pulse rounded-2xl bg-secondary" />
        ))}
      </div>
    </div>
  );
}

export default function AlumniPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Suspense>
        <MatchesLoader />
      </Suspense>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-hive-green sm:text-4xl">All alumni</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Hornets who&apos;ve been where you&apos;re going — and want to help you get there.
        </p>
      </div>
      <Suspense fallback={<DirectorySkeleton />}>
        <DirectoryLoader />
      </Suspense>
    </div>
  );
}

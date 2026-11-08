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
    <div className="mb-14">
      <TopMatches initial={state} />
    </div>
  );
}

function DirectorySkeleton() {
  return (
    <div>
      <div className="mb-8 h-12 animate-pulse rounded-full bg-stone-100" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-80 animate-pulse rounded-2xl border border-line bg-white" />
        ))}
      </div>
    </div>
  );
}

export default function AlumniPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <Suspense>
        <MatchesLoader />
      </Suspense>
      <h1 className="mb-6 text-3xl font-semibold tracking-tight text-ink">Alumni</h1>
      <Suspense fallback={<DirectorySkeleton />}>
        <DirectoryLoader />
      </Suspense>
    </div>
  );
}

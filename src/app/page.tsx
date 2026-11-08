import Link from "next/link";
import { Suspense } from "react";
import { CalendarCheck, Route, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { HornetIcon } from "@/components/hive-logo";
import { getDirectory } from "@/lib/alumni";
import { AlumniDirectory } from "@/components/student-side/alumni-directory";
import { TopMatches } from "@/components/student-side/top-matches";
import { LaunchPlan } from "@/components/student-side/launch-plan";
import { getMatchesState } from "@/lib/matches";
import { getCurrentUser } from "@/lib/auth";
import { getPlan } from "@/lib/plan";

const TILES = [
  { icon: Sparkles, label: "Smart matches" },
  { icon: Route, label: "Real career paths" },
  { icon: CalendarCheck, label: "One-click booking" },
];

function PreviewSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-[300px] animate-pulse rounded-2xl border border-line bg-white" />
      ))}
    </div>
  );
}

async function Preview() {
  const { alumni, unlocked } = await getDirectory();
  if (alumni.length === 0) return null;
  return <AlumniDirectory alumni={alumni} unlocked={unlocked} loggedIn={unlocked} limit={4} />;
}

/** Logged-in students land on their matches + plan instead of the marketing page. */
async function StudentHome() {
  const [user, state] = await Promise.all([getCurrentUser(), getMatchesState()]);
  if (!user || state.status === "not-student") return null;
  const plan = state.status === "ready" ? await getPlan() : null;
  return (
    <section className="mx-auto max-w-6xl space-y-8 px-5 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">Hi, {user.fullName?.split(" ")[0] ?? "there"}</h1>
      <TopMatches initial={state} />
      {plan && <LaunchPlan plan={plan} compact />}
    </section>
  );
}

async function Landing() {
  const user = await getCurrentUser();
  if (user?.role === "student") return <StudentHome />;
  return (
    <>
      <section className="mx-auto max-w-3xl px-5 pb-16 pt-20 text-center sm:pt-28">
        <HornetIcon className="mx-auto h-12 w-12" />
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-ink sm:text-6xl">Coffee chats with Sac State alumni</h1>
        <p className="mx-auto mt-5 max-w-md text-lg text-stone">Get matched, book a chat, and walk in prepared.</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/alumni" className={buttonVariants({ className: "h-11 rounded-full px-6 text-[15px]" })}>
            Browse alumni
          </Link>
          {!user && (
            <Link href="/login" className={buttonVariants({ variant: "outline", className: "h-11 rounded-full bg-white px-6 text-[15px]" })}>
              Log in
            </Link>
          )}
        </div>
      </section>

      <section className="mx-auto grid max-w-3xl grid-cols-3 gap-3 px-5 sm:gap-5">
        {TILES.map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-2.5 rounded-2xl border border-line bg-white px-2 py-5 text-center sm:gap-3 sm:px-3 sm:py-6">
            <Icon className="size-6 text-ink" strokeWidth={1.6} />
            <span className="text-xs font-medium text-ink sm:text-sm">{label}</span>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-xl font-semibold tracking-tight text-ink">Meet the hive</h2>
          <Link href="/alumni" className="text-sm text-stone hover:text-ink">
            See all →
          </Link>
        </div>
        <Suspense fallback={<PreviewSkeleton />}>
          <Preview />
        </Suspense>
      </section>
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="mx-auto mt-28 h-64 max-w-3xl animate-pulse rounded-2xl bg-stone-100" />}>
      <Landing />
    </Suspense>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { getDirectory } from "@/lib/alumni";
import { AlumniDirectory } from "@/components/student-side/alumni-directory";
import { TopMatches } from "@/components/student-side/top-matches";
import { getMatchesState } from "@/lib/matches";
import { getCurrentUser } from "@/lib/auth";
import { getPlan } from "@/lib/plan";
import { LaunchPlan } from "@/components/student-side/launch-plan";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
  { icon: "✨", title: "AI Matches", body: "Your top 1–3 alumni, ranked by your goal, skills, hometown and clubs — with the reasons why." },
  { icon: "⬡", title: "Path Stories", body: "See exactly how each alum got from Sac State to where they are now, step by step." },
  { icon: "🚀", title: "Launch Plan", body: "Your matches in the right order: learn the path → get interview-ready → get referral-ready." },
  { icon: "📅", title: "Book a 1:1", body: "Coffee chat, mock interview or resume review — pick a time the alum has open, right on the page." },
  { icon: "📝", title: "Show up prepared", body: "AI drafts your first message and prep questions tailored to the alum's journey." },
  { icon: "🤝", title: "Get to a referral", body: "After a great chat, alumni can mark you open to refer. Conversations become opportunities." },
];

async function DirectoryTeaser() {
  const { alumni, unlocked } = await getDirectory();
  if (alumni.length === 0) return null;
  return (
    <section className="bg-secondary/50 py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-hive-green sm:text-3xl">Meet a few Hornets</h2>
            <p className="mt-2 text-muted-foreground">Real paths from Sac State to where they are now.</p>
          </div>
          <Link href="/alumni" className={buttonVariants({ variant: "outline", className: "h-10 px-4" })}>
            See all {alumni.length} alumni →
          </Link>
        </div>
        <AlumniDirectory alumni={alumni} unlocked={unlocked} loggedIn={unlocked} limit={3} />
      </div>
    </section>
  );
}

async function StudentHome() {
  const [user, state] = await Promise.all([getCurrentUser(), getMatchesState()]);
  if (!user || state.status === "not-student") return null;
  const plan = state.status === "ready" ? await getPlan() : null;
  return (
    <section className="mx-auto max-w-6xl px-4 pt-10">
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-hive-green">
        Welcome back{user.fullName ? `, ${user.fullName.split(" ")[0]}` : ""} 🐝
      </h1>
      <TopMatches initial={state} />
      {plan && (
        <div className="mt-8">
          <LaunchPlan plan={plan} compact />
        </div>
      )}
    </section>
  );
}

export default function Home() {
  return (
    <div>
      <Suspense>
        <StudentHome />
      </Suspense>
      <section className="relative overflow-hidden bg-hive-green text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='98' viewBox='0 0 56 98'%3E%3Cpath d='M28 0 56 16v32L28 64 0 48V16zM28 64v34' fill='none' stroke='%23C4B581' stroke-width='2'/%3E%3C/svg%3E\")",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <p className="mb-4 inline-block rounded-full border border-hive-gold/50 px-3 py-1 text-sm text-hive-gold">
            🐝 For Sac State students & alumni only
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Don&apos;t know who to ask? <span className="text-hive-gold">We do.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/80 sm:text-xl">
            Hive Network matches you with Sac State alumni who share your goals and your story — down to your
            hometown and clubs — preps you for every conversation, and turns great conversations into referrals.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/alumni" className={buttonVariants({ size: "lg", className: "h-12 px-6 text-base bg-hive-gold text-hive-green hover:bg-hive-gold/90" })}>Browse alumni</Link>
            <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg", className: "h-12 px-6 text-base border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white" })}>Log in with csus.edu</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-bold text-hive-green sm:text-3xl">From your goal to a referral</h2>
        <p className="mt-2 text-muted-foreground">Not another directory. A plan of the right conversations.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="rounded-2xl">
              <CardContent className="p-6">
                <div className="hex mb-4 flex h-12 w-12 items-center justify-center bg-hive-gold-light text-xl text-hive-green">
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-1 text-muted-foreground">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Suspense>
        <DirectoryTeaser />
      </Suspense>
    </div>
  );
}

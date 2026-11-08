import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPlan } from "@/lib/plan";
import { LaunchPlan } from "@/components/student-side/launch-plan";
import { buttonVariants } from "@/components/ui/button";

async function Plan() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/plan");
  if (user.role !== "student") redirect("/");
  if (!user.onboarded) {
    return (
      <div className="rounded-3xl border bg-white p-10 text-center">
        <p className="text-5xl">🚀</p>
        <p className="mt-3 font-medium">Tell us your goal first — your Launch Plan is built from it.</p>
        <Link href="/onboarding" className={buttonVariants({ className: "mt-5 h-11 px-6 text-base" })}>
          Finish my profile →
        </Link>
      </div>
    );
  }
  const plan = await getPlan();
  return <LaunchPlan plan={plan} />;
}

export default function PlanPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-hive-green">Launch Plan</h1>
      <p className="mb-8 mt-1 text-muted-foreground">The right conversations, in the right order — from learning the path to getting referred.</p>
      <Suspense fallback={<div className="h-[500px] animate-pulse rounded-3xl bg-secondary" />}>
        <Plan />
      </Suspense>
    </div>
  );
}

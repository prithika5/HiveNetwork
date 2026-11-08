import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPlan } from "@/lib/plan";
import { HornetIcon } from "@/components/hive-logo";
import { LaunchPlan } from "@/components/student-side/launch-plan";
import { buttonVariants } from "@/components/ui/button";

async function Plan() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/plan");
  if (user.role !== "student") redirect("/");
  if (!user.onboarded) {
    return (
      <div className="rounded-2xl border border-line bg-white p-12 text-center">
        <HornetIcon className="mx-auto h-10 w-10" />
        <p className="mt-3 text-stone">Add your goal first</p>
        <Link href="/onboarding" className={buttonVariants({ className: "mt-5 h-10 rounded-full px-5" })}>
          Finish profile
        </Link>
      </div>
    );
  }
  const plan = await getPlan();
  return <LaunchPlan plan={plan} />;
}

export default function PlanPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight text-ink">Plan</h1>
      <Suspense fallback={<div className="h-[500px] animate-pulse rounded-2xl border border-line bg-white" />}>
        <Plan />
      </Suspense>
    </div>
  );
}

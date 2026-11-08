"use server";

import { revalidatePath } from "next/cache";
import { buildPlan } from "@/lib/plan";
import { hideAndRematch } from "@/lib/matches";

type R = { ok: true } | { ok: false; error: string };

export async function buildPlanAction(): Promise<R> {
  try {
    await buildPlan();
    revalidatePath("/plan");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** "Swap an alum": mark them not a fit, rematch, and rebuild the plan. */
export async function swapAlumAction(alumniId: string): Promise<R> {
  try {
    await hideAndRematch(alumniId);
    await buildPlan();
    revalidatePath("/plan");
    revalidatePath("/alumni");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

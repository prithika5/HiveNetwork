"use server";

import { revalidatePath } from "next/cache";
import { generateMatches, hideAndRematch, type MatchCard } from "@/lib/matches";

type Result = { ok: true; matches: MatchCard[] } | { ok: false; error: string };

export async function refreshMatchesAction(): Promise<Result> {
  try {
    const matches = await generateMatches();
    revalidatePath("/alumni/[id]", "page");
    return { ok: true, matches };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function notAFitAction(alumniId: string): Promise<Result> {
  try {
    const matches = await hideAndRematch(alumniId);
    revalidatePath("/alumni/[id]", "page");
    return { ok: true, matches };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

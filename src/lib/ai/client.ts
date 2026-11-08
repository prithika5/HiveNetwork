import "server-only";
import { GoogleGenAI } from "@google/genai";
import type { z } from "zod";

/**
 * Provider-agnostic AI wrapper. Every AI feature calls `generateJSON` with a prompt + zod schema.
 * Currently backed by the Gemini free tier. Swap the body of `callModel` to change providers.
 */
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

const SYSTEM = [
  "You are the AI inside Hive Network, a Sac State–only alumni network.",
  "Return ONLY valid JSON matching the requested schema — no markdown, no commentary.",
  "Use only facts present in the inputs. Never invent employers, schools, or experiences.",
  "Tone: warm, professional, concise.",
].join(" ");

let ai: GoogleGenAI | null = null;
function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  ai ??= new GoogleGenAI({ apiKey });
  return ai;
}

async function callModel(prompt: string): Promise<string> {
  const res = await getClient().models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { systemInstruction: SYSTEM, responseMimeType: "application/json", temperature: 0.4 },
  });
  return res.text ?? "";
}

function isRateLimit(err: unknown) {
  const e = err as { status?: number; code?: number; message?: string };
  return e?.status === 429 || e?.code === 429 || /429|RESOURCE_EXHAUSTED/i.test(e?.message ?? "");
}

/** Bad key, bad request, unknown model… — retrying can't help. */
function isPermanent(err: unknown) {
  const e = err as { status?: number; code?: number; message?: string };
  const status = e?.status ?? e?.code;
  if (typeof status === "number") return status >= 400 && status < 500 && status !== 429;
  return /API_KEY_INVALID|PERMISSION_DENIED|"code":\s*40[0134]/.test(e?.message ?? "");
}

/** Short human-readable message from SDK errors (which often embed the whole JSON response). */
export function aiErrorMessage(err: unknown): string {
  const msg = (err as Error)?.message ?? String(err);
  return msg.match(/"message"\s*:\s*"([^"]+)"/)?.[1] ?? msg.slice(0, 160);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Calls the model, parses JSON, validates with zod. Retries with backoff on 429 / bad JSON. */
export async function generateJSON<T extends z.ZodType>(
  prompt: string,
  schema: T,
  { retries = 3 }: { retries?: number } = {},
): Promise<z.infer<T>> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const text = await callModel(prompt);
      const json = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
      return schema.parse(json);
    } catch (err) {
      lastErr = err;
      if (attempt === retries || isPermanent(err)) break;
      await sleep((isRateLimit(err) ? 4000 : 800) * 2 ** attempt);
    }
  }
  throw lastErr;
}

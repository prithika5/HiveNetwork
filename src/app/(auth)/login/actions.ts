"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";

export type AuthState = { error?: string; info?: string };

const isCsus = (email: string) => /@csus\.edu$/i.test(email.trim());

/** Only allow relative in-app redirects (prevents open-redirects via ?next=). */
function safeNext(next: FormDataEntryValue | null) {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/";
}

function friendly(message: string) {
  if (/invalid login credentials/i.test(message)) return "Wrong email or password.";
  if (/already registered|already been registered/i.test(message)) return "That email already has an account — log in instead.";
  if (/csus|database error saving new user/i.test(message)) return "Students must use a @csus.edu email.";
  if (/password/i.test(message) && /6|short|weak/i.test(message)) return "Password must be at least 6 characters.";
  return message;
}

export async function authenticate(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!supabaseConfigured) return { error: "Supabase isn't configured yet — add your keys to .env.local." };

  const role = formData.get("role") === "alumni" ? "alumni" : "student";
  const mode = formData.get("mode") === "signup" ? "signup" : "login";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const next = safeNext(formData.get("next"));

  if (!email || !password) return { error: "Enter your email and password." };
  if (role === "student" && !isCsus(email)) {
    return { error: "Students must use a @csus.edu email." };
  }

  const supabase = await createClient();

  if (mode === "signup") {
    if (!fullName) return { error: "Enter your full name." };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role, full_name: fullName } },
    });
    if (error) return { error: friendly(error.message) };
    if (!data.session) {
      return { info: "Account created — check your email to confirm, then log in. (Tip: turn off “Confirm email” in Supabase for the demo.)" };
    }
    redirect(next === "/" ? "/onboarding" : `/onboarding?next=${encodeURIComponent(next)}`);
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: friendly(error.message) };

  // Make sure people log in on the right tab (e.g. an alum using the student form).
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, onboarded")
    .eq("id", data.user.id)
    .maybeSingle();
  if (role === "student" && profile?.role === "alumni") {
    await supabase.auth.signOut();
    return { error: "This is an alumni account — use the Alumni tab." };
  }
  if (role === "alumni" && profile?.role === "student") {
    await supabase.auth.signOut();
    return { error: "This is a student account — use the Student tab." };
  }

  if (profile && !profile.onboarded && profile.role !== "admin") {
    redirect(next === "/" ? "/onboarding" : `/onboarding?next=${encodeURIComponent(next)}`);
  }
  redirect(next);
}

export async function signInWithLinkedIn(formData: FormData) {
  const supabase = await createClient();
  const next = safeNext(formData.get("next"));
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "linkedin_oidc",
    options: { redirectTo: `${site}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect(`/login?tab=alumni&error=linkedin`);
  redirect(data.url);
}

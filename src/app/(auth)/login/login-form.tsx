"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authenticate, signInWithLinkedIn, type AuthState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Role = "student" | "alumni";
const LINKEDIN_ENABLED = process.env.NEXT_PUBLIC_LINKEDIN_ENABLED === "true";

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const [role, setRole] = useState<Role>(params.get("tab") === "alumni" ? "alumni" : "student");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [state, action, pending] = useActionState<AuthState, FormData>(authenticate, {});
  const linkedinError = params.get("error") === "linkedin";
  const gated = next.startsWith("/alumni/");

  return (
    <div className="w-full max-w-md">
      {gated && (
        <div className="mb-4 rounded-2xl border border-hive-gold bg-hive-gold-light p-4 text-sm text-hive-green">
          🔒 Log in with your Sac State account to see the full alumni profile.
        </div>
      )}

      <div className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
        {/* Student / Alumni tabs */}
        <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1" role="tablist">
          {(["student", "alumni"] as const).map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={role === r}
              onClick={() => setRole(r)}
              className={cn(
                "rounded-lg py-2 text-sm font-semibold transition-colors",
                role === r ? "bg-hive-green text-white shadow" : "text-hive-green/70 hover:text-hive-green",
              )}
            >
              {r === "student" ? "🎓 Student" : "🐝 Alumni"}
            </button>
          ))}
        </div>

        <h1 className="text-2xl font-bold text-hive-green">
          {mode === "login" ? "Welcome back" : role === "student" ? "Join as a student" : "Join as an alum"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {role === "student"
            ? "Use your Sac State @csus.edu email."
            : "Alumni sign in with LinkedIn, or with email for the demo."}
        </p>

        {role === "alumni" && LINKEDIN_ENABLED && (
          <form action={signInWithLinkedIn} className="mt-6">
            <input type="hidden" name="next" value={next} />
            <Button type="submit" className="h-11 w-full bg-[#0A66C2] text-base text-white hover:bg-[#0A66C2]/90">
              Continue with LinkedIn
            </Button>
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or use email <span className="h-px flex-1 bg-border" />
            </div>
          </form>
        )}
        {linkedinError && <p className="mt-4 text-sm text-destructive">LinkedIn sign-in didn&apos;t work — use email instead.</p>}

        <form action={action} className={cn("space-y-4", !(role === "alumni" && LINKEDIN_ENABLED) && "mt-6")}>
          <input type="hidden" name="role" value={role} />
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="next" value={next} />

          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" name="full_name" autoComplete="name" required className="h-11 text-base" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">{role === "student" ? "Sac State email" : "Email"}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder={role === "student" ? "you@csus.edu" : "you@example.com"}
              className="h-11 text-base"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={6}
              required
              className="h-11 text-base"
            />
          </div>

          {state.error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{state.error}</p>}
          {state.info && <p className="rounded-lg bg-hive-gold-light p-3 text-sm text-hive-green">{state.info}</p>}

          <Button type="submit" disabled={pending} className="h-11 w-full text-base">
            {pending ? "One sec…" : mode === "login" ? "Log in" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "login" ? "New to Hive Network? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="font-semibold text-hive-green underline-offset-4 hover:underline"
          >
            {mode === "login" ? "Create an account" : "Log in"}
          </button>
        </p>
        {role === "alumni" && mode === "signup" && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            New alumni show as <strong>Pending</strong> until our team verifies you.
          </p>
        )}
      </div>
    </div>
  );
}

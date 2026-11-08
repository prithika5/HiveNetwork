"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { HornetIcon } from "@/components/hive-logo";
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

  const field = "h-11 rounded-xl bg-white text-[15px]";
  return (
    <div className="w-full max-w-sm">
      <HornetIcon className="mx-auto mb-6 h-10 w-10" />
      <h1 className="mb-6 text-center text-2xl font-semibold tracking-tight text-ink">{mode === "login" ? "Log in" : "Sign up"}</h1>

      {gated && (
        <p className="mb-4 flex items-center justify-center gap-2 text-sm text-stone">
          <Lock className="size-3.5" strokeWidth={2} />
          Log in to see this profile
        </p>
      )}

      <div className="rounded-2xl border border-line bg-white p-6">
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-full bg-stone-100 p-1" role="tablist">
          {(["student", "alumni"] as const).map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={role === r}
              onClick={() => setRole(r)}
              className={cn("rounded-full py-1.5 text-sm font-medium transition-colors", role === r ? "bg-white text-ink shadow-sm" : "text-stone hover:text-ink")}
            >
              {r === "student" ? "Student" : "Alumni"}
            </button>
          ))}
        </div>

        {role === "alumni" && LINKEDIN_ENABLED && (
          <form action={signInWithLinkedIn}>
            <input type="hidden" name="next" value={next} />
            <Button type="submit" variant="outline" className="h-11 w-full rounded-full bg-white text-[15px]">
              Continue with LinkedIn
            </Button>
            <div className="my-4 flex items-center gap-3 text-xs text-stone">
              <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
            </div>
          </form>
        )}
        {linkedinError && <p className="mb-3 text-sm text-destructive">LinkedIn sign-in failed. Use email.</p>}

        <form action={action} className="space-y-3.5">
          <input type="hidden" name="role" value={role} />
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="next" value={next} />

          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" name="full_name" autoComplete="name" required className={field} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required placeholder={role === "student" ? "you@csus.edu" : "you@example.com"} className={field} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={6} required className={field} />
          </div>

          {state.error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{state.error}</p>}
          {state.info && <p className="rounded-xl bg-honey-soft/60 p-3 text-sm text-ink">{state.info}</p>}

          <Button type="submit" disabled={pending} className="h-11 w-full rounded-full text-[15px]">
            {pending ? "One sec…" : mode === "login" ? "Log in" : "Sign up"}
          </Button>
        </form>
      </div>

      <button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")} className="mt-5 block w-full text-center text-sm text-stone hover:text-ink">
        {mode === "login" ? "New here? Sign up" : "Have an account? Log in"}
      </button>
    </div>
  );
}

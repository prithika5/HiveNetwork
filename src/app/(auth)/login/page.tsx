import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

async function RedirectIfLoggedIn() {
  const user = await getCurrentUser();
  if (user) redirect("/");
  return null;
}

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-5 py-12">
      <Suspense>
        <RedirectIfLoggedIn />
      </Suspense>
      <Suspense fallback={<div className="h-[440px] w-full max-w-sm animate-pulse rounded-2xl border border-line bg-white" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

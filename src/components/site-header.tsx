import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Avatar } from "@/components/hex-avatar";
import { HornetIcon } from "@/components/hive-logo";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function SiteHeader() {
  const user = await getCurrentUser();
  const links: { href: string; label: string }[] = [{ href: "/alumni", label: "Alumni" }];
  if (user?.role === "student") links.push({ href: "/plan", label: "Plan" }, { href: "/chats", label: "Chats" });
  if (user?.role === "alumni") links.push({ href: "/inbox", label: "Inbox" });
  if (user?.role === "admin") links.push({ href: "/admin", label: "Admin" });

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[#FAFAF9]/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-5">
        <Link href="/" className="flex items-center gap-2 text-ink">
          <HornetIcon />
          <span className="text-[15px] font-semibold tracking-tight">Hive Network</span>
        </Link>
        <nav className="hidden items-center gap-6 sm:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-stone transition-colors hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <Link href="/profile" title="Your profile" className="rounded-full ring-offset-2 transition hover:ring-2 hover:ring-line">
                <Avatar src={user.photoUrl} name={user.fullName ?? user.email} size={32} />
              </Link>
              <form action={signOut}>
                <button type="submit" className="text-sm text-stone hover:text-ink">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className={buttonVariants({ variant: "outline", className: "h-9 rounded-full bg-white px-4" })}>
              Log in
            </Link>
          )}
        </div>
      </div>
      <nav className="flex gap-5 overflow-x-auto px-5 pb-3 sm:hidden">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="text-sm text-stone hover:text-ink">
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

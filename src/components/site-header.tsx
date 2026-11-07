import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button, buttonVariants } from "@/components/ui/button";
import { HexAvatar } from "@/components/hex-avatar";
import { HiveLogo } from "@/components/hive-logo";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function SiteHeader() {
  const user = await getCurrentUser();
  const links: { href: string; label: string }[] = [{ href: "/alumni", label: "Alumni" }];
  if (user?.role === "student") links.push({ href: "/plan", label: "Launch Plan" }, { href: "/chats", label: "My chats" });
  if (user?.role === "alumni") links.push({ href: "/inbox", label: "Inbox" });
  if (user?.role === "admin") links.push({ href: "/admin", label: "Admin" });

  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-hive-green">
          <HiveLogo />
          <span className="text-lg tracking-tight">Hive Network</span>
        </Link>
        <nav className="hidden items-center gap-1 sm:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-hive-green"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Link href="/profile" className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-accent">
                <HexAvatar src={user.photoUrl} name={user.fullName ?? user.email} size={32} />
                <span className="hidden text-sm font-medium md:inline">{user.fullName ?? user.email}</span>
              </Link>
              <form action={signOut}>
                <Button variant="ghost" size="sm" type="submit">
                  Log out
                </Button>
              </form>
            </>
          ) : (
            <Link href="/login" className={buttonVariants({ size: "sm" })}>Log in</Link>
          )}
        </div>
      </div>
      {/* mobile nav */}
      <nav className="flex gap-1 overflow-x-auto px-4 pb-2 sm:hidden">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent">
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

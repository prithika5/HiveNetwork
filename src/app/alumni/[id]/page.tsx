import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { alumniExists, getAlumniProfile, getKudos, getMatchFor } from "@/lib/alumni";
import { getCurrentUser } from "@/lib/auth";
import { HELP_TYPES, JOURNEY } from "@/lib/labels";
import { HexAvatar } from "@/components/hex-avatar";
import { SampleBadge } from "@/components/sample-badge";
import { PathStory } from "@/components/student-side/path-story";
import { buttonVariants } from "@/components/ui/button";

function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border bg-white p-6 shadow-sm sm:p-7 ${className}`}>
      <h2 className="mb-4 text-xl font-bold text-hive-green">{title}</h2>
      {children}
    </section>
  );
}

function Fact({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="text-xl" aria-hidden>
        {icon}
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-base">{children}</p>
      </div>
    </div>
  );
}

async function Profile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [alum, user] = await Promise.all([getAlumniProfile(id), getCurrentUser()]);

  if (!alum) {
    // Logged in but RLS hid it: either an unverified alum viewing, or the alum doesn't exist.
    if (user && (await alumniExists(id))) {
      return (
        <div className="mx-auto max-w-lg px-4 py-24 text-center">
          <div className="hex mx-auto mb-4 flex h-16 w-16 items-center justify-center bg-hive-gold-light text-3xl">🔒</div>
          <h1 className="text-2xl font-bold text-hive-green">Full profiles unlock after verification</h1>
          <p className="mt-2 text-muted-foreground">
            Full alumni profiles are open to Sac State students and verified alumni. Your account is pending — our team will verify you soon.
          </p>
          <Link href="/alumni" className={buttonVariants({ variant: "outline", className: "mt-6 h-10 px-4" })}>
            ← Back to all alumni
          </Link>
        </div>
      );
    }
    notFound();
  }

  const [kudos, match] = await Promise.all([getKudos(alum.id), user?.role === "student" ? getMatchFor(alum.id) : null]);
  const first = alum.full_name.split(" ")[0];
  const isStudent = user?.role === "student";
  const bookable = alum.help_types.filter((h) => h !== "referral");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/alumni" className="text-sm font-medium text-muted-foreground hover:text-hive-green">
        ← All alumni
      </Link>

      {/* Header */}
      <header className="mt-4 overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="h-20 bg-hive-green sm:h-24" />
        <div className="flex flex-col gap-5 px-6 pb-6 sm:flex-row sm:items-end sm:px-8">
          <HexAvatar src={alum.photo_url} name={alum.full_name} size={112} className="-mt-14 sm:-mt-16" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-hive-green">{alum.full_name}</h1>
              {alum.verified && (
                <span className="rounded-full bg-hive-green px-2.5 py-1 text-xs font-semibold text-white">Verified Hornet Alum ✓</span>
              )}
              {alum.is_sample && <SampleBadge />}
            </div>
            <p className="mt-1 text-lg font-medium">
              {alum.job_title}
              {alum.company && <span className="text-muted-foreground"> @ {alum.company}</span>}
            </p>
            <p className="text-muted-foreground">
              Sac State {alum.grad_year} · {alum.major}
              {alum.linkedin_url && (
                <>
                  {" · "}
                  <a href={alum.linkedin_url} target="_blank" rel="noopener noreferrer" className="font-medium text-[#0A66C2] hover:underline">
                    LinkedIn ↗
                  </a>
                </>
              )}
            </p>
            {alum.path_tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {alum.path_tags.map((t) => (
                  <span key={t} className="rounded-full bg-hive-gold-light px-2.5 py-1 text-xs font-medium text-hive-green">
                    {JOURNEY[t]?.icon} {JOURNEY[t]?.label ?? t}
                  </span>
                ))}
              </div>
            )}
          </div>
          {isStudent && (
            <Link href={`/alumni/${alum.id}/book`} className={buttonVariants({ className: "h-12 px-6 text-base" })}>
              📅 Book a 1:1
            </Link>
          )}
        </div>
      </header>

      {match && (
        <div className="mt-6 rounded-2xl border border-hive-gold bg-hive-gold-light p-5">
          <p className="font-semibold text-hive-green">
            ✨ Why you match <span className="ml-1 rounded-full bg-hive-green px-2 py-0.5 text-xs text-white">{match.score}% match</span>
          </p>
          <p className="mt-1 text-hive-green">{match.reasons.join(" · ")}</p>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Section title={`About ${first}`}>
            {alum.bio && <p className="text-lg leading-relaxed text-foreground/90">“{alum.bio}”</p>}
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {alum.hometown && <Fact icon="📍" label="Hometown">{alum.hometown}</Fact>}
              {alum.languages.length > 0 && <Fact icon="🗣" label="Languages">{alum.languages.join(", ")}</Fact>}
              {alum.clubs.length > 0 && <Fact icon="🐝" label="Clubs at Sac State">{alum.clubs.join(", ")}</Fact>}
              {alum.favorite_spot && <Fact icon="📚" label="Favorite Sac State spot">{alum.favorite_spot}</Fact>}
              {alum.hobbies.length > 0 && <Fact icon="🎯" label="Hobbies">{alum.hobbies.join(", ")}</Fact>}
            </div>
            {alum.fun_facts.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">⭐ Fun facts</p>
                <ul className="flex flex-wrap gap-2">
                  {alum.fun_facts.map((f) => (
                    <li key={f} className="rounded-xl bg-secondary px-3 py-2 text-sm">
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>

          <Section title="⬡ Path Story">
            <p className="-mt-2 mb-6 text-sm text-muted-foreground">How {first} got from Sac State to where they are now.</p>
            <PathStory steps={alum.path_story} />
          </Section>

          {kudos.length > 0 && (
            <Section title={`💛 Kudos from students (${kudos.length})`}>
              <ul className="grid gap-3 sm:grid-cols-2">
                {kudos.map((k) => (
                  <li key={k.id} className="rounded-xl bg-secondary p-4">
                    <p className="text-sm leading-relaxed">“{k.note}”</p>
                    <p className="mt-2 text-xs text-muted-foreground">— a Sac State student</p>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        <aside className="space-y-6">
          {alum.ask_me_about.length > 0 && (
            <Section title="Ask me about">
              <ul className="space-y-2">
                {alum.ask_me_about.map((a) => (
                  <li key={a} className="flex gap-2">
                    <span className="text-hive-gold">⬢</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="How I can help">
            <ul className="space-y-2">
              {alum.help_types.map((h) => (
                <li key={h}>
                  {isStudent && h !== "referral" ? (
                    <Link
                      href={`/alumni/${alum.id}/book?type=${h}`}
                      className="flex items-center justify-between rounded-xl border px-4 py-3 font-medium transition-colors hover:border-hive-green hover:bg-secondary"
                    >
                      {HELP_TYPES[h]} <span className="text-hive-green">Book →</span>
                    </Link>
                  ) : (
                    <div className="rounded-xl border border-dashed px-4 py-3 text-muted-foreground">
                      {HELP_TYPES[h]}
                      {h === "referral" && <span className="block text-xs">After a great 1:1 chat</span>}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {isStudent && bookable.length > 0 && (
              <p className="mt-4 text-xs text-muted-foreground">
                1:1s are 15–20 minutes. {first} takes a limited number of chats each month.
              </p>
            )}
          </Section>

          {alum.fields.length > 0 && (
            <Section title="Fields">
              <div className="flex flex-wrap gap-2">
                {alum.fields.map((f) => (
                  <span key={f} className="rounded-lg border px-3 py-1 text-sm">
                    {f}
                  </span>
                ))}
              </div>
            </Section>
          )}
        </aside>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="h-48 animate-pulse rounded-2xl bg-secondary" />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="h-96 animate-pulse rounded-2xl bg-secondary" />
        <div className="h-64 animate-pulse rounded-2xl bg-secondary" />
      </div>
    </div>
  );
}

export default function AlumniProfilePage({ params }: PageProps<"/alumni/[id]">) {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <Profile params={params} />
    </Suspense>
  );
}

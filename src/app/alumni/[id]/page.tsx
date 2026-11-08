import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BadgeCheck, BookOpen, ChevronLeft, ChevronRight, ExternalLink, GraduationCap, Languages, Lock, MapPin, Smile, Star, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { alumniExists, getAlumniProfile, getKudos, getMatchFor } from "@/lib/alumni";
import { getCurrentUser } from "@/lib/auth";
import { HELP_TYPES, JOURNEY } from "@/lib/labels";
import { Avatar } from "@/components/hex-avatar";
import { SampleBadge } from "@/components/sample-badge";
import { CompanyLogo } from "@/components/company-logo";
import { PathStory } from "@/components/student-side/path-story";
import { buttonVariants } from "@/components/ui/button";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-6 sm:p-8">
      <h2 className="mb-5 text-lg font-semibold tracking-tight text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Row({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 text-[15px]">
      <Icon className="mt-0.5 size-[18px] shrink-0 text-stone" strokeWidth={1.6} aria-label={label} />
      <p className="text-ink" title={label}>
        {children}
      </p>
    </div>
  );
}

const chip = "rounded-full bg-stone-100 px-2.5 py-1 text-xs text-ink";

async function Profile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [alum, user] = await Promise.all([getAlumniProfile(id), getCurrentUser()]);

  if (!alum) {
    // Logged in but RLS hid it: either an unverified alum viewing, or the alum doesn't exist.
    if (user && (await alumniExists(id))) {
      return (
        <div className="mx-auto max-w-md px-5 py-28 text-center">
          <Lock className="mx-auto size-7 text-ink" strokeWidth={1.6} />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">Unlocks once you&apos;re verified</h1>
          <Link href="/alumni" className={buttonVariants({ variant: "outline", className: "mt-6 h-10 rounded-full bg-white px-5" })}>
            Back to alumni
          </Link>
        </div>
      );
    }
    notFound();
  }

  const [kudos, match] = await Promise.all([getKudos(alum.id), user?.role === "student" ? getMatchFor(alum.id) : null]);
  const isStudent = user?.role === "student";
  const tags = [...alum.fields, ...alum.path_tags.map((t) => JOURNEY[t]?.label ?? t)];

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/alumni" className="inline-flex items-center gap-1 text-sm text-stone hover:text-ink">
        <ChevronLeft className="size-4" strokeWidth={1.8} />
        Alumni
      </Link>

      <header className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start">
        <Avatar src={alum.photo_url} name={alum.full_name} size={112} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{alum.full_name}</h1>
            {alum.verified && <BadgeCheck className="size-5 text-honey" strokeWidth={1.8} aria-label="Verified Hornet Alum" />}
            {alum.is_sample && <SampleBadge />}
          </div>
          <p className="mt-1.5 text-[15px] text-stone">{alum.job_title}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink">
            {alum.company && (
              <span className="flex items-center gap-2">
                <CompanyLogo domain={alum.company_domain} name={alum.company} size={20} />
                {alum.company}
              </span>
            )}
            <span className="flex items-center gap-2 text-stone">
              <GraduationCap className="size-[18px]" strokeWidth={1.6} />
              Sac State {alum.grad_year}
            </span>
            {alum.linkedin_url && (
              <a href={alum.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-stone hover:text-ink">
                LinkedIn <ExternalLink className="size-3.5" strokeWidth={1.8} />
              </a>
            )}
          </div>
          {tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className={chip}>
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        {isStudent && (
          <Link href={`/alumni/${alum.id}/book`} className={buttonVariants({ className: "h-11 shrink-0 rounded-full px-6 text-[15px]" })}>
            Book a chat
          </Link>
        )}
      </header>

      {match && (
        <div className="mt-8 rounded-2xl border border-honey/40 bg-honey-soft/50 px-5 py-4 text-sm text-ink">
          <span className="font-medium">✨ {match.score}% match</span>
          <span className="text-stone"> · {match.reasons.join(" · ")}</span>
        </div>
      )}

      <div className="mt-8 space-y-5">
        <Section title="About">
          {alum.bio && <p className="mb-6 text-[15px] leading-relaxed text-ink">{alum.bio}</p>}
          <div className="space-y-3">
            {alum.hometown && <Row icon={MapPin} label="Hometown">{alum.hometown}</Row>}
            {alum.clubs.length > 0 && <Row icon={Users} label="Clubs at Sac State">{alum.clubs.join(", ")}</Row>}
            {alum.fun_facts.length > 0 && <Row icon={Star} label="Fun facts">{alum.fun_facts.join(" · ")}</Row>}
            {alum.languages.length > 0 && <Row icon={Languages} label="Languages">{alum.languages.join(", ")}</Row>}
            {alum.hobbies.length > 0 && <Row icon={Smile} label="Hobbies">{alum.hobbies.join(", ")}</Row>}
            {alum.favorite_spot && <Row icon={BookOpen} label="Favorite Sac State spot">{alum.favorite_spot}</Row>}
          </div>
          {alum.ask_me_about.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-1.5 border-t border-line pt-5">
              {alum.ask_me_about.map((a) => (
                <span key={a} className={chip}>
                  {a}
                </span>
              ))}
            </div>
          )}
        </Section>

        <Section title="Path">
          <PathStory steps={alum.path_story} />
        </Section>

        <Section title="Book">
          <ul className="divide-y divide-line">
            {alum.help_types.map((h) => (
              <li key={h}>
                {isStudent && h !== "referral" ? (
                  <Link href={`/alumni/${alum.id}/book?type=${h}`} className="flex items-center justify-between py-3 text-[15px] text-ink hover:text-stone">
                    {HELP_TYPES[h]}
                    <ChevronRight className="size-4 text-stone" strokeWidth={1.8} />
                  </Link>
                ) : (
                  <div className="flex items-center justify-between py-3 text-[15px] text-stone">
                    {HELP_TYPES[h]}
                    {h === "referral" && <span className="text-xs">After a chat</span>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Section>

        {kudos.length > 0 && (
          <Section title={`Thanks from students · ${kudos.length}`}>
            <ul className="space-y-4">
              {kudos.map((k) => (
                <li key={k.id} className="text-sm leading-relaxed text-stone">
                  “{k.note}”
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-5 py-10">
      <div className="flex items-center gap-6">
        <div className="size-28 animate-pulse rounded-full bg-stone-100" />
        <div className="h-20 flex-1 animate-pulse rounded-2xl bg-stone-100" />
      </div>
      <div className="h-72 animate-pulse rounded-2xl border border-line bg-white" />
      <div className="h-72 animate-pulse rounded-2xl border border-line bg-white" />
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

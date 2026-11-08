"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlumniCard } from "./alumni-card";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HELP_TYPES, JOURNEY } from "@/lib/labels";
import type { AlumniPreview } from "@/lib/alumni";

const YEAR_RANGES = [
  { value: "", label: "Any grad year" },
  { value: "2020-2100", label: "2020 or later" },
  { value: "2015-2019", label: "2015 – 2019" },
  { value: "0-2014", label: "2014 or earlier" },
];

type Filters = { q: string; field: string; company: string; major: string; years: string; journey: string; help: string };
const EMPTY: Filters = { q: "", field: "", company: "", major: "", years: "", journey: "", help: "" };

const uniq = (xs: (string | null | undefined)[]) => [...new Set(xs.filter(Boolean) as string[])].sort();

function Select({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-10 rounded-lg border bg-white px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${value ? "border-hive-green font-medium text-hive-green" : "text-muted-foreground"}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function AlumniDirectory({
  alumni,
  unlocked,
  loggedIn,
  limit,
}: {
  alumni: AlumniPreview[];
  unlocked: boolean;
  loggedIn: boolean;
  /** Teaser mode (landing page): show the first N cards, no filters. */
  limit?: number;
}) {
  const [f, setF] = useState<Filters>(EMPTY);
  const [locked, setLocked] = useState<AlumniPreview | null>(null);
  const set = (k: keyof Filters) => (v: string) => setF((prev) => ({ ...prev, [k]: v }));

  const options = useMemo(
    () => ({
      fields: uniq(alumni.flatMap((a) => a.fields)),
      companies: uniq(alumni.map((a) => a.company)),
      majors: uniq(alumni.map((a) => a.major)),
      journeys: uniq(alumni.flatMap((a) => a.path_tags)),
      help: uniq(alumni.flatMap((a) => a.help_types)),
    }),
    [alumni],
  );

  const shown = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    const [lo, hi] = f.years ? f.years.split("-").map(Number) : [0, 9999];
    return alumni.filter((a) => {
      if (f.field && !a.fields.includes(f.field)) return false;
      if (f.company && a.company !== f.company) return false;
      if (f.major && a.major !== f.major) return false;
      if (f.journey && !a.path_tags.includes(f.journey)) return false;
      if (f.help && !a.help_types.includes(f.help)) return false;
      if (f.years && !(a.grad_year && a.grad_year >= lo && a.grad_year <= hi)) return false;
      if (q) {
        const hay = [a.display_name, a.full_name, a.job_title, a.company, a.major, a.path_line, ...a.fields, ...(a.ask_me_about ?? [])]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [alumni, f]);

  const list = limit ? alumni.slice(0, limit) : shown;
  const active = Object.values(f).some(Boolean);
  const firstName = locked?.display_name.split(" ")[0];

  return (
    <div>
      {!limit && (
        <div className="mb-6 space-y-3">
          <Input
            type="search"
            value={f.q}
            onChange={(e) => set("q")(e.target.value)}
            placeholder="Search by name, company, role, or topic — e.g. “government”, “data”, “nursing”, “Sac City”"
            className="h-12 rounded-xl text-base"
          />
          <div className="flex flex-wrap gap-2">
            <Select label="Field" value={f.field} onChange={set("field")} options={[{ value: "", label: "Any field" }, ...options.fields.map((v) => ({ value: v, label: v }))]} />
            <Select label="Company" value={f.company} onChange={set("company")} options={[{ value: "", label: "Any company" }, ...options.companies.map((v) => ({ value: v, label: v }))]} />
            <Select label="Major" value={f.major} onChange={set("major")} options={[{ value: "", label: "Any major" }, ...options.majors.map((v) => ({ value: v, label: v }))]} />
            <Select label="Grad year" value={f.years} onChange={set("years")} options={YEAR_RANGES} />
            <Select label="Journey" value={f.journey} onChange={set("journey")} options={[{ value: "", label: "Any journey" }, ...options.journeys.map((v) => ({ value: v, label: `${JOURNEY[v]?.icon ?? ""} ${JOURNEY[v]?.label ?? v}` }))]} />
            <Select label="Help type" value={f.help} onChange={set("help")} options={[{ value: "", label: "Any help type" }, ...options.help.map((v) => ({ value: v, label: HELP_TYPES[v] ?? v }))]} />
            {active && (
              <button type="button" onClick={() => setF(EMPTY)} className="h-10 px-3 text-sm font-medium text-hive-green underline-offset-4 hover:underline">
                Clear filters
              </button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Showing <strong className="text-foreground">{shown.length}</strong> of {alumni.length} alumni
          </p>
        </div>
      )}

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
          {alumni.length === 0 ? "No alumni yet — run npm run seed to load the sample data." : "No alumni match those filters. Try clearing one."}
        </div>
      ) : (
        <div className={limit ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-4" : "grid gap-5 sm:grid-cols-2 lg:grid-cols-3"}>
          {list.map((a) =>
            unlocked ? (
              <Link key={a.id} href={`/alumni/${a.id}`} className="group block rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring">
                <AlumniCard alum={a} unlocked />
              </Link>
            ) : (
              <button key={a.id} type="button" onClick={() => setLocked(a)} className="group block rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring">
                <AlumniCard alum={a} unlocked={false} />
              </button>
            ),
          )}
        </div>
      )}

      <Dialog open={!!locked} onOpenChange={(open) => !open && setLocked(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <div className="hex mx-auto mb-2 flex h-14 w-14 items-center justify-center bg-hive-gold-light text-2xl">🔒</div>
            <DialogTitle className="text-center text-xl text-hive-green">See {firstName}&apos;s full profile</DialogTitle>
            <DialogDescription className="text-center text-base">
              {loggedIn
                ? "Full profiles are open to Sac State students and verified alumni. Your alumni account is still pending verification — we'll unlock it soon."
                : `Log in with your Sac State account to see ${firstName}'s full profile — their story, Path Story, and how to book a 1:1.`}
            </DialogDescription>
          </DialogHeader>
          {!loggedIn && locked && (
            <Link
              href={`/login?next=${encodeURIComponent(`/alumni/${locked.id}`)}`}
              className={buttonVariants({ className: "mt-2 h-11 w-full text-base" })}
            >
              Log in with csus.edu
            </Link>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

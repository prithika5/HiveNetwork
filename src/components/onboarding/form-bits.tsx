"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const splitList = (s: string, sep: RegExp = /,/) =>
  s
    .split(sep)
    .map((x) => x.trim())
    .filter(Boolean);

export function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-6 sm:p-8">
      <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-stone">{subtitle}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-stone">{hint}</p>}
    </div>
  );
}

export function TextField(props: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <Field label={props.label} hint={props.hint} htmlFor={props.id} className={props.className}>
      <Input
        id={props.id}
        type={props.type ?? "text"}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
        className="h-11 rounded-xl bg-white text-[15px]"
      />
    </Field>
  );
}

export function AreaField(props: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <Field label={props.label} hint={props.hint} htmlFor={props.id}>
      <Textarea
        id={props.id}
        value={props.value}
        rows={props.rows ?? 3}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
        className="rounded-xl bg-white text-[15px]"
      />
    </Field>
  );
}

/** Multi-select as toggle chips. */
export function Chips({
  options,
  value,
  onChange,
  labels,
}: {
  options: readonly string[];
  value: string[];
  onChange: (v: string[]) => void;
  labels?: Record<string, string>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== o) : [...value, o])}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm transition-colors",
              on ? "bg-ink text-white" : "bg-stone-100 text-ink hover:bg-stone-200",
            )}
          >
            {labels?.[o] ?? o}
          </button>
        );
      })}
    </div>
  );
}

export type AboutState = {
  full_name: string;
  bio: string;
  hometown: string;
  clubs: string;
  fun_facts: string;
  hobbies: string;
  languages: string;
  favorite_spot: string;
};

export const aboutFromProfile = (p: {
  full_name: string | null;
  bio: string | null;
  hometown: string | null;
  clubs: string[];
  fun_facts: string[];
  hobbies: string[];
  languages: string[];
  favorite_spot: string | null;
}): AboutState => ({
  full_name: p.full_name ?? "",
  bio: p.bio ?? "",
  hometown: p.hometown ?? "",
  clubs: p.clubs.join(", "),
  fun_facts: p.fun_facts.join("\n"),
  hobbies: p.hobbies.join(", "),
  languages: p.languages.join(", "),
  favorite_spot: p.favorite_spot ?? "",
});

export const aboutToInput = (a: AboutState) => ({
  full_name: a.full_name,
  bio: a.bio,
  hometown: a.hometown,
  clubs: splitList(a.clubs),
  fun_facts: splitList(a.fun_facts, /\n/),
  hobbies: splitList(a.hobbies),
  languages: splitList(a.languages),
  favorite_spot: a.favorite_spot,
});

/** The friendly "About me" section — same for students and alumni. Feeds AI matches. */
export function AboutMeFields({ value, onChange }: { value: AboutState; onChange: (v: AboutState) => void }) {
  const set = (k: keyof AboutState) => (v: string) => onChange({ ...value, [k]: v });
  return (
    <Card title="About me">
      <AreaField id="bio" label="Short bio" value={value.bio} onChange={set("bio")} rows={4} placeholder="A few sentences about you" />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField id="hometown" label="Hometown" value={value.hometown} onChange={set("hometown")} placeholder="Stockton, CA" />
        <TextField id="languages" label="Languages" value={value.languages} onChange={set("languages")} placeholder="English, Spanish" />
        <TextField id="clubs" label="Clubs" value={value.clubs} onChange={set("clubs")} placeholder="ACM, SHPE" />
        <TextField id="hobbies" label="Hobbies" value={value.hobbies} onChange={set("hobbies")} placeholder="Soccer, cooking" />
      </div>
      <TextField id="favorite_spot" label="Favorite campus spot" value={value.favorite_spot} onChange={set("favorite_spot")} placeholder="Library 3rd floor" />
      <AreaField id="fun_facts" label="Fun facts" value={value.fun_facts} onChange={set("fun_facts")} rows={3} placeholder={"Ran the Sac State half marathon\nCan cook pho from scratch"} />
    </Card>
  );
}

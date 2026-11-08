"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { draftAlumniProfile, saveAlumniProfile } from "@/app/onboarding/actions";
import { AboutMeFields, Card, Chips, Field, TextField, aboutFromProfile, aboutToInput, type AboutState } from "./form-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HELP_TYPES, JOURNEY } from "@/lib/labels";
import { FIELDS, HELP_TYPE_KEYS, PATH_KINDS, PATH_TAGS } from "@/lib/options";
import type { OwnProfile } from "@/lib/profile";

type Step = { year: string; title: string; kind: string };
const KIND_LABEL: Record<string, string> = { education: "🎓 Education", internship: "🧪 Internship", job: "💼 Job", pivot: "🔀 Pivot", milestone: "⭐ Milestone" };
const JOURNEY_LABELS = Object.fromEntries(Object.entries(JOURNEY).map(([k, v]) => [k, `${v.icon} ${v.label}`]));

export function AlumniForm({ profile, mode }: { profile: OwnProfile; mode: "onboarding" | "edit" }) {
  const router = useRouter();
  const [source, setSource] = useState("");
  const [drafting, startDraft] = useTransition();
  const [draftMsg, setDraftMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [about, setAbout] = useState<AboutState>(aboutFromProfile(profile));
  const [major, setMajor] = useState(profile.major ?? "");
  const [gradYear, setGradYear] = useState(profile.grad_year ? String(profile.grad_year) : "");
  const [jobTitle, setJobTitle] = useState(profile.job_title ?? "");
  const [company, setCompany] = useState(profile.company ?? "");
  const [steps, setSteps] = useState<Step[]>(profile.path_story.map((s) => ({ year: String(s.year), title: s.title, kind: s.kind })));
  const [pathTags, setPathTags] = useState<string[]>(profile.path_tags);
  const [fields, setFields] = useState<string[]>(profile.fields);
  const [askMe, setAskMe] = useState<string[]>([0, 1, 2].map((i) => profile.ask_me_about[i] ?? ""));
  const [helpTypes, setHelpTypes] = useState<string[]>(profile.help_types.length ? profile.help_types : ["coffee_chat", "quick_question"]);
  const [limit, setLimit] = useState(String(profile.monthly_limit ?? 2));
  const [calendly, setCalendly] = useState(profile.calendly_url ?? "");
  const [linkedin, setLinkedin] = useState(profile.linkedin_url ?? "");
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDraft() {
    setDraftMsg(null);
    startDraft(async () => {
      const res = await draftAlumniProfile(source);
      if (!res.ok) return setDraftMsg({ ok: false, text: res.error });
      const d = res.draft;
      if (d.job_title) setJobTitle(d.job_title);
      if (d.company) setCompany(d.company);
      if (d.major) setMajor(d.major);
      if (d.grad_year) setGradYear(String(d.grad_year));
      if (d.bio) setAbout((a) => ({ ...a, bio: d.bio }));
      if (d.path_story.length) setSteps(d.path_story.map((s) => ({ year: String(s.year), title: s.title, kind: s.kind })));
      setPathTags(d.path_tags);
      if (d.fields.length) setFields(d.fields);
      if (d.ask_me_about.length) setAskMe([0, 1, 2].map((i) => d.ask_me_about[i] ?? ""));
      if (d.suggested_help_types.length) setHelpTypes(d.suggested_help_types);
      setDraftMsg({ ok: true, text: "✨ Drafted! Review everything below — edit anything that's not quite right." });
    });
  }

  const setStep = (i: number, patch: Partial<Step>) => setSteps((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startSave(async () => {
      const res = await saveAlumniProfile({
        ...aboutToInput(about),
        major,
        grad_year: gradYear ? Number(gradYear) : null,
        job_title: jobTitle,
        company,
        path_story: steps
          .filter((s) => s.title.trim() && s.year)
          .map((s) => ({ year: Number(s.year), title: s.title.trim(), kind: s.kind as (typeof PATH_KINDS)[number] })),
        path_tags: pathTags as (typeof PATH_TAGS)[number][],
        fields: fields as (typeof FIELDS)[number][],
        ask_me_about: askMe.map((a) => a.trim()).filter(Boolean),
        help_types: helpTypes as (typeof HELP_TYPE_KEYS)[number][],
        monthly_limit: Number(limit) || 2,
        calendly_url: calendly,
        linkedin_url: linkedin,
      });
      if (!res.ok) return setError(res.error);
      router.push(mode === "onboarding" ? `/alumni/${profile.id}` : "/profile?saved=1");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="rounded-2xl border-2 border-hive-gold bg-hive-gold-light/60 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-hive-green">✨ Let AI draft your profile</h2>
        <p className="mt-1 text-sm text-hive-green/80">
          Paste your LinkedIn “About” + experience, or your resume. We&apos;ll draft your bio, Path Story, and topics — you review everything before saving.
        </p>
        <textarea
          value={source}
          onChange={(e) => setSource(e.target.value)}
          rows={6}
          placeholder={"About: I'm a data analyst turned software engineer…\n\nExperience:\nSoftware Engineer, Bayline Analytics (2023–present)\nData Analyst, CA Dept. of Public Health (2019–2022)\nEducation: Sac State, B.S. Statistics, 2019 · Sacramento City College"}
          className="mt-4 w-full rounded-xl border bg-white p-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button type="button" onClick={onDraft} disabled={drafting} className="h-11 px-5 text-base">
            {drafting ? "✨ Drafting your Path Story…" : "✨ Draft my profile"}
          </Button>
          <span className="text-xs text-hive-green/70">Takes ~5 seconds.</span>
        </div>
        {draftMsg && (
          <p className={`mt-3 rounded-lg p-3 text-sm ${draftMsg.ok ? "bg-white text-hive-green" : "bg-destructive/10 text-destructive"}`}>{draftMsg.text}</p>
        )}
      </section>

      <Card title="💼 Where you are now">
        <TextField id="full_name" label="Full name" value={about.full_name} onChange={(v) => setAbout({ ...about, full_name: v })} />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField id="job_title" label="Current role" value={jobTitle} onChange={setJobTitle} placeholder="Software Engineer" />
          <TextField id="company" label="Company / agency" value={company} onChange={setCompany} placeholder="Bayline Analytics" />
          <TextField id="major" label="Sac State major" value={major} onChange={setMajor} placeholder="Statistics" />
          <TextField id="grad_year" label="Sac State grad year" type="number" value={gradYear} onChange={setGradYear} placeholder="2019" />
        </div>
        <Field label="Fields you work in">
          <Chips options={FIELDS} value={fields} onChange={setFields} />
        </Field>
      </Card>

      <Card title="⬡ Your Path Story" subtitle="How you got from Sac State to where you are — students love seeing the real, non-linear version.">
        <div className="space-y-3">
          {steps.map((s, i) => (
            <div key={i} className="grid grid-cols-[5.5rem_1fr] gap-2 rounded-xl border p-3 sm:grid-cols-[5.5rem_1fr_9.5rem_auto]">
              <Input aria-label="Year" type="number" value={s.year} onChange={(e) => setStep(i, { year: e.target.value })} placeholder="2016" className="h-10" />
              <Input aria-label="What happened" value={s.title} onChange={(e) => setStep(i, { title: e.target.value })} placeholder="Transferred to Sac State — Statistics" className="h-10" />
              <select aria-label="Kind" value={s.kind} onChange={(e) => setStep(i, { kind: e.target.value })} className="h-10 rounded-lg border bg-white px-2 text-sm">
                {PATH_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => setSteps(steps.filter((_, j) => j !== i))} className="h-10 px-2 text-sm text-muted-foreground hover:text-destructive" aria-label="Remove step">
                ✕
              </button>
            </div>
          ))}
          <Button type="button" variant="outline" className="h-10" onClick={() => setSteps([...steps, { year: "", title: "", kind: "job" }])}>
            + Add a step
          </Button>
        </div>
        <Field label="Journey tags" hint="Shown as chips on your card — and used to match you with students on the same path.">
          <Chips options={PATH_TAGS} value={pathTags} onChange={setPathTags} labels={JOURNEY_LABELS} />
        </Field>
      </Card>

      <Card title="🤝 How you'll help">
        <Field label="“Ask me about…” (up to 3)">
          <div className="space-y-2">
            {askMe.map((a, i) => (
              <Input key={i} value={a} onChange={(e) => setAskMe(askMe.map((x, j) => (j === i ? e.target.value : x)))} placeholder={["Breaking into tech without a CS degree", "Going from state government to tech", "Transferring from community college"][i]} className="h-11 text-base" />
            ))}
          </div>
        </Field>
        <Field label="Ways you're happy to help">
          <Chips options={HELP_TYPE_KEYS} value={helpTypes} onChange={setHelpTypes} labels={HELP_TYPES} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-[10rem_1fr]">
          <TextField id="limit" label="Chats per month" type="number" value={limit} onChange={setLimit} hint="We never send you more." />
          <TextField id="linkedin" label="LinkedIn URL" value={linkedin} onChange={setLinkedin} placeholder="https://www.linkedin.com/in/you" />
        </div>
        <div className="rounded-xl bg-secondary p-4">
          <TextField id="calendly" label="📅 Your Calendly link" value={calendly} onChange={setCalendly} placeholder="https://calendly.com/your-name/20min" />
          <p className="mt-2 text-sm text-muted-foreground">
            <strong>Tip:</strong> Create a free Calendly account → make a 20-minute event → paste its link here. Students book right on your profile, and Calendly sends you both the invite.
          </p>
        </div>
      </Card>

      <AboutMeFields value={about} onChange={setAbout} />

      {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <div className="sticky bottom-4 flex justify-end">
        <Button type="submit" disabled={saving || drafting} className="h-12 px-8 text-base shadow-lg">
          {saving ? "Saving…" : mode === "onboarding" ? "Publish my profile →" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

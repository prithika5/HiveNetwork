"use client";

import { safe } from "@/lib/safe";
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
const KIND_LABEL: Record<string, string> = { education: "Education", internship: "Internship", job: "Job", pivot: "Pivot", milestone: "Milestone" };
const JOURNEY_LABELS = Object.fromEntries(Object.entries(JOURNEY).map(([k, v]) => [k, v.label]));

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
      const res = await safe(draftAlumniProfile(source));
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
      setDraftMsg({ ok: true, text: "Drafted. Review below." });
    });
  }

  const setStep = (i: number, patch: Partial<Step>) => setSteps((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startSave(async () => {
      const res = await safe(saveAlumniProfile({
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
      }));
      if (!res.ok) return setError(res.error);
      router.push(mode === "onboarding" ? `/alumni/${profile.id}` : "/profile?saved=1");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="rounded-2xl border border-honey/50 bg-white p-6 sm:p-8">
        <h2 className="text-lg font-semibold tracking-tight text-ink">✨ Draft with AI</h2>
        <textarea
          value={source}
          onChange={(e) => setSource(e.target.value)}
          rows={5}
          aria-label="LinkedIn About and experience, or resume text"
          placeholder="Paste your LinkedIn About + experience"
          className="mt-4 w-full rounded-xl border border-line bg-white p-3 text-[15px] outline-none placeholder:text-stone focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <Button type="button" onClick={onDraft} disabled={drafting} className="mt-3 h-10 rounded-full px-5">
          {drafting ? "Drafting…" : "Draft"}
        </Button>
        {draftMsg && <p className={`mt-3 text-sm ${draftMsg.ok ? "text-stone" : "text-destructive"}`}>{draftMsg.text}</p>}
      </section>

      <Card title="Now">
        <TextField id="full_name" label="Full name" value={about.full_name} onChange={(v) => setAbout({ ...about, full_name: v })} />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField id="job_title" label="Role" value={jobTitle} onChange={setJobTitle} placeholder="Software Engineer" />
          <TextField id="company" label="Company" value={company} onChange={setCompany} placeholder="Bayline Analytics" />
          <TextField id="major" label="Major" value={major} onChange={setMajor} placeholder="Statistics" />
          <TextField id="grad_year" label="Grad year" type="number" value={gradYear} onChange={setGradYear} placeholder="2019" />
        </div>
        <Field label="Fields">
          <Chips options={FIELDS} value={fields} onChange={setFields} />
        </Field>
      </Card>

      <Card title="Path">
        <div className="space-y-3">
          {steps.map((s, i) => (
            <div key={i} className="grid grid-cols-[5.5rem_1fr] gap-2 rounded-xl border border-line p-3 sm:grid-cols-[5.5rem_1fr_9.5rem_auto]">
              <Input aria-label="Year" type="number" value={s.year} onChange={(e) => setStep(i, { year: e.target.value })} placeholder="2016" className="h-10" />
              <Input aria-label="What happened" value={s.title} onChange={(e) => setStep(i, { title: e.target.value })} placeholder="Transferred to Sac State — Statistics" className="h-10" />
              <select aria-label="Kind" value={s.kind} onChange={(e) => setStep(i, { kind: e.target.value })} className="h-10 rounded-lg border border-line bg-white px-2 text-sm">
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
          <Button type="button" variant="outline" className="h-9 rounded-full bg-white px-4" onClick={() => setSteps([...steps, { year: "", title: "", kind: "job" }])}>
            Add step
          </Button>
        </div>
        <Field label="Journey">
          <Chips options={PATH_TAGS} value={pathTags} onChange={setPathTags} labels={JOURNEY_LABELS} />
        </Field>
      </Card>

      <Card title="Help">
        <Field label="Ask me about">
          <div className="space-y-2">
            {askMe.map((a, i) => (
              <Input key={i} value={a} onChange={(e) => setAskMe(askMe.map((x, j) => (j === i ? e.target.value : x)))} placeholder={["Breaking into tech without a CS degree", "Going from state government to tech", "Transferring from community college"][i]} className="h-11 text-base" />
            ))}
          </div>
        </Field>
        <Field label="Offers">
          <Chips options={HELP_TYPE_KEYS} value={helpTypes} onChange={setHelpTypes} labels={HELP_TYPES} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-[10rem_1fr]">
          <TextField id="limit" label="Chats / month" type="number" value={limit} onChange={setLimit} />
          <TextField id="linkedin" label="LinkedIn" value={linkedin} onChange={setLinkedin} placeholder="https://www.linkedin.com/in/you" />
        </div>
        <div>
          <TextField id="calendly" label="Calendly link" value={calendly} onChange={setCalendly} placeholder="https://calendly.com/your-name/20min" hint="Free account → 20-minute event → paste the link" />
        </div>
      </Card>

      <AboutMeFields value={about} onChange={setAbout} />

      {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={saving || drafting} className="h-11 rounded-full px-7 text-[15px]">
          {saving ? "Saving…" : mode === "onboarding" ? "Publish" : "Save"}
        </Button>
      </div>
    </form>
  );
}

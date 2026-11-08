"use client";

import { safe } from "@/lib/safe";
import { useRef, useState, useTransition } from "react";
import { FileCheck2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { saveStudentProfile, uploadResume } from "@/app/onboarding/actions";
import { AboutMeFields, AreaField, Card, Chips, Field, TextField, aboutFromProfile, aboutToInput, splitList, type AboutState } from "./form-bits";
import { Button } from "@/components/ui/button";
import { BACKGROUND_LABELS, BACKGROUND_TAGS, FIELDS } from "@/lib/options";
import type { OwnProfile } from "@/lib/profile";

export function StudentForm({ profile, mode, next }: { profile: OwnProfile; mode: "onboarding" | "edit"; next?: string }) {
  const router = useRouter();
  const [about, setAbout] = useState<AboutState>(aboutFromProfile(profile));
  const [major, setMajor] = useState(profile.major ?? "");
  const [classYear, setClassYear] = useState(profile.class_year ? String(profile.class_year) : "");
  const [goal, setGoal] = useState(profile.goal ?? "");
  const [goalField, setGoalField] = useState(profile.goal_field ?? "");
  const [background, setBackground] = useState<string[]>(profile.background_tags);
  const [skills, setSkills] = useState(profile.skills.join(", "));
  const [hasResume, setHasResume] = useState(profile.hasResume);
  const [resumeMsg, setResumeMsg] = useState<{ tone: "ok" | "warn" | "err"; text: string } | null>(null);
  const [uploading, startUpload] = useTransition();
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function onResume(file: File | undefined) {
    if (!file) return;
    const fd = new FormData();
    fd.set("resume", file);
    setResumeMsg(null);
    startUpload(async () => {
      const res = await safe(uploadResume(fd));
      if (!res.ok) return setResumeMsg({ tone: "err", text: res.error });
      setHasResume(true);
      if (res.skills.length) {
        const merged = [...new Set([...splitList(skills), ...res.skills])];
        setSkills(merged.join(", "));
        setResumeMsg({ tone: "ok", text: `✨ Found ${res.skills.length} skills` });
      } else {
        setResumeMsg({ tone: "warn", text: res.aiError ?? "Resume saved." });
      }
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startSave(async () => {
      const res = await safe(saveStudentProfile({
        ...aboutToInput(about),
        major,
        class_year: classYear ? Number(classYear) : null,
        goal,
        goal_field: goalField as (typeof FIELDS)[number],
        background_tags: background as (typeof BACKGROUND_TAGS)[number][],
        skills: splitList(skills),
      }));
      if (!res.ok) return setError(res.error);
      router.push(mode === "onboarding" ? (next ?? "/alumni") : "/profile?saved=1");
      router.refresh();
    });
  }

  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() + i);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card title="You">
        <TextField id="full_name" label="Full name" value={about.full_name} onChange={(v) => setAbout({ ...about, full_name: v })} />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField id="major" label="Major" value={major} onChange={setMajor} placeholder="Computer Science" />
          <Field label="Grad year" htmlFor="class_year">
            <select id="class_year" value={classYear} onChange={(e) => setClassYear(e.target.value)} className="h-11 w-full rounded-xl border border-line bg-white px-3 text-[15px]">
              <option value="">Select…</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Background">
          <Chips options={BACKGROUND_TAGS} value={background} onChange={setBackground} labels={BACKGROUND_LABELS} />
        </Field>
      </Card>

      <Card title="Goal">
        <AreaField id="goal" label="Career goal" value={goal} onChange={setGoal} rows={2} placeholder="Land a software engineering internship by summer" />
        <Field label="Target field">
          <Chips options={FIELDS} value={goalField ? [goalField] : []} onChange={(v) => setGoalField(v.filter((x) => x !== goalField)[0] ?? "")} />
        </Field>
      </Card>

      <Card title="Resume">
        <div className="rounded-xl border border-dashed border-stone-300 p-6 text-center">
          <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => onResume(e.target.files?.[0])} />
          {hasResume ? <FileCheck2 className="mx-auto size-6 text-honey" strokeWidth={1.6} /> : <Upload className="mx-auto size-6 text-stone" strokeWidth={1.6} />}
          <Button type="button" variant="outline" className="mt-3 h-9 rounded-full bg-white px-4" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? "Reading…" : hasResume ? "Replace PDF" : "Upload PDF"}
          </Button>
          <p className="mt-3 text-xs text-stone">Sample resumes only for the demo</p>
        </div>
        {resumeMsg && (
          <p
            className={`rounded-lg p-3 text-sm ${
              resumeMsg.tone === "ok" ? "bg-honey-soft/60 text-ink" : resumeMsg.tone === "warn" ? "bg-secondary" : "bg-destructive/10 text-destructive"
            }`}
          >
            {resumeMsg.text}
          </p>
        )}
        <TextField id="skills" label="Skills" value={skills} onChange={setSkills} placeholder="Python, React, SQL" />
      </Card>

      <AboutMeFields value={about} onChange={setAbout} />

      {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={saving || uploading} className="h-11 rounded-full px-7 text-[15px]">
          {saving ? "Saving…" : mode === "onboarding" ? "Find matches" : "Save"}
        </Button>
      </div>
    </form>
  );
}

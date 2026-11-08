/**
 * Seeds the Hive Network demo data from supabase/sample-data.json.
 *
 *   npm run seed
 *
 * Safe to re-run: it deletes the sample accounts (by email) and recreates them.
 * Uses the service-role key, so it bypasses RLS. Never import this from app code.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const PASSWORD = process.env.DEMO_PASSWORD || "hivedemo2026";
// Every sample alum uses the team's demo Calendly link unless the JSON gives them their own.
const DEMO_CALENDLY = process.env.DEMO_CALENDLY_URL || "https://calendly.com/hive-network-demo/20min";

const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const data = JSON.parse(readFileSync(new URL("../supabase/sample-data.json", import.meta.url), "utf8"));

type Person = { key: string; email: string; full_name: string; [k: string]: unknown };
const ids: Record<string, string> = {};
const DAY = 24 * 60 * 60 * 1000;

function check<T>(label: string, res: { error: { message: string } | null; data?: unknown }): T {
  if (res.error) throw new Error(`${label}: ${res.error.message}`);
  return res.data as T;
}

/** Tiny one-page PDF (Helvetica) so "View resume" has a real file to open. */
function makePdf(text: string): Buffer {
  const esc = (s: string) => s.replace(/[\\()]/g, (c) => "\\" + c).replace(/[^\x20-\x7E]/g, "-");
  const lines = text.split("\n").flatMap((l) => (l.length > 95 ? l.match(/.{1,95}(\s|$)/g) ?? [l] : [l]));
  const body = lines
    .map((l, i) => `BT /F1 ${i === 0 ? 16 : 10} Tf 50 ${770 - i * 15} Td (${esc(l.trimEnd())}) Tj ET`)
    .join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(body)} >>\nstream\n${body}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}

async function deleteExisting(emails: string[]) {
  const wanted = new Set(emails.map((e) => e.toLowerCase()));
  let page = 1;
  let removed = 0;
  for (;;) {
    const { data: list, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of list.users) {
      if (u.email && wanted.has(u.email.toLowerCase())) {
        await db.storage.from("resumes").remove([`${u.id}/resume.pdf`]);
        check("delete user", await db.auth.admin.deleteUser(u.id)); // cascades to profiles, requests, kudos…
        removed++;
      }
    }
    if (list.users.length < 1000) break;
    page++;
  }
  return removed;
}

async function createUser(p: Person, role: "student" | "alumni") {
  const res = await db.auth.admin.createUser({
    email: p.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { role, full_name: p.full_name },
  });
  const user = check<{ user: { id: string } }>(`create ${p.email}`, res).user;
  ids[p.key] = user.id;
  return user.id;
}

async function main() {
  const everyone: Person[] = [...data.alumni, ...data.students, ...data.admins];
  const removed = await deleteExisting(everyone.map((p) => p.email));
  console.log(`• removed ${removed} existing sample accounts`);

  // Alumni ---------------------------------------------------------------
  for (const a of data.alumni as Person[]) {
    const id = await createUser(a, "alumni");
    const profile: Record<string, unknown> = { ...a };
    delete profile.key;
    delete profile.email;
    delete profile.avatar;
    check(
      `profile ${a.full_name}`,
      await db
        .from("profiles")
        .update({
          ...profile,
          calendly_url: (a.calendly_url as string | undefined) ?? DEMO_CALENDLY,
          photo_url: `/avatars/${a.avatar}.svg`, // generic silhouette
          verified: true,
          onboarded: true,
          is_sample: true,
        })
        .eq("id", id),
    );
  }
  console.log(`• ${data.alumni.length} alumni`);

  // Students -------------------------------------------------------------
  for (const s of data.students as Person[]) {
    const id = await createUser(s, "student");
    const profile: Record<string, unknown> = { ...s };
    delete profile.key;
    delete profile.email;
    let resume_path: string | null = null;
    if (s.resume_text) {
      resume_path = `${id}/resume.pdf`;
      check(
        `resume ${s.full_name}`,
        await db.storage
          .from("resumes")
          .upload(resume_path, makePdf(String(s.resume_text)), { contentType: "application/pdf", upsert: true }),
      );
    }
    check(
      `profile ${s.full_name}`,
      await db.from("profiles").update({ ...profile, resume_path, onboarded: true, is_sample: true }).eq("id", id),
    );
  }
  console.log(`• ${data.students.length} students (with sample resumes)`);

  // Admin ----------------------------------------------------------------
  for (const a of data.admins as Person[]) {
    const id = await createUser(a, "student"); // created as student, then promoted (service role may change role)
    check("admin role", await db.from("profiles").update({ role: "admin", verified: true, onboarded: true }).eq("id", id));
  }
  console.log(`• ${data.admins.length} admin`);

  // Requests (inserted in order — the DB enforces limits & referral rules) --
  const requestIds: Record<string, string> = {};
  for (const r of data.requests) {
    const now = Date.now();
    const row = {
      student_id: ids[r.student],
      alumni_id: ids[r.alumni],
      type: r.type,
      status: r.status,
      message: r.message,
      share_resume: true,
      open_to_refer: r.open_to_refer ?? false,
      created_at: new Date(now - (r.days_ago ?? 0) * DAY).toISOString(),
      scheduled_at:
        r.scheduled_days_from_now != null ? new Date(now + r.scheduled_days_from_now * DAY).toISOString() : null,
    };
    const inserted = check<{ id: string }>(
      `request ${r.student}→${r.alumni}`,
      await db.from("requests").insert(row).select("id").single(),
    );
    if (r.status === "completed") requestIds[`${r.student}:${r.alumni}`] = inserted.id;
  }
  console.log(`• ${data.requests.length} requests`);

  // Kudos ----------------------------------------------------------------
  const kudos = data.kudos.map((k: { alumni: string; student: string; note: string }) => ({
    alumni_id: ids[k.alumni],
    student_id: ids[k.student],
    request_id: requestIds[`${k.student}:${k.alumni}`] ?? null,
    note: k.note,
  }));
  check("kudos", await db.from("kudos").insert(kudos));
  console.log(`• ${kudos.length} kudos`);

  console.log(`\n✅ Seeded. Every demo account uses password: ${PASSWORD}`);
  console.log("   Student: alex.rivera@csus.edu   Alum: maria.lopez@alumni.hive.demo   Admin: hive.admin@csus.edu");
  if (!process.env.DEMO_CALENDLY_URL) {
    console.log(`   ⚠ Alumni use the placeholder Calendly link ${DEMO_CALENDLY} — set DEMO_CALENDLY_URL in .env.local and re-run.`);
  }
}

main().catch((err) => {
  console.error("\n❌ Seed failed:", err.message ?? err);
  process.exit(1);
});

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** OAuth (LinkedIn) lands here: exchange the code for a session, then continue. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // First LinkedIn sign-in: finish the alumni profile before anything else.
      const { data: auth } = await supabase.auth.getUser();
      const { data: profile } = auth.user
        ? await supabase.from("profiles").select("onboarded").eq("id", auth.user.id).maybeSingle()
        : { data: null };
      return NextResponse.redirect(`${origin}${profile && !profile.onboarded ? "/onboarding" : next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?tab=alumni&error=linkedin`);
}

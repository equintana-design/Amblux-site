import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Exchanges a Supabase auth email link's token_hash for a real session —
// the server-side landing point for the "reset password" flow (and any
// future email-link flow: signup confirmation, magic link, etc.), all of
// which follow the same token_hash + type + next shape.
//
// This ONLY works once the relevant email template in the Supabase
// dashboard (Authentication > Emails, e.g. "Reset Password") is edited to
// link here instead of Supabase's default {{ .ConfirmationURL }}:
//
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/account/update-password
//
// Without that template edit, the emailed link points at Supabase's own
// hosted verification URL instead of this route, and this code never
// runs. See supabase.com/docs/guides/auth/server-side/nextjs for the same
// pattern applied to signup/magic-link templates.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/account";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(
    new URL(
      `/sign-in?error=${encodeURIComponent("That link has expired or was already used — request a new one.")}`,
      request.url,
    ),
  );
}

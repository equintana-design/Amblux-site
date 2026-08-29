"use server";

// Server Actions for the distributor auth flow. All of these run on the
// server and use lib/supabase/server.ts (cookie-based session), so the
// resulting session is visible to Server Components on the very next
// request — that's what makes /account (a Server Component) able to read
// `user` immediately after a successful sign-in redirect.
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

function errorRedirect(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

// Server Actions don't get the incoming Request object directly, but
// next/headers reads it from the ambient request context — this is the
// standard way to recover the site's own origin (so the reset-password
// email links back to whichever host actually served the request:
// production domain, a Vercel preview URL, localhost, etc.) without a
// hardcoded env var to keep in sync.
async function getOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) errorRedirect("/sign-in", error.message);

  redirect("/account");
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const supabase = await createClient();

  // A row in amblux_profiles (role='distributor', approved=false) is
  // created automatically by the private.handle_new_amblux_user() trigger
  // (migration 0003) — nothing else to do here.
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) errorRedirect("/sign-up", error.message);

  redirect("/account");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// Kicks off Supabase's built-in recovery-email flow. The redirect always
// points at app/auth/confirm (which exchanges the emailed token/code for
// a real session — see ConfirmClient.tsx for the three link shapes it
// handles) with next=/account/update-password, so clicking the email
// link lands the user straight on the "set a new password" form already
// signed in. Works whether or not the "Reset Password" template in the
// Supabase dashboard has been switched to the custom token_hash link —
// ConfirmClient.tsx also handles Supabase's default {{ .ConfirmationURL }}
// template — but switching it is still recommended, since the custom
// link is a plain GET rather than relying on a client-side redirect.
export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  if (!email) errorRedirect("/forgot-password", "Enter your email address.");

  const supabase = await createClient();
  const origin = await getOrigin();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/account/update-password`,
  });

  // Same "check your email" outcome whether or not the address has an
  // account — a different message here would let someone probe which
  // emails are registered.
  redirect("/forgot-password?sent=1");
}

// Sets a new password for whoever's session is currently active — works
// identically whether that session came from clicking a recovery email
// link (app/auth/confirm/route.ts) or from an already signed-in user
// visiting /account/update-password on their own to change their password.
export async function updatePasswordAction(formData: FormData) {
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) errorRedirect("/forgot-password", "Your reset link has expired — request a new one.");

  if (password.length < 6) errorRedirect("/account/update-password", "Password must be at least 6 characters.");
  if (password !== confirmPassword) errorRedirect("/account/update-password", "Those passwords don't match.");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) errorRedirect("/account/update-password", error.message);

  redirect("/account?password_updated=1");
}

export async function updateCompanyNameAction(formData: FormData) {
  const companyName = String(formData.get("companyName") || "").trim();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // RLS: "users can update their own amblux_profile" (migration 0001)
  // already restricts this to the caller's own row — no need to filter by
  // id here for safety, but it's included anyway to keep the query itself
  // legible about intent.
  await supabase.from("amblux_profiles").update({ company_name: companyName || null }).eq("id", user.id);

  redirect("/account");
}

// Kitchen Manufacturer vs Kitchen Dealer (migration 0030_business_type) —
// used by the configurator's pricing panel to recommend a resale price
// range for the lighting portion of a job. Saved once here (or inline the
// first time the account opens that section in the pricing panel) so it
// doesn't need to be re-asked on every project.
export async function updateBusinessTypeAction(formData: FormData) {
  const businessType = String(formData.get("businessType") || "");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const value = businessType === "manufacturer" || businessType === "dealer" ? businessType : null;

  await supabase.from("amblux_profiles").update({ business_type: value }).eq("id", user.id);

  redirect("/account");
}

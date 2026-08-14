"use server";

// Server Actions for the distributor auth flow. All of these run on the
// server and use lib/supabase/server.ts (cookie-based session), so the
// resulting session is visible to Server Components on the very next
// request — that's what makes /account (a Server Component) able to read
// `user` immediately after a successful sign-in redirect.
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function errorRedirect(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
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

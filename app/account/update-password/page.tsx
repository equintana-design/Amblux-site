import Link from "next/link";
import { redirect } from "next/navigation";
import { PasswordInput } from "@/app/components/PasswordInput";
import { SiteHeader } from "@/app/components/SiteHeader";
import { createClient } from "@/lib/supabase/server";
import { updatePasswordAction } from "../actions";

// Reached two ways: (1) an already signed-in user clicking "Change
// password" on /account, or (2) a fresh recovery session created by
// clicking the emailed reset link (see app/auth/confirm/ConfirmClient.tsx). Either
// way this page just needs *some* active session — updatePasswordAction
// works the same regardless of how that session was established, so
// there's no need to distinguish the two cases here.
export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/forgot-password");

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-soft">AMBLUX Accounts</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Set a new password</h1>
        <p className="mt-2 text-sm text-muted">for {user.email}</p>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        <form action={updatePasswordAction} className="mt-6 flex flex-col gap-4">
          <PasswordInput label="New password" name="password" minLength={6} autoComplete="new-password" />
          <PasswordInput
            label="Confirm new password"
            name="confirmPassword"
            minLength={6}
            autoComplete="new-password"
          />
          <button
            type="submit"
            className="mt-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
          >
            Update password
          </button>
        </form>

        <p className="mt-6 text-sm">
          <Link href="/account" className="font-medium text-accent-strong hover:underline">
            ← Back to account
          </Link>
        </p>
      </div>
    </div>
  );
}

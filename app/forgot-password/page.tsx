import Link from "next/link";
import { requestPasswordResetAction } from "@/app/account/actions";
import { SiteHeader } from "@/app/components/SiteHeader";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-soft">AMBLUX Accounts</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Reset your password</h1>
        <p className="mt-2 text-sm text-muted">
          Enter the email on your account and we&apos;ll send a link to set a new password.{" "}
          <Link href="/sign-in" className="font-medium text-accent-strong hover:underline">
            Back to sign in
          </Link>
          .
        </p>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        {sent ? (
          <p className="mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            If that email has an account, a reset link is on its way — check the inbox (and spam folder).
          </p>
        ) : (
          <form action={requestPasswordResetAction} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-muted">Email</span>
              <input
                type="email"
                name="email"
                required
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </label>
            <button
              type="submit"
              className="mt-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
            >
              Send reset link
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

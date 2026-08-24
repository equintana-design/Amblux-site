import Link from "next/link";
import { signUpAction } from "@/app/account/actions";
import { SiteHeader } from "@/app/components/SiteHeader";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-soft">AMBLUX Accounts</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Create an account</h1>
        <p className="mt-2 text-sm text-muted">
          New accounts start as a Client and unapproved — an AMBLUX admin reviews and approves accounts, and can
          later promote one to Distributor, before its pricing becomes visible. Already have an account?{" "}
          <Link href="/sign-in" className="font-medium text-accent-strong hover:underline">
            Sign in
          </Link>
          .
        </p>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        <form action={signUpAction} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-muted">Email</span>
            <input
              type="email"
              name="email"
              required
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-muted">Password</span>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </label>
          <button
            type="submit"
            className="mt-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
          >
            Create account
          </button>
        </form>
      </div>
    </div>
  );
}

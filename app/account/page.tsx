import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/app/components/SiteHeader";
import { createClient } from "@/lib/supabase/server";
import { signOutAction, updateCompanyNameAction } from "./actions";

const ROLE_LABEL: Record<string, string> = {
  client: "Client",
  distributor: "Distributor",
  admin: "Admin",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ password_updated?: string }>;
}) {
  const { password_updated } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // RLS ("users can read their own amblux_profile") means this can only
  // ever return the caller's own row — no extra filtering needed to keep
  // this safe, though .eq below keeps the query's intent explicit.
  const { data: profile } = await supabase
    .from("amblux_profiles")
    .select("role, company_name, approved")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-md flex-1 px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-soft">AMBLUX Accounts</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Your account</h1>

        {password_updated && (
          <p className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            Password updated.
          </p>
        )}

        <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
          <dl className="flex flex-col gap-4 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted">Email</dt>
              <dd className="font-medium text-foreground">{user.email}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">Account type</dt>
              <dd className="font-medium text-foreground">{ROLE_LABEL[profile?.role ?? "client"]}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">Configurator &amp; pricing</dt>
              <dd>
                {profile?.approved ? (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                    Approved
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                    Pending admin approval
                  </span>
                )}
              </dd>
            </div>
          </dl>

          {profile?.approved ? (
            <div className="mt-6 border-t border-border pt-6">
              <Link
                href="/configurator"
                className="inline-block rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
              >
                Open the configurator →
              </Link>
            </div>
          ) : (
            <p className="mt-6 border-t border-border pt-6 text-xs text-muted">
              The configurator unlocks automatically once an AMBLUX admin approves your account.
            </p>
          )}

          <form action={updateCompanyNameAction} className="mt-6 flex flex-col gap-1.5 border-t border-border pt-6 text-sm">
            <label className="font-medium text-muted" htmlFor="companyName">
              Company name
            </label>
            <div className="flex gap-2">
              <input
                id="companyName"
                name="companyName"
                defaultValue={profile?.company_name ?? ""}
                className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button
                type="submit"
                className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted hover:border-accent hover:text-accent-strong"
              >
                Save
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-border pt-6">
            <Link href="/account/update-password" className="text-sm font-medium text-accent-strong hover:underline">
              Change password →
            </Link>
          </div>

          {profile?.role === "admin" && profile.approved && (
            <div className="mt-6 flex flex-col gap-2 border-t border-border pt-6">
              <Link href="/admin/distributors" className="text-sm font-medium text-accent-strong hover:underline">
                Manage accounts →
              </Link>
              <Link href="/admin/pricing" className="text-sm font-medium text-accent-strong hover:underline">
                Manage pricing engine →
              </Link>
              <Link href="/admin/products" className="text-sm font-medium text-accent-strong hover:underline">
                Edit product pages →
              </Link>
            </div>
          )}

          <form action={signOutAction} className="mt-6 border-t border-border pt-6">
            <button type="submit" className="text-sm font-medium text-muted hover:text-accent-strong">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

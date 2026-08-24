"use client";

import Link from "next/link";
import { useSupabaseUser } from "@/lib/supabase/useSupabaseUser";
import { useTranslations } from "@/app/providers/LocaleProvider";

// Shared "who's signed in" indicator — shown in SiteHeader (every public
// page) and the configurator's own header, so account status is visible
// everywhere rather than only inside the configurator. Signed-in visitors
// see their email linking to /account. Signed-out visitors are routed to
// /contact rather than straight to /sign-in: self-serve sign-up only
// creates a pending account that still needs an admin to approve it (see
// /admin/distributors), so a prospective distributor is better served
// talking to sales first. Existing accounts can still sign in via the
// link on that Contact page.
export function AccountStatus() {
  const { user, loading } = useSupabaseUser();
  const t = useTranslations();

  if (loading) return <span className="h-9 w-24" />;

  if (user) {
    return (
      <Link
        href="/account"
        className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted hover:border-accent hover:text-accent-strong"
      >
        {user.email}
      </Link>
    );
  }

  return (
    <Link
      href="/contact"
      className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted hover:border-accent hover:text-accent-strong"
    >
      {t("nav.contactUs")}
    </Link>
  );
}

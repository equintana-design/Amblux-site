"use client";

import Link from "next/link";
import { useSupabaseUser } from "@/lib/supabase/useSupabaseUser";
import { useTranslations } from "@/app/providers/LocaleProvider";

// Shared "who's signed in" indicator — shown in SiteHeader (every public
// page) and the configurator's own header, so account status is visible
// everywhere rather than only inside the configurator. Signed-in visitors
// see their email linking to /account. Signed-out visitors see two
// distinct pills: "Contact us" for new prospects (self-serve sign-up only
// creates a pending account that still needs an admin to approve it — see
// /admin/distributors — so a prospective distributor is better served
// talking to sales first) and a clearly-marked "Sign in" for existing
// accounts (distributors, dealers, admins) to reach /sign-in directly from
// anywhere on the site, not just the configurator.
//
// `showContact` (default true) lets a caller that already renders its own
// standalone "Contact us" link elsewhere — see SiteHeader's 2026-09 reorder
// — suppress the one built in here, so the two don't both show up. The
// configurator's own header doesn't have a separate Contact us link, so it
// keeps the default (both pills together) unchanged.
export function AccountStatus({ showContact = true }: { showContact?: boolean } = {}) {
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
    <div className="flex items-center gap-2">
      {showContact ? (
        <Link
          href="/contact"
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted hover:border-accent hover:text-accent-strong"
        >
          {t("nav.contactUs")}
        </Link>
      ) : null}
      <Link
        href="/sign-in"
        className="rounded-full border border-accent px-4 py-2 text-sm font-semibold text-accent-strong hover:bg-accent hover:text-white"
      >
        {t("nav.signIn")}
      </Link>
    </div>
  );
}

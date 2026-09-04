"use client";

import Image from "next/image";
import Link from "next/link";
import { AccountStatus } from "@/app/components/AccountStatus";
import { useLocale, useTranslations } from "@/app/providers/LocaleProvider";
import { useTestProject } from "@/app/providers/TestProjectProvider";
import { LOCALES } from "@/lib/i18n/dictionaries";

// Shared header for public marketing pages (home, /products, /products/[slug]).
// Recreates the original ChatGPT-built site's `.site-header` structure
// (logo, EN/FR/ES language switcher, "Start a Project" CTA) recovered in
// index.html/styles.css. The switcher is now live — see LocaleProvider —
// rather than the inert placeholder it used to be.
//
// Reordered 2026-09 per the user's explicit spec: logo, Start a project,
// Distributor Partners, language switcher, sign-in, Contact us, Products,
// Parts List, Configurator. Two things changed along with the reorder:
//  - "Start a project" used to link to /#partners (a leftover from before
//    the /start fork existed) — fixed to point at /start, the actual
//    "how would you like to begin?" page.
//  - The running quick-project item-count badge/link, dropped from an
//    earlier version of this header, is back — as "Parts List," not
//    "Project," per the user's explicit follow-up: with a header nav that
//    also has "Configurator" right next to it, reusing the word "Project"
//    for this link read as confusing ("my project" vs. "my configurator").
//    "Parts List" describes what the page actually is (a running bill of
//    materials) without implying it's the same thing as a Configurator
//    project. Placed between Products and Configurator, matching where the
//    user asked for it — right after browsing products is exactly when you
//    need a way back to the list you're building.
// "Contact us" is rendered here as its own permanent link (not only for
// signed-out visitors) — AccountStatus is told showContact={false} so its
// own built-in "Contact us" pill (still used as-is on the configurator's
// separate header) doesn't duplicate this one.
export function SiteHeader() {
  const { count } = useTestProject();
  const { locale, setLocale } = useLocale();
  const t = useTranslations();

  return (
    <header className="border-b border-border bg-surface print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
        <Link href="/" aria-label={t("home.home")}>
          <Image src="/images/amblux-logo.png" alt="AMBLUX" width={140} height={40} priority className="h-9 w-auto" />
        </Link>
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <Link
            href="/start"
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
          >
            {t("home.start")}
          </Link>
          <Link href="/#partners" className="text-sm font-medium text-muted hover:text-foreground">
            {t("nav.distributors")}
          </Link>
          <div
            className="flex items-center overflow-hidden rounded-full border border-border text-xs font-semibold"
            role="group"
            aria-label="Language / Langue / Idioma"
          >
            {LOCALES.map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={locale === l}
                onClick={() => setLocale(l)}
                className={locale === l ? "bg-foreground px-2.5 py-1.5 text-white" : "px-2.5 py-1.5 text-muted hover:text-foreground"}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <AccountStatus showContact={false} />
          <Link href="/contact" className="text-sm font-medium text-muted hover:text-foreground">
            {t("nav.contactUs")}
          </Link>
          <Link href="/products" className="text-sm font-medium text-muted hover:text-foreground">
            {t("nav.products")}
          </Link>
          <Link
            href="/project"
            className="relative inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground"
          >
            {t("nav.partsList")}
            {count > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-semibold text-white">
                {count}
              </span>
            ) : null}
          </Link>
          <Link href="/configurator" className="text-sm font-medium text-muted hover:text-foreground">
            {t("nav.configurator")}
          </Link>
        </div>
      </div>
    </header>
  );
}

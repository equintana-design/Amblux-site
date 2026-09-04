"use client";

import Image from "next/image";
import Link from "next/link";
import { AccountStatus } from "@/app/components/AccountStatus";
import { useLocale, useTranslations } from "@/app/providers/LocaleProvider";
import { LOCALES } from "@/lib/i18n/dictionaries";

// Shared header for public marketing pages (home, /products, /products/[slug]).
// Recreates the original ChatGPT-built site's `.site-header` structure
// (logo, EN/FR/ES language switcher, "Start a Project" CTA) recovered in
// index.html/styles.css. The switcher is now live — see LocaleProvider —
// rather than the inert placeholder it used to be.
//
// Reordered 2026-09 per the user's explicit spec: logo, Start a project,
// Distributor Partners, language switcher, sign-in, Contact us, Products,
// Configurator. Two things changed along with the reorder:
//  - "Start a project" used to link to /#partners (a leftover from before
//    the /start fork existed) — fixed to point at /start, the actual
//    "how would you like to begin?" page.
//  - The "Project" badge/link (running quick-project item count) that used
//    to live in this header was dropped per the user's explicit choice —
//    it's still reachable from the homepage and the /start page.
// "Contact us" is rendered here as its own permanent link (not only for
// signed-out visitors) — AccountStatus is told showContact={false} so its
// own built-in "Contact us" pill (still used as-is on the configurator's
// separate header) doesn't duplicate this one.
export function SiteHeader() {
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
          <Link href="/configurator" className="text-sm font-medium text-muted hover:text-foreground">
            {t("nav.configurator")}
          </Link>
        </div>
      </div>
    </header>
  );
}

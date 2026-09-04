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
// Client component (not just for the language buttons) because it also
// shows the running "test project" item count — a small badge so the
// BOM someone's building on product pages is reachable from anywhere.
export function SiteHeader() {
  const { count } = useTestProject();
  const { locale, setLocale } = useLocale();
  const t = useTranslations();

  return (
    <header className="border-b border-border bg-surface print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" aria-label={t("home.home")}>
          <Image src="/images/amblux-logo.png" alt="AMBLUX" width={140} height={40} priority className="h-9 w-auto" />
        </Link>
        <div className="flex items-center gap-6">
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted sm:flex">
            <Link href="/products" className="hover:text-foreground">
              {t("nav.products")}
            </Link>
            <Link href="/#partners" className="hover:text-foreground">
              {t("nav.distributors")}
            </Link>
            <Link href="/configurator" className="hover:text-foreground">
              {t("nav.configurator")}
            </Link>
          </nav>
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
          <AccountStatus />
          <Link
            href="/project"
            className="relative inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted hover:border-accent hover:text-accent-strong"
          >
            {t("nav.testProject")}
            {count > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-semibold text-white">
                {count}
              </span>
            ) : null}
          </Link>
          <Link
            href="/#partners"
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
          >
            {t("home.start")}
          </Link>
        </div>
      </div>
    </header>
  );
}

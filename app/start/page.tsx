"use client";

import Link from "next/link";
import { SiteHeader } from "@/app/components/SiteHeader";
import { useTranslations } from "@/app/providers/LocaleProvider";

// The fork the user asked for, right at the top of "starting a project":
// "I know what I want" (pick SKUs directly — routes to /project) versus
// "Guide me" (the existing zone-by-zone wizard — routes to /configurator).
// Those two paths already existed as separate, disconnected features
// (a nav link vs. a homepage CTA); this page is the one new thing that
// actually joins them into a single entry point with a real choice.
//
// Deliberately does NOT include the "lightweight style question (cabinet
// color) → short recommended list" step floated alongside this request —
// that's real, separate design work (what recommends what, based on what
// data) the user asked to leave out of this batch.
//
// The homepage's two "start a project" CTAs (hero + footer) now land here
// instead of jumping straight to /configurator — the nav bar's own direct
// "Configurator" and "Project" links are untouched, since those are
// explicit destination links for someone who already knows which one they
// want, not the generic "start a project" entry point this fork replaces.
export default function StartPage() {
  const t = useTranslations();

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">{t("start.kicker")}</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">{t("start.title")}</h1>
        <p className="mt-3 max-w-xl text-muted">{t("start.intro")}</p>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Link
            href="/products"
            className="flex flex-col rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-accent"
          >
            <h2 className="text-lg font-semibold text-foreground">{t("start.knowTitle")}</h2>
            <p className="mt-2 flex-1 text-sm text-muted">{t("start.knowText")}</p>
            <span className="mt-4 text-sm font-semibold text-accent-strong">{t("start.knowCta")} →</span>
          </Link>

          <Link
            href="/configurator"
            className="flex flex-col rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-accent"
          >
            <h2 className="text-lg font-semibold text-foreground">{t("start.guideTitle")}</h2>
            <p className="mt-2 flex-1 text-sm text-muted">{t("start.guideText")}</p>
            <span className="mt-4 text-sm font-semibold text-accent-strong">{t("start.guideCta")} →</span>
          </Link>
        </div>
      </main>
    </div>
  );
}

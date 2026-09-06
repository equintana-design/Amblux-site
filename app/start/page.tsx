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
// Start flow -> Configurator application-type handoff: picking one of
// these before "Open the configurator" carries the choice straight into
// Project Info's Application field via a `?application=` query param (see
// ConfiguratorClient.tsx's initialConfiguratorState()) instead of landing
// on an unset Application that has to be chosen all over again. Reuses the
// Configurator's own already-translated application-name strings rather
// than adding a new set just for these four links.
const APPLICATION_LINKS: { value: string; labelKey: string }[] = [
  { value: "kitchen", labelKey: "configurator.applicationKitchen" },
  { value: "closets", labelKey: "configurator.applicationClosets" },
  { value: "bathroom", labelKey: "configurator.applicationBathroom" },
  { value: "furniture", labelKey: "configurator.applicationFurniture" },
];

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

          {/* A plain div, not a Link, wraps this card — it holds its own
              inner Link (the CTA) plus a row of per-application Links below,
              and nested <a> elements aren't valid HTML/DOM. */}
          <div className="flex flex-col rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-accent">
            <Link href="/configurator" className="flex flex-1 flex-col">
              <h2 className="text-lg font-semibold text-foreground">{t("start.guideTitle")}</h2>
              <p className="mt-2 flex-1 text-sm text-muted">{t("start.guideText")}</p>
              <span className="mt-4 text-sm font-semibold text-accent-strong">{t("start.guideCta")} →</span>
            </Link>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
              {APPLICATION_LINKS.map((app) => (
                <Link
                  key={app.value}
                  href={`/configurator?application=${app.value}`}
                  className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent-strong"
                >
                  {t(app.labelKey)}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "./components/SiteHeader";
import { useLocale, useTranslations } from "./providers/LocaleProvider";

// Mirrors the original ChatGPT-built site's landing page section-for-section
// (see ambluxlandingpagespec.md, extracted from the live DOM): hero with a
// floating "project service" card over the photo, a value-prop section, a
// dark "how it works" band, an applications grid, and a "go straight to the
// product" CTA into the /products catalog. Colors reuse this app's existing
// brand tokens (globals.css) rather than the spec's raw hex values — those
// tokens were themselves recovered from the same original site in an
// earlier pass, so they already match closely.
//
// Client component (for useTranslations()) — every string below comes from
// the `home` namespace of lib/i18n/dictionaries.ts, itself recovered
// verbatim from the original site's own compiled build (real English/
// French/Spanish for this whole page, not machine-translated).
const APPLICATION_IMAGES = ["/images/amblux-kitchen.png", "/images/amblux-closet.webp", "/images/amblux-linear.jpg"];

export default function Home() {
  const t = useTranslations();
  const { messages } = useLocale();
  const cardSteps = messages.home.cardSteps as [string, string][];
  const services = messages.home.services as [string, string][];
  const applications = messages.home.applications as [string, string][];
  const [processLine1, processLine2] = messages.home.processTitle.split("\n");

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      {/* Section 1 — Hero */}
      <section className="bg-background">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-16 px-6 py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">{t("home.eyebrow")}</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-foreground sm:text-5xl">{t("home.headline")}</h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-muted">{t("home.hero")}</p>
            <div className="mt-10 flex flex-wrap items-center gap-6">
              <Link
                href="/configurator"
                className="rounded-full bg-foreground px-7 py-3 text-base font-semibold text-white transition-colors hover:bg-foreground/90"
              >
                {t("home.startYours")} →
              </Link>
              <Link href="/products" className="text-base font-semibold text-accent-strong hover:underline">
                {t("home.explore")} →
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="relative h-[420px] w-full overflow-hidden rounded-2xl">
              <Image src="/images/amblux-kitchen.png" alt={t("home.imageAlt")} fill priority className="object-cover" />
            </div>

            <div className="absolute -bottom-10 left-4 w-[calc(100%-2rem)] rounded-2xl border border-border bg-surface p-6 shadow-xl sm:left-8 sm:w-96">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent-strong">{t("home.serviceKicker")}</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{t("home.cardTitle")}</p>
              <ol className="mt-4 space-y-3 text-sm">
                {cardSteps.map(([title, copy], i) => (
                  <li key={title}>
                    <p className="font-semibold text-foreground">
                      {i + 1}. {title}
                    </p>
                    <p className="text-muted">{copy}</p>
                  </li>
                ))}
              </ol>
              <Link
                href="/configurator"
                className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent-strong hover:text-white"
              >
                {t("home.begin")} →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 — Value prop */}
      <section className="bg-surface">
        <div className="mx-auto w-full max-w-6xl px-6 py-24 sm:py-28">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">{t("home.more")}</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold text-foreground sm:text-4xl">{t("home.partnerTitle")}</h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">{t("home.partnerText")}</p>
        </div>
      </section>

      {/* Section 3 — How it works */}
      <section className="bg-foreground text-white">
        <div className="mx-auto w-full max-w-6xl px-6 py-24 sm:py-28">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-soft">{t("home.help")}</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold sm:text-4xl">
            {processLine1}
            <br />
            {processLine2}
          </h2>
          <div className="mt-14 grid grid-cols-1 gap-10 sm:grid-cols-3">
            {services.map(([title, copy], i) => (
              <div key={title}>
                <p className="text-sm font-semibold text-accent-soft">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/70">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4 — Applications */}
      <section className="bg-surface">
        <div className="mx-auto w-full max-w-6xl px-6 py-24 sm:py-28">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">{t("home.byApplication")}</p>
              <h2 className="mt-3 text-3xl font-semibold text-foreground sm:text-4xl">{t("home.lightingWhat")}</h2>
            </div>
            <Link href="/products" className="text-sm font-semibold text-accent-strong hover:underline">
              {t("home.allApplications")} →
            </Link>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {applications.map(([title, copy], i) => (
              <Link
                key={title}
                href="/configurator"
                className="group overflow-hidden rounded-2xl border border-border bg-background transition-colors hover:border-accent"
              >
                <div className="relative h-56 w-full">
                  <Image src={APPLICATION_IMAGES[i]} alt={title} fill className="object-cover" />
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-foreground group-hover:text-accent-strong">{title} →</h3>
                  <p className="mt-2 text-sm text-muted">{copy}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5 — Direct to product */}
      <section className="bg-background">
        <div className="mx-auto w-full max-w-6xl px-6 py-24 sm:py-28">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">{t("home.know")}</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold text-foreground sm:text-4xl">{t("home.direct")}</h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-muted">{t("home.directText")}</p>
          <Link
            href="/products"
            className="mt-8 inline-flex items-center gap-1.5 rounded-full bg-foreground px-7 py-3 text-base font-semibold text-white transition-colors hover:bg-foreground/90"
          >
            {t("home.browse")} →
          </Link>
        </div>
      </section>

      <section id="partners" className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-2xl font-semibold text-foreground">{t("misc.partnersTitle")}</h2>
          <p className="mt-3 max-w-2xl text-muted">{t("misc.partnersText")}</p>
        </div>
      </section>

      <footer className="mt-auto border-t border-border bg-surface py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-6 text-center">
          <Image src="/images/amblux-logo.png" alt="AMBLUX" width={120} height={34} className="h-8 w-auto" />
          <p className="text-sm text-muted">{t("home.footer")}</p>
          <Link href="/configurator" className="text-sm font-semibold text-accent-strong hover:underline">
            {t("home.start")} →
          </Link>
          <p className="mt-4 text-xs text-muted">© {new Date().getFullYear()} AMBLUX. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

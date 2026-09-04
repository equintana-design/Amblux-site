"use client";

import Image from "next/image";
import { useState } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import { useTestProject } from "@/app/providers/TestProjectProvider";
import { useLocale, useTranslations } from "@/app/providers/LocaleProvider";
import { localize } from "@/lib/i18n/localize";
import { ProductPricing } from "./ProductPricing";
import { findVariantForAxisValues, useVariant } from "./VariantState";

type ProductPage = Tables<"amblux_product_pages">;

function axisValues(variants: ReturnType<typeof useVariant>["variants"], key: string) {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const v of variants) {
    const options = (v.variant_options ?? {}) as Record<string, string>;
    const value = options[key];
    if (value && !seen.has(value)) {
      seen.add(value);
      values.push(value);
    }
  }
  return values;
}

export function ProductHero({ page }: { page: ProductPage }) {
  const { variants, axes, selected, selectedSku, setSelectedSku } = useVariant();
  const { addItem } = useTestProject();
  const [justAdded, setJustAdded] = useState(false);
  const t = useTranslations();
  const { locale } = useLocale();
  const currentOptions = (selected.variant_options ?? {}) as Record<string, string>;
  const variantImage = selected.image_url ?? page.hero_image_url;
  // Up to 2 additional page-level photos (migration: product_gallery_and_
  // documents) shown as a thumbnail strip alongside whichever image the
  // selected SKU variant shows. Clicking a thumbnail previews it in the
  // main frame; switching variants resets back to that variant's own
  // photo rather than leaving a stale gallery pick showing.
  const galleryImages = (page.gallery_image_urls ?? []) as string[];
  const [activeImage, setActiveImage] = useState<string | null>(null);
  // Reset the gallery pick back to the variant's own photo when the
  // selected SKU changes, without a useEffect — adjusting state during
  // render (comparing against the last-seen selectedSku) avoids the
  // extra render pass an effect-based reset would cause.
  const [prevSelectedSku, setPrevSelectedSku] = useState(selectedSku);
  if (prevSelectedSku !== selectedSku) {
    setPrevSelectedSku(selectedSku);
    setActiveImage(null);
  }
  const heroImage = activeImage ?? variantImage;
  const thumbnails = [variantImage, ...galleryImages].filter((url): url is string => Boolean(url));

  const name = localize(page.name, page.translations, locale, "name");
  const eyebrow = localize(page.eyebrow, page.translations, locale, "eyebrow");
  const heroSummary = localize(page.hero_summary, page.translations, locale, "hero_summary");
  const applications = localize((page.applications ?? []) as string[], page.translations, locale, "applications");

  // Wireless Sensor Switches and Wireless Dimming — Kinetic RF & Bluetooth
  // App each ship a receiver variant (variant_options.role === "receiver")
  // alongside their switch/remote variants on the same page. Until 2026-09
  // this page pulled the receiver out of the selectable button group
  // entirely and force-added it to the project alongside whatever switch
  // was picked (see migration 0017) — modeling the real requirement that a
  // wireless/Kinetic switch needs its own receiver, the same pairing the
  // Configurator's engine still always applies for a complete zone spec.
  // But on this page — the no-account, pick-exact-SKUs "Project" flow — the
  // user explicitly asked to be able to add just one of the two: ordering a
  // single replacement receiver, or a single replacement switch, without
  // the other one tagging along and inflating the count. So the receiver is
  // now a normal, independently selectable variant like every other option
  // on this axis (it already had its own `type: "Receiver"` value here),
  // and "Add to project" adds only whichever one variant is currently
  // selected — same as every other product page. `receiverVariant` is kept
  // only to power the informational reminder below, not to change what
  // gets added.
  const receiverVariant = variants.find((v) => (v.variant_options as Record<string, string> | null)?.role === "receiver");
  const isReceiverSelected = receiverVariant?.sku === selected.sku;

  function pickAxisValue(axisKey: string, value: string) {
    const nextValues = { ...currentOptions, [axisKey]: value };
    const exact = findVariantForAxisValues(variants, axes, nextValues);
    if (exact) {
      setSelectedSku(exact.sku);
      return;
    }
    // No exact combo (e.g. a length only offered at one colour temperature) —
    // fall back to the first variant that at least matches the axis just
    // clicked, so the click always does something rather than going dead.
    const fallback = variants.find((v) => (v.variant_options as Record<string, string> | null)?.[axisKey] === value);
    if (fallback) setSelectedSku(fallback.sku);
  }

  function handleAddToProject() {
    addItem({ sku: selected.sku, label: selected.label, pageSlug: page.slug, imageUrl: heroImage ?? null });
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1800);
  }

  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }

  function handleShare() {
    const subject = encodeURIComponent(t("product.emailSubject"));
    const lines = [
      `${t("product.emailIntro")} ${name}.`,
      "",
      `${t("product.emailVariant")}: ${selectedSku}`,
      "",
      t("product.emailAttach"),
    ];
    const body = encodeURIComponent(lines.join("\n"));
    if (typeof window !== "undefined") window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  return (
    <section className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-12 px-6 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20 lg:py-20 print:grid-cols-2 print:gap-10 print:py-8">
      <div>
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-background">
          {heroImage ? (
            <Image
              src={heroImage}
              alt={name}
              fill
              className="object-contain p-10"
              sizes="(min-width: 1024px) 45vw, 100vw"
            />
          ) : null}
        </div>
        {thumbnails.length > 1 ? (
          <div className="mt-3 flex gap-3 print:hidden">
            {thumbnails.map((url, i) => (
              <button
                key={`${url}-${i}`}
                type="button"
                onClick={() => setActiveImage(url === variantImage ? null : url)}
                aria-label={`${t("product.viewImage")} ${i + 1}`}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-background transition-colors ${
                  heroImage === url ? "border-accent-strong" : "border-border hover:border-accent"
                }`}
              >
                <Image src={url} alt="" fill className="object-contain p-1.5" sizes="64px" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight text-foreground sm:text-4xl">{name}</h1>
        <code className="mt-3 block break-all text-xs text-muted">{selectedSku}</code>
        {heroSummary ? <p className="mt-4 text-base leading-7 text-muted">{heroSummary}</p> : null}

        <div className="print:hidden">
          <ProductPricing />
        </div>

        {axes.length > 0 ? (
          <div className="mt-6 rounded-2xl border border-border bg-background p-5 print:rounded-none print:border-0 print:bg-transparent print:p-0">
            <div className="print:hidden">
              <p className="text-sm font-semibold text-foreground">{t("product.configure")}</p>
              <div className="mt-4 space-y-4">
                {axes.map((axis) => (
                  <div key={axis.key} className="grid grid-cols-[minmax(0,110px)_1fr] items-center gap-3">
                    <span className="text-sm text-muted">{axis.label}</span>
                    <div className="flex flex-wrap gap-2">
                      {axisValues(variants, axis.key).map((value) => {
                        const active = currentOptions[axis.key] === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={active}
                            onClick={() => pickAxisValue(axis.key, value)}
                            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                              active
                                ? "border-foreground bg-foreground text-white"
                                : "border-border bg-surface text-muted hover:border-accent hover:text-accent-strong"
                            }`}
                          >
                            {value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-4 flex flex-wrap items-baseline justify-between gap-2 border-t border-border pt-4 text-sm print:mt-0 print:border-0 print:pt-0">
              <span className="text-muted">{t("product.selected")}</span>
              <code className="break-all font-medium text-foreground">{selectedSku}</code>
            </p>
            <p className="mt-2 text-xs text-muted">
              {/* A wireless/Kinetic switch still genuinely needs its own
                  receiver to work — this is just a reminder, not a forced
                  add. Only shown while a switch (not the receiver itself)
                  is selected, and only adds it to the project if the
                  customer clicks "Receiver" above and adds it themselves. */}
              {receiverVariant && !isReceiverSelected ? t("wireless.receiverNote") : t("product.availability")}
            </p>
          </div>
        ) : null}

        {applications.length > 0 ? (
          <div className="mt-6">
            <p className="text-sm font-semibold text-foreground">{t("product.applications")}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {applications.map((item) => (
                <li
                  key={item}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted"
                >
                  <span aria-hidden="true" className="text-accent-strong">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleAddToProject}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent-soft px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent-strong hover:text-white print:hidden"
        >
          {justAdded ? (
            <>
              {t("product.added")} <span aria-hidden="true">✓</span>
            </>
          ) : (
            <>
              {t("product.add")} <span aria-hidden="true">+</span>
            </>
          )}
        </button>

        <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium text-accent-strong print:hidden">
          <button type="button" onClick={handlePrint} className="inline-flex items-center gap-1.5 hover:underline">
            <span aria-hidden="true">↓</span> {t("product.savePdf")}
          </button>
          <button type="button" onClick={handleShare} className="inline-flex items-center gap-1.5 hover:underline">
            <span aria-hidden="true">↗</span> {t("product.emailSheet")}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted print:hidden">{t("product.pdfHint")}</p>
        <p className="mt-6 text-xs text-muted print:hidden">{t("product.source")}</p>
      </div>
    </section>
  );
}

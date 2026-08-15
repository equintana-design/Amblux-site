"use client";

import Image from "next/image";
import { useState } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import { useTestProject } from "@/app/providers/TestProjectProvider";
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
  const currentOptions = (selected.variant_options ?? {}) as Record<string, string>;
  const heroImage = selected.image_url ?? page.hero_image_url;

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
    const subject = encodeURIComponent(`AMBLUX product: ${page.name}`);
    const body = encodeURIComponent(
      `${page.name}\nPart number: ${selectedSku}\n\nSee the full spec sheet: ${typeof window !== "undefined" ? window.location.href : ""}`,
    );
    if (typeof window !== "undefined") window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  return (
    <section className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-12 px-6 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20 lg:py-20 print:grid-cols-2 print:gap-10 print:py-8">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-background">
        {heroImage ? (
          <Image
            src={heroImage}
            alt={page.name}
            fill
            className="object-contain p-10"
            sizes="(min-width: 1024px) 45vw, 100vw"
          />
        ) : null}
      </div>

      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">{page.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight text-foreground sm:text-4xl">{page.name}</h1>
        <code className="mt-3 block break-all text-xs text-muted">{selectedSku}</code>
        {page.hero_summary ? <p className="mt-4 text-base leading-7 text-muted">{page.hero_summary}</p> : null}

        {axes.length > 0 ? (
          <div className="mt-6 rounded-2xl border border-border bg-background p-5 print:rounded-none print:border-0 print:bg-transparent print:p-0">
            <div className="print:hidden">
              <p className="text-sm font-semibold text-foreground">Configure this model</p>
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
              <span className="text-muted">Selected part number</span>
              <code className="break-all font-medium text-foreground">{selectedSku}</code>
            </p>
            <p className="mt-2 text-xs text-muted">Only combinations available in the AMBLUX sales sheet can be selected.</p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleAddToProject}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent-soft px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent-strong hover:text-white print:hidden"
        >
          {justAdded ? (
            <>
              Added to test project <span aria-hidden="true">✓</span>
            </>
          ) : (
            <>
              Add to test project <span aria-hidden="true">+</span>
            </>
          )}
        </button>

        <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium text-accent-strong print:hidden">
          <button type="button" onClick={handlePrint} className="inline-flex items-center gap-1.5 hover:underline">
            <span aria-hidden="true">↓</span> Download product PDF
          </button>
          <button type="button" onClick={handleShare} className="inline-flex items-center gap-1.5 hover:underline">
            <span aria-hidden="true">↗</span> Share by email
          </button>
        </div>
        <p className="mt-2 text-xs text-muted print:hidden">Save the branded product sheet as a PDF, then attach it to the prepared email.</p>
        <p className="mt-6 text-xs text-muted print:hidden">
          Product information and image sourced from the AMBLUX master product database and model folder.
        </p>
      </div>
    </section>
  );
}

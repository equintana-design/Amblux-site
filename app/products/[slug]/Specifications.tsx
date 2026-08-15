"use client";

import { useLocale, useTranslations } from "@/app/providers/LocaleProvider";
import { localize } from "@/lib/i18n/localize";
import { useVariant } from "./VariantState";

export function Specifications() {
  const { selected, selectedSku } = useVariant();
  const { locale } = useLocale();
  const t = useTranslations();
  const spec = localize(
    (selected.spec ?? []) as { label: string; value: string }[],
    selected.translations,
    locale,
    "spec",
  );
  if (spec.length === 0) return null;

  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 print:py-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">{t("product.specs")}</p>
        <h2 className="mt-2 break-all text-xl font-semibold text-foreground">{selectedSku}</h2>
        <dl className="mt-8 grid grid-cols-1 gap-x-10 md:grid-cols-2">
          {spec.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-4 border-b border-border py-3">
              <dt className="text-sm text-muted">{row.label}</dt>
              <dd className="text-right text-sm font-medium text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

"use client";

import type { Tables } from "@/lib/supabase/database.types";
import { useLocale, useTranslations } from "@/app/providers/LocaleProvider";
import { localize } from "@/lib/i18n/localize";

export function BenefitGrid({ page }: { page: Tables<"amblux_product_pages"> }) {
  const { locale } = useLocale();
  const t = useTranslations();
  const features = localize((page.features ?? []) as string[], page.translations, locale, "features");
  if (features.length === 0) return null;

  return (
    <section className="border-t border-border bg-surface">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 print:py-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">{t("product.features")}</p>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <article key={i} className="rounded-2xl border border-border p-6">
              <span className="text-sm font-semibold text-accent-soft">{String(i + 1).padStart(2, "0")}</span>
              <p className="mt-3 text-base leading-6 text-foreground">{feature}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

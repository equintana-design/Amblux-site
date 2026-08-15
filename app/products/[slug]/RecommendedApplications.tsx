"use client";

import type { Tables } from "@/lib/supabase/database.types";
import { useLocale, useTranslations } from "@/app/providers/LocaleProvider";
import { localize } from "@/lib/i18n/localize";

export function RecommendedApplications({ page }: { page: Tables<"amblux_product_pages"> }) {
  const { locale } = useLocale();
  const t = useTranslations();
  const applications = localize((page.applications ?? []) as string[], page.translations, locale, "applications");
  if (applications.length === 0) return null;

  return (
    <section className="bg-foreground text-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 print:py-10">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-soft">{t("product.applications")}</p>
          <h2 className="mt-2 text-2xl font-semibold">{t("product.applications")}</h2>
          <p className="mt-3 text-white/70">{t("product.applicationsIntro")}</p>
        </div>
        <ul className="mt-10 grid grid-cols-1 gap-x-12 gap-y-4 md:grid-cols-2">
          {applications.map((item) => (
            <li key={item} className="flex items-center gap-3 border-b border-white/10 pb-4 text-white/90">
              <span aria-hidden="true" className="text-accent-soft">
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

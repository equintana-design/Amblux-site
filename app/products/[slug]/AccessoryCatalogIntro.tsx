"use client";

import type { Tables } from "@/lib/supabase/database.types";
import { useLocale } from "@/app/providers/LocaleProvider";
import { localize } from "@/lib/i18n/localize";

// Intro chrome for the /products/accessories grouped-catalog page (the one
// product page that isn't a hero+configurator template — see page.tsx). A
// small client component so it can localize name/eyebrow/hero_summary/
// marketing_paragraphs the same way every other product page section does.
export function AccessoryCatalogIntro({ page }: { page: Tables<"amblux_product_pages"> }) {
  const { locale } = useLocale();
  const eyebrow = localize(page.eyebrow, page.translations, locale, "eyebrow");
  const name = localize(page.name, page.translations, locale, "name");
  const heroSummary = localize(page.hero_summary, page.translations, locale, "hero_summary");
  const paragraphs = localize((page.marketing_paragraphs ?? []) as string[], page.translations, locale, "marketing_paragraphs");

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-14">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-semibold leading-tight text-foreground sm:text-4xl">{name}</h1>
      {heroSummary ? <p className="mt-4 max-w-2xl text-base leading-7 text-muted">{heroSummary}</p> : null}
      {paragraphs.map((paragraph, i) => (
        <p key={i} className="mt-4 max-w-3xl text-base leading-7 text-muted">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

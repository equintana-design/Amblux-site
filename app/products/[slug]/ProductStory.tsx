"use client";

import type { Tables } from "@/lib/supabase/database.types";
import { useLocale } from "@/app/providers/LocaleProvider";
import { localize } from "@/lib/i18n/localize";

export function ProductStory({ page }: { page: Tables<"amblux_product_pages"> }) {
  const { locale } = useLocale();
  const name = localize(page.name, page.translations, locale, "name");
  const eyebrow = localize(page.eyebrow, page.translations, locale, "eyebrow");
  const paragraphs = localize((page.marketing_paragraphs ?? []) as string[], page.translations, locale, "marketing_paragraphs");
  if (paragraphs.length === 0) return null;

  return (
    <section className="border-t border-border bg-surface">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-6 py-20 lg:grid-cols-[0.7fr_1.5fr] lg:gap-16 print:py-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold text-foreground">{name}</h2>
        </div>
        <div className="space-y-5 text-base leading-7 text-muted">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
    </section>
  );
}

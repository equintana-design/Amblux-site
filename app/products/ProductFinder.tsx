"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "@/app/providers/LocaleProvider";
import { useTestProject } from "@/app/providers/TestProjectProvider";
import { localize } from "@/lib/i18n/localize";
import { TestProjectSidebar } from "./TestProjectSidebar";

export const CATEGORY_ORDER = ["silicone-linear", "rigid-linear", "puck", "driver", "control", "accessory"] as const;

type ProductPageRow = {
  slug: string;
  category: string;
  eyebrow: string;
  name: string;
  hero_summary: string | null;
  hero_image_url: string | null;
  default_sku: string | null;
  translations?: unknown;
};

// Search box + category filter pills + a live-filtering grid, matching the
// original site's "Find a component for your project" section
// (ambluxlandingpagespec.md section 6) — plus the sticky "Your test
// project" sidebar cart next to it. The intro heading + all static chrome
// here comes from the `home` namespace (real recovered EN/FR/ES); each
// card's own name/eyebrow/summary is DB content localized via the
// `translations` jsonb column (falls back to English until translated).
export function ProductFinder({ pages }: { pages: ProductPageRow[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const { addItem } = useTestProject();
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const t = useTranslations();
  const { locale } = useLocale();

  const localizedPages = useMemo(
    () =>
      pages.map((page) => ({
        ...page,
        name: localize(page.name, page.translations, locale, "name"),
        eyebrow: localize(page.eyebrow, page.translations, locale, "eyebrow"),
        hero_summary: localize(page.hero_summary, page.translations, locale, "hero_summary"),
      })),
    [pages, locale],
  );

  const availableCategories = useMemo(
    () => CATEGORY_ORDER.filter((c) => pages.some((p) => p.category === c)),
    [pages],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return localizedPages.filter((page) => {
      const matchesCategory = category === "all" || page.category === category;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        page.name.toLowerCase().includes(q) ||
        page.eyebrow.toLowerCase().includes(q) ||
        (page.default_sku ?? "").toLowerCase().includes(q)
      );
    });
  }, [localizedPages, query, category]);

  function handleAdd(page: (typeof localizedPages)[number]) {
    if (!page.default_sku) return;
    addItem({ sku: page.default_sku, label: page.name, pageSlug: page.slug, imageUrl: page.hero_image_url });
    setJustAdded(page.slug);
    window.setTimeout(() => setJustAdded((current) => (current === page.slug ? null : current)), 1800);
  }

  return (
    <>
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">{t("home.finder")}</p>
      <h1 className="mt-2 text-3xl font-semibold text-foreground sm:text-4xl">{t("home.finderTitle")}</h1>
      <p className="mt-4 max-w-2xl text-muted">{t("home.finderText")}</p>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("home.search")}
              className="w-full rounded-full border border-border bg-surface px-5 py-3 text-sm text-foreground placeholder:text-muted sm:max-w-sm"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory("all")}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                category === "all"
                  ? "border-foreground bg-foreground text-white"
                  : "border-border bg-surface text-muted hover:border-accent hover:text-accent-strong"
              }`}
            >
              {t("home.all")}
            </button>
            {availableCategories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  category === c
                    ? "border-foreground bg-foreground text-white"
                    : "border-border bg-surface text-muted hover:border-accent hover:text-accent-strong"
                }`}
              >
                {t(`categories.${c}`)}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="mt-10 text-sm text-muted">{t("home.noResults")}</p>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {filtered.map((page) => (
                <div key={page.slug} className="overflow-hidden rounded-2xl border border-border bg-surface">
                  <Link href={`/products/${page.slug}`} className="group block">
                    <div className="relative h-48 w-full bg-background">
                      {page.hero_image_url ? (
                        <Image
                          src={page.hero_image_url}
                          alt={page.name}
                          fill
                          className="object-contain p-6"
                          sizes="(min-width: 1024px) 33vw, 100vw"
                        />
                      ) : null}
                    </div>
                    <div className="p-5 pb-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent-strong">{page.eyebrow}</p>
                      <h3 className="mt-2 font-semibold text-foreground group-hover:text-accent-strong">{page.name}</h3>
                      {page.default_sku ? <code className="mt-1 block break-all text-xs text-muted">{page.default_sku}</code> : null}
                      {page.hero_summary ? <p className="mt-2 text-sm text-muted line-clamp-2">{page.hero_summary}</p> : null}
                    </div>
                  </Link>
                  <div className="flex items-center justify-between gap-3 p-5 pt-4">
                    <Link href={`/products/${page.slug}`} className="text-sm font-semibold text-accent-strong hover:underline">
                      {t("home.view")} →
                    </Link>
                    {page.default_sku ? (
                      <button
                        type="button"
                        onClick={() => handleAdd(page)}
                        className="shrink-0 rounded-full border border-accent-soft px-3 py-1.5 text-xs font-semibold text-accent-strong hover:bg-accent-soft/20"
                      >
                        {justAdded === page.slug ? `${t("home.added")} ✓` : t("home.add")}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <TestProjectSidebar />
      </div>
    </>
  );
}

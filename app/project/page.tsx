"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/app/components/SiteHeader";
import { useTranslations } from "@/app/providers/LocaleProvider";
import { useTestProject } from "@/app/providers/TestProjectProvider";
import { PricingPanel } from "@/app/configurator/PricingPanel";
import { bomFromQuickProject } from "@/lib/configurator/quickProject";
import { SavedQuickProjectsPanel } from "./SavedQuickProjectsPanel";
import type { TestProjectItem } from "@/app/providers/TestProjectProvider";

// The no-account, no-configurator path to a BOM: everything added via
// "Add to project" on a product page lands here. Not connected to the
// Configurator's zone-based engine — it's just a running parts list
// someone can print or read off, for a distributor who already knows what
// they want and would rather pick SKUs directly than model a room.
//
// Renamed from "Test Project" to plain "Project" 2026-09 (the old name
// read like a leftover QA page, not a real feature) — the internal
// `testProject.*`/`TestProject*` symbol and translation-key names were
// deliberately left as-is to keep this a pure copy/route change; only
// what's displayed changed. The old `/test-project` URL now redirects
// here (see next.config.ts).
//
// Also as of 2026-09: a signed-in account can save this to their account
// (SavedQuickProjectsPanel below — same save/reload/delete/12-month
// retention system as the Configurator's own saved projects, see
// migration 0032), and see real pricing plus the Manufacturer/Dealer
// job-cost estimate via the same PricingPanel the Configurator uses,
// fed a synthesized one-zone BOM (see lib/configurator/quickProject.ts)
// instead of the Configurator's real per-zone BOM. Building the list
// itself still needs no account at all — signing in only unlocks saving
// it and seeing pricing, matching how the rest of the site gates pricing.
//
// This whole page is new in this port (the original site only had a
// sidebar, not a dedicated BOM page), so its `testProject.*` strings have
// no recovered original translation — fr/es are placeholders pending real
// copy (see lib/i18n/dictionaries.ts's header note).
export default function TestProjectPage() {
  const { items, name, setName, removeItem, setQty, clear, replaceAll } = useTestProject();
  const t = useTranslations();
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const bom = useMemo(() => bomFromQuickProject({ name, items }), [name, items]);

  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }

  function handleClear() {
    clear();
    setQuoteId(null);
  }

  function handleSaved(id: string) {
    setQuoteId(id);
  }

  function handleLoad(id: string, loadedName: string, loadedItems: TestProjectItem[]) {
    setQuoteId(id);
    replaceAll(loadedName, loadedItems);
  }

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl px-6 py-16">
        <div className="print:hidden">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">{t("testProject.kicker")}</p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">{t("testProject.title")}</h1>
          <p className="mt-3 max-w-xl text-muted">{t("testProject.intro")}</p>
          <label className="mt-6 flex max-w-sm flex-col gap-1.5 text-sm">
            <span className="font-medium text-muted">{t("configurator.projectName")}</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </label>
        </div>
        <div className="hidden print:block">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-foreground">{t("misc.printMasthead")}</p>
          <h1 className="mt-3 text-2xl font-semibold text-foreground">
            {name.trim() ? name : `${t("testProject.kicker")} — ${t("testProject.title")}`}
          </h1>
          <hr className="mt-3 border-border" />
        </div>

        <div className="mt-6 print:hidden">
          <SavedQuickProjectsPanel name={name} items={items} quoteId={quoteId} onSaved={handleSaved} onLoad={handleLoad} />
        </div>

        {items.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-border bg-surface p-10 text-center print:hidden">
            <p className="text-foreground">{t("testProject.emptyTitle")}</p>
            <p className="mt-2 text-sm text-muted">
              {t("testProject.emptyBrowse")}{" "}
              <Link href="/products" className="font-medium text-accent-strong hover:underline">
                {t("testProject.emptyCatalog")}
              </Link>{" "}
              {t("testProject.emptyEnd")}
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-surface print:rounded-none print:border-0 print:divide-y-0">
              {items.map((item) => (
                <div key={item.sku} className="flex items-center gap-4 p-4 print:border-b print:border-border print:py-3">
                  <div className="relative hidden h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-background sm:block print:block">
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.label} fill className="object-contain p-2" sizes="64px" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    {item.pageSlug ? (
                      <Link href={`/products/${item.pageSlug}`} className="font-medium text-foreground hover:text-accent-strong print:text-foreground">
                        {item.label}
                      </Link>
                    ) : (
                      <p className="font-medium text-foreground">{item.label}</p>
                    )}
                    <code className="mt-1 block break-all text-xs text-muted">{item.sku}</code>
                  </div>
                  <div className="flex items-center gap-2 print:gap-1">
                    <label className="sr-only" htmlFor={`qty-${item.sku}`}>
                      {t("testProject.quantity")}
                    </label>
                    <input
                      id={`qty-${item.sku}`}
                      type="number"
                      min={1}
                      value={item.qty}
                      onChange={(e) => setQty(item.sku, Number(e.target.value) || 0)}
                      className="w-16 rounded-lg border border-border bg-background px-2 py-1.5 text-center text-sm print:border-0 print:bg-transparent print:font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(item.sku)}
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted hover:border-accent hover:text-accent-strong print:hidden"
                    >
                      {t("testProject.remove")}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
              <button type="button" onClick={handleClear} className="text-sm font-medium text-muted hover:text-accent-strong">
                {t("testProject.clearProject")}
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="rounded-full border border-accent-soft px-5 py-2.5 text-sm font-semibold text-accent-strong hover:bg-accent-soft/20"
                >
                  {t("testProject.printSave")}
                </button>
                <Link
                  href="/products"
                  className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-strong"
                >
                  {t("testProject.addMore")}
                </Link>
              </div>
            </div>

            <div className="mt-6 print:hidden">
              <PricingPanel bom={bom} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

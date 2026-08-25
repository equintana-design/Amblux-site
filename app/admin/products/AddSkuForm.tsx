"use client";

import { useMemo, useState } from "react";

type Axis = { key: string; label: string };
type ProductPage = { slug: string; name: string; category: string; variant_axes: Axis[]; skuCount: number };

type Props = {
  action: (formData: FormData) => void;
  pages: ProductPage[];
  productCategories: string[];
  pageCategories: string[];
  sampleCategoryByPage: Record<string, string>;
};

const inputClass =
  "rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

// Adds a brand-new SKU. Two modes, chosen up front: most of the time
// that's another size/colour/wattage option on a product page that
// already exists (e.g. a new length for silicone-6x6) — pick the page
// and this shows exactly the variant fields that page's picker needs.
// The other mode is for something with no home yet at all — a new
// accessory or an entirely new product line — which creates its product
// page and this first SKU together, including which category it's filed
// under both for pricing (Category & SKU overrides) and for where it
// groups on the public site and in this admin list.
export function AddSkuForm({ action, pages, productCategories, pageCategories, sampleCategoryByPage }: Props) {
  const [mode, setMode] = useState<"existing" | "new">(pages.length > 0 ? "existing" : "new");
  const [existingPageSlug, setExistingPageSlug] = useState(pages[0]?.slug ?? "");
  const [productCategory, setProductCategory] = useState(sampleCategoryByPage[pages[0]?.slug ?? ""] ?? "");
  const [newHasVariants, setNewHasVariants] = useState(false);
  const [newAxisKeys, setNewAxisKeys] = useState<string[]>(["", "", ""]);

  const selectedPage = useMemo(() => pages.find((p) => p.slug === existingPageSlug), [pages, existingPageSlug]);
  const existingAxes = selectedPage?.variant_axes ?? [];

  function pickExistingPage(slug: string) {
    setExistingPageSlug(slug);
    // A category typed for a previous page shouldn't silently carry over
    // to a different one — re-suggest from this page's own SKUs (or clear
    // it if this is the first SKU on a page with none yet).
    setProductCategory(sampleCategoryByPage[slug] ?? "");
  }

  return (
    <form action={action} className="mt-8 flex flex-col gap-6" encType="multipart/form-data">
      <input type="hidden" name="mode" value={mode} />

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-muted">This SKU is</span>
        <div className="flex flex-wrap gap-3">
          <label className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm ${mode === "existing" ? "border-accent-strong bg-accent-soft/40" : "border-border"}`}>
            <input
              type="radio"
              name="modeRadio"
              checked={mode === "existing"}
              disabled={pages.length === 0}
              onChange={() => setMode("existing")}
            />
            Another option on an existing product
          </label>
          <label className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm ${mode === "new" ? "border-accent-strong bg-accent-soft/40" : "border-border"}`}>
            <input type="radio" name="modeRadio" checked={mode === "new"} onChange={() => setMode("new")} />
            A brand-new product (no page yet)
          </label>
        </div>
      </div>

      {mode === "existing" ? (
        <div className="flex flex-col gap-4 rounded-xl border border-border p-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-muted">Product page</span>
            <select
              name="existingPageSlug"
              value={existingPageSlug}
              onChange={(e) => pickExistingPage(e.target.value)}
              className={inputClass}
            >
              {pages.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name} — /products/{p.slug}
                </option>
              ))}
            </select>
          </label>
          <input type="hidden" name="existingPageAxisKeys" value={JSON.stringify(existingAxes.map((a) => a.key))} />

          {existingAxes.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {existingAxes.map((axis) => (
                <label key={axis.key} className="flex flex-col gap-1 text-xs text-muted">
                  {axis.label}
                  <input
                    name={`axisValue_${axis.key}`}
                    required
                    placeholder="e.g. 3000K"
                    className={inputClass}
                  />
                </label>
              ))}
            </div>
          ) : (selectedPage?.skuCount ?? 0) > 0 ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              This page has no variant picker, so its one existing SKU is always what shows — adding a second SKU
              here would just sit hidden and unreachable on the site. If this is really a different product, use
              &quot;A brand-new product&quot; instead so it gets its own page.
            </p>
          ) : (
            <p className="text-xs text-muted">
              This page doesn&apos;t have variant options — it&apos;ll just show whichever SKU you add here (same
              as any accessory page).
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4 rounded-xl border border-border p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-muted">Product name</span>
              <input name="newPageName" required placeholder="e.g. Corner bracket — 2-pack" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-muted">Page URL (/products/…)</span>
              <input name="newPageSlug" required placeholder="e.g. corner-bracket-2pk" className={inputClass} />
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-muted">Category (where this shows up on the site)</span>
            <input name="newPageCategory" required list="page-categories" placeholder="e.g. accessory" className={inputClass} />
            <datalist id="page-categories">
              {pageCategories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-muted">Eyebrow (optional — defaults to the product name)</span>
            <input name="newPageEyebrow" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-muted">Hero summary (optional, one sentence)</span>
            <textarea name="newPageHeroSummary" rows={2} className={inputClass} />
          </label>

          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={newHasVariants} onChange={(e) => setNewHasVariants(e.target.checked)} />
            This product will have multiple SKU options (e.g. different lengths or colours)
          </label>

          {newHasVariants ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-muted">
                Define up to 3 option types, and this first SKU&apos;s value for each. You can add more SKUs for
                other values later the same way (pick this page under &quot;Another option on an existing
                product&quot;).
              </p>
              {[0, 1, 2].map((i) => (
                <div key={i} className="grid grid-cols-3 gap-2">
                  <input
                    name={`axisKey${i}`}
                    placeholder="key, e.g. length"
                    value={newAxisKeys[i]}
                    onChange={(e) => {
                      const next = [...newAxisKeys];
                      next[i] = e.target.value.trim();
                      setNewAxisKeys(next);
                    }}
                    className={`${inputClass} text-xs`}
                  />
                  <input name={`axisLabel${i}`} placeholder="label, e.g. Length" className={`${inputClass} text-xs`} />
                  <input
                    name={`axisValue${i}`}
                    placeholder="this SKU's value, e.g. 16.4 ft"
                    className={`${inputClass} text-xs`}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted">SKU code</span>
          <input name="sku" required placeholder="e.g. AMB-DRV-24V-96W" className={`${inputClass} font-mono`} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted">Label (shown to customers)</span>
          <input name="label" required className={inputClass} />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-muted">
          Category (for pricing — Category &amp; SKU overrides on /admin/pricing use this)
        </span>
        <input
          name="productCategory"
          required
          list="product-categories"
          value={productCategory}
          onChange={(e) => setProductCategory(e.target.value)}
          placeholder="e.g. linear_piece"
          className={inputClass}
        />
        <datalist id="product-categories">
          {productCategories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted">Status</span>
          <select name="status" defaultValue="active" className={inputClass}>
            <option value="active">Active</option>
            <option value="backordered">Backordered</option>
            <option value="coming_soon">Coming soon</option>
            <option value="hidden">Hidden</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted">FOB cost, USD (optional — can add later in /admin/pricing)</span>
          <input name="fobUsd" type="number" step="0.01" min="0" placeholder="e.g. 12.50" className={inputClass} />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-muted">Short description (optional)</span>
        <textarea name="shortDescription" rows={2} className={inputClass} />
      </label>

      <div className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-muted">Photo (optional — can add later)</span>
        <input name="imageUrl" placeholder="Image URL (paste a Drive link, or upload a file below)" className={inputClass} />
        <input type="file" name="imageFile" accept="image/*" className="text-xs text-muted" />
      </div>

      <button
        type="submit"
        className="self-start rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
      >
        Add SKU
      </button>
    </form>
  );
}

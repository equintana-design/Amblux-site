"use client";

import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/app/components/SiteHeader";
import { useTestProject } from "@/app/providers/TestProjectProvider";

// The no-account, no-configurator path to a BOM: everything added via
// "Add to test project" on a product page lands here. Not connected to
// pricing or the Configurator's zone-based engine — it's just a running
// parts list someone can print or read off, for a distributor who already
// knows what they want and would rather pick SKUs directly than model a
// room. Persisted client-side only (see TestProjectProvider).
export default function TestProjectPage() {
  const { items, removeItem, setQty, clear } = useTestProject();

  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl px-6 py-16">
        <div className="print:hidden">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">Your test project</p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">Bill of materials</h1>
          <p className="mt-3 max-w-xl text-muted">
            Every part you&rsquo;ve added from a product page, in one list — no room layout required. Print it, or hand the
            part numbers to your distributor.
          </p>
        </div>
        <div className="hidden print:block">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-foreground">AMBLUX • Complete Cabinet Lighting Solutions</p>
          <h1 className="mt-3 text-2xl font-semibold text-foreground">Test project — bill of materials</h1>
          <hr className="mt-3 border-border" />
        </div>

        {items.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-border bg-surface p-10 text-center print:hidden">
            <p className="text-foreground">Nothing added yet.</p>
            <p className="mt-2 text-sm text-muted">
              Browse the{" "}
              <Link href="/products" className="font-medium text-accent-strong hover:underline">
                product catalog
              </Link>{" "}
              and use &ldquo;Add to test project&rdquo; on anything you want to include.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-8 divide-y divide-border rounded-2xl border border-border bg-surface print:rounded-none print:border-0 print:divide-y-0">
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
                      Quantity
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
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
              <button type="button" onClick={clear} className="text-sm font-medium text-muted hover:text-accent-strong">
                Clear project
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="rounded-full border border-accent-soft px-5 py-2.5 text-sm font-semibold text-accent-strong hover:bg-accent-soft/20"
                >
                  Print / Save as PDF
                </button>
                <Link
                  href="/products"
                  className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-strong"
                >
                  Add more products
                </Link>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

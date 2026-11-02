"use client";

import type { LoadedPurchaseOrder } from "@/lib/configurator/purchaseOrders";

function formatUsd(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

// Same minimal CSV-field escaping used throughout the admin tools
// (app/admin/orders/OrderBuilder.tsx, app/admin/distributor-quotes/
// DistributorQuoteBuilder.tsx, app/admin/pricing/export/route.ts) — kept
// consistent rather than reinventing it.
function csvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadTextFile(filename: string, contents: string, mimeType: string) {
  const blob = new Blob(["﻿" + contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function PurchaseOrderView({ po }: { po: LoadedPurchaseOrder }) {
  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }

  function handleDownloadCsv() {
    const header = [
      "amblux_sku",
      "label",
      "vendor_sku",
      "amblux_qty",
      "vendor_unit",
      "qty_per_amblux_sku",
      "vendor_units_to_order",
      "unit_price_usd",
      "line_total_usd",
    ];
    const lines = po.lineItems.map((li) =>
      [
        li.sku,
        li.label,
        li.vendorSku ?? "",
        li.qty,
        li.unit,
        li.qtyPerAmbluxSku,
        li.vendorUnits,
        li.unitPriceUsd.toFixed(2),
        li.lineTotalUsd.toFixed(2),
      ]
        .map(csvField)
        .join(","),
    );
    const meta = [`Vendor,${csvField(po.vendor.name)}`, `PO number,${csvField(po.poNumber)}`, ""];
    const csv = [...meta, header.join(","), ...lines, "", `,,,,,,,${formatUsd(po.totalUsd)}`].join("\n") + "\n";
    const vendorSlug = po.vendor.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    downloadTextFile(`${po.poNumber || "amblux-po"}-${vendorSlug}.csv`, csv, "text/csv;charset=utf-8");
  }

  return (
    <div>
      <section className="mt-6 rounded-2xl border border-border bg-surface p-6 print:border-0 print:p-0 print:mt-0">
        <div className="flex flex-wrap items-start justify-between gap-6 print:flex-nowrap">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Purchase order</h2>
            <p className="mt-1 text-sm text-muted">{po.vendor.name}</p>
            {po.vendor.contactName && <p className="text-sm text-muted">Attn: {po.vendor.contactName}</p>}
            {po.vendor.email && <p className="text-sm text-muted">{po.vendor.email}</p>}
            {po.vendor.phone && <p className="text-sm text-muted">{po.vendor.phone}</p>}
            {po.vendor.address && <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{po.vendor.address}</p>}
            {po.vendor.terms && <p className="mt-1 text-sm text-muted">Terms: {po.vendor.terms}</p>}
          </div>

          <div className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">PO number</span>
            <p className="font-mono text-sm text-foreground">{po.poNumber}</p>
            <span className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">Last updated</span>
            <p className="text-sm text-foreground">{new Date(po.updatedAt).toLocaleString()}</p>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-6 print:border-0 print:p-0 print:mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted print:text-foreground">
          Line items
        </h2>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-sm print:min-w-0">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-3">Amblux SKU</th>
                <th className="py-2 pr-3">Vendor part #</th>
                <th className="py-2 pr-3">Qty</th>
                <th className="py-2 pr-3">Vendor units</th>
                <th className="py-2 pr-3">Unit price</th>
                <th className="py-2 pr-3">Line total</th>
              </tr>
            </thead>
            <tbody>
              {po.lineItems.map((li) => (
                <tr key={li.sku} className="border-b border-border/60 align-top">
                  <td className="py-2 pr-3">
                    <div className="font-mono text-xs">{li.sku}</div>
                    <div className="text-xs text-muted">{li.label}</div>
                  </td>
                  <td className="py-2 pr-3 text-xs text-muted">{li.vendorSku ?? "—"}</td>
                  <td className="py-2 pr-3 text-xs">{li.qty}</td>
                  <td className="py-2 pr-3 text-xs text-muted">
                    {li.vendorUnits} {li.unit}
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap text-xs text-muted">
                    {formatUsd(li.unitPriceUsd)}/{li.unit}
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap text-xs font-medium text-foreground">
                    {formatUsd(li.lineTotalUsd)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} className="py-3 pr-3 text-right text-sm font-semibold text-foreground">
                  Total
                </td>
                <td className="py-3 pr-3 text-sm font-semibold text-foreground">{formatUsd(po.totalUsd)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {po.vendor.bankInfo && (
          <p className="mt-6 hidden whitespace-pre-wrap text-xs text-muted print:block">
            <span className="font-semibold text-foreground">Payment details: </span>
            {po.vendor.bankInfo}
          </p>
        )}
      </section>

      <div className="mt-6 flex flex-wrap gap-3 print:hidden">
        <button
          type="button"
          onClick={handlePrint}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
        >
          Print / Save as PDF
        </button>
        <button
          type="button"
          onClick={handleDownloadCsv}
          className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent-strong"
        >
          Download as Excel (CSV)
        </button>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";

interface VendorSkuLine {
  id: string;
  sku: string;
  vendor_sku: string | null;
  unit_price_usd: number;
  unit: string;
  qty_per_amblux_sku: number;
  notes: string | null;
  label: string;
  category: string | null;
}

interface VendorData {
  vendor: {
    id: string;
    name: string;
    contact_name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    bank_info: string | null;
    terms: string | null;
    notes: string | null;
  };
  lines: VendorSkuLine[];
}

function formatUsd(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

// Same minimal CSV-field escaping as app/admin/pricing/export/route.ts —
// kept consistent rather than reinventing it, even though this one runs in
// the browser instead of a route handler (there's no server-side state to
// export from: quantities only ever live in this component).
function csvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadTextFile(filename: string, contents: string, mimeType: string) {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function OrderBuilder({ vendorData }: { vendorData: VendorData[] }) {
  const [vendorIndex, setVendorIndex] = useState(0);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [poNumber, setPoNumber] = useState("");
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [shipTo, setShipTo] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  const current = vendorData[vendorIndex];

  const rows = useMemo(
    () =>
      current.lines.map((line) => {
        const qty = quantities[line.id] ?? 0;
        const vendorUnits = qty * line.qty_per_amblux_sku;
        const lineTotal = vendorUnits * line.unit_price_usd;
        return { line, qty, vendorUnits, lineTotal };
      }),
    [current, quantities],
  );

  const orderedRows = rows.filter((r) => r.qty > 0);
  const grandTotal = orderedRows.reduce((sum, r) => sum + r.lineTotal, 0);

  function setQty(id: string, value: string) {
    const n = Math.max(0, Math.round(Number(value) || 0));
    setQuantities((prev) => ({ ...prev, [id]: n }));
  }

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
      "notes",
    ];
    const lines = orderedRows.map((r) =>
      [
        r.line.sku,
        r.line.label,
        r.line.vendor_sku ?? "",
        r.qty,
        r.line.unit,
        r.line.qty_per_amblux_sku,
        r.vendorUnits,
        r.line.unit_price_usd.toFixed(2),
        r.lineTotal.toFixed(2),
        r.line.notes ?? "",
      ]
        .map(csvField)
        .join(","),
    );
    const meta = [
      `Vendor,${csvField(current.vendor.name)}`,
      `PO number,${csvField(poNumber)}`,
      `Date,${csvField(orderDate)}`,
      "",
    ];
    const csv = [...meta, header.join(","), ...lines, "", `,,,,,,,,${formatUsd(grandTotal)},`].join("\n") + "\n";
    const date = orderDate || new Date().toISOString().slice(0, 10);
    const vendorSlug = current.vendor.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    downloadTextFile(`amblux-po-${vendorSlug}-${date}.csv`, csv, "text/csv;charset=utf-8");
  }

  return (
    <div>
      {vendorData.length > 1 && (
        <div className="mt-6 print:hidden">
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted">Vendor</label>
          <select
            value={vendorIndex}
            onChange={(e) => setVendorIndex(Number(e.target.value))}
            className="mt-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {vendorData.map((v, i) => (
              <option key={v.vendor.id} value={i}>
                {v.vendor.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* --- Order header (editable) --- */}
      <section className="mt-6 rounded-2xl border border-border bg-surface p-6 print:border-0 print:p-0 print:mt-0">
        <div className="flex flex-wrap items-start justify-between gap-6 print:flex-nowrap">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Purchase order</h2>
            <p className="mt-1 text-sm text-muted">{current.vendor.name}</p>
            {current.vendor.contact_name && (
              <p className="text-sm text-muted">Attn: {current.vendor.contact_name}</p>
            )}
            {current.vendor.email && <p className="text-sm text-muted">{current.vendor.email}</p>}
            {current.vendor.phone && <p className="text-sm text-muted">{current.vendor.phone}</p>}
            {current.vendor.address && <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{current.vendor.address}</p>}
            {current.vendor.terms && <p className="mt-1 text-sm text-muted">Terms: {current.vendor.terms}</p>}
          </div>

          <div className="flex flex-col gap-3 text-sm">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">PO number</span>
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="e.g. PO-2026-01"
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent print:border-0 print:p-0"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">Date</span>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent print:border-0 print:p-0"
              />
            </label>
          </div>
        </div>

        {/* Ship-to is left blank/editable — no company "ship from"/billing
            address exists anywhere in the codebase to default this from. */}
        <label className="mt-6 block">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Ship to / notes to vendor</span>
          <textarea
            value={shipTo}
            onChange={(e) => setShipTo(e.target.value)}
            rows={2}
            placeholder="Add your shipping address or instructions for this order"
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent print:border-0 print:p-0"
          />
        </label>
      </section>

      {/* --- Line items --- */}
      <section className="mt-6 rounded-2xl border border-border bg-surface p-6 print:border-0 print:p-0 print:mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted print:text-foreground">
          Line items
        </h2>
        <p className="mt-1 text-sm text-muted print:hidden">
          Enter how many Amblux SKUs you need — &quot;vendor units&quot; and totals are computed automatically using
          each item&apos;s qty-per-Amblux-SKU multiplier.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm print:min-w-0">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-3">Amblux SKU</th>
                <th className="py-2 pr-3">Vendor part #</th>
                <th className="py-2 pr-3 print:hidden">Qty (Amblux SKUs)</th>
                <th className="py-2 pr-3">Qty</th>
                <th className="py-2 pr-3">Vendor units</th>
                <th className="py-2 pr-3">Unit price</th>
                <th className="py-2 pr-3">Line total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ line, qty, vendorUnits, lineTotal }) => (
                <tr
                  key={line.id}
                  className={`border-b border-border/60 align-top ${qty === 0 ? "print:hidden" : ""}`}
                >
                  <td className="py-2 pr-3">
                    <div className="font-mono text-xs">{line.sku}</div>
                    <div className="text-xs text-muted">{line.label}</div>
                  </td>
                  <td className="py-2 pr-3 text-xs text-muted">{line.vendor_sku ?? "—"}</td>
                  <td className="py-2 pr-3 print:hidden">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={qty || ""}
                      onChange={(e) => setQty(line.id, e.target.value)}
                      placeholder="0"
                      className="w-20 rounded-lg border border-border bg-surface px-2 py-1 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </td>
                  <td className="hidden py-2 pr-3 text-xs print:table-cell">{qty}</td>
                  <td className="py-2 pr-3 text-xs text-muted">
                    {vendorUnits} {line.unit}
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap text-xs text-muted">
                    {formatUsd(line.unit_price_usd)}/{line.unit}
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap text-xs font-medium text-foreground">
                    {formatUsd(lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6} className="py-3 pr-3 text-right text-sm font-semibold text-foreground">
                  Total
                </td>
                <td className="py-3 pr-3 text-sm font-semibold text-foreground">{formatUsd(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {orderedRows.length === 0 && (
          <p className="mt-4 text-sm text-muted print:hidden">
            Enter a quantity for at least one line item to generate an order.
          </p>
        )}

        {orderNotes !== undefined && (
          <label className="mt-6 block print:hidden">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Internal notes (optional)</span>
            <textarea
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              rows={2}
              placeholder="Not included in the printed/exported order — for your own reference while building it"
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </label>
        )}

        {shipTo && (
          <p className="mt-6 hidden whitespace-pre-wrap text-sm text-foreground print:block">
            <span className="font-semibold">Ship to / notes: </span>
            {shipTo}
          </p>
        )}

        {current.vendor.bank_info && (
          <p className="mt-6 hidden whitespace-pre-wrap text-xs text-muted print:block">
            <span className="font-semibold text-foreground">Payment details: </span>
            {current.vendor.bank_info}
          </p>
        )}
      </section>

      <div className="mt-6 flex flex-wrap gap-3 print:hidden">
        <button
          type="button"
          onClick={handlePrint}
          disabled={orderedRows.length === 0}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
        >
          Print / Save as PDF
        </button>
        <button
          type="button"
          onClick={handleDownloadCsv}
          disabled={orderedRows.length === 0}
          className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
        >
          Download as Excel (CSV)
        </button>
      </div>
    </div>
  );
}

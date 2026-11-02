"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  distributorQuoteDefault,
  saveDistributorQuote,
  markDistributorQuoteSent,
  deleteDistributorQuote,
  type DistributorQuoteState,
} from "@/lib/configurator/distributorQuotes";
import type { PurchaseOrderSummary, UnmappedSku } from "@/lib/configurator/purchaseOrders";

interface CatalogProduct {
  sku: string;
  label: string;
  category: string;
  status: string;
  distributorCents: number | null;
  dealerCents: number | null;
}

interface DistributorOption {
  id: string;
  companyName: string;
  email: string;
}

interface InitialQuote {
  id: string;
  jobNumber: string;
  status: string;
  state: DistributorQuoteState;
}

function formatCad(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "—";
  return (cents / 100).toLocaleString("en-CA", { style: "currency", currency: "CAD" });
}

function csvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// A UTF-8 BOM prefix is required for Excel (on double-click, outside any
// browser/HTTP context) to detect the file as UTF-8 rather than guessing
// the system codepage — without it, every non-ASCII character here (×,
// —, °, etc. in product labels) renders as mojibake in Excel even though
// the file is already valid UTF-8 and opens correctly everywhere else.
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

export function DistributorQuoteBuilder({
  catalog,
  distributors,
  initialQuote,
  initialPurchaseOrders,
}: {
  catalog: CatalogProduct[];
  distributors: DistributorOption[];
  initialQuote: InitialQuote | null;
  initialPurchaseOrders: PurchaseOrderSummary[];
}) {
  const router = useRouter();
  const defaults = distributorQuoteDefault();
  const initialState = initialQuote?.state ?? defaults;

  const [quoteId, setQuoteId] = useState<string | null>(initialQuote?.id ?? null);
  const [jobNumber, setJobNumber] = useState(initialQuote?.jobNumber ?? "");
  const [status, setStatus] = useState(initialQuote?.status ?? "draft");

  const [recipientMode, setRecipientMode] = useState<"existing" | "new">(
    initialState.recipient.distributorAccountId ? "existing" : distributors.length > 0 ? "existing" : "new",
  );
  const [distributorAccountId, setDistributorAccountId] = useState<string | null>(
    initialState.recipient.distributorAccountId,
  );
  const [companyName, setCompanyName] = useState(initialState.recipient.companyName);
  const [contactName, setContactName] = useState(initialState.recipient.contactName);
  const [email, setEmail] = useState(initialState.recipient.email);
  const [phone, setPhone] = useState(initialState.recipient.phone);
  const [address, setAddress] = useState(initialState.recipient.address);
  const [quoteDate, setQuoteDate] = useState(initialState.quoteDate);
  const [notes, setNotes] = useState(initialState.notes);

  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(initialState.lineItems.map((li) => [li.sku, li.qty])),
  );
  const [search, setSearch] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Vendor orders auto-generated from this quote's line items — see
  // lib/configurator/purchaseOrders.ts. Seeded from the server-loaded
  // snapshot on open, then replaced with handleSave()'s fresh result on
  // every save so this stays in sync without a page reload.
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderSummary[]>(initialPurchaseOrders);
  const [unmappedSkus, setUnmappedSkus] = useState<UnmappedSku[]>([]);

  function selectDistributor(id: string) {
    setDistributorAccountId(id);
    const dist = distributors.find((d) => d.id === id);
    if (dist) {
      setCompanyName(dist.companyName);
      setEmail(dist.email);
    }
  }

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (p) => p.sku.toLowerCase().includes(q) || p.label.toLowerCase().includes(q) || p.category.toLowerCase().includes(q),
    );
  }, [catalog, search]);

  const rows = useMemo(
    () =>
      catalog
        .filter((p) => (quantities[p.sku] ?? 0) > 0)
        .map((p) => {
          const qty = quantities[p.sku] ?? 0;
          const distCents = p.distributorCents ?? 0;
          const dealerCents = p.dealerCents ?? 0;
          return {
            product: p,
            qty,
            lineDistCents: distCents * qty,
            lineDealerCents: dealerCents * qty,
            lineMarginCents: (dealerCents - distCents) * qty,
          };
        }),
    [catalog, quantities],
  );

  const totalDistCents = rows.reduce((sum, r) => sum + r.lineDistCents, 0);
  const totalDealerCents = rows.reduce((sum, r) => sum + r.lineDealerCents, 0);
  const totalMarginCents = totalDealerCents - totalDistCents;
  const marginPct = totalDistCents > 0 ? (totalMarginCents / totalDistCents) * 100 : 0;

  function setQty(sku: string, value: string) {
    const n = Math.max(0, Math.round(Number(value) || 0));
    setQuantities((prev) => ({ ...prev, [sku]: n }));
  }

  // Removing a line is just setting its qty to 0 (rows filters qty>0 out
  // of the quote entirely) — this is the explicit affordance for it
  // directly in the quote line-items table, since previously the only
  // way to remove a line was to scroll back up to the full catalog
  // search table and find that same SKU again to zero it out there.
  function removeLine(sku: string) {
    setQuantities((prev) => ({ ...prev, [sku]: 0 }));
  }

  function buildState(): DistributorQuoteState {
    return {
      recipient: {
        distributorAccountId: recipientMode === "existing" ? distributorAccountId : null,
        companyName,
        contactName,
        email,
        phone,
        address,
      },
      quoteDate,
      notes,
      lineItems: rows.map((r) => ({ sku: r.product.sku, label: r.product.label, qty: r.qty })),
    };
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSavedNotice(null);
    try {
      const supabase = createClient();
      const result = await saveDistributorQuote(supabase, {
        id: quoteId,
        accountId: recipientMode === "existing" ? distributorAccountId : null,
        state: buildState(),
      });
      setQuoteId(result.id);
      setJobNumber(result.jobNumber);
      setPurchaseOrders(result.purchaseOrders);
      setUnmappedSkus(result.unmappedSkus);
      setSavedNotice(
        result.unmappedSkus.length > 0
          ? `Saved. ${result.unmappedSkus.length} SKU(s) couldn't be added to a vendor order — see below.`
          : "Saved.",
      );
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkSent() {
    if (!quoteId) return;
    try {
      const supabase = createClient();
      await markDistributorQuoteSent(supabase, quoteId);
      setStatus("submitted");
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't update status");
    }
  }

  async function handleDelete() {
    if (!quoteId) return;
    if (!window.confirm("Delete this saved quote? This can't be undone.")) return;
    try {
      const supabase = createClient();
      await deleteDistributorQuote(supabase, quoteId);
      router.push("/admin/distributor-quotes");
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }

  function handleDownloadCsv() {
    const header = [
      "sku",
      "label",
      "category",
      "qty",
      "distributor_unit_cad",
      "distributor_line_cad",
      "dealer_unit_cad",
      "dealer_line_cad",
      "margin_cad",
    ];
    const lines = rows.map((r) =>
      [
        r.product.sku,
        r.product.label,
        r.product.category,
        r.qty,
        (r.product.distributorCents ?? 0) / 100,
        r.lineDistCents / 100,
        (r.product.dealerCents ?? 0) / 100,
        r.lineDealerCents / 100,
        r.lineMarginCents / 100,
      ]
        .map(csvField)
        .join(","),
    );
    const meta = [
      `Quote #,${csvField(jobNumber || "(unsaved)")}`,
      `Distributor,${csvField(companyName)}`,
      `Date,${csvField(quoteDate)}`,
      "",
    ];
    const totals = ["", "", "", "", "", `Total,${(totalDistCents / 100).toFixed(2)}`, "", `${(totalDealerCents / 100).toFixed(2)}`, `${(totalMarginCents / 100).toFixed(2)}`];
    const csv = [...meta, header.join(","), ...lines, "", totals.join(",")].join("\n") + "\n";
    const slug = (companyName || "distributor").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    downloadTextFile(`amblux-quote-${slug}-${quoteDate}.csv`, csv, "text/csv;charset=utf-8");
  }

  const emailSummary = useMemo(() => {
    if (rows.length === 0) return "";
    const lines = [
      `Hi ${contactName || "there"},`,
      "",
      `Here's an initial-order quote from AMBLUX${jobNumber ? ` (Quote #${jobNumber})` : ""}, dated ${quoteDate}.`,
      "",
      ...rows.map(
        (r) =>
          `${r.qty} x ${r.product.sku} — ${r.product.label} — ${formatCad(r.product.distributorCents)} ea — line total ${formatCad(r.lineDistCents)}`,
      ),
      "",
      `Total due: ${formatCad(totalDistCents)}`,
      `Your resale value at dealer pricing: ${formatCad(totalDealerCents)} (${formatCad(totalMarginCents)} potential margin, ${marginPct.toFixed(0)}%)`,
      "",
      notes ? notes : "",
      "",
      "Let me know if you'd like any changes to quantities before we confirm.",
    ].filter((l, i, arr) => !(l === "" && arr[i - 1] === ""));
    return lines.join("\n");
  }, [rows, contactName, jobNumber, quoteDate, totalDistCents, totalDealerCents, marginPct, notes]);

  async function handleCopyEmail() {
    try {
      await navigator.clipboard.writeText(emailSummary);
      setSavedNotice("Email text copied to clipboard.");
    } catch {
      setSavedNotice("Couldn't copy automatically — select the text below and copy manually.");
    }
  }

  return (
    <div>
      {/* --- Recipient --- */}
      <section className="mt-6 rounded-2xl border border-border bg-surface p-6 print:border-0 print:p-0 print:mt-0">
        <div className="flex flex-wrap items-start justify-between gap-6 print:flex-nowrap">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">Quote to</h2>

            <div className="mt-3 flex gap-4 text-sm print:hidden">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="recipientMode"
                  checked={recipientMode === "existing"}
                  onChange={() => setRecipientMode("existing")}
                  disabled={distributors.length === 0}
                />
                Existing distributor account
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="recipientMode"
                  checked={recipientMode === "new"}
                  onChange={() => setRecipientMode("new")}
                />
                New prospect
              </label>
            </div>

            {recipientMode === "existing" && distributors.length > 0 && (
              <select
                value={distributorAccountId ?? ""}
                onChange={(e) => selectDistributor(e.target.value)}
                className="mt-3 w-full max-w-sm rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent print:hidden"
              >
                <option value="" disabled>
                  Select a distributor…
                </option>
                {distributors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.companyName}
                  </option>
                ))}
              </select>
            )}

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 print:grid-cols-1">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted print:hidden">Company</span>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Berenson"
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent print:border-0 print:p-0 print:text-base print:font-semibold"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted print:hidden">Contact name</span>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent print:border-0 print:p-0"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted print:hidden">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent print:border-0 print:p-0"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted print:hidden">Phone</span>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent print:border-0 print:p-0"
                />
              </label>
            </div>
            <label className="mt-3 block">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted print:hidden">Address</span>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent print:border-0 print:p-0"
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 text-sm">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">Quote #</span>
              <p className="font-mono text-sm text-foreground">{jobNumber || "assigned on save"}</p>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">Date</span>
              <input
                type="date"
                value={quoteDate}
                onChange={(e) => setQuoteDate(e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent print:border-0 print:p-0"
              />
            </label>
            {jobNumber && <p className="text-xs capitalize text-muted print:hidden">Status: {status}</p>}
          </div>
        </div>
      </section>

      {/* --- Product picker (full catalog, searchable) --- */}
      <section className="mt-6 rounded-2xl border border-border bg-surface p-6 print:hidden">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Add products</h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by SKU, name, or category…"
          className="mt-3 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <div className="mt-4 max-h-96 overflow-y-auto overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-sm">
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-3">SKU</th>
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3">Distributor (CAD)</th>
                <th className="py-2 pr-3">Dealer (CAD)</th>
                <th className="py-2 pr-3">Qty</th>
              </tr>
            </thead>
            <tbody>
              {filteredCatalog.map((p) => (
                <tr key={p.sku} className="border-b border-border/60 align-top">
                  <td className="py-2 pr-3">
                    <div className="font-mono text-xs">{p.sku}</div>
                    <div className="text-xs text-muted">
                      {p.label}
                      {p.status === "hidden" && <span className="ml-1 text-amber-600">(hidden)</span>}
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-xs text-muted">{p.category}</td>
                  <td className="py-2 pr-3 whitespace-nowrap text-xs text-foreground">{formatCad(p.distributorCents)}</td>
                  <td className="py-2 pr-3 whitespace-nowrap text-xs text-foreground">{formatCad(p.dealerCents)}</td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={quantities[p.sku] || ""}
                      onChange={(e) => setQty(p.sku, e.target.value)}
                      placeholder="0"
                      className="w-20 rounded-lg border border-border bg-surface px-2 py-1 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </td>
                </tr>
              ))}
              {filteredCatalog.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-sm text-muted">
                    No products match &quot;{search}&quot;.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* --- Quote line items (printable) --- */}
      <section className="mt-6 rounded-2xl border border-border bg-surface p-6 print:border-0 print:p-0 print:mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted print:text-foreground">
          Quote line items
        </h2>

        {rows.length === 0 ? (
          <p className="mt-4 text-sm text-muted print:hidden">Add a quantity for at least one product above.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-sm print:min-w-0">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3">SKU</th>
                  <th className="py-2 pr-3">Qty</th>
                  <th className="py-2 pr-3">Distributor price</th>
                  <th className="py-2 pr-3">Line total (distributor pays)</th>
                  <th className="py-2 pr-3 print:hidden">Dealer price</th>
                  <th className="py-2 pr-3 print:hidden">Resale value</th>
                  <th className="py-2 pr-3 print:hidden">Margin</th>
                  <th className="py-2 pr-3 print:hidden" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.product.sku} className="border-b border-border/60 align-top">
                    <td className="py-2 pr-3">
                      <div className="font-mono text-xs">{r.product.sku}</div>
                      <div className="text-xs text-muted">{r.product.label}</div>
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={r.qty || ""}
                        onChange={(e) => setQty(r.product.sku, e.target.value)}
                        placeholder="0"
                        className="w-16 rounded-lg border border-border bg-surface px-2 py-1 text-xs text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent print:w-auto print:border-0 print:bg-transparent print:p-0"
                      />
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap text-xs text-foreground">
                      {formatCad(r.product.distributorCents)}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap text-xs font-medium text-foreground">
                      {formatCad(r.lineDistCents)}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap text-xs text-muted print:hidden">
                      {formatCad(r.product.dealerCents)}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap text-xs text-muted print:hidden">
                      {formatCad(r.lineDealerCents)}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap text-xs text-green-700 print:hidden">
                      {formatCad(r.lineMarginCents)}
                    </td>
                    <td className="py-2 pr-3 print:hidden">
                      <button
                        type="button"
                        onClick={() => removeLine(r.product.sku)}
                        className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:border-red-300 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="py-3 pr-3 text-right text-sm font-semibold text-foreground">
                    Total due from distributor
                  </td>
                  <td className="py-3 pr-3 text-sm font-semibold text-foreground">{formatCad(totalDistCents)}</td>
                  <td className="print:hidden" />
                  <td className="py-3 pr-3 text-sm font-semibold text-muted print:hidden">{formatCad(totalDealerCents)}</td>
                  <td className="py-3 pr-3 text-sm font-semibold text-green-700 print:hidden">
                    {formatCad(totalMarginCents)} ({marginPct.toFixed(0)}%)
                  </td>
                  <td className="print:hidden" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <p className="mt-4 hidden text-xs text-muted print:block">
          Resale value at dealer pricing: {formatCad(totalDealerCents)} — potential margin {formatCad(totalMarginCents)} (
          {marginPct.toFixed(0)}%).
        </p>

        <label className="mt-6 block">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted print:hidden">Notes / terms</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. payment terms, validity period, freight terms"
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent print:border-0 print:p-0"
          />
        </label>
      </section>

      {/* --- Vendor orders generated from this quote --- */}
      {(purchaseOrders.length > 0 || unmappedSkus.length > 0) && (
        <section className="mt-6 rounded-2xl border border-border bg-surface p-6 print:hidden">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Vendor orders for this quote</h2>
          <p className="mt-1 text-xs text-muted">
            Automatically generated from the line items above, split by vendor, and regenerated every time you save.
          </p>

          {purchaseOrders.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {purchaseOrders.map((po) => (
                <Link
                  key={po.vendorId}
                  href={`/admin/purchase-orders/${po.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:border-accent"
                >
                  <span className="font-medium text-foreground">{po.vendorName}</span>
                  <span className="font-mono text-xs text-muted">{po.poNumber}</span>
                  <span className="text-xs text-muted">{po.lineItemCount} line item(s)</span>
                  <span className="text-xs font-semibold text-foreground">
                    {po.totalUsd.toLocaleString("en-US", { style: "currency", currency: "USD" })}
                  </span>
                </Link>
              ))}
            </div>
          )}

          {unmappedSkus.length > 0 && (
            <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">
                {unmappedSkus.length} SKU(s) have no vendor mapping on file and were skipped from every vendor order:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-0.5">
                {unmappedSkus.map((u) => (
                  <li key={u.sku} className="font-mono text-xs">
                    {u.qty} x {u.sku} — {u.label}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs">
                Add a vendor SKU mapping for these, then save the quote again to include them.
              </p>
            </div>
          )}
        </section>
      )}

      {saveError && (
        <p className="mt-4 rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 print:hidden">{saveError}</p>
      )}
      {savedNotice && (
        <p className="mt-4 rounded-lg bg-green-100 px-4 py-2 text-sm font-medium text-green-700 print:hidden">{savedNotice}</p>
      )}

      <div className="mt-6 flex flex-wrap gap-3 print:hidden">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || rows.length === 0 || !companyName.trim()}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : quoteId ? "Save changes" : "Save quote"}
        </button>
        {quoteId && status !== "submitted" && (
          <button
            type="button"
            onClick={handleMarkSent}
            className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent-strong"
          >
            Mark as sent
          </button>
        )}
        <button
          type="button"
          onClick={handlePrint}
          disabled={rows.length === 0}
          className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
        >
          Print / Save as PDF
        </button>
        <button
          type="button"
          onClick={handleDownloadCsv}
          disabled={rows.length === 0}
          className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
        >
          Download as Excel (CSV)
        </button>
        {quoteId && (
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-full px-5 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            Delete quote
          </button>
        )}
      </div>

      {rows.length > 0 && (
        <section className="mt-6 rounded-2xl border border-border bg-surface p-6 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Emailable summary</h2>
            <button
              type="button"
              onClick={handleCopyEmail}
              className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent-strong"
            >
              Copy to clipboard
            </button>
          </div>
          <textarea
            readOnly
            value={emailSummary}
            rows={12}
            className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground"
          />
        </section>
      )}
    </div>
  );
}

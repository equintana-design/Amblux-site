"use client";

import { consolidateParts, generateJobNumber, hashBom } from "@/lib/configurator/engine";
import type { BomResult, ProjectInfo } from "@/lib/configurator/types";
import { useTranslations, type TFunction } from "@/app/providers/LocaleProvider";
import { bestTierPrice, usePricingRows } from "./usePricingRows";

// CSV export always prices in CAD — the business's primary pricing
// currency (see PricingPanel.tsx) — independent of any currency toggle a
// viewer might have set elsewhere in the page.
const CSV_CURRENCY = "CAD" as const;

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function PartsList({ bom, project }: { bom: BomResult; project: ProjectInfo }) {
  const parts = consolidateParts(bom);
  const jobNumber = generateJobNumber(project.name, hashBom(bom));
  const t: TFunction = useTranslations();
  const { rows: pricingRows } = usePricingRows(parts.map((p) => p.sku));

  if (parts.length === 0) return null;

  const handleExport = () => {
    // Only attach price columns if at least one line actually priced —
    // still-loading (rows === null), an RLS-empty result (signed out, or
    // an account with no visible tier), and a fetch error all fall back to
    // the plain SKU/description/qty CSV rather than a column of dashes.
    const priced = parts.map((p) => bestTierPrice(pricingRows, p.sku, CSV_CURRENCY));
    const hasPricing = priced.some((p) => p !== null);

    const header = hasPricing
      ? ["SKU", t("configuratorExtra.description"), t("configurator.qty"), t("configuratorExtra.unitPrice"), t("configuratorExtra.totalPrice")]
      : ["SKU", t("configuratorExtra.description"), t("configurator.qty")];

    let grandTotal = 0;
    const partRows = parts.map((p, i) => {
      if (!hasPricing) return [p.sku, p.description, String(p.qty)];
      const price = priced[i];
      if (!price) return [p.sku, p.description, String(p.qty), "—", "—"];
      const unit = price.price_cents / 100;
      const lineTotal = unit * p.qty;
      grandTotal += lineTotal;
      return [p.sku, p.description, String(p.qty), unit.toFixed(2), lineTotal.toFixed(2)];
    });

    const csvRows: string[][] = [
      [t("configuratorExtra.jobNumber"), jobNumber],
      [t("configurator.projectName"), project.name || "—"],
      [t("configurator.client"), project.client || "—"],
      ...(hasPricing ? [[t("configuratorExtra.currencyLabel"), CSV_CURRENCY]] : []),
      [],
      header,
      ...partRows,
    ];
    if (hasPricing) {
      csvRows.push([], ["", "", "", t("configuratorExtra.grandTotal"), grandTotal.toFixed(2)]);
    }

    downloadCsv(`${jobNumber}-parts-list.csv`, csvRows);
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{t("configuratorExtra.partsList")}</h3>
          <p className="text-xs font-mono text-muted">{t("configuratorExtra.jobNumber")} {jobNumber}</p>
        </div>
        <button
          onClick={handleExport}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
        >
          {t("configuratorExtra.exportCsv")}
        </button>
      </div>

      <div className="mt-5 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-background text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">{t("configuratorExtra.description")}</th>
              <th className="px-3 py-2 text-right">{t("configurator.qty")}</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((p) => (
              <tr key={p.sku} className="border-t border-border align-top">
                <td className="px-3 py-2 font-mono text-xs text-accent-strong">{p.sku}</td>
                <td className="px-3 py-2 text-foreground">{p.description}</td>
                <td className="px-3 py-2 text-right font-medium text-foreground">{p.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-muted">{t("configuratorExtra.oneLinePerPart")}</p>
      <p className="mt-1 text-xs text-muted">{t("configuratorExtra.csvIncludesPricing")}</p>
    </div>
  );
}

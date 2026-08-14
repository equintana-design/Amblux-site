"use client";

import { consolidateParts, generateJobNumber, hashBom } from "@/lib/configurator/engine";
import type { BomResult, ProjectInfo } from "@/lib/configurator/types";

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

  if (parts.length === 0) return null;

  const handleExport = () => {
    downloadCsv(`${jobNumber}-parts-list.csv`, [
      ["Job #", jobNumber],
      ["Project", project.name || "—"],
      ["Client", project.client || "—"],
      [],
      ["SKU", "Description", "Qty"],
      ...parts.map((p) => [p.sku, p.description, String(p.qty)]),
    ]);
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Parts list</h3>
          <p className="text-xs font-mono text-muted">Job # {jobNumber}</p>
        </div>
        <button
          onClick={handleExport}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
        >
          Export CSV
        </button>
      </div>

      <div className="mt-5 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-background text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2 text-right">Qty</th>
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

      <p className="mt-4 text-xs text-muted">
        One line per part number, quantities totalled across every zone — this is the order-ready list.
        Pricing and total job cost will be added to this list once the pricing model is finalized.
      </p>
    </div>
  );
}

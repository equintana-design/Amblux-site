"use client";

import { groupBom } from "@/lib/configurator/engine";
import type { BomResult } from "@/lib/configurator/types";

export function BomSummary({ bom }: { bom: BomResult }) {
  const groups = groupBom(bom);

  if (bom.rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">
        Select at least one kitchen zone to build the solution.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">AMBLUX calculated solution</h3>
        <span className="rounded-full bg-background px-4 py-1.5 text-sm font-semibold text-accent-strong">
          Total {Math.round(bom.total * 10) / 10} W
        </span>
      </div>

      <div className="mt-5 flex flex-col gap-6">
        {groups.map((group) => (
          <div key={group.zone}>
            <h4 className="text-sm font-semibold text-muted">{group.zone}</h4>
            <div className="mt-2 overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-background text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Part number &amp; description</th>
                    <th className="px-3 py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((row, i) => (
                    <tr key={i} className="border-t border-border align-top">
                      <td className="px-3 py-2 font-medium text-foreground">{row.qty}</td>
                      <td className="px-3 py-2">
                        <div className="font-mono text-xs text-accent-strong">{row.sku}</div>
                        <div className="text-foreground">{row.description}</div>
                      </td>
                      <td className="px-3 py-2 text-muted">{row.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 rounded-lg bg-background px-4 py-3 text-xs text-muted">
        Distributor pricing, MSRP, and total job cost will appear here once the pricing model is finalized —
        part numbers and quantities above are already the real, calculated AMBLUX solution.
      </p>
    </div>
  );
}

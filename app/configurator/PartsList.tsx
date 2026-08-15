"use client";

import { consolidateParts, generateJobNumber, hashBom } from "@/lib/configurator/engine";
import type { BomResult, ProjectInfo } from "@/lib/configurator/types";
import { useTranslations, type TFunction } from "@/app/providers/LocaleProvider";

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

  if (parts.length === 0) return null;

  const handleExport = () => {
    downloadCsv(`${jobNumber}-parts-list.csv`, [
      [t("configuratorExtra.jobNumber"), jobNumber],
      [t("configurator.projectName"), project.name || "—"],
      [t("configurator.client"), project.client || "—"],
      [],
      ["SKU", t("configuratorExtra.description"), t("configurator.qty")],
      ...parts.map((p) => [p.sku, p.description, String(p.qty)]),
    ]);
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
    </div>
  );
}

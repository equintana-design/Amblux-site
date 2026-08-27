"use client";

// The dark "AMBLUX calculated solution" sheet shown on the wizard's final
// step (see ConfiguratorClient.tsx) — the zone-grouped BOM plus the
// Print/PDF and Share-by-email actions, following the exact
// window.print() / mailto: pattern already established in
// app/products/[slug]/ProductHero.tsx (handlePrint/handleShare).
import { Fragment } from "react";
import { groupBom } from "@/lib/configurator/engine";
import type { BomResult, ProjectInfo } from "@/lib/configurator/types";
import { useTranslations } from "@/app/providers/LocaleProvider";

export function BomSummaryStep({ bom, project }: { bom: BomResult; project: ProjectInfo }) {
  const t = useTranslations();
  const groups = groupBom(bom);
  const title = project.name || t("configuratorExtra.defaultProjectTitle");

  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }

  function handleShare() {
    const subject = encodeURIComponent(t("configuratorExtra.bomEmailSubject"));
    const lines = [
      `${t("configuratorExtra.bomEmailIntro")} ${title}.`,
      "",
      `${t("configurator.totalWatts")}: ${Math.round(bom.total * 10) / 10} W`,
      "",
      t("configuratorExtra.bomEmailAttach"),
    ];
    const body = encodeURIComponent(lines.join("\n"));
    if (typeof window !== "undefined") window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-2 sm:p-4 print:border-0 print:p-0">
      <div className="rounded-xl bg-foreground p-6 text-white sm:p-8 print:rounded-none">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-soft">{t("configurator.calculate")}</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>

        {bom.rows.length === 0 ? (
          <p className="mt-6 text-sm text-white/70">{t("configurator.empty")}</p>
        ) : (
          <>
            <div className="mt-5 flex items-center justify-between rounded-lg bg-white/10 px-4 py-3 text-sm">
              <span className="text-white/80">{t("configurator.totalWatts")}</span>
              <span className="font-semibold text-white">{Math.round(bom.total * 10) / 10} W</span>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-white/60">
                  <tr>
                    <th className="py-2 pr-3">{t("configurator.qty")}</th>
                    <th className="py-2">{t("configurator.part")}</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => (
                    <Fragment key={group.zone}>
                      <tr className="border-t border-accent-soft/40">
                        <td colSpan={2} className="py-2 pr-3 text-xs font-semibold uppercase tracking-wide text-accent-soft">
                          {group.zone}
                        </td>
                      </tr>
                      {group.rows.map((row, i) => (
                        <tr key={i} className="border-t border-white/10 align-top">
                          <td className="py-2 pr-3 font-medium text-white">{row.qty}</td>
                          <td className="py-2">
                            <div className="font-mono text-xs text-accent-soft">{row.sku}</div>
                            <div className="text-white/80">{row.description}</div>
                            {row.notes ? <div className="text-xs text-white/50">{row.notes}</div> : null}
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-6 text-xs text-white/60 print:hidden">{t("configurator.electrical")}</p>

            <button
              type="button"
              onClick={handlePrint}
              className="mt-4 w-full rounded-lg bg-accent-soft px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent-strong hover:text-white print:hidden"
            >
              {t("configurator.print")}
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="mt-3 w-full text-center text-sm font-semibold text-white/80 transition-colors hover:text-white print:hidden"
            >
              {t("configurator.emailShare")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

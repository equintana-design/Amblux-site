"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { consolidateParts, generateJobNumber, hashBom } from "@/lib/configurator/engine";
import { createClient } from "@/lib/supabase/client";
import type { BomResult, ProjectInfo } from "@/lib/configurator/types";

// Product photos, keyed by SKU — fetched straight from amblux_products the
// same way PricingPanel fetches amblux_pricing (client-side, keyed off the
// current part list's SKUs). Not every SKU has a photo yet (a few Drive
// folders are still empty/flagged — see migration 0010), so this renders a
// plain placeholder square for anything missing rather than leaving a gap
// or erroring the whole table.
function usePartImages(skus: string[]) {
  const [images, setImages] = useState<Record<string, string | null>>({});
  const skuKey = skus.join(",");

  useEffect(() => {
    if (skus.length === 0) return;
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("amblux_products")
      .select("sku, image_url")
      .in("sku", skus)
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        const next: Record<string, string | null> = {};
        data.forEach((row) => {
          next[row.sku] = row.image_url;
        });
        setImages(next);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skuKey]);

  return images;
}

function PartThumb({ src, alt }: { src: string | null | undefined; alt: string }) {
  if (!src) {
    return <div className="h-10 w-10 shrink-0 rounded-md border border-border bg-background" aria-hidden />;
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={40}
      height={40}
      className="h-10 w-10 shrink-0 rounded-md border border-border object-cover"
      unoptimized
    />
  );
}

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
  const images = usePartImages(parts.map((p) => p.sku));

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
              <th className="px-3 py-2" aria-hidden />
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2 text-right">Qty</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((p) => (
              <tr key={p.sku} className="border-t border-border align-top">
                <td className="px-3 py-2">
                  <PartThumb src={images[p.sku]} alt={p.description} />
                </td>
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

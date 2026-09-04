// A "Project" (formerly "Test Project" — see app/project/page.tsx) is a
// flat list of directly-picked SKUs with no zone/room model behind it —
// the opposite end of the spectrum from the Configurator's guided,
// zone-based ConfiguratorState. This file is the one place that bridges
// that flat list into the same BomResult shape the Configurator's
// PricingPanel, job-cost estimate, and CSV export already expect, so all
// of that gets reused here rather than rebuilt for a second time.
import type { BomResult } from "./types";

export interface QuickProjectItem {
  sku: string;
  label: string;
  pageSlug: string | null;
  imageUrl: string | null;
  qty: number;
}

// What actually gets saved under amblux_quotes.state for a kind='quick'
// row (see migration 0032) — a name (so the saved-projects list has
// something to show, the same way a Configurator save shows its
// state.project.name) plus the picked items.
export interface QuickProjectState {
  name: string;
  items: QuickProjectItem[];
}

export function quickProjectDefault(): QuickProjectState {
  return { name: "", items: [] };
}

// One BOM row per picked SKU, all under a single made-up "zone" label
// since there's no real zone/room concept behind this flow — that's all
// PricingPanel/consolidateParts*/the CSV export need to treat a Project
// exactly like a one-zone Configurator project, with no changes to any of
// that already-shipped code. `total` (watts) is always 0: these items
// carry no wattage data of their own (picked directly by SKU, not derived
// from a zone's dimensions), so there's nothing real to sum — the Project
// page never shows a wattage total, only pricing.
export function bomFromQuickProject(state: QuickProjectState): BomResult {
  return {
    rows: state.items.map((item) => ({
      zone: "Selected products",
      qty: item.qty,
      sku: item.sku,
      description: item.label,
    })),
    total: 0,
  };
}

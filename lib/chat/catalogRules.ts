// Server-only "rule book" loader for the AI chat assistant.
//
// This used to read a separately-seeded amblux_catalog_rules database table
// that mirrored lib/configurator/catalog.ts's hardcoded rules. That table
// had no automatic sync with catalog.ts, and its own seeding migration was
// never committed to the repo (found during a 2026-09-13 architecture
// audit) — so it could silently drift from the rules the graphical
// configurator actually uses. Concretely, that drift already caused two
// real bugs: get_linear_family_options was separately re-implementing
// catalog.ts's own linearFamiliesFor() filtering logic by hand on top of a
// stale copy, and puck lighting (a real AMBLUX option for several zones)
// was never exposed at all, so the assistant wrongly told a customer it
// didn't exist. Both are fixed the same way: this file now imports
// catalog.ts directly (a plain, dependency-free data module — safe to
// import from server-only code) instead of maintaining a second copy.
// catalog.ts already ships to every visitor's browser via the graphical
// configurator's own client bundle (ConfiguratorClient.tsx and friends
// import it directly, "use client"), so nothing about competitor-scraping
// protection is lost by also reading it here — the data was never actually
// hidden.
//
// The one thing that genuinely can't come from catalog.ts is live product
// sellability (a SKU can go from active to hidden/coming_soon at any time,
// independent of any code deploy) — that still comes from a real-time
// amblux_products query via the service-role client, same as before.
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import {
  ZONES,
  ZONE_NAMES,
  ZONES_BY_APPLICATION,
  CONTROL_OPTIONS,
  CONTROL_LABEL,
  UNDERCABINET_REMOTE_CONTROLS,
  MAX_SHELVES_BY_ZONE,
  DEFAULT_COUNT_CAP,
  LINEAR_ONLY_ZONES,
  PUCK_CAPABLE_ZONES,
  VERTICAL_CAPABLE_ZONES,
  RECESSED_FACEPLATES,
  SURFACE_PUCKS,
  PUCK_SKU,
  linearFamiliesFor as catalogLinearFamiliesFor,
  familyCcts as catalogFamilyCcts,
  familyLengthsM as catalogFamilyLengthsM,
  puckWattsFor,
  type LinearFamily,
} from "@/lib/configurator/catalog";

export type UsableStatus = "active" | "backordered";
const USABLE_STATUSES: readonly string[] = ["active", "backordered"];

export interface CatalogSnapshot {
  loadedAt: number;
  zones: readonly string[];
  zonesByApplication: typeof ZONES_BY_APPLICATION;
  zoneNames: typeof ZONE_NAMES;
  defaultCountCap: number;
  maxShelvesByZone: typeof MAX_SHELVES_BY_ZONE;
  linearOnlyZones: readonly string[];
  // Zones where a customer can choose puck fixtures instead of linear tape/
  // extrusion (undercabinet, floating shelves, base/wall/pantry/high
  // cabinet/library in shelf mode) — see catalog.ts's PUCK_CAPABLE_ZONES for
  // exactly which zones and why. A zone not in this list and not in
  // linearOnlyZones (toe kick, crown, floating cabinet, mirror, drawers,
  // vanity) simply has no lightType concept at all — always linear.
  puckCapableZones: readonly string[];
  // Zones with a real shelf-vs-vertical/gable "Layout" choice, which must be
  // asked BEFORE light type/mounting/product family — see catalog.ts's
  // VERTICAL_CAPABLE_ZONES for exactly which zones and why (2026-09-13 chat
  // bug: this question was never asked at all, so a customer had to
  // self-correct from an assumed shelf answer to get gable-appropriate
  // options). A zone not in this list has no Layout choice — it's always
  // shelf-orientation (undercabinet, floating shelves) or has no shelf/
  // gable concept at all (toe kick, crown, drawers, vanity, mirror,
  // floating cabinet).
  verticalCapableZones: readonly string[];
  puckFinishes: { recess: string[]; surface: string[] };
  controlOptions: typeof CONTROL_OPTIONS;
  controlLabel: typeof CONTROL_LABEL;
  undercabinetRemoteControls: readonly string[];
  // Live per-SKU sellability — the one thing catalog.ts can't know.
  usableSkus: Set<string>;
  productStatusBySku: Map<string, string>;
}

let cached: { snapshot: CatalogSnapshot; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000; // product status changes at business speed; a short cache just avoids a DB round trip on every tool call within one chat turn.

export async function loadCatalogRules(forceRefresh = false): Promise<CatalogSnapshot> {
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return cached.snapshot;
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.from("amblux_products").select("sku, status");
  if (error) throw new Error(`loadCatalogRules: amblux_products query failed: ${error.message}`);

  const productStatusBySku = new Map<string, string>((data ?? []).map((p) => [p.sku, p.status]));
  const usableSkus = new Set<string>([...productStatusBySku.entries()].filter(([, status]) => USABLE_STATUSES.includes(status)).map(([sku]) => sku));

  const snapshot: CatalogSnapshot = {
    loadedAt: Date.now(),
    zones: ZONES,
    zonesByApplication: ZONES_BY_APPLICATION,
    zoneNames: ZONE_NAMES,
    defaultCountCap: DEFAULT_COUNT_CAP,
    maxShelvesByZone: MAX_SHELVES_BY_ZONE,
    linearOnlyZones: LINEAR_ONLY_ZONES,
    puckCapableZones: PUCK_CAPABLE_ZONES,
    verticalCapableZones: VERTICAL_CAPABLE_ZONES,
    puckFinishes: { recess: Object.keys(RECESSED_FACEPLATES), surface: Object.keys(SURFACE_PUCKS) },
    controlOptions: CONTROL_OPTIONS,
    controlLabel: CONTROL_LABEL,
    undercabinetRemoteControls: UNDERCABINET_REMOTE_CONTROLS,
    usableSkus,
    productStatusBySku,
  };

  cached = { snapshot, expiresAt: Date.now() + CACHE_TTL_MS };
  return snapshot;
}

// Real AMBLUX linear-family options for a mounting/mode, filtered to
// per-(CCT, length) combinations that are currently usable (active or
// backordered) per live product status — everything else (which families
// exist, which mountings/modes they apply to) comes straight from
// catalog.ts's own linearFamiliesFor(), the exact function the graphical
// configurator itself calls, so this can never drift from it.
export interface UsableLinearFamily {
  id: string;
  label: string;
  type: LinearFamily["type"];
  mounting: LinearFamily["mounting"];
  wattsPerMetre: number;
  lengthsByCct: Record<"3000" | "4000", number[]>;
}

export function usableLinearFamilies(snapshot: CatalogSnapshot, mounting: "recess" | "surface", mode?: "shelf" | "vertical"): UsableLinearFamily[] {
  return catalogLinearFamiliesFor(mounting, mode).map((f) => {
    const lengthsByCct: Record<"3000" | "4000", number[]> = { "3000": [], "4000": [] };
    for (const cct of catalogFamilyCcts(f)) {
      lengthsByCct[cct] = catalogFamilyLengthsM(f, cct).filter((lengthM) => {
        const sku = f.skusByCctAndLength[cct]?.[lengthM];
        return !!sku && snapshot.usableSkus.has(sku);
      });
    }
    return { id: f.id, label: f.label, type: f.type, mounting: f.mounting, wattsPerMetre: f.wattsPerMetre, lengthsByCct };
  });
}

// Real puck fixture watts + SKU-usability check for a mounting — mirrors
// catalog.ts's own puckWattsFor()/puckFixtureSku(), only adding the live
// usable-status check on top (the fixture SKU itself, unlike a linear
// piece, doesn't vary by CCT/length, so there's no combinatorial filtering
// needed here the way usableLinearFamilies() has).
export function puckOption(snapshot: CatalogSnapshot, mounting: "recess" | "surface"): { wattsPerFixture: number; skuUsable: boolean } {
  const sku = mounting === "recess" ? PUCK_SKU : Object.values(SURFACE_PUCKS)[0];
  return { wattsPerFixture: puckWattsFor(mounting), skuUsable: snapshot.usableSkus.has(sku) };
}

export function isSkuUsable(snapshot: CatalogSnapshot, sku: string): boolean {
  return snapshot.usableSkus.has(sku);
}

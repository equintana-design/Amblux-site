// Server-only "rule book" loader for the AI chat assistant.
//
// This is a DELIBERATE PARALLEL to lib/configurator/catalog.ts, not a
// replacement for it. The existing graphical configurator keeps importing
// catalog.ts exactly as it does today (see the 2026-09-13 decision: fix the
// browser-exposure problem for the *new chat* now, leave the already-shipped
// configurator's own exposure as a separate, later project). This file is
// what the chat's tool-calling layer reads instead — it never ships to any
// browser, and it reads the single database source of truth (migration
// 0035_unified_catalog_rules.sql's amblux_catalog_rules table, plus
// amblux_linear_families/amblux_products) via the service-role key.
//
// Every SKU-resolving helper here respects product status: a SKU that is
// 'hidden' or 'coming_soon' in amblux_products is never returned as usable,
// so the chat can never recommend something the business has pulled from
// sale — the gap flagged during the 2026-09-13 chat-assistant planning
// conversation. 'active' and 'backordered' are both treated as usable
// (backordered still ships, just later); only 'hidden' and 'coming_soon'
// are excluded.
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

export type UsableStatus = "active" | "backordered";
const USABLE_STATUSES: readonly string[] = ["active", "backordered"];

export interface CatalogLinearFamily {
  id: string;
  label: string;
  type: "flexible" | "rigid";
  mounting: "recess" | "surface";
  wattsPerMetre: number;
  powerCordSku?: string;
  installAccessorySku?: string;
  installAccessoryLabel?: string;
  installAccessoryOptional: boolean;
  verticalOnly: boolean;
  verticalCapable: boolean;
  // (cct -> (lengthMetres -> { sku, status })) — only usable-status rows are
  // included at all, so "is this length/CCT combination sold" and "is it
  // currently orderable" collapse into one check: presence in this map.
  skusByCctAndLength: Partial<Record<"3000" | "4000", Record<number, { sku: string; status: UsableStatus }>>>;
}

export interface CatalogSnapshot {
  loadedAt: number;
  zones: string[];
  zonesByApplication: Record<string, string[]>;
  zoneNames: Record<string, string>;
  defaultCountCap: number;
  maxShelvesByZone: Record<string, number>;
  closetHangerCompartmentCounts: number[];
  noVerticalOptionZones: string[];
  linearOnlyZones: string[];
  driverLines: Record<string, { sizes: number[]; skuPattern: string }>;
  psuSizes: number[];
  puckConfig: {
    puckSku: string;
    recessedFaceplates: Record<string, string>;
    surfacePucks: Record<string, string>;
    puckWattsRecess: number;
    puckWattsSurface: number;
  };
  miscSkus: Record<string, string | number>;
  controlSku: Record<string, string>;
  controlLabel: Record<string, string>;
  receiverMap: {
    dimmingControls: string[];
    sensorControls: string[];
    dimmingReceiverSku: string;
    sensorReceiverSku: string;
    dimmingReceiverDescription: string;
    sensorReceiverDescription: string;
  };
  controlOptions: Record<string, Record<string, string[]>>;
  undercabinetRemoteControls: string[];
  linearFamilies: CatalogLinearFamily[];
  // Every SKU (any category) currently usable — active or backordered —
  // for quick "is this SKU still sellable" checks outside the linear-piece
  // resolution path (e.g. before quoting a puck/control/driver SKU pulled
  // from the config rows above).
  usableSkus: Set<string>;
  productStatusBySku: Map<string, string>;
}

let cached: { snapshot: CatalogSnapshot; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000; // rules change rarely; a short cache avoids a DB round trip on every tool call within one chat turn.

export async function loadCatalogRules(forceRefresh = false): Promise<CatalogSnapshot> {
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return cached.snapshot;
  }

  const supabase = createServiceRoleClient();

  const [rulesRes, familiesRes, productsRes] = await Promise.all([
    supabase.from("amblux_catalog_rules").select("key, value"),
    supabase
      .from("amblux_linear_families")
      .select(
        "id, label, type, mounting, watts_per_metre, power_cord_sku, install_accessory_sku, install_accessory_label, install_accessory_optional, vertical_only, vertical_capable",
      ),
    supabase.from("amblux_products").select("sku, family_id, cct, length_m, status").eq("category", "linear_piece"),
  ]);

  if (rulesRes.error) throw new Error(`loadCatalogRules: amblux_catalog_rules query failed: ${rulesRes.error.message}`);
  if (familiesRes.error) throw new Error(`loadCatalogRules: amblux_linear_families query failed: ${familiesRes.error.message}`);
  if (productsRes.error) throw new Error(`loadCatalogRules: amblux_products query failed: ${productsRes.error.message}`);

  const rules = new Map<string, unknown>((rulesRes.data ?? []).map((r) => [r.key, r.value]));
  const need = <T,>(key: string): T => {
    if (!rules.has(key)) throw new Error(`loadCatalogRules: missing required amblux_catalog_rules row "${key}"`);
    return rules.get(key) as T;
  };

  // Also pull every other SKU category so usableSkus/productStatusBySku
  // cover the whole catalog, not just linear pieces (pucks, drivers,
  // controls, receivers, accessories all live in the same table).
  const allProductsRes = await supabase.from("amblux_products").select("sku, status");
  if (allProductsRes.error) throw new Error(`loadCatalogRules: amblux_products (full) query failed: ${allProductsRes.error.message}`);

  const productStatusBySku = new Map<string, string>((allProductsRes.data ?? []).map((p) => [p.sku, p.status]));
  const usableSkus = new Set<string>([...productStatusBySku.entries()].filter(([, status]) => USABLE_STATUSES.includes(status)).map(([sku]) => sku));

  const familyById = new Map((familiesRes.data ?? []).map((f) => [f.id, f]));
  const skusByFamily = new Map<string, CatalogLinearFamily["skusByCctAndLength"]>();
  for (const p of productsRes.data ?? []) {
    if (!p.family_id || !p.cct || p.length_m === null) continue;
    if (!USABLE_STATUSES.includes(p.status)) continue; // hidden/coming_soon never enter the resolvable map
    const cct = p.cct as "3000" | "4000";
    const lengthM = Number(p.length_m);
    if (!skusByFamily.has(p.family_id)) skusByFamily.set(p.family_id, {});
    const forFamily = skusByFamily.get(p.family_id)!;
    if (!forFamily[cct]) forFamily[cct] = {};
    forFamily[cct]![lengthM] = { sku: p.sku, status: p.status as UsableStatus };
  }

  const linearFamilies: CatalogLinearFamily[] = [...familyById.values()].map((f) => ({
    id: f.id,
    label: f.label,
    type: f.type as "flexible" | "rigid",
    mounting: f.mounting as "recess" | "surface",
    wattsPerMetre: Number(f.watts_per_metre),
    powerCordSku: f.power_cord_sku ?? undefined,
    installAccessorySku: f.install_accessory_sku ?? undefined,
    installAccessoryLabel: f.install_accessory_label ?? undefined,
    installAccessoryOptional: f.install_accessory_optional,
    verticalOnly: f.vertical_only,
    verticalCapable: f.vertical_capable,
    skusByCctAndLength: skusByFamily.get(f.id) ?? {},
  }));

  const snapshot: CatalogSnapshot = {
    loadedAt: Date.now(),
    zones: need("zones"),
    zonesByApplication: need("zones_by_application"),
    zoneNames: need("zone_names"),
    defaultCountCap: need("default_count_cap"),
    maxShelvesByZone: need("max_shelves_by_zone"),
    closetHangerCompartmentCounts: need("closet_hanger_compartment_counts"),
    noVerticalOptionZones: need("no_vertical_option_zones"),
    linearOnlyZones: need("linear_only_zones"),
    driverLines: need("driver_lines"),
    psuSizes: need("psu_sizes"),
    puckConfig: need("puck_config"),
    miscSkus: need("misc_skus"),
    controlSku: need("control_sku"),
    controlLabel: need("control_label"),
    receiverMap: need("receiver_map"),
    controlOptions: need("control_options"),
    undercabinetRemoteControls: need("undercabinet_remote_controls"),
    linearFamilies,
    usableSkus,
    productStatusBySku,
  };

  cached = { snapshot, expiresAt: Date.now() + CACHE_TTL_MS };
  return snapshot;
}

// ---------------------------------------------------------------------
// Pure helpers mirroring lib/configurator/catalog.ts's function shapes,
// operating on a loaded snapshot instead of static module-level constants.
// ---------------------------------------------------------------------

export function zonesForApplication(snapshot: CatalogSnapshot, app: string): string[] {
  return snapshot.zonesByApplication[app] ?? snapshot.zonesByApplication["kitchen"];
}

export function getLinearFamily(snapshot: CatalogSnapshot, id: string): CatalogLinearFamily | undefined {
  return snapshot.linearFamilies.find((f) => f.id === id);
}

export function linearFamiliesFor(snapshot: CatalogSnapshot, mounting: "recess" | "surface", mode?: "shelf" | "vertical"): CatalogLinearFamily[] {
  if (mode === "vertical") {
    return snapshot.linearFamilies.filter((f) => f.mounting === mounting && f.verticalCapable);
  }
  return snapshot.linearFamilies.filter((f) => f.mounting === mounting && !f.verticalOnly);
}

export function familyCcts(family: CatalogLinearFamily): ("3000" | "4000")[] {
  return (Object.keys(family.skusByCctAndLength) as ("3000" | "4000")[]).filter(
    (cct) => Object.keys(family.skusByCctAndLength[cct] ?? {}).length > 0,
  );
}

export function familyLengthsM(family: CatalogLinearFamily, cct: "3000" | "4000"): number[] {
  return Object.keys(family.skusByCctAndLength[cct] ?? {})
    .map(Number)
    .sort((a, b) => a - b);
}

// Returns the SKU only if it's currently usable (active/backordered) — a
// hidden/coming_soon piece for this exact (family, CCT, length) simply
// isn't returned, same as if AMBLUX never stocked that combination at all.
export function familyPieceSku(family: CatalogLinearFamily, cct: "3000" | "4000", lengthM: number): string | undefined {
  return family.skusByCctAndLength[cct]?.[lengthM]?.sku;
}

export function controlSku(snapshot: CatalogSnapshot, control: string): string {
  const sku = snapshot.controlSku[control];
  if (!sku) throw new Error(`No AMBLUX SKU mapped for control option "${control}"`);
  return sku;
}

export function isSkuUsable(snapshot: CatalogSnapshot, sku: string): boolean {
  return snapshot.usableSkus.has(sku);
}

export function receiverSku(snapshot: CatalogSnapshot, control: string): string | null {
  if (snapshot.receiverMap.dimmingControls.includes(control)) return snapshot.receiverMap.dimmingReceiverSku;
  if (snapshot.receiverMap.sensorControls.includes(control)) return snapshot.receiverMap.sensorReceiverSku;
  return null;
}

export function driverSkuForWatts(snapshot: CatalogSnapshot, kind: string, watts: number): string {
  const line = snapshot.driverLines[kind] ?? snapshot.driverLines["ultra"];
  return line.skuPattern.replace("{w}", String(watts));
}

export function maxShelvesFor(snapshot: CatalogSnapshot, zone: string): number {
  return snapshot.maxShelvesByZone[zone] ?? snapshot.defaultCountCap;
}

export function isLinearOnlyZone(snapshot: CatalogSnapshot, zone: string): boolean {
  return snapshot.linearOnlyZones.includes(zone);
}

export function hasVerticalOption(snapshot: CatalogSnapshot, zone: string): boolean {
  return !snapshot.noVerticalOptionZones.includes(zone);
}

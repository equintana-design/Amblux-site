// Live, DB-driven "is this SKU currently offered in the graphical
// configurator" gate — the runtime counterpart to catalog.ts's purely
// structural option tables. catalog.ts answers "what options can ever
// exist" (which zones, which finishes, which control id maps to which
// SKU); this answers "of those, which are actually sellable right now,"
// read straight from amblux_products.status.
//
// Per the business owner's direct instruction (2026-11-05): the graphical
// configurator offers "active" and "coming_soon" SKUs, and does NOT offer
// "backordered" or "hidden" ones. That's a deliberately different usable
// set than the chat assistant's own (lib/chat/catalogRules.ts's
// USABLE_STATUSES = ["active", "backordered"], which still treats
// "backordered" as sellable) — the whole point of this set is that putting
// a SKU on Backorder from /admin/products/<slug>/<sku> (the Status
// dropdown, then Save) is the one-click action that instantly pulls it
// from the wizard, with no code change or deploy ever needed, while
// "Coming soon" lets a not-yet-stocked SKU still be offered ahead of
// launch. If the chat assistant's own back-order handling should ever
// change to match this, that's a separate, explicit decision — not
// something to infer from this file.
export const CONFIGURATOR_USABLE_STATUSES: readonly string[] = ["active", "coming_soon"];

// The live snapshot every option-filtering helper in forms.tsx reads.
// `usable` is every SKU whose status is in CONFIGURATOR_USABLE_STATUSES;
// `known` is every SKU amblux_products has a row for at all, regardless of
// status — kept separate so a sentinel/non-catalog "SKU" (e.g.
// catalog.ts's BY_OTHERS_SKU, the "supplied by others" 120V line-dimmer
// placeholder, which has no amblux_products row at all) is never
// accidentally filtered out just for not being a real product row.
export interface UsableSkuInfo {
  usable: Set<string>;
  known: Set<string>;
}

// null/undefined means "the live status hasn't loaded yet, or the fetch
// failed" — every filter below treats that exactly like this feature not
// existing at all (show whatever catalog.ts structurally offers) rather
// than flashing an empty wizard on first paint or breaking if Supabase is
// briefly unreachable. See UsableSkusContext.tsx for where this is
// produced.
export type UsableSkuSnapshot = UsableSkuInfo | null | undefined;

export function skuIsUsable(sku: string | undefined, snapshot: UsableSkuSnapshot): boolean {
  if (!sku) return true; // nothing to gate (e.g. no SKU attached to this option at all)
  if (!snapshot) return true; // fail open — see UsableSkuSnapshot comment
  if (!snapshot.known.has(sku)) return true; // not a tracked product row (e.g. BY_OTHERS_SKU) — never gated
  return snapshot.usable.has(sku);
}

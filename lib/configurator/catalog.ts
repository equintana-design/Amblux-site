// Catalog data recovered from the compiled AMBLUX configurator build
// (dist/server/ssr/assets/page-C5zAW_HQ.js, //#region app/configurator/page.tsx).
// This is the same data the "approved AMBLUX configurator" ships with today —
// carried over as-is, not re-derived.

export const ZONES = [
  "undercabinet",
  "floating",
  "toeKick",
  "crown",
  "base",
  "wall",
  "pantry",
  "drawers",
  "highCabinet",
  "library",
  "closetHangers",
  "shoeRack",
] as const;
export type ZoneKey = (typeof ZONES)[number];

// ---------------------------------------------------------------------
// Project types & which built zones apply to each
// ---------------------------------------------------------------------
// Mirrors the Cabinet Light Builder reference doc's per-project-type zone
// lists (Kitchen: Undercabinet, Floating Shelves, Wall Cabinets, Base
// Cabinets, Pantry, Toe Kick, Crown, Drawers; Closet: Floating Shelves,
// Shelving Cabinet, Closet Hangers, Shoe Rack, Drawer Lights, Toe Kick,
// Crown; Bathroom: Vanity, High Cabinet, Floating Cabinet; Furniture:
// Library/Bookcase, Toe Kick, Crown) — filtered down to only the zones
// AMBLUX has actually built so far. Vanity and Floating Cabinet don't exist
// yet, so Bathroom shows only High Cabinet — the wizard falls back to a
// "more zones coming soon" message wherever that makes the zone list empty
// (see ConfiguratorClient.tsx/ui.tsx). Add a zone to a project type's list
// here the moment its engine and real AMBLUX parts exist; nothing else
// about the wizard needs to change.
//
// High Cabinet (Bathroom) and Library/Bookcase (Furniture) reuse the exact
// same "storage cabinet" engine as Pantry — see engine.ts's addBlocks() and
// forms.tsx's BlocksZoneForm. They're built as pure behavioral clones of
// Pantry as it exists today (optional opt-in top light, same driver/control
// logic), not a "reduced" variant — the CLB reference doc describes Pantry
// as auto-including a top fixture, but AMBLUX's actual shipped Pantry has
// never implemented that; its topLight is a plain toggle, identical to
// Wall's. Since there's no auto-fold-in behavior in the real Pantry to
// strip out, High Cabinet/Library simply are Pantry under a different zone
// key and label.
//
// Closet Hangers and Shoe Rack (Closet) also reuse the same engine, but
// with two real differences from Pantry: they're open shelving, not
// cabinets with doors (so their control options are motion/wall-remote
// only — no door sensor, see CONTROL_OPTIONS below), and a hanging bay or
// shoe shelf stack has nowhere near a pantry's shelf count, so their block
// rows cap "shelves" at a small number (see MAX_SHELVES_BY_ZONE) and only
// ever offer linear light, never puck (see LINEAR_ONLY_ZONES) — both the
// main run and its optional top light.
export type ApplicationType = "kitchen" | "closets" | "bathroom" | "furniture";

export const ZONES_BY_APPLICATION: Record<ApplicationType, ZoneKey[]> = {
  kitchen: ["undercabinet", "floating", "wall", "base", "pantry", "toeKick", "crown", "drawers"],
  closets: ["floating", "pantry", "closetHangers", "shoeRack", "toeKick", "crown", "drawers"],
  bathroom: ["highCabinet"],
  furniture: ["library", "toeKick", "crown"],
};

// ---------------------------------------------------------------------
// Per-zone "storage cabinet" engine overrides
// ---------------------------------------------------------------------
// Both tables default to "no restriction" for any zone not listed — Base/
// Wall/Pantry/Floating/High Cabinet/Library keep their existing unlimited
// shelf count and full puck-or-linear choice; only Closet Hangers/Shoe Rack
// opt into the caps, matching what those fixtures are physically like in
// the reference doc. Add a zone to either table (or adjust its number) the
// moment a real AMBLUX product fact requires it — nothing else about
// engine.ts/forms.tsx needs to change.
export const MAX_SHELVES_BY_ZONE: Partial<Record<ZoneKey, number>> = {
  closetHangers: 2,
  shoeRack: 2,
};

export function maxShelvesFor(zone: ZoneKey): number | undefined {
  return MAX_SHELVES_BY_ZONE[zone];
}

export const LINEAR_ONLY_ZONES: ZoneKey[] = ["closetHangers", "shoeRack"];

export function isLinearOnlyZone(zone: ZoneKey): boolean {
  return (LINEAR_ONLY_ZONES as ZoneKey[]).includes(zone);
}

export function zonesForApplication(app: ApplicationType): ZoneKey[] {
  return ZONES_BY_APPLICATION[app] ?? ZONES_BY_APPLICATION.kitchen;
}

export const PSU = [24, 36, 60, 96] as const;

// ---------------------------------------------------------------------
// Driver lines, gated by real product existence
// ---------------------------------------------------------------------
// A driver "kind" is the axis Cabinet Light Builder calls plug-and-play vs.
// hardwire (see types.ts PowerType = "ultra" | "hardwire"). AMBLUX's real
// product line today only has one: the compact 24V "ultra-thin" driver
// (AMB-DRV-24V-{24,36,60,96}W). There is currently no real 120V hardwire
// driver SKU at all — confirmed directly against amblux_products (no SKU
// matches DRV/120V/HW patterns other than the four 24V sizes above).
//
// Rather than let every zone's Power select unconditionally offer
// "Hardwire" (which is what the previous build did — cosmetically labeling
// the BOM row "Hardwire power supply" while still emitting the real 24V
// AMB-DRV-24V-{size}W SKU underneath, since that was the only SKU pattern
// wired in), driver kinds are modeled as a small catalog table exactly like
// LINEAR_FAMILIES: a kind is only selectable in the wizard if a real stock
// list + SKU pattern is defined for it here. Add a "hardwire" entry the
// moment a real AMBLUX 120V hardwire driver line exists (with its own real
// stock sizes and SKU pattern — they need not match the 24V line's
// 24/36/60/96W steps) and every zone's Power dropdown picks it up
// automatically; nothing else needs to change. Until then, "hardwire" is
// simply absent from every Power select, and any old saved project that
// still has powerType:"hardwire" on file falls back to the real ultra-thin
// driver at calculation time (driverLineFor() below) rather than emitting
// an invented SKU.
export interface DriverLine {
  // Real stock wattage sizes this driver line actually ships in.
  sizes: readonly number[];
  // Real AMBLUX SKU for a given stock size.
  skuFor: (watts: number) => string;
}

export const DRIVER_LINES: Partial<Record<"ultra" | "hardwire", DriverLine>> = {
  ultra: {
    sizes: PSU,
    skuFor: (w) => `AMB-DRV-24V-${w}W`,
  },
  // hardwire: intentionally absent — see comment above.
};

// Only kinds with a real DRIVER_LINES entry are offered anywhere in the
// wizard — this is the single source of truth every Power select reads
// from, so a new driver line only needs to be added once, here.
export function availablePowerTypes(): ("ultra" | "hardwire")[] {
  return Object.keys(DRIVER_LINES) as ("ultra" | "hardwire")[];
}

export function driverLineFor(kind: "ultra" | "hardwire"): DriverLine {
  return DRIVER_LINES[kind] ?? DRIVER_LINES.ultra!;
}

export const PUCK_SKU = "AMB-PK-RC58-24V-345-90-35W-LE";

export const RECESSED_FACEPLATES: Record<string, string> = {
  white: "AMB-PK-RC58-FACEPLATE-WH",
  satinNickel: "AMB-PK-RC58-FACEPLATE-SN",
  black: "AMB-PK-RC58-FACEPLATE-BK",
};

export const SURFACE_PUCKS: Record<string, string> = {
  white: "AMB-PK-SLSR35-24V-345-90-2W-WH",
  chrome: "AMB-PK-SLSR35-24V-345-90-2W-CH",
};

export const EXTENSION_SKU = "AMB-EXT-2M";
export const WIRELESS_SENSOR_RECEIVER = "AMB-WRLSS-SS-RCVR";
export const WIRELESS_DIMMING_RECEIVER = "AMB-DMG-WRLSS-RCVR";
export const RIGID_CORD_SKU = "AMB-FCRGL-RC0608TR-PC-1.5M";
export const DEFAULT_FLEXIBLE_LINEAR_SKU = "AMB-FCST-RC0606-24V-30-24-90-3M-27W";
export const DEFAULT_RIGID_LINEAR_SKU = "AMB-FCRGL-RC0608TR-24V-30-24-90-2.4M-18W";

// Real AMBLUX install-hardware SKUs — recovered from the real product list
// (af15ab79-linearsolutions.json's "Required Accessories" column), not
// guessed. Two real products exist:
//   - AMB-FCST-SR1010-45DEG-CLIPS  ("Clips bag of 10") for the one silicone
//     family that needs them (surface-mount 10x10 45deg).
//   - three "-BRKT" SKUs ("stainless steel installation bracket 10pcs (with
//     screws)") for the rigid families that need them — note this includes
//     one *recess*-mount family (rigid-10x15), so which families need this
//     hardware is a per-family fact from Required Accessories, not a
//     recess-vs-surface rule. See LINEAR_FAMILIES' installAccessorySku below
//     for the per-family mapping; families with no entry there sell no such
//     accessory at all (matches Required Accessories being empty for them).
// Both real products are confirmed packs of 10 ("10pcs" / "bag of 10").
// The per-metre density used to estimate quantity below was originally a
// borrowed Cabinet Light Builder estimate (4 per metre, minimum 1) pending
// a real AMBLUX spec — since confirmed as the real number directly from
// AMBLUX (also 4 per metre, so no value change, just no longer a guess).
export const CLIPS_PER_METRE = 4;
export const CLIPS_PER_BAG = 10;

export interface LinearSolution {
  sku: string;
  label: string;
  type: "flexible" | "rigid";
  mounting: "recess" | "surface";
  cct: "3000" | "4000";
  wattsPerMetre: number;
  powerCordSku?: string;
}

// Flat list kept only as the verbatim record of what was recovered from the
// source bundle (one row per real SKU). Not used directly by the engine
// anymore — see LINEAR_FAMILIES below, which groups these same real SKUs by
// physical product line (profile) so the engine can pick the right SKU from
// mounting + CCT + a computed purchase length, instead of a user manually
// picking one fixed-length SKU off a flat list.
export const LINEAR_SOLUTIONS: LinearSolution[] = [
  { sku: "AMB-FCST-RC0606-24V-30-24-90-1.5M-13.5W", label: "Flexible Silicone 6 × 6 mm · 1.5 m · 3000 K", type: "flexible", mounting: "recess", cct: "3000", wattsPerMetre: 9 },
  { sku: "AMB-FCST-RC0606-24V-40-24-90-1.5M-13.5W", label: "Flexible Silicone 6 × 6 mm · 1.5 m · 4000 K", type: "flexible", mounting: "recess", cct: "4000", wattsPerMetre: 9 },
  { sku: "AMB-FCST-RC0606-24V-30-24-90-3M-27W", label: "Flexible Silicone 6 × 6 mm · 3 m · 3000 K", type: "flexible", mounting: "recess", cct: "3000", wattsPerMetre: 9 },
  { sku: "AMB-FCST-RC0606-24V-40-24-90-3M-27W", label: "Flexible Silicone 6 × 6 mm · 3 m · 4000 K", type: "flexible", mounting: "recess", cct: "4000", wattsPerMetre: 9 },
  { sku: "AMB-FCST-RC0485TR-24V-30-24-90-3M-18W", label: "Flexible Silicone 4 × 8.5 mm translucent trim · 3 m · 3000 K", type: "flexible", mounting: "recess", cct: "3000", wattsPerMetre: 6 },
  { sku: "AMB-FCST-RC0485TR-24V-40-24-90-3M-18W", label: "Flexible Silicone 4 × 8.5 mm translucent trim · 3 m · 4000 K", type: "flexible", mounting: "recess", cct: "4000", wattsPerMetre: 6 },
  { sku: "AMB-FCRGL-RC1015TR-24V-30-24-90-2.4M-28.8W", label: "Rigid 10 × 15 mm · 2.4 m · 3000 K", type: "rigid", mounting: "recess", cct: "3000", wattsPerMetre: 12, powerCordSku: "AMB-FCRGL-RC1015TR-PC-1.5M" },
  { sku: "AMB-FCRGL-RC1015TR-24V-40-24-90-2.4M-28.8W", label: "Rigid 10 × 15 mm · 2.4 m · 4000 K", type: "rigid", mounting: "recess", cct: "4000", wattsPerMetre: 12, powerCordSku: "AMB-FCRGL-RC1015TR-PC-1.5M" },
  { sku: "AMB-FCRGL-RC0608TR-24V-30-24-90-2.4M-18W", label: "Rigid 6 × 8 mm · 2.4 m · 3000 K", type: "rigid", mounting: "recess", cct: "3000", wattsPerMetre: 7.2, powerCordSku: RIGID_CORD_SKU },
  { sku: "AMB-FCRGL-RC0608TR-24V-40-24-90-2.4M-18W", label: "Rigid 6 × 8 mm · 2.4 m · 4000 K", type: "rigid", mounting: "recess", cct: "4000", wattsPerMetre: 7.2, powerCordSku: RIGID_CORD_SKU },
  { sku: "AMB-FCST-SR1010-45DEG-24V-30-24-90-3M-27W", label: "Flexible Silicone 10 × 10 mm · 45° · 3 m · 3000 K", type: "flexible", mounting: "surface", cct: "3000", wattsPerMetre: 9 },
  { sku: "AMB-FCST-SR1010-45DEG-24V-40-24-90-3M-27W", label: "Flexible Silicone 10 × 10 mm · 45° · 3 m · 4000 K", type: "flexible", mounting: "surface", cct: "4000", wattsPerMetre: 9 },
  { sku: "AMB-FCST-SR1010-45DEG-24V-30-24-90-5M-45W", label: "Flexible Silicone 10 × 10 mm · 45° · 5 m · 3000 K", type: "flexible", mounting: "surface", cct: "3000", wattsPerMetre: 9 },
  { sku: "AMB-FCRGL-SM-45DEG-24V-30-24-90-2.4M-28.8W", label: "Rigid 45° · 2.4 m · 3000 K", type: "rigid", mounting: "surface", cct: "3000", wattsPerMetre: 12, powerCordSku: "AMB-FCRGL-SM-45DEG-PC-1.5M" },
  { sku: "AMB-FCRGL-SM1610-24V-30-24-90-2.4M-28.8W", label: "Rigid 16 × 10 mm · 2.4 m · 3000 K", type: "rigid", mounting: "surface", cct: "3000", wattsPerMetre: 12, powerCordSku: "AMB-FCRGL-SM1610-PC-1.5M" },
  { sku: "AMB-FCRGL-SM1610-24V-40-24-90-2.4M-28.8W", label: "Rigid 16 × 10 mm · 2.4 m · 4000 K", type: "rigid", mounting: "surface", cct: "4000", wattsPerMetre: 12, powerCordSku: "AMB-FCRGL-SM1610-PC-1.5M" },
];

// ---------------------------------------------------------------------
// Linear product families ("profiles")
// ---------------------------------------------------------------------
// Cabinet Light Builder's real engine doesn't let the installer manually
// pick one fixed-length SKU — it takes the run's mounting/type/CCT
// characteristics, then computes how many stock-length pieces are needed to
// cover the actual entered run length (bin-packed against whatever lengths
// that product line ships in). AMBLUX has real SKUs where CLB only has
// descriptive categories, so this groups the same 16 real SKUs above by
// physical product line (profile) — same mm profile, same mounting, same
// type — each with the *real* AMBLUX SKU for every (CCT, stock length) it's
// actually sold in. The engine picks the family from mounting + type, then
// resolves the exact SKU per piece from (family, CCT, stock length).
//
// Two SKUs above originally carried a stray space before "-24V" (RC1015TR's
// 4000K variant and SM1610's 4000K variant), left in verbatim pending a
// human check — confirmed by the business owner to be a typo, not a real
// catalog string, and corrected here (and in the amblux_products/
// amblux_pricing/amblux_product_cost tables, see migration
// 0029_fix_stray_space_skus.sql) to match their already-clean siblings.
export interface LinearFamily {
  id: string;
  label: string;
  type: "flexible" | "rigid";
  mounting: "recess" | "surface";
  wattsPerMetre: number;
  powerCordSku?: string;
  // Real 10-pack install-hardware SKU this family requires, straight from
  // the product list's "Required Accessories" column — undefined means the
  // real catalog lists no such accessory for this family at all. Whether
  // it's called "clips" or a "bracket" varies by family (see
  // installAccessoryLabel), and presence doesn't track mounting type
  // (rigid-10x15 is recess-mount and still requires one).
  installAccessorySku?: string;
  installAccessoryLabel?: string;
  // true = still a real accessory with a real SKU (shows in the BOM by
  // default), but the customer can choose to drop it from the purchase list
  // rather than it being a forced add-on. Set on rigid-10x15 at your
  // request — it's the one recess-mount family that lists a bracket at all,
  // so it's reasonable for an installer to skip it. Everything else with an
  // installAccessorySku stays a plain required line, unchanged.
  installAccessoryOptional?: boolean;
  // true = this profile's only real-world application (per the product
  // pages' seeded "applications" data) is vertical side-panel lighting —
  // it should only be offered when a cabinet block's Layout is set to
  // "Vertical", never for shelf-mode blocks. Set on rigid-6x8 and
  // silicone-4x8.5-trim only; every other family stays available
  // regardless of layout.
  verticalOnly?: boolean;
  // real SKU for each (CCT, stock length in metres) this family is actually
  // sold in — absence of a key means AMBLUX doesn't carry that combination.
  skusByCctAndLength: Partial<Record<"3000" | "4000", Record<number, string>>>;
}

export const LINEAR_FAMILIES: LinearFamily[] = [
  {
    id: "silicone-6x6",
    label: "Flexible Silicone 6 × 6 mm",
    type: "flexible",
    mounting: "recess",
    wattsPerMetre: 9,
    skusByCctAndLength: {
      "3000": { 1.5: "AMB-FCST-RC0606-24V-30-24-90-1.5M-13.5W", 3: "AMB-FCST-RC0606-24V-30-24-90-3M-27W" },
      "4000": { 1.5: "AMB-FCST-RC0606-24V-40-24-90-1.5M-13.5W", 3: "AMB-FCST-RC0606-24V-40-24-90-3M-27W" },
    },
  },
  {
    id: "silicone-4x8.5-trim",
    label: "Flexible Silicone 4 × 8.5 mm translucent trim",
    type: "flexible",
    mounting: "recess",
    wattsPerMetre: 6,
    verticalOnly: true,
    skusByCctAndLength: {
      "3000": { 3: "AMB-FCST-RC0485TR-24V-30-24-90-3M-18W" },
      "4000": { 3: "AMB-FCST-RC0485TR-24V-40-24-90-3M-18W" },
    },
  },
  {
    id: "rigid-10x15",
    label: "Rigid 10 × 15 mm",
    type: "rigid",
    mounting: "recess",
    wattsPerMetre: 12,
    powerCordSku: "AMB-FCRGL-RC1015TR-PC-1.5M",
    installAccessorySku: "AMB-FCRGL-RC1015TR-BRKT",
    installAccessoryLabel: "Installation bracket",
    installAccessoryOptional: true,
    skusByCctAndLength: {
      "3000": { 2.4: "AMB-FCRGL-RC1015TR-24V-30-24-90-2.4M-28.8W" },
      "4000": { 2.4: "AMB-FCRGL-RC1015TR-24V-40-24-90-2.4M-28.8W" },
    },
  },
  {
    id: "rigid-6x8",
    label: "Rigid 6 × 8 mm",
    type: "rigid",
    mounting: "recess",
    // Confirmed against the AMBLUX Product Sales Sheet Templates workbook
    // (Google Drive, "Linear Solutions" tab, Wattage per Foot/Meter column
    // for AMB-FCRGL-RC0608TR-...): 7.2 W/m, not the 7.5 previously carried
    // over from the recovered CLB build — the product pages' own spec data
    // already shows 7.2 W/m correctly, only this engine constant was stale.
    wattsPerMetre: 7.2,
    powerCordSku: RIGID_CORD_SKU,
    verticalOnly: true,
    skusByCctAndLength: {
      "3000": { 2.4: "AMB-FCRGL-RC0608TR-24V-30-24-90-2.4M-18W" },
      "4000": { 2.4: "AMB-FCRGL-RC0608TR-24V-40-24-90-2.4M-18W" },
    },
  },
  {
    id: "silicone-10x10-45deg",
    label: "Flexible Silicone 10 × 10 mm · 45°",
    type: "flexible",
    mounting: "surface",
    wattsPerMetre: 9,
    installAccessorySku: "AMB-FCST-SR1010-45DEG-CLIPS",
    installAccessoryLabel: "Clips",
    skusByCctAndLength: {
      "3000": { 3: "AMB-FCST-SR1010-45DEG-24V-30-24-90-3M-27W", 5: "AMB-FCST-SR1010-45DEG-24V-30-24-90-5M-45W" },
      "4000": { 3: "AMB-FCST-SR1010-45DEG-24V-40-24-90-3M-27W" },
    },
  },
  {
    id: "rigid-45deg-surface",
    label: "Rigid 45°",
    type: "rigid",
    mounting: "surface",
    wattsPerMetre: 12,
    powerCordSku: "AMB-FCRGL-SM-45DEG-PC-1.5M",
    installAccessorySku: "AMB-FCRGL-SM-45DEG-BRKT",
    installAccessoryLabel: "Installation bracket",
    skusByCctAndLength: {
      "3000": { 2.4: "AMB-FCRGL-SM-45DEG-24V-30-24-90-2.4M-28.8W" },
    },
  },
  {
    id: "rigid-16x10-surface",
    label: "Rigid 16 × 10 mm",
    type: "rigid",
    mounting: "surface",
    wattsPerMetre: 12,
    powerCordSku: "AMB-FCRGL-SM1610-PC-1.5M",
    installAccessorySku: "AMB-FCRGL-SM1610-BRKT",
    installAccessoryLabel: "Installation bracket",
    skusByCctAndLength: {
      "3000": { 2.4: "AMB-FCRGL-SM1610-24V-30-24-90-2.4M-28.8W" },
      "4000": { 2.4: "AMB-FCRGL-SM1610-24V-40-24-90-2.4M-28.8W" },
    },
  },
];

// Vertical/gable lighting (both side panels of a cabinet) is real-world
// restricted to exactly these 3 profiles — the two verticalOnly ones
// (silicone-4x8.5-trim, rigid-6x8), plus silicone-6x6 which also works
// there even though it isn't exclusively for it. rigid-10x15 and every
// surface-mount profile were previously offered for "vertical" too (the
// old rule was just "skip verticalOnly unless mode is vertical," which
// let every non-restricted profile through) — per direct product
// confirmation, vertical lighting is recess-only and limited to this list.
export const VERTICAL_LINEAR_FAMILY_IDS = ["silicone-6x6", "silicone-4x8.5-trim", "rigid-6x8"] as const;

// mode omitted/"shelf" => excludes verticalOnly profiles (correct for every
// caller that has no Layout concept at all — simple zones, drawers — as
// well as a shelf-mode cabinet block). mode "vertical" => restricted to
// VERTICAL_LINEAR_FAMILY_IDS only, regardless of mounting — since every one
// of those is recess-mount, requesting "vertical" with mounting "surface"
// correctly returns an empty list; callers should force mounting to
// "recess" the moment a block's Layout becomes "vertical" (see forms.tsx's
// CabinetBlockRow) rather than relying on this function to silently fall
// back.
export function linearFamiliesFor(mounting: "recess" | "surface", mode?: "shelf" | "vertical"): LinearFamily[] {
  if (mode === "vertical") {
    return LINEAR_FAMILIES.filter((f) => f.mounting === mounting && (VERTICAL_LINEAR_FAMILY_IDS as readonly string[]).includes(f.id));
  }
  return LINEAR_FAMILIES.filter((f) => f.mounting === mounting && !f.verticalOnly);
}

export function getLinearFamily(id: string): LinearFamily {
  return LINEAR_FAMILIES.find((f) => f.id === id) || LINEAR_FAMILIES[0];
}

// CCTs a given family is actually sold in (not every family is stocked at
// both 3000K and 4000K — e.g. the surface 45° rigid profile is 3000K only).
export function familyCcts(family: LinearFamily): ("3000" | "4000")[] {
  return (Object.keys(family.skusByCctAndLength) as ("3000" | "4000")[]).filter(
    (cct) => Object.keys(family.skusByCctAndLength[cct] || {}).length > 0
  );
}

// Stock lengths (metres) a family is actually sold in at a given CCT.
export function familyLengthsM(family: LinearFamily, cct: "3000" | "4000"): number[] {
  return Object.keys(family.skusByCctAndLength[cct] || {})
    .map(Number)
    .sort((a, b) => a - b);
}

export function familyPieceSku(family: LinearFamily, cct: "3000" | "4000", lengthM: number): string | undefined {
  return family.skusByCctAndLength[cct]?.[lengthM];
}

// control id -> AMBLUX SKU. NOTE: the original recovered source had a
// "line" control option with an unresolved placeholder SKU
// ("REPLACE_WITH_AMBLUX_SKU"). Confirmed directly: there is currently no
// AMBLUX line-control product, so it's been dropped entirely rather than
// left as a selectable option with a fake part number — it was never
// actually wired into CONTROL_OPTIONS/UNDERCABINET_REMOTE_CONTROLS below,
// so nothing user-facing changes here, this just removes dead/unsafe code.
// Revisit if/when a real line-control product exists.
export const CONTROL_SKU: Record<string, string> = {
  bluetoothApp: "AMB-APP",
  remote1Zone: "AMB-DMG-WRLSS-KNT-1ZWS",
  remote2Zone: "AMB-DMG-WRLSS-KNT-2ZWS",
  remoteButton: "AMB-DMG-WRLSS-KNT-BTN",
  touch: "AMB-WR-SS-TOUCH-DMR",
  door: "AMB-WR-SS-1DOOR",
  doubleDoor: "AMB-WR-SS-2DOOR",
  motion: "AMB-WR-SS-MS",
  motionDayNight: "AMB-WR-SS-MS-DN",
  wireless: "AMB-DMG-WRLSS-KNT-1ZWS",
  wirelessTouch: "AMB-WRLSS-SS-TOUCH-DMR",
  wirelessDoor: "AMB-WRLSS-SS-MDOOR",
  wirelessMotion: "AMB-WRLSS-MS",
};

export function controlSku(control: string): string {
  const sku = CONTROL_SKU[control];
  if (!sku) throw new Error(`No AMBLUX SKU mapped for control option "${control}"`);
  return sku;
}

const DIMMING_RECEIVER_CONTROLS = ["bluetoothApp", "remote1Zone", "remote2Zone", "remoteButton"];
const SENSOR_RECEIVER_CONTROLS = ["wirelessTouch", "wirelessDoor", "wirelessMotion"];

export function receiverSku(control: string): string | null {
  if (DIMMING_RECEIVER_CONTROLS.includes(control)) return WIRELESS_DIMMING_RECEIVER;
  if (SENSOR_RECEIVER_CONTROLS.includes(control)) return WIRELESS_SENSOR_RECEIVER;
  return null;
}

// Verbatim from CONTROL_DESCRIPTIONS[id].en in the recovered source.
export const CONTROL_LABEL: Record<string, string> = {
  touch: "LED wired touch sensor switch and dimmer",
  door: "LED wired door-control sensor switch",
  doubleDoor: "LED wired door-control sensor switch for two doors",
  motion: "LED wired PIR motion-sensor switch",
  motionDayNight: "LED wired PIR motion-sensor switch with day/night sensor",
  wirelessTouch: "LED wireless touch sensor switch and dimmer",
  wirelessDoor: "LED wireless door-control sensor switch for single or double doors",
  wirelessMotion: "LED wireless PIR motion-sensor switch",
  remote1Zone: "Kinetic RF switch — 1 gang, 1 zone",
  remote2Zone: "Kinetic RF switch — 1 gang, 2 zones",
  remoteButton: "Compact kinetic RF push-button switch",
  bluetoothApp: "Bluetooth App",
};

export const WIRELESS_DIMMING_RECEIVER_DESCRIPTION = "Wireless RF and Bluetooth receiver for Kinetic RF Switches and App";
export const WIRELESS_SENSOR_RECEIVER_DESCRIPTION = "LED Wireless receiver";

// Which control options are offered per zone / control-system combination.
// Verbatim from CONTROL_OPTIONS[zone][system] in the recovered source
// (id lists only here — the "sku — label" strings are rebuilt from
// controlSku()/CONTROL_LABEL so they can't drift out of sync with the SKU map).
export const CONTROL_OPTIONS: Record<string, Record<string, string[]>> = {
  toeKick: { wired: ["motion", "motionDayNight"], wireless: ["wirelessMotion"], wallControl: ["remote1Zone", "remote2Zone", "bluetoothApp"] },
  crown: { wired: ["motion", "motionDayNight"], wireless: ["wirelessMotion"], wallControl: ["remote1Zone", "remote2Zone", "bluetoothApp"] },
  base: { wired: ["door", "doubleDoor", "motion"], wireless: ["wirelessDoor"], wallControl: [] },
  wall: { wired: ["door", "doubleDoor"], wireless: ["wirelessDoor"], wallControl: [] },
  floating: { wired: ["motion", "motionDayNight"], wireless: ["wirelessMotion"], wallControl: ["remote1Zone", "remote2Zone", "remoteButton", "bluetoothApp"] },
  pantry: { wired: ["door", "doubleDoor", "motion", "motionDayNight"], wireless: ["wirelessDoor", "wirelessMotion"], wallControl: ["remote1Zone", "remote2Zone", "bluetoothApp"] },
  // Clones of pantry's own options — see the ZONES_BY_APPLICATION comment
  // above for why High Cabinet/Library are exact Pantry behavioral clones.
  highCabinet: { wired: ["door", "doubleDoor", "motion", "motionDayNight"], wireless: ["wirelessDoor", "wirelessMotion"], wallControl: ["remote1Zone", "remote2Zone", "bluetoothApp"] },
  library: { wired: ["door", "doubleDoor", "motion", "motionDayNight"], wireless: ["wirelessDoor", "wirelessMotion"], wallControl: ["remote1Zone", "remote2Zone", "bluetoothApp"] },
  // Open shelving, not cabinet doors — motion/wall-remote only, same shape
  // as Toe Kick/Crown/Floating rather than Pantry's door-sensor options.
  closetHangers: { wired: ["motion", "motionDayNight"], wireless: ["wirelessMotion"], wallControl: ["remote1Zone", "remote2Zone", "bluetoothApp"] },
  shoeRack: { wired: ["motion", "motionDayNight"], wireless: ["wirelessMotion"], wallControl: ["remote1Zone", "remote2Zone", "bluetoothApp"] },
};

// Fixed id list for the under-cabinet zone's remote/app control picker
// (underCabinetRemoteOptions() in the source — not zone/system keyed).
export const UNDERCABINET_REMOTE_CONTROLS = ["remote1Zone", "remote2Zone", "remoteButton", "bluetoothApp"];

// Kept for reference/lookup by SKU (e.g. displaying a label for a legacy
// stored SKU) — the engine itself now resolves SKUs via LINEAR_FAMILIES.
export function getLinearSolution(sku: string): LinearSolution {
  return LINEAR_SOLUTIONS.find((s) => s.sku === sku) || LINEAR_SOLUTIONS[0];
}

export function normalizedPuckFinish(mounting: "recess" | "surface", finish: string): string {
  if (mounting === "recess") return finish === "chrome" ? "white" : finish;
  return finish === "satinNickel" || finish === "black" ? "white" : finish;
}

export function puckFixtureSku(mounting: "recess" | "surface", finish: string): string {
  return mounting === "recess" ? PUCK_SKU : SURFACE_PUCKS[normalizedPuckFinish(mounting, finish)];
}

export function puckFaceplateSku(mounting: "recess" | "surface", finish: string): string | null {
  return mounting === "recess" ? RECESSED_FACEPLATES[normalizedPuckFinish(mounting, finish)] : null;
}

// Real per-fixture puck wattage differs by mounting — the recessed puck is
// the 3.5 W AMB-PK-RC58 fixture (PUCK_SKU above), the surface-mount puck is
// the 2 W AMB-PK-SLSR35 fixture (SURFACE_PUCKS above). SimpleZoneState/
// CabinetBlock store `puckWatts` as a plain field rather than deriving it
// inline everywhere it's read, so every caller that flips a puck zone's
// mounting needs to re-sync it through this helper — see forms.tsx's
// mounting <Select> onChange handlers.
export function puckWattsFor(mounting: "recess" | "surface"): number {
  return mounting === "recess" ? 3.5 : 2;
}

export const ZONE_NAMES: Record<ZoneKey, string> = {
  undercabinet: "Under-cabinet lighting",
  floating: "Floating Shelves",
  toeKick: "Toe kick",
  crown: "Crown moulding",
  base: "Base Cabinets",
  wall: "Wall Cabinets",
  pantry: "Pantries",
  drawers: "Drawer lights",
  highCabinet: "High Cabinet",
  library: "Library / Bookcase",
  closetHangers: "Closet Hangers",
  shoeRack: "Shoe Rack",
};

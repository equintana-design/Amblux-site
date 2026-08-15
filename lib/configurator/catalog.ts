// Catalog data recovered from the compiled AMBLUX configurator build
// (dist/server/ssr/assets/page-C5zAW_HQ.js, //#region app/configurator/page.tsx).
// This is the same data the "approved AMBLUX configurator" ships with today —
// carried over as-is, not re-derived.

export const ZONES = [
  "undercabinet",
  "toeKick",
  "crown",
  "base",
  "wall",
  "pantry",
  "drawers",
] as const;
export type ZoneKey = (typeof ZONES)[number];

export const PSU = [24, 36, 60, 96] as const;

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
//   - AMB-FCST-SR1010-45DEG -CLIPS  ("Clips bag of 10") for the one silicone
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
  { sku: "AMB-FCRGL-RC1015TR -24V-40-24-90-2.4M-28.8W", label: "Rigid 10 × 15 mm · 2.4 m · 4000 K", type: "rigid", mounting: "recess", cct: "4000", wattsPerMetre: 12, powerCordSku: "AMB-FCRGL-RC1015TR-PC-1.5M" },
  { sku: "AMB-FCRGL-RC0608TR-24V-30-24-90-2.4M-18W", label: "Rigid 6 × 8 mm · 2.4 m · 3000 K", type: "rigid", mounting: "recess", cct: "3000", wattsPerMetre: 7.2, powerCordSku: RIGID_CORD_SKU },
  { sku: "AMB-FCRGL-RC0608TR-24V-40-24-90-2.4M-18W", label: "Rigid 6 × 8 mm · 2.4 m · 4000 K", type: "rigid", mounting: "recess", cct: "4000", wattsPerMetre: 7.2, powerCordSku: RIGID_CORD_SKU },
  { sku: "AMB-FCST-SR1010-45DEG -24V-30-24-90-3M-27W", label: "Flexible Silicone 10 × 10 mm · 45° · 3 m · 3000 K", type: "flexible", mounting: "surface", cct: "3000", wattsPerMetre: 9 },
  { sku: "AMB-FCST-SR1010-45DEG -24V-40-24-90-3M-27W", label: "Flexible Silicone 10 × 10 mm · 45° · 3 m · 4000 K", type: "flexible", mounting: "surface", cct: "4000", wattsPerMetre: 9 },
  { sku: "AMB-FCST-SR1010-45DEG -24V-30-24-90-5M-45W", label: "Flexible Silicone 10 × 10 mm · 45° · 5 m · 3000 K", type: "flexible", mounting: "surface", cct: "3000", wattsPerMetre: 9 },
  { sku: "AMB-FCRGL-SM-45DEG -24V-30-24-90-2.4M-28.8W", label: "Rigid 45° · 2.4 m · 3000 K", type: "rigid", mounting: "surface", cct: "3000", wattsPerMetre: 12, powerCordSku: "AMB-FCRGL-SM-45DEG-PC-1.5M" },
  { sku: "AMB-FCRGL-SM1610-24V-30-24-90-2.4M-28.8W", label: "Rigid 16 × 10 mm · 2.4 m · 3000 K", type: "rigid", mounting: "surface", cct: "3000", wattsPerMetre: 12, powerCordSku: "AMB-FCRGL-SM1610-PC-1.5M" },
  { sku: "AMB-FCRGL-SM1610 -24V-40-24-90-2.4M-28.8W", label: "Rigid 16 × 10 mm · 2.4 m · 4000 K", type: "rigid", mounting: "surface", cct: "4000", wattsPerMetre: 12, powerCordSku: "AMB-FCRGL-SM1610-PC-1.5M" },
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
// Two SKUs above carry a literal stray space before "-24V" in the source
// data (RC1015TR's 4000K variant and SM1610's 4000K variant) — preserved
// verbatim rather than "corrected", since a fixed typo could just as easily
// turn out to be the real catalog string. Flagged here for a human check.
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
    installAccessorySku: "AMB-FCRGL-RC1015TR -BRKT",
    installAccessoryLabel: "Installation bracket",
    installAccessoryOptional: true,
    skusByCctAndLength: {
      "3000": { 2.4: "AMB-FCRGL-RC1015TR-24V-30-24-90-2.4M-28.8W" },
      "4000": { 2.4: "AMB-FCRGL-RC1015TR -24V-40-24-90-2.4M-28.8W" },
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
    installAccessorySku: "AMB-FCST-SR1010-45DEG -CLIPS",
    installAccessoryLabel: "Clips",
    skusByCctAndLength: {
      "3000": { 3: "AMB-FCST-SR1010-45DEG -24V-30-24-90-3M-27W", 5: "AMB-FCST-SR1010-45DEG -24V-30-24-90-5M-45W" },
      "4000": { 3: "AMB-FCST-SR1010-45DEG -24V-40-24-90-3M-27W" },
    },
  },
  {
    id: "rigid-45deg-surface",
    label: "Rigid 45°",
    type: "rigid",
    mounting: "surface",
    wattsPerMetre: 12,
    powerCordSku: "AMB-FCRGL-SM-45DEG-PC-1.5M",
    installAccessorySku: "AMB-FCRGL-SM-45DEG -BRKT",
    installAccessoryLabel: "Installation bracket",
    skusByCctAndLength: {
      "3000": { 2.4: "AMB-FCRGL-SM-45DEG -24V-30-24-90-2.4M-28.8W" },
    },
  },
  {
    id: "rigid-16x10-surface",
    label: "Rigid 16 × 10 mm",
    type: "rigid",
    mounting: "surface",
    wattsPerMetre: 12,
    powerCordSku: "AMB-FCRGL-SM1610-PC-1.5M",
    installAccessorySku: "AMB-FCRGL-SM1610 -BRKT",
    installAccessoryLabel: "Installation bracket",
    skusByCctAndLength: {
      "3000": { 2.4: "AMB-FCRGL-SM1610-24V-30-24-90-2.4M-28.8W" },
      "4000": { 2.4: "AMB-FCRGL-SM1610 -24V-40-24-90-2.4M-28.8W" },
    },
  },
];

// mode omitted/"shelf" => excludes verticalOnly profiles (correct for every
// caller that has no Layout concept at all — simple zones, drawers — as
// well as a shelf-mode cabinet block). mode "vertical" => full list for
// that mounting, since a vertical block may still use a general-purpose
// profile; verticalOnly profiles are simply also available there.
export function linearFamiliesFor(mounting: "recess" | "surface", mode?: "shelf" | "vertical"): LinearFamily[] {
  return LINEAR_FAMILIES.filter((f) => f.mounting === mounting && (mode === "vertical" || !f.verticalOnly));
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

export const ZONE_NAMES: Record<ZoneKey, string> = {
  undercabinet: "Under-cabinet lighting",
  toeKick: "Toe kick",
  crown: "Crown moulding",
  base: "Base Cabinets",
  wall: "Wall Cabinets / Floating Shelf",
  pantry: "Pantries",
  drawers: "Drawer lights",
};

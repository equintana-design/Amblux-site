// State shapes recovered from the compiled AMBLUX configurator build.
// These mirror the original React component's useState shapes exactly so
// the calculation engine (engine.ts) can be ported as pure functions that
// take this state as input, independent of any UI framework.

import type { ApplicationType, ZoneKey } from "./catalog";

export type Unit = "in" | "ft" | "cm" | "m";
export type WattUnit = "W/m" | "W/ft";
export type Mounting = "recess" | "surface";
export type LightType = "puck" | "linear";
export type PuckFinish = "white" | "satinNickel" | "black" | "chrome";
export type ControlSystem = "wired" | "wireless" | "wallControl";
export type PowerType = "ultra" | "hardwire";
export type ZoneControlMode = "together" | "separate";

export interface SelectedZones {
  undercabinet: boolean;
  floating: boolean;
  toeKick: boolean;
  crown: boolean;
  base: boolean;
  wall: boolean;
  pantry: boolean;
  drawers: boolean;
  highCabinet: boolean;
  library: boolean;
  closetHangers: boolean;
  shoeRack: boolean;
  floatingCabinet: boolean;
}

export interface ProjectInfo {
  name: string;
  client: string;
  location: string;
  provider: "distributor" | "showroom";
  providerName: string;
  notes: string;
  email: string;
  phone: string;
  cabinet: "framed" | "frameless";
  installLocation: "factory" | "jobSite";
  installer: "cabinet" | "electrician";
  // Now a real project-type switch (see catalog.ts's ZONES_BY_APPLICATION/
  // zonesForApplication) rather than descriptive-only metadata — it decides
  // which zones the wizard offers, not just what gets printed on the BOM.
  application: ApplicationType;
  install: "plug" | "hardwire";
}

// Under-cabinet / toe kick / crown moulding — the "simple" zones.
export interface SimpleZoneState {
  length: number;
  zoneCount: number;
  zoneLengths: number[];
  zoneControl: ZoneControlMode;
  unit: Unit;
  lightType: LightType;
  spacing: number;
  spacingUnit: Unit;
  puckWatts: number;
  // Which real AMBLUX linear product line (see catalog.ts LINEAR_FAMILIES) —
  // wattage/type/purchase-length are all derived from this + cct at
  // calculation time, not stored, so they can never drift out of sync.
  linearFamily: string;
  control: string;
  powerType: PowerType;
  cct: "3000" | "4000";
  mounting: Mounting;
  puckFinish: PuckFinish;
  controlSystem: ControlSystem;
  // Only meaningful for families with an optional install accessory (see
  // catalog.ts LinearFamily.installAccessoryOptional, e.g. rigid-10x15) —
  // ignored otherwise. Lets the customer drop that line from the BOM.
  includeInstallBracket: boolean;
}

export interface SimpleState {
  undercabinet: SimpleZoneState;
  toeKick: SimpleZoneState;
  crown: SimpleZoneState;
  // Floating Cabinet (Bathroom) — same "simple linear-run" engine/shape as
  // Toe Kick/Crown, just under its own zone key (see catalog.ts's
  // ZONES_BY_APPLICATION comment and engine.ts's addSimple()).
  floatingCabinet: SimpleZoneState;
}

// Base / wall / pantry cabinet blocks (each block = one cabinet run).
export interface CabinetBlock {
  included: boolean;
  mode: "shelf" | "vertical";
  mounting: Mounting;
  height: number;
  shelves: number;
  topLight: boolean;
  topLightControl: "same" | "separate";
  topControlSystem: ControlSystem;
  topControl: string;
  length: number;
  lightType: LightType;
  linearFamily: string;
  spacing: number;
  puckWatts: number;
  puckFinish: PuckFinish;
  cct: "3000" | "4000";
  // Same optional-accessory opt-out as SimpleZoneState — see there.
  includeInstallBracket: boolean;
  // Floating Shelves only — a real per-shelf control choice, used exactly
  // when BlocksState.group === false (verified against the live reference
  // wizard: "each shelf gets its own independent Control type + switch/
  // sensor choice" when shelves aren't set to shared control). Every other
  // zone leaves these undefined and keeps using its zone-level
  // BlocksState.controlSystem/control instead — see engine.ts's addBlocks()
  // and forms.tsx's CabinetBlockRow for the two callers.
  controlSystem?: ControlSystem;
  control?: string;
}

export interface BlocksState {
  unit: Unit;
  mounting: Mounting;
  controlSystem: ControlSystem;
  sensorInstall?: Mounting;
  group?: boolean;
  powerType: PowerType;
  control: string;
  // Legacy only — Floating Shelves used to be a mode switch inside the Wall
  // Cabinets zone rather than its own zone/step. Kept only so
  // mergeConfiguratorState() can detect and migrate an old saved project
  // that still has wall.section==="floating" into the new standalone
  // `floating` zone; nothing reads this to change behavior anymore (see
  // engine.ts's addBlocks(), which now branches on the zone key itself).
  section?: "wall" | "floating";
  blocks: CabinetBlock[];
}

export interface DrawerBlock {
  included: boolean;
  count: number;
  length: number;
  linearFamily: string;
  mounting: Mounting;
  cct: "3000" | "4000";
}

export interface DrawersState {
  unit: Unit;
  control: string;
  powerType: PowerType;
  blocks: DrawerBlock[];
}

export interface ConfiguratorState {
  selected: SelectedZones;
  project: ProjectInfo;
  simple: SimpleState;
  base: BlocksState;
  wall: BlocksState;
  floating: BlocksState;
  pantry: BlocksState;
  drawers: DrawersState;
  // High Cabinet (Bathroom) and Library/Bookcase (Furniture) — exact
  // behavioral clones of the Pantry "storage cabinet" engine under their
  // own zone identity. See catalog.ts's ZONES_BY_APPLICATION comment for
  // why these are clones rather than a reduced variant.
  highCabinet: BlocksState;
  library: BlocksState;
  // Closet Hangers / Shoe Rack — same engine, but capped shelf count and
  // linear-only (see catalog.ts's MAX_SHELVES_BY_ZONE/LINEAR_ONLY_ZONES).
  closetHangers: BlocksState;
  shoeRack: BlocksState;
}

export interface BomRow {
  zone: string;
  qty: number;
  sku: string;
  description: string;
  notes?: string;
}

export interface BomResult {
  rows: BomRow[];
  total: number;
}

export interface BomGroup {
  zone: string;
  rows: BomRow[];
}

// ---- Default-state factories (ported from simpleDefault / blockDefault) ----

export function simpleDefault(linearOnly = false): SimpleZoneState {
  return {
    length: 0,
    zoneCount: 1,
    zoneLengths: [0, 0, 0, 0],
    zoneControl: "together",
    unit: "in",
    lightType: linearOnly ? "linear" : "puck",
    spacing: 16,
    spacingUnit: "in",
    puckWatts: 3.5,
    linearFamily: "silicone-6x6",
    control: "touch",
    powerType: "ultra",
    cct: "3000",
    mounting: "recess",
    puckFinish: "white",
    controlSystem: "wired",
    includeInstallBracket: true,
  };
}

export function blockDefault(): CabinetBlock {
  return {
    included: false,
    mode: "shelf",
    mounting: "recess",
    height: 84,
    shelves: 3,
    topLight: false,
    topLightControl: "same",
    topControlSystem: "wired",
    topControl: "door",
    length: 30,
    lightType: "linear",
    // Rigid 6 × 8 mm is vertical-side-panel-only (see catalog.ts
    // LinearFamily.verticalOnly) and this default block starts in "shelf"
    // mode, so it can't be the default profile here — Rigid 10 × 15 mm is
    // the next general-purpose recess profile.
    linearFamily: "rigid-10x15",
    spacing: 16,
    puckWatts: 3.5,
    puckFinish: "white",
    cct: "3000",
    includeInstallBracket: true,
  };
}

// Pre-caps a block's starting shelf count at a real max (see catalog.ts's
// MAX_SHELVES_BY_ZONE) — used where blockDefault()'s shelves: 3 would
// already violate a lower real cap before the customer touches anything.
function cappedBlockDefault(maxShelves: number): CabinetBlock {
  return { ...blockDefault(), shelves: Math.min(3, maxShelves) };
}

// Closet Hangers' "shelves" field is really "hanging compartments" — a
// 1-or-2 dropdown, not a free-typed number (see catalog.ts's
// CLOSET_HANGER_COMPARTMENT_COUNTS) — so a fresh block starts at 1 (a
// single continuous hanging section), not pre-set to the 2-compartment max
// the way a generic capped default would. lightType is already "linear"
// from blockDefault(), matching this zone's linear-only restriction
// (catalog.ts's LINEAR_ONLY_ZONES), so nothing else needs overriding here.
function closetHangerBlockDefault(): CabinetBlock {
  return { ...blockDefault(), shelves: 1 };
}

// Floating Shelves' own block default: shelves is pre-capped at 1 (see
// cappedBlockDefault's comment — each block already IS one physical shelf),
// plus a starting per-shelf control choice ("wired"/"motion", matching the
// zone-level default below) so a shelf already has a sane value the moment
// the zone is switched to per-shelf ("Separate") control.
function floatingShelfBlockDefault(): CabinetBlock {
  return { ...cappedBlockDefault(1), controlSystem: "wired", control: "motion" };
}

export function defaultConfiguratorState(): ConfiguratorState {
  return {
    selected: {
      undercabinet: false,
      floating: false,
      toeKick: false,
      crown: false,
      base: false,
      wall: false,
      pantry: false,
      drawers: false,
      highCabinet: false,
      library: false,
      closetHangers: false,
      shoeRack: false,
      floatingCabinet: false,
    },
    project: {
      name: "",
      client: "",
      location: "",
      provider: "distributor",
      providerName: "",
      notes: "",
      email: "",
      phone: "",
      cabinet: "frameless",
      installLocation: "factory",
      installer: "cabinet",
      application: "kitchen",
      install: "plug",
    },
    simple: {
      undercabinet: { ...simpleDefault(), control: "remote1Zone" },
      toeKick: { ...simpleDefault(true), control: "motion" },
      crown: { ...simpleDefault(true), control: "motion" },
      floatingCabinet: { ...simpleDefault(true), control: "motion" },
    },
    base: {
      unit: "in",
      mounting: "recess",
      controlSystem: "wired",
      sensorInstall: "recess",
      powerType: "ultra",
      control: "doubleDoor",
      blocks: Array.from({ length: 4 }, blockDefault),
    },
    wall: {
      unit: "in",
      mounting: "recess",
      controlSystem: "wired",
      group: true,
      powerType: "ultra",
      control: "doubleDoor",
      section: "wall",
      blocks: Array.from({ length: 4 }, blockDefault),
    },
    // Floating Shelves — its own zone/step now (previously a mode switch
    // inside Wall Cabinets, see BlocksState.section's comment). "doubleDoor"
    // isn't a valid control for this zone (CONTROL_OPTIONS.floating has no
    // door-sensor options at all — it's a shelf, not a cabinet), so this
    // defaults to "motion" instead, matching Toe Kick/Crown's default.
    // group:false = independent per-shelf control by default — verified
    // directly against the live reference wizard's "Control all floating
    // shelves with one sensor/switch?" field, whose default is blank and
    // behaves exactly like "No" (each shelf gets its own independent
    // control choice). Earlier this zone defaulted to pooled (group:true);
    // corrected 2026-08-28 once the reference wizard's actual default
    // behavior was confirmed. The customer can still switch to one pooled
    // driver/control for the whole zone instead (see forms.tsx's
    // BlocksZoneForm). Each block is one physical shelf (no "how many
    // shelves in this cabinet" sub-count, and no Layout/Vertical option — a
    // floating shelf has no cabinet body or side panels to gable-light), so
    // its block default (floatingShelfBlockDefault()) is pre-set to
    // shelves:1 rather than blockDefault()'s cabinet-oriented shelves:3, and
    // carries its own starting per-shelf control choice for the
    // group:false/independent default above.
    floating: {
      unit: "in",
      mounting: "recess",
      controlSystem: "wired",
      group: false,
      powerType: "ultra",
      control: "motion",
      section: "floating",
      blocks: Array.from({ length: 4 }, floatingShelfBlockDefault),
    },
    pantry: {
      unit: "in",
      mounting: "recess",
      controlSystem: "wired",
      sensorInstall: "recess",
      powerType: "ultra",
      control: "door",
      blocks: Array.from({ length: 4 }, blockDefault),
    },
    drawers: {
      unit: "in",
      control: "door",
      powerType: "ultra",
      blocks: Array.from({ length: 4 }, () => ({
        included: false,
        count: 1,
        length: 24,
        // Drawers have no vertical layout concept, so — same reasoning as
        // blockDefault() above — the default can't be the vertical-only
        // Rigid 6 × 8 mm profile.
        linearFamily: "rigid-10x15",
        mounting: "recess" as Mounting,
        cct: "3000" as const,
      })),
    },
    // Pantry-clone defaults — see the ConfiguratorState.highCabinet/library
    // comment above.
    highCabinet: {
      unit: "in",
      mounting: "recess",
      controlSystem: "wired",
      sensorInstall: "recess",
      powerType: "ultra",
      control: "door",
      blocks: Array.from({ length: 4 }, blockDefault),
    },
    library: {
      unit: "in",
      mounting: "recess",
      controlSystem: "wired",
      sensorInstall: "recess",
      powerType: "ultra",
      control: "door",
      blocks: Array.from({ length: 4 }, blockDefault),
    },
    // Open shelving, not cabinets with doors — same reasoning as Floating
    // Shelves' defaults (no sensorInstall, "motion" control since "door"
    // isn't a real option here — see catalog.ts CONTROL_OPTIONS.
    // closetHangers/.shoeRack). Closet Hangers' "shelves" field is really a
    // 1-or-2 "hanging compartments" dropdown (see catalog.ts's
    // CLOSET_HANGER_COMPARTMENT_COUNTS), so its blocks use
    // closetHangerBlockDefault() (starts at 1, not the 2-compartment max).
    // Shoe Rack's shelf count is a plain free number like Base/Pantry/etc.
    // (verified against the live reference wizard — it was incorrectly
    // capped at 2 in an earlier pass before that doc existed), so it uses
    // the same plain blockDefault() everyone else does.
    closetHangers: {
      unit: "in",
      mounting: "recess",
      controlSystem: "wired",
      group: true,
      powerType: "ultra",
      control: "motion",
      blocks: Array.from({ length: 4 }, closetHangerBlockDefault),
    },
    shoeRack: {
      unit: "in",
      mounting: "recess",
      controlSystem: "wired",
      group: true,
      powerType: "ultra",
      control: "motion",
      blocks: Array.from({ length: 4 }, blockDefault),
    },
  };
}

// Defensively reconstitutes a ConfiguratorState loaded from a saved quote
// (lib/configurator/quotes.ts) on top of a fresh default state, rather than
// trusting the loaded JSON blob to already have every field the app
// currently expects. A quote saved by an older version of the app (fewer
// ProjectInfo fields, fewer blocks per zone, a since-renamed key) would
// otherwise leave those fields `undefined` on load — which for a
// controlled <input value={...}> means the field silently goes blank/
// uncontrolled instead of falling back to a sane default, which is exactly
// what "the saved project doesn't load completely" looks like from the
// UI. Every nested object is merged shallowly onto its `default*()`
// counterpart so a missing or stale key always falls back cleanly instead
// of propagating `undefined`.
export function mergeConfiguratorState(loaded: Partial<ConfiguratorState> | null | undefined): ConfiguratorState {
  const base = defaultConfiguratorState();
  if (!loaded) return base;

  const mergeBlocks = <T extends { included: boolean }>(defaults: T[], loadedBlocks: T[] | undefined, factory: () => T): T[] => {
    if (!Array.isArray(loadedBlocks) || loadedBlocks.length === 0) return defaults;
    return loadedBlocks.map((b) => ({ ...factory(), ...b }));
  };

  // One-time migration: Toe Kick / Crown Moulding used to be a single-run
  // zone (only SimpleZoneState.length was ever read/written by the UI or
  // engine) — they now support 1-4 runs exactly like Undercabinet already
  // did, reading zoneCount/zoneLengths instead (see engine.ts's addSimple).
  // An older saved project has its real run length filed only under
  // `length`, with zoneLengths still at its untouched default ([0,0,0,0]) —
  // detect that shape and seed zoneLengths[0] from it so the saved length
  // isn't silently dropped the first time the project reloads under the
  // new logic. A no-op for Undercabinet (already used zoneLengths) or any
  // project that already has real zoneLengths data.
  const migrateSimpleZone = (loadedZone: Partial<SimpleZoneState> | undefined, baseZone: SimpleZoneState): SimpleZoneState => {
    const merged: SimpleZoneState = { ...baseZone, ...(loadedZone ?? {}) };
    const hasRealZoneLength = Array.isArray(merged.zoneLengths) && merged.zoneLengths.some((n) => n > 0);
    if (!hasRealZoneLength && merged.length > 0) {
      const zoneLengths = [...merged.zoneLengths];
      zoneLengths[0] = merged.length;
      return { ...merged, zoneLengths, zoneCount: Math.max(1, merged.zoneCount || 1) };
    }
    return merged;
  };

  // One-time migration: Floating Shelves used to live inside the Wall
  // Cabinets zone as a mode switch (wall.section === "floating") instead of
  // being its own zone/step. An older saved project with that flag set has
  // its real data (and its "included" toggle) filed under wall/
  // selected.wall — route both to the new floating/selected.floating slot
  // instead of losing them; `wall` itself falls back to its own defaults,
  // since a project that was actually using Floating Shelves mode never had
  // real Wall Cabinets data worth keeping there.
  const wallWasFloating = loaded.wall?.section === "floating";
  const loadedWallSlot = wallWasFloating ? undefined : loaded.wall;
  const loadedFloatingSlot = wallWasFloating ? loaded.wall : loaded.floating;

  return {
    selected: {
      ...base.selected,
      ...(loaded.selected ?? {}),
      wall: wallWasFloating ? false : (loaded.selected?.wall ?? base.selected.wall),
      floating: wallWasFloating ? (loaded.selected?.wall ?? base.selected.floating) : (loaded.selected?.floating ?? base.selected.floating),
    },
    project: { ...base.project, ...(loaded.project ?? {}) },
    simple: {
      undercabinet: { ...base.simple.undercabinet, ...(loaded.simple?.undercabinet ?? {}) },
      toeKick: migrateSimpleZone(loaded.simple?.toeKick, base.simple.toeKick),
      crown: migrateSimpleZone(loaded.simple?.crown, base.simple.crown),
      // Brand-new zone (no prior saved shape to migrate from), but reusing
      // migrateSimpleZone here too costs nothing and keeps this block
      // uniform with its two siblings above.
      floatingCabinet: migrateSimpleZone(loaded.simple?.floatingCabinet, base.simple.floatingCabinet),
    },
    base: {
      ...base.base,
      ...(loaded.base ?? {}),
      blocks: mergeBlocks(base.base.blocks, loaded.base?.blocks, blockDefault),
    },
    wall: {
      ...base.wall,
      ...(loadedWallSlot ?? {}),
      blocks: mergeBlocks(base.wall.blocks, loadedWallSlot?.blocks, blockDefault),
    },
    floating: {
      ...base.floating,
      ...(loadedFloatingSlot ?? {}),
      blocks: mergeBlocks(base.floating.blocks, loadedFloatingSlot?.blocks, floatingShelfBlockDefault),
    },
    pantry: {
      ...base.pantry,
      ...(loaded.pantry ?? {}),
      blocks: mergeBlocks(base.pantry.blocks, loaded.pantry?.blocks, blockDefault),
    },
    highCabinet: {
      ...base.highCabinet,
      ...(loaded.highCabinet ?? {}),
      blocks: mergeBlocks(base.highCabinet.blocks, loaded.highCabinet?.blocks, blockDefault),
    },
    library: {
      ...base.library,
      ...(loaded.library ?? {}),
      blocks: mergeBlocks(base.library.blocks, loaded.library?.blocks, blockDefault),
    },
    closetHangers: {
      ...base.closetHangers,
      ...(loaded.closetHangers ?? {}),
      blocks: mergeBlocks(base.closetHangers.blocks, loaded.closetHangers?.blocks, closetHangerBlockDefault),
    },
    shoeRack: {
      ...base.shoeRack,
      ...(loaded.shoeRack ?? {}),
      blocks: mergeBlocks(base.shoeRack.blocks, loaded.shoeRack?.blocks, blockDefault),
    },
    drawers: {
      ...base.drawers,
      ...(loaded.drawers ?? {}),
      blocks: mergeBlocks(base.drawers.blocks, loaded.drawers?.blocks, () => ({
        included: false,
        count: 1,
        length: 24,
        linearFamily: "rigid-10x15",
        mounting: "recess" as Mounting,
        cct: "3000" as const,
      })),
    },
  };
}

export type { ZoneKey };

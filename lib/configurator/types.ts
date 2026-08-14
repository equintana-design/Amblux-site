// State shapes recovered from the compiled AMBLUX configurator build.
// These mirror the original React component's useState shapes exactly so
// the calculation engine (engine.ts) can be ported as pure functions that
// take this state as input, independent of any UI framework.

import type { ZoneKey } from "./catalog";

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
  toeKick: boolean;
  crown: boolean;
  base: boolean;
  wall: boolean;
  pantry: boolean;
  drawers: boolean;
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
  application: string;
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
}

export interface BlocksState {
  unit: Unit;
  mounting: Mounting;
  controlSystem: ControlSystem;
  sensorInstall?: Mounting;
  group?: boolean;
  powerType: PowerType;
  control: string;
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
  pantry: BlocksState;
  drawers: DrawersState;
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
    linearFamily: "rigid-6x8",
    spacing: 16,
    puckWatts: 3.5,
    puckFinish: "white",
    cct: "3000",
    includeInstallBracket: true,
  };
}

export function defaultConfiguratorState(): ConfiguratorState {
  return {
    selected: {
      undercabinet: false,
      toeKick: false,
      crown: false,
      base: false,
      wall: false,
      pantry: false,
      drawers: false,
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
        linearFamily: "rigid-6x8",
        mounting: "recess" as Mounting,
        cct: "3000" as const,
      })),
    },
  };
}

export type { ZoneKey };

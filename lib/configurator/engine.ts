// BOM / wattage / driver-sizing calculation engine.
//
// Originally ported from the recovered AMBLUX `bom` useMemo, then rebuilt
// against Cabinet Light Builder's actual server-side calc engine (the real
// source, supplied directly — see engine.js/app-calc.js) after a side-by-side
// comparison surfaced three real discrepancies:
//   1. PSU/driver splitting: CLB fills 96W drivers to their 80%-safe usable
//      capacity and sizes one final remainder driver, instead of rounding up
//      to N full-size drivers.
//   2. Puck count: CLB rounds DOWN (not up) and applies a minimum-fixture
//      rule (runs <24in always get 1 puck; runs >=24in always get >=2),
//      instead of a plain ceiling.
//   3. Linear runs: CLB computes a bin-packed purchase list of stock pieces
//      that cover the entered run length, instead of the installer manually
//      picking one fixed-length preset.
// This module keeps CLB's actual math for all three, but resolves real
// AMBLUX SKUs (see catalog.ts LINEAR_FAMILIES) instead of CLB's SKU-less
// descriptive categories — the point of the AMBLUX build is that the right
// real product comes out the other end for the characteristics entered
// (mounting, linear type, CCT), not just a category label.
//
// Install hardware (clips/brackets) is a real AMBLUX accessory CLB has no
// equivalent of at all — which families need it, and the real SKU/name for
// each, comes straight from the real product list's "Required Accessories"
// column (see catalog.ts LINEAR_FAMILIES' installAccessorySku/Label), not
// from a recess-vs-surface guess: one recess-mount family (rigid-10x15)
// requires a bracket too. Per-run quantity uses AMBLUX's confirmed real
// spacing (4 per installed metre, minimum 1) — this happened to match the
// CLB estimate the engine started with, so no value changed, only the
// confidence behind it. Both real SKUs are confirmed sold in packs of 10.
// Matches CLB's scope otherwise: drawers never get this accessory (CLB's
// buildDrawerZone never calls the clips/power-cord logic other zones do).
//
// Framework-agnostic on purpose — no React/Next imports — so it can run
// identically in the browser today and move behind a server boundary later
// (hiding the logic from site visitors) without a rewrite.
//
// English-only for this port (see labels.ts) — French/Spanish existed in the
// original and are a deliberate, not-yet-communicated scope cut.

import {
  CONTROL_OPTIONS,
  EXTENSION_SKU,
  UNDERCABINET_REMOTE_CONTROLS,
  controlSku,
  driverLineFor,
  familyLengthsM,
  familyPieceSku,
  getLinearFamily,
  isLinearOnlyZone,
  normalizedPuckFinish,
  puckFaceplateSku,
  puckFixtureSku,
  receiverSku,
  CONTROL_LABEL,
  WIRELESS_DIMMING_RECEIVER,
  WIRELESS_DIMMING_RECEIVER_DESCRIPTION,
  WIRELESS_SENSOR_RECEIVER_DESCRIPTION,
  CLIPS_PER_METRE,
  CLIPS_PER_BAG,
  type LinearFamily,
} from "./catalog";
import { LABELS, finishLabel } from "./labels";
import type {
  BlocksState,
  BomGroup,
  BomResult,
  BomRow,
  ConfiguratorState,
  PowerType,
  SimpleZoneState,
  Unit,
} from "./types";

export function toInches(value: number, unit: Unit): number {
  if (unit === "in") return value;
  if (unit === "ft") return value * 12;
  if (unit === "cm") return value / 2.54;
  return value * 39.3701; // "m"
}

export function toMetres(value: number, unit: Unit): number {
  return toInches(value, unit) / 39.3701;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ---------------------------------------------------------------------
// Puck placement — matches Cabinet Light Builder's calcPuckPlacement()
// exactly: round DOWN (not up), plus a minimum-fixture business rule
// independent of the spacing math (runs under 24in never need more than
// one puck; runs 24in and over always need at least two).
// ---------------------------------------------------------------------
export interface PuckPlacement {
  puckCount: number;
  adjustedSpacingIn: number;
  positionsIn: number[];
}

export function calcPuckPlacement(runInches: number, spacingIn: number): PuckPlacement {
  if (runInches <= 0) return { puckCount: 0, adjustedSpacingIn: spacingIn, positionsIn: [] };
  let puckCount = Math.max(1, Math.floor(runInches / spacingIn));
  if (runInches < 24) puckCount = 1;
  else if (puckCount < 2) puckCount = 2;
  const adjustedSpacing = runInches / puckCount;
  const positions = Array.from({ length: puckCount }, (_, i) => adjustedSpacing / 2 + i * adjustedSpacing);
  return { puckCount, adjustedSpacingIn: adjustedSpacing, positionsIn: positions };
}

// ---------------------------------------------------------------------
// PSU / driver selection — matches Cabinet Light Builder's
// selectPowerSupplies() exactly: derate to 80% loading, pick the smallest
// single driver that covers it; if the load needs more than one driver,
// fill full-size (96W) drivers to their 80%-safe usable capacity and size
// one final driver to the remainder — NOT N same-size drivers.
// ---------------------------------------------------------------------
const PSU_MAX_LOADING = 0.8;

export interface PsuSupply {
  watts: number;
  usedWatts: number;
}

// kind picks which real driver line's stock sizes to size against (see
// catalog.ts DRIVER_LINES) — defaults to "ultra" since that's AMBLUX's only
// real driver line today; driverLineFor() itself falls back to "ultra" for
// any kind with no real line defined yet, so this never sizes against an
// invented stock list.
export function selectPowerSupplies(totalWatts: number, kind: PowerType = "ultra"): PsuSupply[] {
  const total = round2(totalWatts);
  if (total <= 0) return [];

  const sizes = driverLineFor(kind).sizes;
  const minCapacity = total / PSU_MAX_LOADING;
  const largest = sizes[sizes.length - 1];
  const usableLargest = round2(largest * PSU_MAX_LOADING);

  if (minCapacity <= largest) {
    for (const size of sizes) {
      if (minCapacity <= size) return [{ watts: size, usedWatts: total }];
    }
  }

  const supplies: PsuSupply[] = [];
  let remaining = total;
  while (remaining > usableLargest) {
    supplies.push({ watts: largest, usedWatts: usableLargest });
    remaining = round2(remaining - usableLargest);
  }
  const remCapacity = remaining / PSU_MAX_LOADING;
  for (const size of sizes) {
    if (remCapacity <= size) {
      supplies.push({ watts: size, usedWatts: remaining });
      break;
    }
  }
  return supplies;
}

// Builds the driver BOM row(s) for a load, aggregating same-size drivers
// into one row (qty = count) — same visual shape as before, but now
// correctly splits into different-size rows when a remainder driver differs
// from the full-size ones ahead of it.
function psuRows(zone: string, watts: number, psuLabel: string, kind: PowerType, notes?: string): BomRow[] {
  const supplies = selectPowerSupplies(watts, kind);
  const skuFor = driverLineFor(kind).skuFor;
  const bySize = new Map<number, number>();
  supplies.forEach((s) => bySize.set(s.watts, (bySize.get(s.watts) || 0) + 1));
  return Array.from(bySize.entries()).map(([size, count]) => ({
    zone,
    qty: count,
    sku: skuFor(size),
    description: `${psuLabel} · ${size} W`,
    notes,
  }));
}

function supplyCount(watts: number, kind: PowerType = "ultra"): number {
  return selectPowerSupplies(watts, kind).length;
}

// ---------------------------------------------------------------------
// Linear purchase-piece calculation — matches Cabinet Light Builder's
// selectLinearPieces()/buildLinearPurchaseRows(): an unbounded-knapsack
// search for the minimum number of stock pieces (any size reusable any
// number of times) whose combined length covers the target, worked in 0.1m
// units so 1/1.5/2.4/3/5m are all exact integers. Resolves each returned
// piece size to the real AMBLUX SKU for that family/CCT/length.
// ---------------------------------------------------------------------
const PIECE_GRANULARITY_M = 0.1;

export function selectPieces(targetM: number, sizesM: number[]): { sizeM: number; count: number }[] {
  if (!targetM || targetM <= 0 || sizesM.length === 0) return [];
  const gran = PIECE_GRANULARITY_M;
  let targetUnits = Math.round(targetM / gran);
  if (targetUnits * gran < targetM - 1e-6) targetUnits += 1;
  if (targetUnits < 1) targetUnits = 1;

  const sizeUnits = sizesM.map((s) => Math.round(s / gran));
  const maxSizeUnits = Math.max(...sizeUnits);
  const maxUnits = targetUnits + maxSizeUnits;

  const dp = new Array(maxUnits + 1).fill(Infinity);
  const choice = new Array(maxUnits + 1).fill(-1);
  dp[0] = 0;
  for (let u = 1; u <= maxUnits; u++) {
    for (let i = 0; i < sizeUnits.length; i++) {
      const su = sizeUnits[i];
      if (su <= u && dp[u - su] + 1 < dp[u]) {
        dp[u] = dp[u - su] + 1;
        choice[u] = i;
      }
    }
  }

  let bestUnits = -1;
  let bestPieces = Infinity;
  for (let tt = targetUnits; tt <= maxUnits; tt++) {
    if (dp[tt] < bestPieces) {
      bestPieces = dp[tt];
      bestUnits = tt;
    }
  }

  if (bestUnits === -1) {
    const largest = Math.max(...sizesM);
    return [{ sizeM: largest, count: Math.ceil(targetM / largest) }];
  }

  const counts = new Map<number, number>();
  let cur = bestUnits;
  while (cur > 0) {
    const idx = choice[cur];
    const su2 = sizeUnits[idx];
    const key = sizesM[idx];
    counts.set(key, (counts.get(key) || 0) + 1);
    cur -= su2;
  }
  return Array.from(counts.entries())
    .map(([sizeM, count]) => ({ sizeM, count }))
    .sort((a, b) => b.sizeM - a.sizeM);
}

export interface LinearPurchaseLine {
  sku: string;
  sizeM: number;
  qty: number;
}

// targetLengthM x repeat: repeat lets a shelf-light spec's per-shelf piece
// list be computed once and multiplied by shelf count (matches CLB's
// calcShelfLightSpec — every shelf in a block uses the same run length, so
// the piece breakdown for one shelf just repeats).
export function linearPurchaseLines(family: LinearFamily, cct: "3000" | "4000", targetLengthM: number, repeat = 1): LinearPurchaseLine[] {
  const lengths = familyLengthsM(family, cct);
  if (lengths.length === 0) return [];
  const pieces = selectPieces(targetLengthM, lengths);
  return pieces
    .filter((p) => p.count > 0)
    .map((p) => {
      const sku = familyPieceSku(family, cct, p.sizeM);
      return sku ? { sku, sizeM: p.sizeM, qty: p.count * repeat } : null;
    })
    .filter((l): l is LinearPurchaseLine => l !== null);
}

function receiverDescription(sku: string): string {
  return sku === WIRELESS_DIMMING_RECEIVER
    ? WIRELESS_DIMMING_RECEIVER_DESCRIPTION
    : WIRELESS_SENSOR_RECEIVER_DESCRIPTION;
}

type ControlOption = [id: string, label: string];

function zoneControls(zone: string, system: string): ControlOption[] {
  const ids = CONTROL_OPTIONS[zone]?.[system] || [];
  return ids.map((id) => [id, `${controlSku(id)} — ${CONTROL_LABEL[id] || id}`]);
}

function underCabinetRemoteOptions(): ControlOption[] {
  return UNDERCABINET_REMOTE_CONTROLS.map((id) => [id, `${controlSku(id)} — ${CONTROL_LABEL[id] || id}`]);
}

function findControlLabel(options: ControlOption[], id: string): string | undefined {
  return options.find(([optionId]) => optionId === id)?.[1];
}

// Packs needed for a run's given TOTAL installed length (already multiplied
// by however many fixtures/shelves/sides repeat it) — uses AMBLUX's
// confirmed real spacing (4 per installed metre, minimum 1), then packs
// that count into AMBLUX's real 10-per-pack packaging, confirmed on both
// real SKUs ("10pcs" / "bag of 10").
export function calcClipBags(totalLengthM: number): number {
  if (!totalLengthM || totalLengthM <= 0) return 0;
  const clipsNeeded = Math.max(1, Math.ceil(totalLengthM * CLIPS_PER_METRE));
  return Math.ceil(clipsNeeded / CLIPS_PER_BAG);
}

function pushLinearRows(
  rows: BomRow[],
  zone: string,
  family: LinearFamily,
  cct: "3000" | "4000",
  targetLengthM: number,
  repeat: number,
  mounting: "recess" | "surface",
  opts?: { notes?: string; includeAccessories?: boolean; includeOptionalAccessory?: boolean }
) {
  const mountingLabel = mounting === "recess" ? LABELS.recess : LABELS.surface;
  const lines = linearPurchaseLines(family, cct, targetLengthM, repeat);
  lines.forEach((line) => {
    rows.push({
      zone,
      qty: line.qty,
      sku: line.sku,
      description: `${family.label} · ${line.sizeM} m piece · ${cct} K · ${mountingLabel}`,
      notes: opts?.notes,
    });
  });
  if (lines.length === 0) return;

  // CLB never gives drawers a power cord or clips accessory at all (its
  // buildDrawerZone never calls the shared function other zones use for
  // this) — includeAccessories:false reproduces that, not just an
  // AMBLUX-specific choice.
  if (opts?.includeAccessories === false) return;

  if (family.powerCordSku) {
    rows.push({ zone, qty: repeat, sku: family.powerCordSku, description: "Linear solution power cord", notes: opts?.notes });
  }
  // Which families need install hardware — and whether it's called a "clip"
  // or a "bracket" — is a real per-family fact (see installAccessorySku on
  // LINEAR_FAMILIES), not a recess-vs-surface rule: rigid-10x15 is a
  // recess-mount family that still requires a bracket. For families flagged
  // installAccessoryOptional (currently just rigid-10x15, at your request),
  // the customer can drop this line from the BOM entirely via
  // opts.includeOptionalAccessory — defaults to included when the caller
  // doesn't pass it, so nothing changes unless the family is opted out.
  const skippedAsOptional = family.installAccessoryOptional && opts?.includeOptionalAccessory === false;
  if (family.installAccessorySku && !skippedAsOptional) {
    const bags = calcClipBags(targetLengthM * repeat);
    if (bags > 0) {
      rows.push({
        zone,
        qty: bags,
        sku: family.installAccessorySku,
        description: `${family.installAccessoryLabel || "Install hardware"} · 10-pack (${CLIPS_PER_METRE}/m est.)${
          family.installAccessoryOptional ? " · optional" : ""
        }`,
        notes: opts?.notes,
      });
    }
  }
}

/**
 * Computes the full bill of materials + total connected wattage for a
 * configurator state. Pure function — same input always produces the same
 * output, which is what makes it safe to run client-side today and move
 * behind a server boundary later without changing behaviour.
 */
export function computeBom(state: ConfiguratorState): BomResult {
  const { selected, simple, base, wall, floating, pantry, drawers, highCabinet, library, closetHangers, shoeRack } = state;
  const rows: BomRow[] = [];
  let total = 0;

  // ---- undercabinet / toeKick / crown ("simple" zones) ----
  const addSimple = (key: "undercabinet" | "toeKick" | "crown") => {
    if (!selected[key]) return;
    const z: SimpleZoneState = simple[key];
    const runLengths = key === "undercabinet" ? z.zoneLengths.slice(0, z.zoneCount) : [z.length];
    const isPuck = key === "undercabinet" && z.lightType === "puck";
    const family = getLinearFamily(z.linearFamily);
    const spacingIn = z.spacing > 0 ? toInches(z.spacing, z.spacingUnit) : 16;
    const name = LABELS.zoneNames[key];
    const availableControls = key === "undercabinet" ? underCabinetRemoteOptions() : zoneControls(key, z.controlSystem);
    const receiver = receiverSku(z.control);
    const mountingLabel = z.mounting === "recess" ? LABELS.recess : LABELS.surface;

    const results = runLengths
      .map((length, index) => {
        const inches = toInches(length, z.unit);
        const zone = key === "undercabinet" && z.zoneCount > 1 ? `${name} · Zone ${index + 1}` : name;

        if (isPuck) {
          const placement = calcPuckPlacement(inches, spacingIn);
          const watts = placement.puckCount * z.puckWatts;
          total += watts;
          if (placement.puckCount > 0) {
            const finish = normalizedPuckFinish(z.mounting, z.puckFinish);
            rows.push({
              zone,
              qty: placement.puckCount,
              sku: puckFixtureSku(z.mounting, finish),
              description: `${LABELS.puck} · ${LABELS.selectableWhite} · 3000 K / 4000 K / 5000 K · ${mountingLabel} · ${finishLabel(finish)}`,
              notes: `${LABELS.placement}: ${placement.positionsIn.map((p) => p.toFixed(1)).join(", ")} ${z.unit}`,
            });
            const faceplate = puckFaceplateSku(z.mounting, finish);
            if (faceplate) {
              rows.push({ zone, qty: placement.puckCount, sku: faceplate, description: `${LABELS.faceplate} · ${finishLabel(finish)}` });
            }
            rows.push({ zone, qty: placement.puckCount, sku: EXTENSION_SKU, description: "2m extension cord" });
          }
          return { zone, watts };
        }

        const lengthM = toMetres(length, z.unit);
        const watts = lengthM * family.wattsPerMetre;
        total += watts;
        if (length > 0) {
          pushLinearRows(rows, zone, family, z.cct, lengthM, 1, z.mounting, {
            includeOptionalAccessory: z.includeInstallBracket,
          });
          rows.push({ zone, qty: 1, sku: EXTENSION_SKU, description: "2m extension cord" });
        }
        return { zone, watts };
      })
      .filter((result) => result.watts > 0);

    if (key === "undercabinet" && z.zoneCount > 1 && z.zoneControl === "separate") {
      results.forEach(({ zone, watts }) => {
        rows.push(...psuRows(zone, watts, z.powerType === "hardwire" ? LABELS.hardPsu : LABELS.ultra, z.powerType));
        rows.push({
          zone,
          qty: 1,
          sku: controlSku(z.control),
          description: findControlLabel(availableControls, z.control) || z.control,
        });
        if (receiver) {
          rows.push({ zone, qty: supplyCount(watts, z.powerType), sku: receiver, description: receiverDescription(receiver) });
        }
      });
    } else if (results.length) {
      const totalZoneWatts = results.reduce((sum, result) => sum + result.watts, 0);
      rows.push(
        ...psuRows(
          name,
          totalZoneWatts,
          z.powerType === "hardwire" ? LABELS.hardPsu : LABELS.ultra,
          z.powerType,
          results.length > 1 ? LABELS.combinedDriver : undefined
        )
      );
      rows.push({
        zone: name,
        qty: 1,
        sku: controlSku(z.control),
        description: findControlLabel(availableControls, z.control) || z.control,
      });
      if (receiver) {
        rows.push({ zone: name, qty: supplyCount(totalZoneWatts, z.powerType), sku: receiver, description: receiverDescription(receiver) });
      }
    }
  };

  addSimple("undercabinet");
  addSimple("toeKick");
  addSimple("crown");

  // ---- base / wall / floating / pantry / highCabinet / library (per-cabinet-block "blocks" zones) ----
  // Floating Shelves shares this exact engine with Base/Wall/Pantry (same
  // as the reference doc's "storage cabinet" reuse pattern) — it used to be
  // reached via key==="wall" with zoneState.section==="floating"; it's now
  // its own top-level zone/step, so isFloatingShelf below is just
  // key==="floating" directly. See BlocksState.section's comment and
  // mergeConfiguratorState() for the one-time migration of old saved data.
  //
  // High Cabinet and Library/Bookcase are exact behavioral clones of Pantry
  // under a different zone key/label (see catalog.ts's ZONES_BY_APPLICATION
  // comment) — they fall in wherever Pantry does below (opt-in top light,
  // pooled driver, door/motion controls).
  //
  // Closet Hangers and Shoe Rack also share this engine, but are always
  // linear (never puck) for both the main run and its optional top light —
  // catalog.ts's isLinearOnlyZone() is the single source of truth for that,
  // so a block loaded with a stale/invalid puck lightType still computes
  // and displays as linear rather than emitting a puck row that couldn't
  // exist for these zones in the wizard.
  const addBlocks = (key: "base" | "wall" | "floating" | "pantry" | "highCabinet" | "library" | "closetHangers" | "shoeRack", zoneState: BlocksState) => {
    if (!selected[key]) return;
    let zoneWatts = 0;
    const isFloatingShelf = key === "floating";
    const independentDrivers = key === "base" || key === "wall";
    const linearOnly = isLinearOnlyZone(key);

    zoneState.blocks.forEach((b, i) => {
      if (!b.included) return;
      const hasTopLight =
        (key === "pantry" || key === "wall" || key === "highCabinet" || key === "library" || key === "closetHangers" || key === "shoeRack") &&
        b.topLight;
      // Vertical Gable Lighting is always installed on both sides of the
      // cabinet (matches Cabinet Light Builder exactly) — length, wattage,
      // fixture count, and purchase-piece counts all double.
      const sideCount = 2;
      const fixtures = b.mode === "vertical" ? sideCount : Math.max(1, b.shelves);
      const length = b.mode === "vertical" ? b.height : b.length;
      const inches = toInches(length, zoneState.unit);
      const spacingIn = b.spacing > 0 ? b.spacing : 16;
      const mountingLabel = b.mounting === "recess" ? LABELS.recess : LABELS.surface;

      let watts = 0;
      const zone = `${LABELS.zoneNames[key]} · ${LABELS.cabinet} ${i + 1}`;
      const finish = normalizedPuckFinish(b.mounting, b.puckFinish);
      const family = getLinearFamily(b.linearFamily);

      if (!linearOnly && b.lightType === "puck" && b.mode !== "vertical") {
        const placement = calcPuckPlacement(inches, spacingIn);
        const puckQty = placement.puckCount * fixtures;
        watts = puckQty * b.puckWatts;
        if (puckQty > 0) {
          rows.push({
            zone,
            qty: puckQty,
            sku: puckFixtureSku(b.mounting, finish),
            description: `${LABELS.puck} · ${LABELS.selectableWhite} · 3000 K / 4000 K / 5000 K · ${finishLabel(finish)} · ${mountingLabel}`,
            notes: `${LABELS.placementEachRun}: ${placement.positionsIn.map((p) => p.toFixed(1)).join(", ")} ${zoneState.unit}`,
          });
          const faceplate = puckFaceplateSku(b.mounting, finish);
          if (faceplate) rows.push({ zone, qty: puckQty, sku: faceplate, description: `${LABELS.faceplate} · ${finishLabel(finish)}` });
          rows.push({ zone, qty: fixtures, sku: EXTENSION_SKU, description: "2m extension cord" });
        }
      } else {
        const lengthM = toMetres(length, zoneState.unit);
        watts = lengthM * family.wattsPerMetre * fixtures;
        pushLinearRows(rows, zone, family, b.cct, lengthM, fixtures, b.mounting, {
          notes: b.mode === "vertical" ? "both sides" : undefined,
          includeOptionalAccessory: b.includeInstallBracket,
        });
        rows.push({ zone, qty: fixtures, sku: EXTENSION_SKU, description: "2m extension cord" });
      }
      total += watts;
      zoneWatts += watts;

      // "Light on top of cabinet" — independent add-on spec, own shelf light
      // (always shelf-mode; vertical toppers aren't modeled here).
      const topInches = toInches(b.length, zoneState.unit);
      let topWatts = 0;
      if (hasTopLight) {
        const topZone = `${zone} · ${LABELS.topLightZone}`;
        if (!linearOnly && b.lightType === "puck") {
          const placement = calcPuckPlacement(topInches, spacingIn);
          topWatts = placement.puckCount * b.puckWatts;
          if (placement.puckCount > 0) {
            rows.push({
              zone: topZone,
              qty: placement.puckCount,
              sku: puckFixtureSku(b.mounting, finish),
              description: `${LABELS.puck} · ${LABELS.selectableWhite} · 3000 K / 4000 K / 5000 K · ${finishLabel(finish)} · ${mountingLabel}`,
              notes: `${LABELS.placement}: ${placement.positionsIn.map((p) => p.toFixed(1)).join(", ")} ${zoneState.unit}`,
            });
            const faceplate = puckFaceplateSku(b.mounting, finish);
            if (faceplate) rows.push({ zone: topZone, qty: placement.puckCount, sku: faceplate, description: `${LABELS.faceplate} · ${finishLabel(finish)}` });
            rows.push({ zone: topZone, qty: 1, sku: EXTENSION_SKU, description: "2m extension cord" });
          }
        } else {
          const topLengthM = toMetres(b.length, zoneState.unit);
          topWatts = topLengthM * family.wattsPerMetre;
          pushLinearRows(rows, topZone, family, b.cct, topLengthM, 1, b.mounting, {
            includeOptionalAccessory: b.includeInstallBracket,
          });
          rows.push({ zone: topZone, qty: 1, sku: EXTENSION_SKU, description: "2m extension cord" });
        }
        total += topWatts;

        if (b.topLightControl === "separate") {
          rows.push(...psuRows(topZone, topWatts, LABELS.power, zoneState.powerType, LABELS.separateTopControl));
          const topControls = zoneControls("pantry", b.topControlSystem);
          rows.push({
            zone: topZone,
            qty: 1,
            sku: controlSku(b.topControl),
            description: findControlLabel(topControls, b.topControl) || b.topControl,
          });
          const topReceiver = receiverSku(b.topControl);
          if (topReceiver) {
            rows.push({ zone: topZone, qty: supplyCount(topWatts, zoneState.powerType), sku: topReceiver, description: receiverDescription(topReceiver) });
          }
        } else {
          zoneWatts += topWatts;
        }
      }

      if (independentDrivers) {
        const driverWatts = watts + (hasTopLight && b.topLightControl === "same" ? topWatts : 0);
        rows.push(...psuRows(zone, driverWatts, LABELS.power, zoneState.powerType, LABELS.independentDriver));
        const availableControls = zoneControls(key === "wall" ? "wall" : key, zoneState.controlSystem);
        rows.push({
          zone,
          qty: 1,
          sku: controlSku(zoneState.control),
          description: findControlLabel(availableControls, zoneState.control) || zoneState.control,
        });
        const receiver = receiverSku(zoneState.control);
        if (receiver) {
          rows.push({ zone, qty: supplyCount(driverWatts, zoneState.powerType), sku: receiver, description: receiverDescription(receiver) });
        }
      }
    });

    if (zoneWatts && !independentDrivers) {
      const activeBlocks = zoneState.blocks.filter((block) => block.included).length;
      rows.push(...psuRows(LABELS.zoneNames[key], zoneWatts, LABELS.power, zoneState.powerType, activeBlocks > 1 ? LABELS.combinedDriver : undefined));
      const availableControls = zoneControls(isFloatingShelf ? "floating" : key, zoneState.controlSystem);
      rows.push({
        zone: LABELS.zoneNames[key],
        qty: 1,
        sku: controlSku(zoneState.control),
        description: findControlLabel(availableControls, zoneState.control) || zoneState.control,
      });
      const receiver = receiverSku(zoneState.control);
      if (receiver) {
        rows.push({ zone: LABELS.zoneNames[key], qty: supplyCount(zoneWatts, zoneState.powerType), sku: receiver, description: receiverDescription(receiver) });
      }
    }
  };

  addBlocks("base", base);
  addBlocks("wall", wall);
  addBlocks("floating", floating);
  addBlocks("pantry", pantry);
  addBlocks("highCabinet", highCabinet);
  addBlocks("library", library);
  addBlocks("closetHangers", closetHangers);
  addBlocks("shoeRack", shoeRack);

  // ---- drawers ----
  if (selected.drawers) {
    let drawerWatts = 0;
    drawers.blocks.forEach((b, i) => {
      if (!b.included) return;
      const family = getLinearFamily(b.linearFamily);
      const lengthM = toMetres(b.length, drawers.unit);
      const watts = lengthM * family.wattsPerMetre * b.count;
      total += watts;
      drawerWatts += watts;
      const zone = `${LABELS.zoneNames.drawers} · ${LABELS.drawer} ${i + 1}`;
      // CLB's buildDrawerZone never gives drawers a power-cord or clips
      // accessory (only the fixture row + extension cords + driver) —
      // includeAccessories:false reproduces that exactly.
      pushLinearRows(rows, zone, family, b.cct, lengthM, b.count, b.mounting, { includeAccessories: false });
      rows.push({ zone, qty: b.count, sku: EXTENSION_SKU, description: "2m extension cord" });
    });
    if (drawers.blocks.some((b) => b.included)) {
      const activeDrawers = drawers.blocks.filter((block) => block.included).length;
      rows.push(...psuRows(LABELS.zoneNames.drawers, drawerWatts, LABELS.power, drawers.powerType, activeDrawers > 1 ? LABELS.combinedDriver : undefined));
    }
  }

  return { rows, total: round2(total) };
}

export function groupBom(bom: BomResult): BomGroup[] {
  const groups: BomGroup[] = [];
  bom.rows.forEach((row) => {
    const existing = groups.find((group) => group.zone === row.zone);
    if (existing) existing.rows.push(row);
    else groups.push({ zone: row.zone, rows: [row] });
  });
  return groups;
}

export interface PartListLine {
  sku: string;
  description: string;
  qty: number;
}

/**
 * Rolls the zone-grouped BOM up into one line per SKU — the actual
 * purchasable parts list, quantities summed across every zone that uses
 * that part. This is what a distributor or installer would order against,
 * as distinct from the zone-by-zone BOM (which is what explains *why* each
 * part is there).
 */
export function consolidateParts(bom: BomResult): PartListLine[] {
  const bySku = new Map<string, PartListLine>();
  bom.rows.forEach((row) => {
    const existing = bySku.get(row.sku);
    if (existing) {
      existing.qty += row.qty;
    } else {
      bySku.set(row.sku, { sku: row.sku, description: row.description, qty: row.qty });
    }
  });
  return Array.from(bySku.values()).sort((a, b) => a.sku.localeCompare(b.sku));
}

/**
 * Deterministic, human-readable job/quote number so a parts list can be
 * referenced later (by AMBLUX, a distributor, or the end customer) without
 * a database — same project inputs always produce the same number.
 */
export function generateJobNumber(projectName: string, seed: number): string {
  const base = (projectName || "AMBLUX-JOB").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const stamp = Math.abs(seed).toString(36).toUpperCase().padStart(5, "0").slice(0, 5);
  return `${base || "AMBLUX-JOB"}-${stamp}`;
}

/** Simple content hash used to seed generateJobNumber deterministically from BOM contents. */
export function hashBom(bom: BomResult): number {
  let h = 0;
  const s = bom.rows.map((r) => `${r.sku}:${r.qty}`).join("|") + `|${bom.total}`;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return h;
}

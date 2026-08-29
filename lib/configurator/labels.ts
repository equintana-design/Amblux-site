// English UI/BOM copy recovered from the compiled AMBLUX configurator build
// (the `t` / `en` branch of the multi-language `copy` object in the source).
//
// This file now only backs computed catalog/engine output (BOM row zone
// group headers, generated part descriptions, finish names baked into
// SKUs — see engine.ts) — deliberately English-only, since that's
// calculated data, not UI chrome. All translatable UI chrome that used to
// read LABELS.* (Field labels, Section titles, button text) has moved to
// lib/i18n/dictionaries.ts's `configurator`/`configuratorExtra` namespaces
// and is wired through useTranslations() — see app/configurator/forms.tsx.

import type { ZoneKey } from "./catalog";

export const LABELS = {
  zoneNames: {
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
    floatingCabinet: "Floating Cabinet",
    vanity: "Vanity",
  },
  selectableWhite: "Selectable White",
  puck: "Puck light",
  linear: "Linear light",
  combinedDriver: "Combined driver for all zones",
  independentDriver: "Independent driver for this cabinet",
  power: "Power supply type",
  ultra: "Ultra-thin power supply",
  hardPsu: "Hardwire power supply",
  recess: "Recessed",
  surface: "Surface-mount",
  finish: {
    white: "White",
    satinNickel: "Satin nickel",
    black: "Black",
    chrome: "Chrome",
  } as Record<string, string>,
  faceplate: "Recessed puck faceplate",
  cabinet: "Cabinet",
  drawer: "Drawer",
  separateTopControl: "Separate control system",
  topLightZone: "Top of cabinet",
  placement: "Puck placement",
  placementEachRun: "Puck placement on each shelf/run",
  // Vanity's two independent per-unit sub-fixtures — see engine.ts's
  // addVanity() and forms.tsx's VanityForm, both of which build the BOM
  // zone-row string as `${zone name} · Cabinet N · Doors`/`· Drawers` and
  // must stay byte-for-byte in sync with each other, hence the shared
  // constant instead of each file inlining its own literal.
  vanityDoors: "Doors",
  vanityDrawers: "Drawers",
} as const;

export function finishLabel(finish: string): string {
  return LABELS.finish[finish] || finish;
}

// Floating Shelves' per-block BOM row/UI unit is a "Shelf," not a
// "Cabinet" — a floating shelf has no cabinet body, just a mounted run. See
// engine.ts's addBlocks() (row zone naming) and forms.tsx's BlocksZoneForm
// (CalculatedSolution title, which must match the row zone string exactly
// for the rows.filter() lookup to work) for the two callers of this.
export function blockUnitLabel(zone: ZoneKey): string {
  return zone === "floating" ? "Shelf" : LABELS.cabinet;
}

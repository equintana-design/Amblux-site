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

export const LABELS = {
  zoneNames: {
    undercabinet: "Under-cabinet lighting",
    toeKick: "Toe kick",
    crown: "Crown moulding",
    base: "Base Cabinets",
    wall: "Wall Cabinets / Floating Shelf",
    pantry: "Pantries",
    drawers: "Drawer lights",
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
} as const;

export function finishLabel(finish: string): string {
  return LABELS.finish[finish] || finish;
}

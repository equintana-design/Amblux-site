// English UI/BOM copy recovered from the compiled AMBLUX configurator build
// (the `t` / `en` branch of the multi-language `copy` object in the source).
// French and Spanish were also present in the original and are a deliberate
// scope cut for this port — English only, for now.

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

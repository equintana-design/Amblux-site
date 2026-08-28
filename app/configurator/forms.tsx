"use client";

import {
  CONTROL_LABEL,
  CONTROL_OPTIONS,
  RECESSED_FACEPLATES,
  SURFACE_PUCKS,
  UNDERCABINET_REMOTE_CONTROLS,
  availablePowerTypes,
  controlSku,
  familyCcts,
  getLinearFamily,
  isLinearOnlyZone,
  linearFamiliesFor,
  maxShelvesFor,
  puckWattsFor,
} from "@/lib/configurator/catalog";
import { blockUnitLabel, finishLabel, LABELS } from "@/lib/configurator/labels";
import type {
  BlocksState,
  BomResult,
  CabinetBlock,
  DrawerBlock,
  DrawersState,
  SimpleZoneState,
  Unit,
} from "@/lib/configurator/types";
import { useTranslations, type TFunction } from "@/app/providers/LocaleProvider";
import { CalculatedSolution, Field, NumberInput, ReadOnly, Section, Select, Toggle } from "./ui";

function unitOptions(t: TFunction): { value: Unit; label: string }[] {
  return [
    { value: "in", label: t("configuratorExtra.unitInches") },
    { value: "ft", label: t("configuratorExtra.unitFeet") },
    { value: "cm", label: t("configuratorExtra.unitCentimetres") },
    { value: "m", label: t("configuratorExtra.unitMetres") },
  ];
}

function controlOptionsFor(zone: string, system: string): { value: string; label: string }[] {
  const ids = CONTROL_OPTIONS[zone]?.[system] || [];
  return ids.map((id) => ({ value: id, label: `${controlSku(id)} — ${CONTROL_LABEL[id] || id}` }));
}

function controlSystemOptions(zone: string, t: TFunction): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [
    { value: "wired", label: t("configurator.wiredSensor") },
    { value: "wireless", label: t("configurator.wirelessSensor") },
  ];
  if ((CONTROL_OPTIONS[zone]?.wallControl || []).length > 0) {
    opts.push({ value: "wallControl", label: t("configurator.wallControl") });
  }
  return opts;
}

// Only offers a driver kind if catalog.ts's DRIVER_LINES has a real AMBLUX
// product line behind it — today that's just the 24V "ultra-thin" driver,
// so Hardwire is absent everywhere until a real 120V hardwire driver SKU
// exists. See catalog.ts's DRIVER_LINES/availablePowerTypes() comment.
function powerTypeOptions(t: TFunction): { value: string; label: string }[] {
  return availablePowerTypes().map((kind) => ({
    value: kind,
    label: kind === "hardwire" ? t("configurator.hardPsu") : t("configurator.ultra"),
  }));
}

function puckFinishOptions(mounting: "recess" | "surface"): { value: string; label: string }[] {
  const keys = Object.keys(mounting === "recess" ? RECESSED_FACEPLATES : SURFACE_PUCKS);
  return keys.map((k) => ({ value: k, label: finishLabel(k) }));
}

// Real AMBLUX linear product lines available for a given mounting — this is
// the "right product for the right characteristics" step: the installer
// picks a physical profile, not a fixed-length SKU. Purchase quantity is
// computed from the entered run length at calculation time (see engine.ts).
function linearFamilyOptions(mounting: "recess" | "surface", mode?: "shelf" | "vertical"): { value: string; label: string }[] {
  return linearFamiliesFor(mounting, mode).map((f) => ({
    value: f.id,
    label: `${f.label} (${f.type === "flexible" ? "Flexible" : "Rigid"})`,
  }));
}

function cctOptionsForFamily(familyId: string): { value: string; label: string }[] {
  return familyCcts(getLinearFamily(familyId)).map((c) => ({ value: c, label: `${c} K` }));
}

// AMBLUX's linear families store wattage as W/metre (catalog.ts's real
// numbers) — this just re-expresses that in whichever unit the zone/block
// is currently using, so an installer working in feet doesn't have to do
// the metric conversion by hand.
const METRES_PER_FOOT = 0.3048;
function linearWattsLabel(wattsPerMetre: number, unit: Unit): string {
  return unit === "ft" ? `${(wattsPerMetre * METRES_PER_FOOT).toFixed(2)} W/ft` : `${wattsPerMetre.toFixed(2)} W/m`;
}

// Picks the first family available for a mounting, and the first CCT that
// family actually ships in — used whenever mounting changes and the
// previously-selected family/CCT combo may no longer be valid.
function defaultLinearPatch(mounting: "recess" | "surface", mode?: "shelf" | "vertical") {
  const family = linearFamiliesFor(mounting, mode)[0];
  const cct = familyCcts(family)[0] || "3000";
  return { mounting, linearFamily: family.id, cct: cct as "3000" | "4000" };
}

// ---------------------------------------------------------------------
// Under-cabinet / toe kick / crown ("simple") zones
// ---------------------------------------------------------------------

export function SimpleZoneForm({
  zoneKey,
  title,
  allowPuck,
  state,
  onChange,
  included,
  onToggleIncluded,
  bom,
}: {
  zoneKey: "undercabinet" | "toeKick" | "crown" | "floatingCabinet";
  title: string;
  allowPuck: boolean;
  state: SimpleZoneState;
  onChange: (patch: Partial<SimpleZoneState>) => void;
  included: boolean;
  onToggleIncluded: (v: boolean) => void;
  bom: BomResult;
}) {
  const t = useTranslations();
  // Toe Kick / Crown Moulding / Floating Cabinet now support 1-4 runs
  // sharing one fixture spec, exactly like Undercabinet always did (see
  // engine.ts's addSimple) — every SimpleZoneForm zone shows the multi-run
  // UI. kineticOnly is the one remaining real difference: Undercabinet's
  // control is Kinetic (battery/app) only, no wired/wireless option, per
  // the reference doc — the other three keep their normal motion-sensor
  // CONTROL_OPTIONS choices.
  const hasMultipleRuns = zoneKey === "undercabinet" || zoneKey === "toeKick" || zoneKey === "crown" || zoneKey === "floatingCabinet";
  const kineticOnly = zoneKey === "undercabinet";
  const isPuck = state.lightType === "puck";
  const controlZone = zoneKey; // toeKick / crown map directly; undercabinet uses its own remote list
  const availableControls = kineticOnly
    ? UNDERCABINET_REMOTE_CONTROLS.map((id) => ({ value: id, label: `${controlSku(id)} — ${CONTROL_LABEL[id] || id}` }))
    : controlOptionsFor(controlZone, state.controlSystem);

  const zoneLabel = LABELS.zoneNames[zoneKey];
  const calculatedRows = bom.rows.filter((r) => r.zone === zoneLabel || r.zone.startsWith(`${zoneLabel} · `));

  return (
    <Section
      title={title}
      description={t("configuratorExtra.sectionSimpleDesc")}
      headerRight={<Toggle label={t("configurator.include")} checked={included} onChange={onToggleIncluded} />}
    >
      {allowPuck && (
        <Field label={t("configurator.lightType")}>
          <Select
            value={state.lightType}
            onChange={(v) => onChange({ lightType: v as SimpleZoneState["lightType"] })}
            options={[
              { value: "puck", label: t("configurator.puck") },
              { value: "linear", label: t("configurator.linear") },
            ]}
          />
        </Field>
      )}

      <Field label={t("configurator.units")}>
        <Select value={state.unit} onChange={(v) => onChange({ unit: v as Unit })} options={unitOptions(t)} />
      </Field>

      {hasMultipleRuns ? (
        <>
          <Field label={kineticOnly ? t("configurator.underCabinetZones") : t("configuratorExtra.numberOfRuns")}>
            <NumberInput
              value={state.zoneCount}
              min={1}
              max={4}
              onChange={(v) => onChange({ zoneCount: Math.max(1, Math.min(4, v)) })}
            />
          </Field>
          {state.zoneCount > 1 && (
            <Field label={t("configurator.zoneControl")}>
              <Select
                value={state.zoneControl}
                onChange={(v) => onChange({ zoneControl: v as SimpleZoneState["zoneControl"] })}
                options={[
                  { value: "together", label: t("configurator.together") },
                  { value: "separate", label: t("configurator.separate") },
                ]}
              />
            </Field>
          )}
          {Array.from({ length: state.zoneCount }).map((_, i) => (
            <Field key={i} label={`${t("configurator.zoneLength")} ${i + 1} (${state.unit})`}>
              <NumberInput
                value={state.zoneLengths[i] ?? 0}
                onChange={(v) => {
                  const zoneLengths = [...state.zoneLengths];
                  zoneLengths[i] = v;
                  onChange({ zoneLengths });
                }}
              />
            </Field>
          ))}
        </>
      ) : (
        <Field label={`${t("configurator.run")} (${state.unit})`}>
          <NumberInput value={state.length} onChange={(v) => onChange({ length: v })} />
        </Field>
      )}

      <Field label={t("configurator.mounting")}>
        <Select
          value={state.mounting}
          onChange={(v) => {
            const mounting = v as SimpleZoneState["mounting"];
            onChange(
              isPuck
                ? { mounting, puckFinish: "white" as SimpleZoneState["puckFinish"], puckWatts: puckWattsFor(mounting) }
                : { ...defaultLinearPatch(mounting) }
            );
          }}
          options={[
            { value: "recess", label: t("configurator.recess") },
            { value: "surface", label: t("configurator.surface") },
          ]}
        />
      </Field>

      {isPuck ? (
        <>
          <Field label={t("configurator.finish")}>
            <Select
              value={state.puckFinish}
              onChange={(v) => onChange({ puckFinish: v as SimpleZoneState["puckFinish"] })}
              options={puckFinishOptions(state.mounting)}
            />
          </Field>
          <Field label={t("configurator.spacing")}>
            <div className="flex gap-2">
              <NumberInput value={state.spacing} min={1} onChange={(v) => onChange({ spacing: v })} />
              <Select
                value={state.spacingUnit}
                onChange={(v) => onChange({ spacingUnit: v as Unit })}
                options={unitOptions(t)}
              />
            </div>
          </Field>
          <Field label={t("configurator.puckWatts")}>
            <ReadOnly value={`${puckWattsFor(state.mounting)} W`} />
          </Field>
        </>
      ) : (
        <>
          <Field label={t("configurator.linearSolution")}>
            <Select
              value={state.linearFamily}
              onChange={(v) => {
                const cct = familyCcts(getLinearFamily(v))[0] || "3000";
                onChange({ linearFamily: v, cct: cct as "3000" | "4000", includeInstallBracket: true });
              }}
              options={linearFamilyOptions(state.mounting)}
            />
          </Field>
          <Field label={t("product.cct")}>
            <Select
              value={state.cct}
              onChange={(v) => onChange({ cct: v as SimpleZoneState["cct"] })}
              options={cctOptionsForFamily(state.linearFamily)}
            />
          </Field>
          <Field label={t("configurator.linearWatts")}>
            <ReadOnly value={linearWattsLabel(getLinearFamily(state.linearFamily).wattsPerMetre, state.unit)} />
          </Field>
          {getLinearFamily(state.linearFamily).installAccessoryOptional && (
            <Field label={getLinearFamily(state.linearFamily).installAccessoryLabel || t("configuratorExtra.installHardware")}>
              <Toggle
                label={t("configuratorExtra.addToBom")}
                checked={state.includeInstallBracket}
                onChange={(v) => onChange({ includeInstallBracket: v })}
              />
            </Field>
          )}
        </>
      )}

      <Field label={t("configurator.controlSystem")}>
        <Select
          value={state.controlSystem}
          onChange={(v) => {
            const system = v as SimpleZoneState["controlSystem"];
            const opts = kineticOnly
              ? UNDERCABINET_REMOTE_CONTROLS
              : CONTROL_OPTIONS[controlZone]?.[system] || [];
            onChange({ controlSystem: system, control: opts[0] || state.control });
          }}
          options={kineticOnly ? [{ value: "wallControl", label: t("configurator.wallControl") }] : controlSystemOptions(controlZone, t)}
        />
      </Field>
      <Field label={t("configurator.switches")}>
        <Select value={state.control} onChange={(v) => onChange({ control: v })} options={availableControls} />
      </Field>

      <Field label={t("configurator.power")}>
        <Select
          value={state.powerType}
          onChange={(v) => onChange({ powerType: v as SimpleZoneState["powerType"] })}
          options={powerTypeOptions(t)}
        />
      </Field>

      <CalculatedSolution heading={t("configurator.calculate")} title={zoneLabel} rows={calculatedRows} />
    </Section>
  );
}

// ---------------------------------------------------------------------
// Base / wall / pantry ("blocks") zones
// ---------------------------------------------------------------------

export function BlocksZoneForm({
  zoneKey,
  title,
  state,
  onChange,
  included,
  onToggleIncluded,
  bom,
}: {
  zoneKey: "base" | "wall" | "floating" | "pantry" | "highCabinet" | "library" | "closetHangers" | "shoeRack";
  title: string;
  state: BlocksState;
  onChange: (patch: Partial<BlocksState>) => void;
  included: boolean;
  onToggleIncluded: (v: boolean) => void;
  bom: BomResult;
}) {
  const t = useTranslations();
  // Floating Shelves is its own zone/step now (previously a mode switch
  // inside Wall Cabinets — see types.ts BlocksState.section's comment), so
  // this is a plain zoneKey check rather than reading state.section.
  const isFloating = zoneKey === "floating";
  const controlZone = isFloating ? "floating" : zoneKey;
  const supportsTopLight =
    zoneKey === "pantry" ||
    zoneKey === "wall" ||
    zoneKey === "highCabinet" ||
    zoneKey === "library" ||
    zoneKey === "closetHangers" ||
    zoneKey === "shoeRack";
  // Floating Shelves is the one zone where pooled-vs-independent
  // driver/control is a real customer choice (see the reference doc:
  // "shelves can share one pooled control or each get their own") rather
  // than being fixed by zone the way Base/Wall (always independent) and
  // Pantry/etc. (always pooled) are — state.group:false switches it to the
  // same "one driver per block" code path Base/Wall already use. See
  // engine.ts's addBlocks() for the matching calculation-side logic.
  const independentDrivers = zoneKey === "base" || zoneKey === "wall" || (isFloating && state.group === false);
  // Closet Hangers / Shoe Rack are open shelving with a real physical cap
  // on shelf count and no puck option — see catalog.ts's
  // MAX_SHELVES_BY_ZONE/isLinearOnlyZone(). undefined maxShelves means "no
  // cap" for every other zone.
  const linearOnly = isLinearOnlyZone(zoneKey);
  const maxShelves = maxShelvesFor(zoneKey);

  const updateBlock = (index: number, patch: Partial<CabinetBlock>) => {
    const blocks = state.blocks.map((b, i) => (i === index ? { ...b, ...patch } : b));
    onChange({ blocks });
  };

  const zoneLabel = LABELS.zoneNames[zoneKey];
  const sharedRows = bom.rows.filter((r) => r.zone === zoneLabel);

  return (
    <Section
      title={title}
      description={t("configuratorExtra.sectionBlocksDesc")}
      headerRight={<Toggle label={t("configurator.include")} checked={included} onChange={onToggleIncluded} />}
    >
      <Field label={t("configurator.units")}>
        <Select value={state.unit} onChange={(v) => onChange({ unit: v as Unit })} options={unitOptions(t)} />
      </Field>

      {isFloating && (
        <Field label={t("configuratorExtra.shelfControlGrouping")}>
          <Select
            value={state.group === false ? "separate" : "together"}
            onChange={(v) => onChange({ group: v === "together" })}
            options={[
              { value: "together", label: t("configurator.together") },
              { value: "separate", label: t("configurator.separate") },
            ]}
          />
        </Field>
      )}

      {!independentDrivers && (
        <>
          <Field label={t("configurator.controlSystem")}>
            <Select
              value={state.controlSystem}
              onChange={(v) => {
                const system = v as BlocksState["controlSystem"];
                const opts = CONTROL_OPTIONS[controlZone]?.[system] || [];
                onChange({ controlSystem: system, control: opts[0] || state.control });
              }}
              options={controlSystemOptions(controlZone, t)}
            />
          </Field>
          <Field label={t("configurator.zoneControl")}>
            <Select
              value={state.control}
              onChange={(v) => onChange({ control: v })}
              options={controlOptionsFor(controlZone, state.controlSystem)}
            />
          </Field>
        </>
      )}

      <Field label={t("configurator.power")}>
        <Select
          value={state.powerType}
          onChange={(v) => onChange({ powerType: v as BlocksState["powerType"] })}
          options={powerTypeOptions(t)}
        />
      </Field>

      <div className="sm:col-span-2 flex flex-col gap-4">
        {state.blocks.map((b, i) => (
          <CabinetBlockRow
            key={i}
            index={i}
            zoneKey={zoneKey}
            unit={state.unit}
            block={b}
            supportsTopLight={supportsTopLight}
            independentDrivers={independentDrivers}
            linearOnly={linearOnly}
            maxShelves={maxShelves}
            onChange={(patch) => updateBlock(i, patch)}
          />
        ))}
      </div>

      {state.blocks.map(
        (b, i) =>
          b.included && (
            <CalculatedSolution
              key={`sol-${i}`}
              heading={t("configurator.calculate")}
              title={`${zoneLabel} · ${blockUnitLabel(zoneKey)} ${i + 1}`}
              rows={bom.rows.filter((r) => r.zone === `${zoneLabel} · ${blockUnitLabel(zoneKey)} ${i + 1}`)}
            />
          )
      )}
      <CalculatedSolution heading={t("configurator.calculate")} title={zoneLabel} rows={sharedRows} />
    </Section>
  );
}

function CabinetBlockRow({
  index,
  zoneKey,
  unit,
  block,
  supportsTopLight,
  independentDrivers,
  linearOnly,
  maxShelves,
  onChange,
}: {
  index: number;
  zoneKey: "base" | "wall" | "floating" | "pantry" | "highCabinet" | "library" | "closetHangers" | "shoeRack";
  unit: Unit;
  block: CabinetBlock;
  supportsTopLight: boolean;
  independentDrivers: boolean;
  // Closet Hangers / Shoe Rack only — see catalog.ts's
  // MAX_SHELVES_BY_ZONE/isLinearOnlyZone(). Every other zone passes
  // linearOnly:false and maxShelves:undefined (no restriction).
  linearOnly: boolean;
  maxShelves?: number;
  onChange: (patch: Partial<CabinetBlock>) => void;
}) {
  const t = useTranslations();
  // Floating Shelves has no cabinet body or side panels to gable-light and
  // no internal "how many shelves in this cabinet" concept — each block
  // already IS one physical shelf — so it never gets the Layout (shelf vs.
  // vertical) or Shelves-count fields at all; engine.ts's addBlocks()
  // defensively forces the same effective shelf-only, 1-fixture behavior
  // even if a block somehow still has stale mode:"vertical"/shelves>1 data
  // from before this zone had its own engine.
  const isFloatingShelf = zoneKey === "floating";
  // linearOnly zones never actually offer the puck option (the Light Type
  // field below doesn't even render for them) — this guard also covers a
  // block whose lightType is stale/invalid puck data (e.g. loaded from
  // another zone), so the row still renders correctly as linear rather than
  // showing puck fields that don't apply here. Vertical/gable lighting is
  // also always linear (matches engine.ts's computeBom exactly) — a point
  // fixture doesn't make sense run down a cabinet's side panel — so the
  // Light Type field is hidden whenever Layout is Vertical too, not just
  // for linearOnly zones.
  const isPuck = !linearOnly && block.mode !== "vertical" && block.lightType === "puck";
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground">
          {isFloatingShelf ? t("configurator.shelfUnit") : t("configurator.cabinet")} {index + 1}
        </span>
        <Toggle label={t("configurator.includeBlock")} checked={block.included} onChange={(v) => onChange({ included: v })} />
      </div>
      {block.included && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {!isFloatingShelf && (
            <Field label={t("configuratorExtra.layout")}>
              <Select
                value={block.mode}
                onChange={(v) => {
                  const mode = v as CabinetBlock["mode"];
                  if (mode === "vertical") {
                    // Vertical/gable lighting is always a recess-mount
                    // linear run restricted to the 3 real profiles rated
                    // for side-panel use (see catalog.ts's
                    // VERTICAL_LINEAR_FAMILY_IDS) — force both regardless
                    // of whatever the block's shelf-mode mounting/light
                    // type/family were, rather than risk landing on an
                    // empty family list (e.g. leaving a surface mounting
                    // in place).
                    onChange({ mode, ...defaultLinearPatch("recess", mode), lightType: "linear" });
                    return;
                  }
                  // Some linear profiles (e.g. Rigid 6 × 8 mm) are sold only
                  // for vertical side-panel lighting — if the block is leaving
                  // vertical mode and its selected profile is vertical-only,
                  // fall back to the first profile that's valid for shelf use.
                  const stillValid = linearFamiliesFor(block.mounting, mode).some((f) => f.id === block.linearFamily);
                  if (stillValid) {
                    onChange({ mode });
                  } else {
                    onChange({ mode, ...defaultLinearPatch(block.mounting, mode) });
                  }
                }}
                options={[
                  { value: "shelf", label: t("configurator.shelfLight") },
                  { value: "vertical", label: t("configurator.vertical") },
                ]}
              />
            </Field>
          )}
          {block.mode === "vertical" && !isFloatingShelf ? (
            <Field label={`${t("configurator.height")} (${unit})`}>
              <NumberInput value={block.height} onChange={(v) => onChange({ height: v })} />
            </Field>
          ) : (
            <>
              <Field label={`${t("configurator.shelfRun")} (${unit})`}>
                <NumberInput value={block.length} onChange={(v) => onChange({ length: v })} />
              </Field>
              {!isFloatingShelf && (
                <Field label={t("configurator.shelves")}>
                  <NumberInput value={block.shelves} min={1} max={maxShelves} onChange={(v) => onChange({ shelves: v })} />
                </Field>
              )}
            </>
          )}

          {!linearOnly && block.mode !== "vertical" && (
            <Field label={t("configurator.lightType")}>
              <Select
                value={block.lightType}
                onChange={(v) => onChange({ lightType: v as CabinetBlock["lightType"] })}
                options={[
                  { value: "puck", label: t("configurator.puck") },
                  { value: "linear", label: t("configurator.linear") },
                ]}
              />
            </Field>
          )}

          {block.mode !== "vertical" && (
            <Field label={t("configurator.mounting")}>
              <Select
                value={block.mounting}
                onChange={(v) => {
                  const mounting = v as CabinetBlock["mounting"];
                  onChange(
                    isPuck
                      ? { mounting, puckFinish: "white" as CabinetBlock["puckFinish"], puckWatts: puckWattsFor(mounting) }
                      : defaultLinearPatch(mounting, block.mode)
                  );
                }}
                options={[
                  { value: "recess", label: t("configurator.recess") },
                  { value: "surface", label: t("configurator.surface") },
                ]}
              />
            </Field>
          )}
          {block.mode === "vertical" && (
            <Field label={t("configurator.mounting")}>
              <ReadOnly value={t("configurator.recess")} />
            </Field>
          )}

          {isPuck ? (
            <>
              <Field label={t("configurator.finish")}>
                <Select
                  value={block.puckFinish}
                  onChange={(v) => onChange({ puckFinish: v as CabinetBlock["puckFinish"] })}
                  options={puckFinishOptions(block.mounting)}
                />
              </Field>
              <Field label={`${t("configurator.spacing")} (in)`}>
                <NumberInput value={block.spacing} min={1} onChange={(v) => onChange({ spacing: v })} />
              </Field>
              <Field label={t("configurator.puckWatts")}>
                <ReadOnly value={`${puckWattsFor(block.mounting)} W`} />
              </Field>
            </>
          ) : (
            <>
              <Field label={t("configurator.linearSolution")}>
                <Select
                  value={block.linearFamily}
                  onChange={(v) => {
                    const cct = familyCcts(getLinearFamily(v))[0] || "3000";
                    onChange({ linearFamily: v, cct: cct as CabinetBlock["cct"], includeInstallBracket: true });
                  }}
                  options={linearFamilyOptions(block.mounting, block.mode)}
                />
              </Field>
              <Field label={t("product.cct")}>
                <Select
                  value={block.cct}
                  onChange={(v) => onChange({ cct: v as CabinetBlock["cct"] })}
                  options={cctOptionsForFamily(block.linearFamily)}
                />
              </Field>
              <Field label={t("configurator.linearWatts")}>
                <ReadOnly value={linearWattsLabel(getLinearFamily(block.linearFamily).wattsPerMetre, unit)} />
              </Field>
              {getLinearFamily(block.linearFamily).installAccessoryOptional && (
                <Field label={getLinearFamily(block.linearFamily).installAccessoryLabel || t("configuratorExtra.installHardware")}>
                  <Toggle
                    label={t("configuratorExtra.addToBom")}
                    checked={block.includeInstallBracket}
                    onChange={(v) => onChange({ includeInstallBracket: v })}
                  />
                </Field>
              )}
            </>
          )}

          {supportsTopLight && (
            <>
              <Field label={t("configuratorExtra.lightOnTop")}>
                <Toggle label={t("configuratorExtra.addTopLight")} checked={block.topLight} onChange={(v) => onChange({ topLight: v })} />
              </Field>
              {block.topLight && (
                <Field label={t("configurator.topControl")}>
                  <Select
                    value={block.topLightControl}
                    onChange={(v) => onChange({ topLightControl: v as CabinetBlock["topLightControl"] })}
                    options={[
                      { value: "same", label: t("configurator.sameCabinetControl") },
                      { value: "separate", label: t("configurator.separateTopControl") },
                    ]}
                  />
                </Field>
              )}
              {block.topLight && block.topLightControl === "separate" && (
                <>
                  <Field label={t("configurator.controlSystem")}>
                    <Select
                      value={block.topControlSystem}
                      onChange={(v) => {
                        const system = v as CabinetBlock["topControlSystem"];
                        const opts = CONTROL_OPTIONS.pantry?.[system] || [];
                        onChange({ topControlSystem: system, topControl: opts[0] || block.topControl });
                      }}
                      options={controlSystemOptions("pantry", t)}
                    />
                  </Field>
                  <Field label={t("configurator.topControl")}>
                    <Select
                      value={block.topControl}
                      onChange={(v) => onChange({ topControl: v })}
                      options={controlOptionsFor("pantry", block.topControlSystem)}
                    />
                  </Field>
                </>
              )}
            </>
          )}

          {independentDrivers && (
            <p className="sm:col-span-2 text-xs text-muted">
              {t("configuratorExtra.independentDriverNote").replace(
                "{zone}",
                zoneKey === "base" ? t("configurator.zoneNames.base") : t("configurator.zoneNames.wall")
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Drawers
// ---------------------------------------------------------------------

export function DrawersForm({
  state,
  onChange,
  included,
  onToggleIncluded,
  bom,
}: {
  state: DrawersState;
  onChange: (patch: Partial<DrawersState>) => void;
  included: boolean;
  onToggleIncluded: (v: boolean) => void;
  bom: BomResult;
}) {
  const t = useTranslations();
  const zoneLabel = LABELS.zoneNames.drawers;
  const sharedRows = bom.rows.filter((r) => r.zone === zoneLabel);
  const updateBlock = (index: number, patch: Partial<DrawerBlock>) => {
    const blocks = state.blocks.map((b, i) => (i === index ? { ...b, ...patch } : b));
    onChange({ blocks });
  };

  return (
    <Section
      title={t("configurator.zoneNames.drawers")}
      description={t("configuratorExtra.sectionDrawersDesc")}
      headerRight={<Toggle label={t("configurator.include")} checked={included} onChange={onToggleIncluded} />}
    >
      <Field label={t("configurator.units")}>
        <Select value={state.unit} onChange={(v) => onChange({ unit: v as Unit })} options={unitOptions(t)} />
      </Field>
      <Field label={t("configurator.power")}>
        <Select
          value={state.powerType}
          onChange={(v) => onChange({ powerType: v as DrawersState["powerType"] })}
          options={powerTypeOptions(t)}
        />
      </Field>

      <div className="sm:col-span-2 flex flex-col gap-4">
        {state.blocks.map((b, i) => (
          <div key={i} className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">
                {t("configurator.drawer")} {i + 1}
              </span>
              <Toggle label={t("configurator.includeBlock")} checked={b.included} onChange={(v) => updateBlock(i, { included: v })} />
            </div>
            {b.included && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label={t("configurator.drawerCount")}>
                  <NumberInput value={b.count} min={1} onChange={(v) => updateBlock(i, { count: v })} />
                </Field>
                <Field label={`${t("configurator.drawerLength")} (${state.unit})`}>
                  <NumberInput value={b.length} onChange={(v) => updateBlock(i, { length: v })} />
                </Field>
                <Field label={t("configurator.mounting")}>
                  <Select
                    value={b.mounting}
                    onChange={(v) => {
                      const mounting = v as DrawerBlock["mounting"];
                      updateBlock(i, defaultLinearPatch(mounting));
                    }}
                    options={[
                      { value: "recess", label: t("configurator.recess") },
                      { value: "surface", label: t("configurator.surface") },
                    ]}
                  />
                </Field>
                <Field label={t("configurator.linearSolution")}>
                  <Select
                    value={b.linearFamily}
                    onChange={(v) => {
                      const cct = familyCcts(getLinearFamily(v))[0] || "3000";
                      updateBlock(i, { linearFamily: v, cct: cct as DrawerBlock["cct"] });
                    }}
                    options={linearFamilyOptions(b.mounting)}
                  />
                </Field>
                <Field label={t("product.cct")}>
                  <Select
                    value={b.cct}
                    onChange={(v) => updateBlock(i, { cct: v as DrawerBlock["cct"] })}
                    options={cctOptionsForFamily(b.linearFamily)}
                  />
                </Field>
                <Field label={t("configurator.linearWatts")}>
                  <ReadOnly value={linearWattsLabel(getLinearFamily(b.linearFamily).wattsPerMetre, state.unit)} />
                </Field>
              </div>
            )}
          </div>
        ))}
      </div>

      {state.blocks.map(
        (b, i) =>
          b.included && (
            <CalculatedSolution
              key={`sol-${i}`}
              heading={t("configurator.calculate")}
              title={`${zoneLabel} · ${LABELS.drawer} ${i + 1}`}
              rows={bom.rows.filter((r) => r.zone === `${zoneLabel} · ${LABELS.drawer} ${i + 1}`)}
            />
          )
      )}
      <CalculatedSolution heading={t("configurator.calculate")} title={zoneLabel} rows={sharedRows} />
    </Section>
  );
}

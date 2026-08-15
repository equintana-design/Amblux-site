"use client";

import {
  CONTROL_LABEL,
  CONTROL_OPTIONS,
  RECESSED_FACEPLATES,
  SURFACE_PUCKS,
  UNDERCABINET_REMOTE_CONTROLS,
  controlSku,
  familyCcts,
  getLinearFamily,
  linearFamiliesFor,
} from "@/lib/configurator/catalog";
import { finishLabel } from "@/lib/configurator/labels";
import type {
  BlocksState,
  CabinetBlock,
  DrawerBlock,
  DrawersState,
  SimpleZoneState,
  Unit,
} from "@/lib/configurator/types";
import { useTranslations, type TFunction } from "@/app/providers/LocaleProvider";
import { Field, NumberInput, ReadOnly, Section, Select, Toggle } from "./ui";

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
}: {
  zoneKey: "undercabinet" | "toeKick" | "crown";
  title: string;
  allowPuck: boolean;
  state: SimpleZoneState;
  onChange: (patch: Partial<SimpleZoneState>) => void;
}) {
  const t = useTranslations();
  const isMultiZone = zoneKey === "undercabinet";
  const isPuck = state.lightType === "puck";
  const controlZone = zoneKey; // toeKick / crown map directly; undercabinet uses its own remote list
  const availableControls = isMultiZone
    ? UNDERCABINET_REMOTE_CONTROLS.map((id) => ({ value: id, label: `${controlSku(id)} — ${CONTROL_LABEL[id] || id}` }))
    : controlOptionsFor(controlZone, state.controlSystem);

  return (
    <Section title={title} description={t("configuratorExtra.sectionSimpleDesc")}>
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

      {isMultiZone ? (
        <>
          <Field label={t("configurator.underCabinetZones")}>
            <NumberInput
              value={state.zoneCount}
              min={1}
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
                ? { mounting, puckFinish: "white" as SimpleZoneState["puckFinish"] }
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
            <ReadOnly value={`${state.puckWatts} W`} />
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
            const opts = isMultiZone
              ? UNDERCABINET_REMOTE_CONTROLS
              : CONTROL_OPTIONS[controlZone]?.[system] || [];
            onChange({ controlSystem: system, control: opts[0] || state.control });
          }}
          options={isMultiZone ? [{ value: "wallControl", label: t("configurator.wallControl") }] : controlSystemOptions(controlZone, t)}
        />
      </Field>
      <Field label={t("configurator.switches")}>
        <Select value={state.control} onChange={(v) => onChange({ control: v })} options={availableControls} />
      </Field>

      <Field label={t("configurator.power")}>
        <Select
          value={state.powerType}
          onChange={(v) => onChange({ powerType: v as SimpleZoneState["powerType"] })}
          options={[
            { value: "ultra", label: t("configurator.ultra") },
            { value: "hardwire", label: t("configurator.hardPsu") },
          ]}
        />
      </Field>
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
}: {
  zoneKey: "base" | "wall" | "pantry";
  title: string;
  state: BlocksState;
  onChange: (patch: Partial<BlocksState>) => void;
}) {
  const t = useTranslations();
  const isWall = zoneKey === "wall";
  const isFloating = isWall && state.section === "floating";
  const controlZone = isFloating ? "floating" : zoneKey;
  const supportsTopLight = zoneKey === "pantry" || (isWall && !isFloating);
  const independentDrivers = zoneKey === "base" || (isWall && !isFloating);

  const updateBlock = (index: number, patch: Partial<CabinetBlock>) => {
    const blocks = state.blocks.map((b, i) => (i === index ? { ...b, ...patch } : b));
    onChange({ blocks });
  };

  return (
    <Section title={title} description={t("configuratorExtra.sectionBlocksDesc")}>
      <Field label={t("configurator.units")}>
        <Select value={state.unit} onChange={(v) => onChange({ unit: v as Unit })} options={unitOptions(t)} />
      </Field>

      {isWall && (
        <Field label={t("configurator.section")}>
          <Select
            value={state.section || "wall"}
            onChange={(v) => onChange({ section: v as BlocksState["section"] })}
            options={[
              { value: "wall", label: t("configurator.wallCabinet") },
              { value: "floating", label: t("configurator.floating") },
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
          options={[
            { value: "ultra", label: t("configurator.ultra") },
            { value: "hardwire", label: t("configurator.hardPsu") },
          ]}
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
            onChange={(patch) => updateBlock(i, patch)}
          />
        ))}
      </div>
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
  onChange,
}: {
  index: number;
  zoneKey: "base" | "wall" | "pantry";
  unit: Unit;
  block: CabinetBlock;
  supportsTopLight: boolean;
  independentDrivers: boolean;
  onChange: (patch: Partial<CabinetBlock>) => void;
}) {
  const t = useTranslations();
  const isPuck = block.lightType === "puck";
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground">
          {t("configurator.cabinet")} {index + 1}
        </span>
        <Toggle label={t("configurator.includeBlock")} checked={block.included} onChange={(v) => onChange({ included: v })} />
      </div>
      {block.included && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label={t("configuratorExtra.layout")}>
            <Select
              value={block.mode}
              onChange={(v) => {
                const mode = v as CabinetBlock["mode"];
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
          {block.mode === "vertical" ? (
            <Field label={`${t("configurator.height")} (${unit})`}>
              <NumberInput value={block.height} onChange={(v) => onChange({ height: v })} />
            </Field>
          ) : (
            <>
              <Field label={`${t("configurator.shelfRun")} (${unit})`}>
                <NumberInput value={block.length} onChange={(v) => onChange({ length: v })} />
              </Field>
              <Field label={t("configurator.shelves")}>
                <NumberInput value={block.shelves} min={1} onChange={(v) => onChange({ shelves: v })} />
              </Field>
            </>
          )}

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

          <Field label={t("configurator.mounting")}>
            <Select
              value={block.mounting}
              onChange={(v) => {
                const mounting = v as CabinetBlock["mounting"];
                onChange(
                  isPuck
                    ? { mounting, puckFinish: "white" as CabinetBlock["puckFinish"] }
                    : defaultLinearPatch(mounting, block.mode)
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
                  value={block.puckFinish}
                  onChange={(v) => onChange({ puckFinish: v as CabinetBlock["puckFinish"] })}
                  options={puckFinishOptions(block.mounting)}
                />
              </Field>
              <Field label={`${t("configurator.spacing")} (in)`}>
                <NumberInput value={block.spacing} min={1} onChange={(v) => onChange({ spacing: v })} />
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

export function DrawersForm({ state, onChange }: { state: DrawersState; onChange: (patch: Partial<DrawersState>) => void }) {
  const t = useTranslations();
  const updateBlock = (index: number, patch: Partial<DrawerBlock>) => {
    const blocks = state.blocks.map((b, i) => (i === index ? { ...b, ...patch } : b));
    onChange({ blocks });
  };

  return (
    <Section title={t("configurator.zoneNames.drawers")} description={t("configuratorExtra.sectionDrawersDesc")}>
      <Field label={t("configurator.units")}>
        <Select value={state.unit} onChange={(v) => onChange({ unit: v as Unit })} options={unitOptions(t)} />
      </Field>
      <Field label={t("configurator.power")}>
        <Select
          value={state.powerType}
          onChange={(v) => onChange({ powerType: v as DrawersState["powerType"] })}
          options={[
            { value: "ultra", label: t("configurator.ultra") },
            { value: "hardwire", label: t("configurator.hardPsu") },
          ]}
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
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

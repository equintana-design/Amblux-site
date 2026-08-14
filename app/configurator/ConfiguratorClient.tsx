"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { computeBom, consolidateParts } from "@/lib/configurator/engine";
import { LABELS } from "@/lib/configurator/labels";
import { defaultConfiguratorState } from "@/lib/configurator/types";
import type { ConfiguratorState, SelectedZones } from "@/lib/configurator/types";
import { AuthStatus } from "./AuthStatus";
import { BomSummary } from "./BomSummary";
import { PartsList } from "./PartsList";
import { PricingPanel } from "./PricingPanel";
import { BlocksZoneForm, DrawersForm, SimpleZoneForm } from "./forms";
import { Field, Select, Toggle } from "./ui";

const ZONE_META: { key: keyof SelectedZones; title: string }[] = [
  { key: "undercabinet", title: LABELS.zoneNames.undercabinet },
  { key: "toeKick", title: LABELS.zoneNames.toeKick },
  { key: "crown", title: LABELS.zoneNames.crown },
  { key: "base", title: LABELS.zoneNames.base },
  { key: "wall", title: LABELS.zoneNames.wall },
  { key: "pantry", title: LABELS.zoneNames.pantry },
  { key: "drawers", title: LABELS.zoneNames.drawers },
];

export function ConfiguratorClient() {
  const [state, setState] = useState<ConfiguratorState>(() => defaultConfiguratorState());

  const bom = useMemo(() => computeBom(state), [state]);

  const toggleZone = (key: keyof SelectedZones, value: boolean) => {
    setState((s) => ({ ...s, selected: { ...s.selected, [key]: value } }));
  };

  const patchSimple = (key: "undercabinet" | "toeKick" | "crown", patch: Partial<ConfiguratorState["simple"][typeof key]>) => {
    setState((s) => ({ ...s, simple: { ...s.simple, [key]: { ...s.simple[key], ...patch } } }));
  };

  const patchBlocks = (key: "base" | "wall" | "pantry", patch: Partial<ConfiguratorState["base"]>) => {
    setState((s) => ({ ...s, [key]: { ...s[key], ...patch } }));
  };

  const patchDrawers = (patch: Partial<ConfiguratorState["drawers"]>) => {
    setState((s) => ({ ...s, drawers: { ...s.drawers, ...patch } }));
  };

  const patchProject = (patch: Partial<ConfiguratorState["project"]>) => {
    setState((s) => ({ ...s, project: { ...s.project, ...patch } }));
  };

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/images/amblux-logo.png" alt="AMBLUX" width={120} height={32} className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            <AuthStatus />
            <button
              onClick={() => setState(defaultConfiguratorState())}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted hover:border-accent hover:text-accent-strong"
            >
              Clear all form data
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-soft">
          AMBLUX Kitchen Configurator
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">
          Describe the kitchen. AMBLUX designs the lighting system.
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Select the kitchen zones you want to light. The questions and calculations follow the approved
          AMBLUX configurator exactly.
        </p>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="flex flex-col gap-8">
            <section className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="text-lg font-semibold text-foreground">Project Info</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Project name">
                  <input
                    className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    value={state.project.name}
                    onChange={(e) => patchProject({ name: e.target.value })}
                  />
                </Field>
                <Field label="Client / Company">
                  <input
                    className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    value={state.project.client}
                    onChange={(e) => patchProject({ client: e.target.value })}
                  />
                </Field>
                <Field label="Cabinet type">
                  <Select
                    value={state.project.cabinet}
                    onChange={(v) => patchProject({ cabinet: v as ConfiguratorState["project"]["cabinet"] })}
                    options={[
                      { value: "frameless", label: "Frameless" },
                      { value: "framed", label: "Framed" },
                    ]}
                  />
                </Field>
                <Field label="Installation preference">
                  <Select
                    value={state.project.install}
                    onChange={(v) => patchProject({ install: v as ConfiguratorState["project"]["install"] })}
                    options={[
                      { value: "plug", label: "Plug & Play" },
                      { value: "hardwire", label: "Hardwire" },
                    ]}
                  />
                </Field>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="text-lg font-semibold text-foreground">Zones to include</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {ZONE_META.map((z) => (
                  <Toggle
                    key={z.key}
                    label={z.title}
                    checked={state.selected[z.key]}
                    onChange={(v) => toggleZone(z.key, v)}
                  />
                ))}
              </div>
            </section>

            {state.selected.undercabinet && (
              <SimpleZoneForm
                zoneKey="undercabinet"
                title={LABELS.zoneNames.undercabinet}
                allowPuck
                state={state.simple.undercabinet}
                onChange={(patch) => patchSimple("undercabinet", patch)}
              />
            )}
            {state.selected.toeKick && (
              <SimpleZoneForm
                zoneKey="toeKick"
                title={LABELS.zoneNames.toeKick}
                allowPuck={false}
                state={state.simple.toeKick}
                onChange={(patch) => patchSimple("toeKick", patch)}
              />
            )}
            {state.selected.crown && (
              <SimpleZoneForm
                zoneKey="crown"
                title={LABELS.zoneNames.crown}
                allowPuck={false}
                state={state.simple.crown}
                onChange={(patch) => patchSimple("crown", patch)}
              />
            )}
            {state.selected.base && (
              <BlocksZoneForm
                zoneKey="base"
                title={LABELS.zoneNames.base}
                state={state.base}
                onChange={(patch) => patchBlocks("base", patch)}
              />
            )}
            {state.selected.wall && (
              <BlocksZoneForm
                zoneKey="wall"
                title={LABELS.zoneNames.wall}
                state={state.wall}
                onChange={(patch) => patchBlocks("wall", patch)}
              />
            )}
            {state.selected.pantry && (
              <BlocksZoneForm
                zoneKey="pantry"
                title={LABELS.zoneNames.pantry}
                state={state.pantry}
                onChange={(patch) => patchBlocks("pantry", patch)}
              />
            )}
            {state.selected.drawers && <DrawersForm state={state.drawers} onChange={patchDrawers} />}
          </div>

          <div className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
            <BomSummary bom={bom} />
            <PartsList bom={bom} project={state.project} />
            <PricingPanel parts={consolidateParts(bom)} />
          </div>
        </div>
      </div>
    </div>
  );
}

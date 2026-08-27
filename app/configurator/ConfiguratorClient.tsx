"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AccountStatus } from "@/app/components/AccountStatus";
import { computeBom, consolidateParts } from "@/lib/configurator/engine";
import { defaultConfiguratorState } from "@/lib/configurator/types";
import type { ConfiguratorState, SelectedZones } from "@/lib/configurator/types";
import { useLocale, useTranslations } from "@/app/providers/LocaleProvider";
import { createClient } from "@/lib/supabase/client";
import { loadQuoteState } from "@/lib/configurator/quotes";
import { LOCALES } from "@/lib/i18n/dictionaries";
import { BomSummaryStep } from "./BomSummaryStep";
import { PartsList } from "./PartsList";
import { PricingPanel } from "./PricingPanel";
import { ProjectInfoStep } from "./ProjectInfoStep";
import { BlocksZoneForm, DrawersForm, SimpleZoneForm } from "./forms";
import { StepTabs, ZoneSidebar, type WizardStep } from "./ui";

type ZoneStepKey = keyof SelectedZones;
type StepKey = "project" | ZoneStepKey | "summary";

const ZONE_STEP_ORDER: ZoneStepKey[] = ["undercabinet", "toeKick", "crown", "base", "wall", "pantry", "drawers"];

export function ConfiguratorClient() {
  const [state, setState] = useState<ConfiguratorState>(() => defaultConfiguratorState());
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<StepKey>("project");
  const t = useTranslations();
  const { locale, setLocale } = useLocale();

  // Deep link from "My saved projects" (e.g. /configurator?quote=<id>) —
  // read straight off window.location instead of next/navigation's
  // useSearchParams so this doesn't force a Suspense boundary around the
  // whole page for what's a one-time initial read.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("quote");
    if (!id) return;
    loadQuoteState(createClient(), id).then((loaded) => {
      if (loaded) {
        setState(loaded);
        setQuoteId(id);
      }
    });
  }, []);

  const bom = useMemo(() => computeBom(state), [state]);

  const ZONE_META: Record<ZoneStepKey, { title: string; allowPuck?: boolean }> = {
    undercabinet: { title: t("configurator.zoneNames.undercabinet"), allowPuck: true },
    toeKick: { title: t("configurator.zoneNames.toeKick"), allowPuck: false },
    crown: { title: t("configurator.zoneNames.crown"), allowPuck: false },
    base: { title: t("configurator.zoneNames.base") },
    wall: { title: t("configurator.zoneNames.wall") },
    pantry: { title: t("configurator.zoneNames.pantry") },
    drawers: { title: t("configurator.zoneNames.drawers") },
  };

  const STEPS: WizardStep[] = [
    { key: "project", label: t("configurator.project") },
    ...ZONE_STEP_ORDER.map((key) => ({ key, label: ZONE_META[key].title, done: state.selected[key] })),
    { key: "summary", label: t("configurator.summary") },
  ];

  const toggleZone = (key: ZoneStepKey, value: boolean) => {
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

  function renderStepContent() {
    if (activeStep === "project") {
      return (
        <ProjectInfoStep
          project={state.project}
          onChange={patchProject}
          state={state}
          bom={bom}
          quoteId={quoteId}
          onSaved={(id) => setQuoteId(id)}
          onLoad={(id, loaded) => {
            setState(loaded);
            setQuoteId(id);
          }}
        />
      );
    }

    if (activeStep === "summary") {
      return (
        <div className="flex flex-col gap-6">
          <BomSummaryStep bom={bom} project={state.project} />
          <div className="grid gap-6 print:hidden lg:grid-cols-2">
            <PartsList bom={bom} project={state.project} />
            <PricingPanel parts={consolidateParts(bom)} />
          </div>
        </div>
      );
    }

    switch (activeStep) {
      case "undercabinet":
      case "toeKick":
      case "crown":
        return (
          <SimpleZoneForm
            zoneKey={activeStep}
            title={ZONE_META[activeStep].title}
            allowPuck={Boolean(ZONE_META[activeStep].allowPuck)}
            state={state.simple[activeStep]}
            onChange={(patch) => patchSimple(activeStep, patch)}
            included={state.selected[activeStep]}
            onToggleIncluded={(v) => toggleZone(activeStep, v)}
            bom={bom}
          />
        );
      case "base":
      case "wall":
      case "pantry":
        return (
          <BlocksZoneForm
            zoneKey={activeStep}
            title={ZONE_META[activeStep].title}
            state={state[activeStep]}
            onChange={(patch) => patchBlocks(activeStep, patch)}
            included={state.selected[activeStep]}
            onToggleIncluded={(v) => toggleZone(activeStep, v)}
            bom={bom}
          />
        );
      case "drawers":
        return (
          <DrawersForm
            state={state.drawers}
            onChange={patchDrawers}
            included={state.selected.drawers}
            onToggleIncluded={(v) => toggleZone("drawers", v)}
            bom={bom}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/images/amblux-logo.png" alt="AMBLUX" width={120} height={32} className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-4">
            <div
              className="flex items-center overflow-hidden rounded-full border border-border text-xs font-semibold"
              role="group"
              aria-label="Language / Langue / Idioma"
            >
              {LOCALES.map((l) => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={locale === l}
                  onClick={() => setLocale(l)}
                  className={locale === l ? "bg-foreground px-2.5 py-1.5 text-white" : "px-2.5 py-1.5 text-muted hover:text-foreground"}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <AccountStatus />
          </div>
        </div>
      </header>

      <div className="bg-foreground text-white print:hidden">
        <div className="mx-auto w-full max-w-6xl px-6 py-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-soft">{t("configurator.kicker")}</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">{t("configurator.title")}</h1>
          <p className="mt-3 max-w-2xl text-white/70">{t("configurator.intro")}</p>
          <button
            type="button"
            onClick={() => {
              setState(defaultConfiguratorState());
              setQuoteId(null);
              setActiveStep("project");
            }}
            className="mt-3 text-sm font-medium text-accent-soft underline-offset-2 hover:underline"
          >
            {t("configurator.clear")}
          </button>
        </div>
      </div>

      <div className="print:hidden">
        <StepTabs steps={STEPS} activeKey={activeStep} onSelect={(key) => setActiveStep(key as StepKey)} />
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        {activeStep === "summary" ? (
          renderStepContent()
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div>{renderStepContent()}</div>
            <div className="print:hidden">
              <ZoneSidebar
                kicker={t("configurator.kitchenOnly")}
                heading={t("configurator.zones")}
                zones={ZONE_STEP_ORDER.map((key) => ({
                  key,
                  label: ZONE_META[key].title,
                  included: state.selected[key],
                }))}
                summaryLabel={t("configurator.summary")}
                activeKey={activeStep}
                onSelectZone={(key) => setActiveStep(key as StepKey)}
                onJumpToSummary={() => setActiveStep("summary")}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

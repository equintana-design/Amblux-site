"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AccountStatus } from "@/app/components/AccountStatus";
import { zonesForApplication } from "@/lib/configurator/catalog";
import { computeBom } from "@/lib/configurator/engine";
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
import { SaveProjectButton } from "./SaveProjectButton";
import { BlocksZoneForm, DrawersForm, SimpleZoneForm, VanityForm } from "./forms";
import { StepTabs, ZoneSidebar, type WizardStep } from "./ui";

type ZoneStepKey = keyof SelectedZones;
type StepKey = "project" | ZoneStepKey | "summary";

// Master zone order (all built zones, every project type combined) — the
// step tabs, sidebar tracker, and Project Info checklist all filter this
// down to zonesForApplication(state.project.application) so only the zones
// that make sense for the selected project type ever show up. Order here
// roughly follows the reference doc's Kitchen zone order.
const ZONE_STEP_ORDER: ZoneStepKey[] = [
  "undercabinet",
  "floating",
  "toeKick",
  "crown",
  "base",
  "wall",
  "pantry",
  "drawers",
  "highCabinet",
  "floatingCabinet",
  "vanity",
  "library",
  "closetHangers",
  "shoeRack",
];

export function ConfiguratorClient() {
  const [state, setState] = useState<ConfiguratorState>(() => defaultConfiguratorState());
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<StepKey>("project");
  const t = useTranslations();
  const { locale, setLocale } = useLocale();

  // Unsaved-work protection: a snapshot of whatever was last actually
  // persisted (or freshly loaded/cleared, which counts as "in sync" too)
  // to compare the live `state` against. `isDirty` drives both the small
  // "Unsaved changes" indicator next to the header Save button and the
  // beforeunload warning below — a plain JSON comparison is enough here
  // since ConfiguratorState is already a small, fully-serializable object
  // (the same assumption saveQuote()/loadQuoteState() already make).
  const lastSavedStateRef = useRef<ConfiguratorState>(state);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setIsDirty(JSON.stringify(state) !== JSON.stringify(lastSavedStateRef.current));
  }, [state]);

  // Warns on tab close / navigation away from the site if there's
  // unsaved work — the actual "tell them to save before closing the page"
  // behavior. Browsers show their own generic confirmation text regardless
  // of what's set on the event, so there's no custom copy to localize
  // here; registered once and reads isDirty fresh on every unload attempt
  // rather than re-registering the listener on every keystroke.
  const isDirtyRef = useRef(isDirty);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!isDirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Used after a real save (both the header's SaveProjectButton and the
  // Saved Projects panel's own Save button funnel through this) — marks
  // whatever was just persisted as the new "in sync" baseline immediately,
  // rather than waiting on the state-comparison effect above (state itself
  // doesn't change on a save, so that effect wouldn't otherwise re-run).
  function markSaved() {
    lastSavedStateRef.current = state;
    setIsDirty(false);
  }

  // Shared "a save just completed" handler — used by every Save entry
  // point (the header's compact button, Project Info's full Saved
  // Projects panel, and now the per-zone Save button rendered right under
  // each zone's "Include this zone" toggle — see zoneSaveSlot below) so
  // there's exactly one place that reacts to a successful save instead of
  // three copies of the same two-line lambda.
  function handleQuoteSaved(id: string) {
    setQuoteId(id);
    markSaved();
  }

  // Used for loading a saved project or starting a fresh one — both
  // replace `state` wholesale, and the replacement itself should count as
  // already "in sync" rather than dirty (nothing has actually diverged
  // from what's on the server yet).
  function loadState(newState: ConfiguratorState, id: string | null) {
    setState(newState);
    setQuoteId(id);
    lastSavedStateRef.current = newState;
    setIsDirty(false);
  }

  // Deep link from "My saved projects" (e.g. /configurator?quote=<id>) —
  // read straight off window.location instead of next/navigation's
  // useSearchParams so this doesn't force a Suspense boundary around the
  // whole page for what's a one-time initial read.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("quote");
    if (!id) return;
    loadQuoteState(createClient(), id).then((loaded) => {
      if (loaded) loadState(loaded, id);
    });
  }, []);

  const bom = useMemo(() => computeBom(state), [state]);

  // Rendered inside every zone form (SimpleZoneForm/BlocksZoneForm/
  // DrawersForm/VanityForm — see forms.tsx's `saveSlot` prop), stacked
  // right under that zone's "Include this zone" toggle. Per the user's
  // explicit request: the header's Save button was there all along, but
  // it wasn't obvious enough while working through an individual zone —
  // this puts a real Save button in the same spot on every single zone
  // step, not just Project Info. It's the exact same SaveProjectButton
  // component the header uses (same save-in-progress/error/missing-fields
  // states), just rendered a second time in a more visible spot; saving
  // from here or from the header updates the same one saved project.
  const zoneSaveSlot = <SaveProjectButton state={state} bom={bom} quoteId={quoteId} onSaved={handleQuoteSaved} />;

  // The sidebar used to hardcode "Kitchen only" here since that was the
  // only project type the wizard actually supported — now that Application
  // is a real switch, the sidebar kicker should say whichever project type
  // is actually selected instead of always claiming Kitchen.
  const APPLICATION_KICKER: Record<ConfiguratorState["project"]["application"], string> = {
    kitchen: t("configurator.applicationKitchen"),
    closets: t("configurator.applicationClosets"),
    bathroom: t("configurator.applicationBathroom"),
    furniture: t("configurator.applicationFurniture"),
  };

  const ZONE_META: Record<ZoneStepKey, { title: string; allowPuck?: boolean }> = {
    undercabinet: { title: t("configurator.zoneNames.undercabinet"), allowPuck: true },
    floating: { title: t("configurator.zoneNames.floating") },
    toeKick: { title: t("configurator.zoneNames.toeKick"), allowPuck: false },
    crown: { title: t("configurator.zoneNames.crown"), allowPuck: false },
    base: { title: t("configurator.zoneNames.base") },
    wall: { title: t("configurator.zoneNames.wall") },
    pantry: { title: t("configurator.zoneNames.pantry") },
    drawers: { title: t("configurator.zoneNames.drawers") },
    highCabinet: { title: t("configurator.zoneNames.highCabinet") },
    floatingCabinet: { title: t("configurator.zoneNames.floatingCabinet"), allowPuck: false },
    vanity: { title: t("configurator.zoneNames.vanity") },
    library: { title: t("configurator.zoneNames.library") },
    closetHangers: { title: t("configurator.zoneNames.closetHangers") },
    shoeRack: { title: t("configurator.zoneNames.shoeRack") },
  };

  // The one list every zone-facing UI (step tabs, sidebar tracker, Project
  // Info's zone checklist) filters down to — this is what makes the
  // Application field a real project-type switch instead of descriptive
  // metadata: Kitchen sees all built zones, Closet/Furniture see their
  // subset, and Bathroom now has all 3 of its reference zones (High
  // Cabinet, Floating Cabinet, Vanity — Stage 4, 2026-08-29). See
  // catalog.ts's ZONES_BY_APPLICATION for the per-project-type list and its
  // comment for how to extend it as more zones get built.
  const visibleZoneKeys = ZONE_STEP_ORDER.filter((key) => zonesForApplication(state.project.application).includes(key));

  const STEPS: WizardStep[] = [
    { key: "project", label: t("configurator.project") },
    ...visibleZoneKeys.map((key) => ({ key, label: ZONE_META[key].title, done: state.selected[key] })),
    { key: "summary", label: t("configurator.summary") },
  ];

  const toggleZone = (key: ZoneStepKey, value: boolean) => {
    setState((s) => ({ ...s, selected: { ...s.selected, [key]: value } }));
  };

  const patchSimple = (key: "undercabinet" | "toeKick" | "crown" | "floatingCabinet", patch: Partial<ConfiguratorState["simple"][typeof key]>) => {
    setState((s) => ({ ...s, simple: { ...s.simple, [key]: { ...s.simple[key], ...patch } } }));
  };

  const patchBlocks = (
    key: "base" | "wall" | "floating" | "pantry" | "highCabinet" | "library" | "closetHangers" | "shoeRack",
    patch: Partial<ConfiguratorState["base"]>
  ) => {
    setState((s) => ({ ...s, [key]: { ...s[key], ...patch } }));
  };

  const patchDrawers = (patch: Partial<ConfiguratorState["drawers"]>) => {
    setState((s) => ({ ...s, drawers: { ...s.drawers, ...patch } }));
  };

  const patchVanity = (patch: Partial<ConfiguratorState["vanity"]>) => {
    setState((s) => ({ ...s, vanity: { ...s.vanity, ...patch } }));
  };

  const patchProject = (patch: Partial<ConfiguratorState["project"]>) => {
    setState((s) => {
      const project = { ...s.project, ...patch };
      if (!patch.application || patch.application === s.project.application) {
        return { ...s, project };
      }
      // Switching project type changes which zones are even visible — a
      // zone that's still selected but no longer offered would otherwise
      // keep silently contributing to the BOM/wattage total with no way to
      // see or turn it off (since its tab, sidebar row, and checklist entry
      // all disappear). Its configured data (lengths, wattages, etc.) is
      // left untouched in state in case the user switches back — only the
      // "included" flag is cleared.
      const allowed = new Set(zonesForApplication(patch.application));
      const selected = { ...s.selected };
      (Object.keys(selected) as ZoneStepKey[]).forEach((key) => {
        if (!allowed.has(key)) selected[key] = false;
      });
      return { ...s, project, selected };
    });
    if (patch.application) {
      // If the step the user is currently on just disappeared from the tab
      // strip, land back on Project Info instead of leaving them stranded
      // on a step with no way back to it via the UI.
      const nextApplication = patch.application;
      setActiveStep((step) => {
        if (step === "project" || step === "summary") return step;
        return zonesForApplication(nextApplication).includes(step as ZoneStepKey) ? step : "project";
      });
    }
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
          onSaved={handleQuoteSaved}
          onLoad={(id, loaded) => {
            loadState(loaded, id);
            // Jump straight to the summary so loading a saved project
            // immediately shows proof that the full BOM came back intact —
            // this was the direct fix for "when we load a project it
            // doesn't load completely" (the state itself loads fine; the
            // user just had no visible confirmation without paging through
            // all 9 steps themselves).
            setActiveStep("summary");
          }}
          zoneMeta={visibleZoneKeys.map((key) => ({ key, title: ZONE_META[key].title }))}
          selected={state.selected}
          onToggleZone={toggleZone}
        />
      );
    }

    if (activeStep === "summary") {
      return (
        <div className="flex flex-col gap-6">
          <BomSummaryStep bom={bom} project={state.project} />
          <div className="grid gap-6 print:hidden lg:grid-cols-2">
            <PartsList bom={bom} project={state.project} />
            <PricingPanel bom={bom} />
          </div>
        </div>
      );
    }

    switch (activeStep) {
      case "undercabinet":
      case "toeKick":
      case "crown":
      case "floatingCabinet":
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
            saveSlot={zoneSaveSlot}
          />
        );
      case "base":
      case "wall":
      case "floating":
      case "pantry":
      case "highCabinet":
      case "library":
      case "closetHangers":
      case "shoeRack":
        return (
          <BlocksZoneForm
            zoneKey={activeStep}
            title={ZONE_META[activeStep].title}
            state={state[activeStep]}
            onChange={(patch) => patchBlocks(activeStep, patch)}
            included={state.selected[activeStep]}
            onToggleIncluded={(v) => toggleZone(activeStep, v)}
            bom={bom}
            saveSlot={zoneSaveSlot}
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
            saveSlot={zoneSaveSlot}
          />
        );
      case "vanity":
        return (
          <VanityForm
            state={state.vanity}
            onChange={patchVanity}
            included={state.selected.vanity}
            onToggleIncluded={(v) => toggleZone("vanity", v)}
            bom={bom}
            saveSlot={zoneSaveSlot}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/images/amblux-logo.png" alt="AMBLUX" width={120} height={32} className="h-8 w-auto" />
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-3">
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
            <div className="print:hidden">
              <SaveProjectButton state={state} bom={bom} quoteId={quoteId} onSaved={handleQuoteSaved} />
            </div>
            {isDirty ? (
              <span className="hidden shrink-0 text-xs font-medium text-accent-strong sm:inline">
                {t("configuratorExtra.unsavedChanges")}
              </span>
            ) : null}
            <AccountStatus />
          </div>
        </div>
      </header>

      <div className="bg-foreground text-white print:hidden">
        <div className="mx-auto w-full max-w-7xl px-6 py-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-soft">{t("configurator.kicker")}</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">{t("configurator.title")}</h1>
          <p className="mt-3 max-w-2xl text-white/70">{t("configurator.intro")}</p>
          <button
            type="button"
            onClick={() => {
              loadState(defaultConfiguratorState(), null);
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

      <div className="mx-auto w-full max-w-7xl px-6 py-10">
        {activeStep === "summary" ? (
          renderStepContent()
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div>{renderStepContent()}</div>
            <div className="print:hidden">
              <ZoneSidebar
                kicker={APPLICATION_KICKER[state.project.application]}
                heading={t("configurator.zones")}
                zones={visibleZoneKeys.map((key) => ({
                  key,
                  label: ZONE_META[key].title,
                  included: state.selected[key],
                }))}
                emptyMessage={t("configuratorExtra.noZonesForApplication")}
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

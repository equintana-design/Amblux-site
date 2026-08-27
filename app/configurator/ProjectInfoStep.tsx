"use client";

// Step 1 of the wizard — every ProjectInfo field (see lib/configurator/
// types.ts; the data model already had all of these) plus the existing
// save/load-quote panel, which lives here now instead of a permanent
// sidebar widget since the reference design has no such sidebar slot.
import type { BomResult, ConfiguratorState, ProjectInfo } from "@/lib/configurator/types";
import { useTranslations } from "@/app/providers/LocaleProvider";
import { SavedProjectsPanel } from "./SavedProjectsPanel";
import { Field, Section, Select, Textarea } from "./ui";

export function ProjectInfoStep({
  project,
  onChange,
  state,
  bom,
  quoteId,
  onSaved,
  onLoad,
}: {
  project: ProjectInfo;
  onChange: (patch: Partial<ProjectInfo>) => void;
  state: ConfiguratorState;
  bom: BomResult;
  quoteId: string | null;
  onSaved: (id: string, jobNumber: string) => void;
  onLoad: (id: string, loaded: ConfiguratorState) => void;
}) {
  const t = useTranslations();
  const textClass =
    "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

  return (
    <div className="flex flex-col gap-6">
      <Section title={t("configurator.project")}>
        <Field label={t("configurator.projectName")}>
          <input className={textClass} value={project.name} onChange={(e) => onChange({ name: e.target.value })} />
        </Field>
        <Field label={t("configurator.client")}>
          <input className={textClass} value={project.client} onChange={(e) => onChange({ client: e.target.value })} />
        </Field>
        <Field label={t("configurator.location")}>
          <input className={textClass} value={project.location} onChange={(e) => onChange({ location: e.target.value })} />
        </Field>
        <Field label={t("configurator.providerName")}>
          <input
            className={textClass}
            value={project.providerName}
            onChange={(e) => onChange({ providerName: e.target.value })}
          />
        </Field>
        <Field label={t("configurator.email")}>
          <input
            type="email"
            className={textClass}
            value={project.email}
            onChange={(e) => onChange({ email: e.target.value })}
          />
        </Field>
        <Field label={t("configurator.phone")}>
          <input
            type="tel"
            className={textClass}
            value={project.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
          />
        </Field>
        <Field label={t("configurator.provider")}>
          <Select
            value={project.provider}
            onChange={(v) => onChange({ provider: v as ProjectInfo["provider"] })}
            options={[
              { value: "distributor", label: t("configurator.distributor") },
              { value: "showroom", label: t("configurator.showroom") },
            ]}
          />
        </Field>
        <Field label={t("configurator.cabinetType")}>
          <Select
            value={project.cabinet}
            onChange={(v) => onChange({ cabinet: v as ProjectInfo["cabinet"] })}
            options={[
              { value: "frameless", label: t("configurator.frameless") },
              { value: "framed", label: t("configurator.framed") },
            ]}
          />
        </Field>
        <Field label={t("configurator.installLocation")}>
          <Select
            value={project.installLocation}
            onChange={(v) => onChange({ installLocation: v as ProjectInfo["installLocation"] })}
            options={[
              { value: "factory", label: t("configurator.factory") },
              { value: "jobSite", label: t("configurator.jobSite") },
            ]}
          />
        </Field>
        <Field label={t("configurator.installer")}>
          <Select
            value={project.installer}
            onChange={(v) => onChange({ installer: v as ProjectInfo["installer"] })}
            options={[
              { value: "cabinet", label: t("configurator.cabinetInstaller") },
              { value: "electrician", label: t("configurator.electricianInstaller") },
            ]}
          />
        </Field>
        <Field label={t("configurator.application")}>
          <input
            className={textClass}
            value={project.application}
            onChange={(e) => onChange({ application: e.target.value })}
          />
        </Field>
        <Field label={t("configurator.preference")}>
          <Select
            value={project.install}
            onChange={(v) => onChange({ install: v as ProjectInfo["install"] })}
            options={[
              { value: "plug", label: t("configurator.plug") },
              { value: "hardwire", label: t("configurator.hardwire") },
            ]}
          />
        </Field>
        <Field label={t("configurator.notes")} wide>
          <Textarea value={project.notes} onChange={(v) => onChange({ notes: v })} />
        </Field>
      </Section>

      <SavedProjectsPanel state={state} bom={bom} quoteId={quoteId} onSaved={onSaved} onLoad={onLoad} />
    </div>
  );
}

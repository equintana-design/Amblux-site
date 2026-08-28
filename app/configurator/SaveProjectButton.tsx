"use client";

// Compact save action rendered in the wizard's header (see
// ConfiguratorClient.tsx) so saving a project doesn't require navigating
// back to the Project Info step — the full save/load panel (Saved
// Projects list) stays there, but the ability to save the project you're
// currently editing, from wherever you are in the wizard, lives here.
import type { BomResult, ConfiguratorState } from "@/lib/configurator/types";
import { useTranslations } from "@/app/providers/LocaleProvider";
import { useSaveQuote } from "./useSaveQuote";

export function SaveProjectButton({
  state,
  bom,
  quoteId,
  onSaved,
}: {
  state: ConfiguratorState;
  bom: BomResult;
  quoteId: string | null;
  onSaved: (id: string, jobNumber: string) => void;
}) {
  const t = useTranslations();
  const { user, saving, error, lastSavedJob, save } = useSaveQuote({ state, bom, quoteId, onSaved });

  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent-strong disabled:opacity-60"
      >
        {saving ? t("configuratorExtra.saving") : t("configuratorExtra.saveProject")}
      </button>
      {lastSavedJob ? <span className="hidden text-xs text-muted sm:inline">{t("configuratorExtra.savedAs").replace("{job}", lastSavedJob)}</span> : null}
      {error ? <span className="hidden text-xs text-red-600 sm:inline">{t("configuratorExtra.saveError")}</span> : null}
    </div>
  );
}

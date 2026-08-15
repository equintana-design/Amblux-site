"use client";

// Save the current Configurator project to the signed-in distributor's
// account (amblux_quotes — see lib/configurator/quotes.ts) and reload any
// previous one. The Configurator route is already gated to signed-in,
// approved accounts only (see app/configurator/page.tsx), so there's no
// "please sign in" state to handle here — by the time this component
// renders, a user is guaranteed.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseUser } from "@/lib/supabase/useSupabaseUser";
import { useTranslations } from "@/app/providers/LocaleProvider";
import { listMyQuotes, loadQuoteState, saveQuote, type QuoteSummary } from "@/lib/configurator/quotes";
import type { BomResult, ConfiguratorState } from "@/lib/configurator/types";

export function SavedProjectsPanel({
  state,
  bom,
  quoteId,
  onSaved,
  onLoad,
}: {
  state: ConfiguratorState;
  bom: BomResult;
  quoteId: string | null;
  onSaved: (id: string, jobNumber: string) => void;
  onLoad: (id: string, state: ConfiguratorState) => void;
}) {
  const { user } = useSupabaseUser();
  const t = useTranslations();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [lastSavedJob, setLastSavedJob] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<QuoteSummary[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    listMyQuotes(createClient(), user.id)
      .then((rows) => {
        if (!cancelled) setQuotes(rows);
      })
      .catch(() => {
        if (!cancelled) setQuotes([]);
      });
    return () => {
      cancelled = true;
    };
    // Re-list after every successful save so a fresh save shows up in the
    // list immediately (lastSavedJob changes on every save).
  }, [user, lastSavedJob]);

  if (!user) return null;

  async function handleSave() {
    setSaving(true);
    setError(false);
    try {
      const supabase = createClient();
      const result = await saveQuote(supabase, { id: quoteId, accountId: user!.id, state, bom });
      setLastSavedJob(result.jobNumber);
      onSaved(result.id, result.jobNumber);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleLoad(id: string) {
    const loaded = await loadQuoteState(createClient(), id);
    if (loaded) onLoad(id, loaded);
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-foreground">{t("configuratorExtra.savedProjects")}</h3>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:opacity-60"
        >
          {saving ? t("configuratorExtra.saving") : t("configuratorExtra.saveProject")}
        </button>
      </div>

      {lastSavedJob ? (
        <p className="mt-3 text-xs text-muted">
          {t("configuratorExtra.savedAs").replace("{job}", lastSavedJob)}
        </p>
      ) : null}
      {error ? <p className="mt-3 text-xs text-red-600">{t("configuratorExtra.saveError")}</p> : null}

      <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
        {quotes === null ? (
          <p className="text-xs text-muted">{t("configuratorExtra.loadingProjects")}</p>
        ) : quotes.length === 0 ? (
          <p className="text-xs text-muted">{t("configuratorExtra.noSavedProjects")}</p>
        ) : (
          quotes.map((q) => (
            <div key={q.id} className="flex items-center justify-between gap-3 rounded-lg bg-background px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{q.projectName}</p>
                <p className="truncate text-xs text-muted">
                  {q.jobNumber}
                  {q.totalWatts != null ? ` · ${Math.round(q.totalWatts * 10) / 10} W` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleLoad(q.id)}
                className="shrink-0 rounded-full border border-accent-soft px-3 py-1.5 text-xs font-semibold text-accent-strong hover:bg-accent-soft/20"
              >
                {t("configuratorExtra.loadProject")}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

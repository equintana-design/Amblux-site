"use client";

// Save the current Configurator project to the signed-in distributor's
// account (amblux_quotes — see lib/configurator/quotes.ts) and reload any
// previous one. The Configurator route is already gated to signed-in,
// approved accounts only (see app/configurator/page.tsx), so there's no
// "please sign in" state to handle here — by the time this component
// renders, a user is guaranteed.
//
// Saved projects also carry a 12-month rolling save window (migration
// 0031): a daily scheduled cleanup permanently deletes any project that
// hasn't been saved/updated in the last 12 months, and every real save —
// this panel's own Save button, or the compact one in the header — resets
// that clock. The note below the heading and the "Expires" date on each
// row make that policy visible instead of a silent background job. A
// client can also delete a project themselves at any time with the
// "Delete" button, which is immediate and permanent (not subject to the
// 12-month wait) — a one-click "Delete" becomes a "Confirm / Cancel" pair
// rather than a native browser confirm() popup, matching the rest of the
// app's plain-button UI.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "@/app/providers/LocaleProvider";
import { deleteQuote, listMyQuotes, loadQuoteState, type QuoteSummary } from "@/lib/configurator/quotes";
import type { BomResult, ConfiguratorState } from "@/lib/configurator/types";
import { useSaveQuote } from "./useSaveQuote";

const RETENTION_MONTHS = 12;

function expiresAt(updatedAt: string): Date {
  const d = new Date(updatedAt);
  d.setMonth(d.getMonth() + RETENTION_MONTHS);
  return d;
}

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
  const t = useTranslations();
  const { user, saving, error, lastSavedJob, save } = useSaveQuote({ state, bom, quoteId, onSaved });
  const [quotes, setQuotes] = useState<QuoteSummary[] | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState(false);

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

  async function handleLoad(id: string) {
    const loaded = await loadQuoteState(createClient(), id);
    if (loaded) onLoad(id, loaded);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteError(false);
    try {
      await deleteQuote(createClient(), id);
      setQuotes((prev) => (prev ? prev.filter((q) => q.id !== id) : prev));
      setConfirmingId(null);
      // If the project just deleted is the one currently open in the
      // wizard, there's nothing sensible left to "load" back — but that's
      // the same state a brand-new, never-saved project is already in, so
      // no extra handling is needed here; the caller's quoteId simply
      // stops matching anything in the list.
    } catch {
      setDeleteError(true);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-foreground">{t("configuratorExtra.savedProjects")}</h3>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong disabled:opacity-60"
        >
          {saving ? t("configuratorExtra.saving") : t("configuratorExtra.saveProject")}
        </button>
      </div>

      <p className="mt-2 text-xs text-muted">{t("configuratorExtra.retentionNote")}</p>

      {lastSavedJob ? (
        <p className="mt-3 text-xs text-muted">
          {t("configuratorExtra.savedAs").replace("{job}", lastSavedJob)}
        </p>
      ) : null}
      {error ? <p className="mt-3 text-xs text-red-600">{t("configuratorExtra.saveError")}</p> : null}
      {deleteError ? <p className="mt-3 text-xs text-red-600">{t("configuratorExtra.deleteError")}</p> : null}

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
                <p className="truncate text-xs text-muted/70">
                  {t("configuratorExtra.expiresOn").replace(
                    "{date}",
                    expiresAt(q.updatedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleLoad(q.id)}
                  className="rounded-full border border-accent-soft px-3 py-1.5 text-xs font-semibold text-accent-strong hover:bg-accent-soft/20"
                >
                  {t("configuratorExtra.loadProject")}
                </button>
                {confirmingId === q.id ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleDelete(q.id)}
                      disabled={deletingId === q.id}
                      className="rounded-full border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                    >
                      {deletingId === q.id ? t("configuratorExtra.deleting") : t("configuratorExtra.confirmDelete")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted hover:border-accent hover:text-accent-strong"
                    >
                      {t("configuratorExtra.cancelDelete")}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingId(q.id)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted hover:border-red-300 hover:text-red-700"
                  >
                    {t("configuratorExtra.deleteProject")}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

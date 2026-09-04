"use client";

// Save the current Project (formerly "Test Project" — a flat picked-SKU
// list, no account needed to build one) to the signed-in account, and
// reload or delete a previous one. This is the direct-SKU-pick
// counterpart to the Configurator's SavedProjectsPanel.tsx — same
// save/reload/delete/12-month-retention system underneath (see migration
// 0032 and lib/configurator/quotes.ts), reusing that component's own
// shared translation strings (configuratorExtra.saveProject, etc.) since
// the wording applies just as well here.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "@/app/providers/LocaleProvider";
import { deleteQuote, listMyQuickProjects, loadQuickProjectState, type QuickProjectSummary } from "@/lib/configurator/quotes";
import type { QuickProjectItem } from "@/lib/configurator/quickProject";
import { useSaveQuickProject } from "./useSaveQuickProject";

const RETENTION_MONTHS = 12;

function expiresAt(updatedAt: string): Date {
  const d = new Date(updatedAt);
  d.setMonth(d.getMonth() + RETENTION_MONTHS);
  return d;
}

export function SavedQuickProjectsPanel({
  name,
  items,
  quoteId,
  onSaved,
  onLoad,
}: {
  name: string;
  items: QuickProjectItem[];
  quoteId: string | null;
  onSaved: (id: string, jobNumber: string) => void;
  onLoad: (id: string, name: string, items: QuickProjectItem[]) => void;
}) {
  const t = useTranslations();
  const { user, saving, error, missingName, lastSavedJob, save } = useSaveQuickProject({ name, items, quoteId, onSaved });
  const [quotes, setQuotes] = useState<QuickProjectSummary[] | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    listMyQuickProjects(createClient(), user.id)
      .then((rows) => {
        if (!cancelled) setQuotes(rows);
      })
      .catch(() => {
        if (!cancelled) setQuotes([]);
      });
    return () => {
      cancelled = true;
    };
    // Re-list after every successful save so a fresh save shows up
    // immediately (lastSavedJob changes on every save) — same pattern as
    // SavedProjectsPanel.tsx.
  }, [user, lastSavedJob]);

  if (!user) return null;

  async function handleLoad(id: string) {
    const loaded = await loadQuickProjectState(createClient(), id);
    if (loaded) onLoad(id, loaded.name, loaded.items);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteError(false);
    try {
      await deleteQuote(createClient(), id);
      setQuotes((prev) => (prev ? prev.filter((q) => q.id !== id) : prev));
      setConfirmingId(null);
    } catch {
      setDeleteError(true);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 print:hidden">
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
        <p className="mt-3 text-xs text-muted">{t("configuratorExtra.savedAs").replace("{job}", lastSavedJob)}</p>
      ) : null}
      {error ? <p className="mt-3 text-xs text-red-600">{t("configuratorExtra.saveError")}</p> : null}
      {missingName ? <p className="mt-3 text-xs text-red-600">{t("configuratorExtra.quickProjectNameRequired")}</p> : null}
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
                  {q.jobNumber} · {q.itemCount} {t("testProject.items")}
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

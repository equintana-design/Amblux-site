type Cost = { fob_usd: number; is_estimated: boolean; notes: string | null };

// Lets an admin edit (or, for a SKU that has no cost row yet, add) the
// FOB (USD) cost right inside the Category & SKU overrides section,
// instead of having to scroll down to the separate Product cost (FOB)
// table to find the same SKU again. Plain server-action form — no client
// state of its own — so it works equally well rendered from the
// server-rendered overrides list (page.tsx) or from the client-side
// "add a new override" form (NewOverrideForm.tsx), as long as the caller
// re-mounts it (via a `key`) whenever the SKU it targets changes, since
// its FOB/estimated/notes inputs are uncontrolled and only pick up
// `cost` on mount.
export function FobEditForm({
  sku,
  cost,
  updateAction,
  addAction,
}: {
  sku: string;
  cost?: Cost;
  updateAction: (formData: FormData) => void;
  addAction: (formData: FormData) => void;
}) {
  if (!sku.trim()) return null;

  return (
    <form
      action={cost ? updateAction : addAction}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-border/60 bg-background p-3"
    >
      <input type="hidden" name="sku" value={sku} />
      <label className="flex flex-col gap-1 text-xs text-muted">
        FOB (USD)
        <input
          type="number"
          step="0.01"
          min="0"
          name="fob_usd"
          defaultValue={cost?.fob_usd ?? ""}
          required
          className="w-28 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </label>
      {cost ? (
        <>
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <input type="checkbox" name="is_estimated" defaultChecked={cost.is_estimated} />
            estimated
          </label>
          <input
            type="text"
            name="notes"
            defaultValue={cost.notes ?? ""}
            placeholder="notes"
            className="min-w-[160px] flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </>
      ) : (
        <p className="text-xs text-muted">No FOB on file yet for this SKU — enter one to add it.</p>
      )}
      <button
        type="submit"
        className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted hover:border-accent hover:text-accent-strong"
      >
        {cost ? "Save FOB" : "Add FOB cost"}
      </button>
    </form>
  );
}

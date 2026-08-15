"use client";

import Link from "next/link";
import { useTestProject } from "@/app/providers/TestProjectProvider";

// Mirrors the original site's sticky "Your test project" sidebar card on
// the product finder (ambluxlandingpagespec.md section 6) — a live view of
// whatever's been added via "Add to test project" on product pages, with
// per-item remove and a clear-all, right on the listing page itself.
export function TestProjectSidebar() {
  const { items, removeItem, clear } = useTestProject();

  return (
    <div className="sticky top-6 rounded-2xl border border-border bg-background p-5">
      <p className="text-sm font-semibold text-foreground">Your test project</p>
      <p className="mt-1 text-sm text-muted">{items.length} component{items.length === 1 ? "" : "s"} selected</p>

      {items.length > 0 ? (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          {items.map((item) => (
            <div key={item.sku} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                <code className="block break-all text-xs text-muted">{item.sku}</code>
              </div>
              <button
                type="button"
                onClick={() => removeItem(item.sku)}
                aria-label={`Remove ${item.label}`}
                className="shrink-0 text-muted hover:text-accent-strong"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-2">
        <Link href="/test-project" className="text-sm font-semibold text-accent-strong hover:underline">
          View full bill of materials →
        </Link>
        {items.length > 0 ? (
          <button type="button" onClick={clear} className="text-left text-xs font-medium text-muted hover:text-accent-strong">
            Clear project
          </button>
        ) : null}
      </div>
    </div>
  );
}

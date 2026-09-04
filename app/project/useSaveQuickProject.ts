"use client";

// Save-to-account logic for a Project (formerly "Test Project") — the
// direct-SKU-pick counterpart to the Configurator's useSaveQuote.ts. Same
// shape and same reasoning, just backed by saveQuickProject() (kind='quick'
// rows, see migration 0032 and lib/configurator/quotes.ts) instead of the
// full Configurator save path.
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseUser } from "@/lib/supabase/useSupabaseUser";
import { saveQuickProject } from "@/lib/configurator/quotes";
import type { QuickProjectItem } from "@/lib/configurator/quickProject";

export function useSaveQuickProject({
  name,
  items,
  quoteId,
  onSaved,
}: {
  name: string;
  items: QuickProjectItem[];
  quoteId: string | null;
  onSaved: (id: string, jobNumber: string) => void;
}) {
  const { user } = useSupabaseUser();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [missingName, setMissingName] = useState(false);
  const [lastSavedJob, setLastSavedJob] = useState<string | null>(null);

  async function save() {
    if (!user) return;
    if (!name.trim()) {
      setMissingName(true);
      return;
    }
    setMissingName(false);
    setSaving(true);
    setError(false);
    try {
      const supabase = createClient();
      const result = await saveQuickProject(supabase, {
        id: quoteId,
        accountId: user.id,
        state: { name, items },
      });
      setLastSavedJob(result.jobNumber);
      onSaved(result.id, result.jobNumber);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return { user, saving, error, missingName, lastSavedJob, save };
}

"use client";

// Shared save-to-account logic for the Configurator, used by both
// SavedProjectsPanel (the full save/load panel on the Project Info step)
// and SaveProjectButton (a compact "Save" action available from every
// step — see ConfiguratorClient.tsx's header). Previously this lived only
// inside SavedProjectsPanel, which meant the only way to save was to
// navigate back to step 1 first.
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseUser } from "@/lib/supabase/useSupabaseUser";
import { saveQuote } from "@/lib/configurator/quotes";
import type { BomResult, ConfiguratorState } from "@/lib/configurator/types";

export function useSaveQuote({
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
  const { user } = useSupabaseUser();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [lastSavedJob, setLastSavedJob] = useState<string | null>(null);

  async function save() {
    if (!user) return;
    setSaving(true);
    setError(false);
    try {
      const supabase = createClient();
      const result = await saveQuote(supabase, { id: quoteId, accountId: user.id, state, bom });
      setLastSavedJob(result.jobNumber);
      onSaved(result.id, result.jobNumber);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return { user, saving, error, lastSavedJob, save };
}

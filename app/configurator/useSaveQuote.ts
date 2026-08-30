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
  const [missingRequiredFields, setMissingRequiredFields] = useState(false);
  const [lastSavedJob, setLastSavedJob] = useState<string | null>(null);

  // Project name, Client / Company, and Lighting provider name are
  // mandatory (per the user's explicit request) — ProjectInfoStep.tsx
  // shows a red asterisk + red border on these three fields, but the real
  // enforcement is here: Save is refused outright, from either the header
  // button or the Saved Projects panel, until all three are filled in.
  function hasRequiredFields(): boolean {
    return Boolean(state.project.name.trim() && state.project.client.trim() && state.project.providerName.trim());
  }

  async function save() {
    if (!user) return;
    if (!hasRequiredFields()) {
      setMissingRequiredFields(true);
      return;
    }
    setMissingRequiredFields(false);
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

  return { user, saving, error, missingRequiredFields, lastSavedJob, save };
}

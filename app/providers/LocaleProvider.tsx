"use client";

// Site-wide language switcher (EN/FR/ES) — same architectural pattern as
// TestProjectProvider: a client React context, persisted to localStorage,
// with an effect-based hydration read on mount (server always renders the
// default locale; the saved preference applies a moment later on the
// client) to avoid an SSR/hydration mismatch.
//
// Storage key and the `document.documentElement.lang` sync below both
// intentionally match the original AMBLUX site's own recovered behavior
// (see product-detail-Bs2U9gra.js: `window.localStorage.getItem(
// "amblux-language")` / `document.documentElement.lang = next`) rather than
// inventing a new convention.
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LOCALE, dictionaries, type Locale, type Messages } from "@/lib/i18n/dictionaries";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  messages: Messages;
};

const STORAGE_KEY = "amblux-language";

const LocaleContext = createContext<LocaleContextValue | null>(null);

function isLocale(value: string | null): value is Locale {
  return value === "en" || value === "fr" || value === "es";
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage (an external system) on mount is exactly the documented exception to this rule.
      if (isLocale(saved)) setLocaleState(saved);
    } catch {
      // Corrupt or inaccessible storage — just start on the default locale.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // Storage full or disabled — the switch still works for this session.
    }
    document.documentElement.lang = locale;
  }, [locale, hydrated]);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale: setLocaleState, messages: dictionaries[locale] }),
    [locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
}

// Exported so module-level helper functions (outside a component body, e.g.
// forms.tsx's option-builder functions) can accept the translator as a
// parameter instead of calling the hook themselves.
export type TFunction = (path: string) => string;

// Dot-path lookup into the current locale's message dictionary — e.g.
// t("product.configure") — with a console warning + key echo instead of a
// crash if a path is ever mistyped.
export function useTranslations(): TFunction {
  const { messages } = useLocale();
  return function t(path: string): string {
    const parts = path.split(".");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let value: any = messages;
    for (const part of parts) {
      value = value?.[part];
    }
    if (typeof value !== "string") {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`Missing translation for "${path}"`);
      }
      return path;
    }
    return value;
  };
}

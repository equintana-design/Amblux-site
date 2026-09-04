"use client";

// A lightweight, no-account-needed alternative to the room-based
// Configurator: lets someone browsing the product pages add individual
// SKUs to a running list ("Project", formerly "Test Project") and come
// away with their own bill of materials, without having to model
// zones/cabinets. Mirrors the original site's "Your test project" sidebar
// cart (see ambluxlandingpagespec.md section 6).
//
// Always persisted to localStorage so it survives a refresh/navigation
// with no account needed to build one. As of 2026-09, a signed-in account
// can additionally save it to their account (see app/project/page.tsx,
// useSaveQuickProject.ts) — that's a separate, explicit action; nothing
// here talks to the server on its own.
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { QuickProjectItem } from "@/lib/configurator/quickProject";

// The item shape lives in lib/configurator/quickProject.ts now (it's also
// what gets saved to an account under amblux_quotes — see
// useSaveQuickProject.ts) — re-exported here under its original name so
// nothing else in the app that imports TestProjectItem from this file
// needs to change.
export type TestProjectItem = QuickProjectItem;

type TestProjectContextValue = {
  items: TestProjectItem[];
  name: string;
  setName: (name: string) => void;
  addItem: (item: Omit<TestProjectItem, "qty">, qty?: number) => void;
  removeItem: (sku: string) => void;
  setQty: (sku: string, qty: number) => void;
  clear: () => void;
  // Wholesale-replaces both name and items at once — used when loading a
  // previously-saved Project from an account (see
  // SavedQuickProjectsPanel.tsx's onLoad), as opposed to addItem's
  // merge-in behaviour for the normal "add from a product page" flow.
  replaceAll: (name: string, items: TestProjectItem[]) => void;
  count: number;
};

const STORAGE_KEY = "amblux-test-project";

interface StoredShape {
  name: string;
  items: TestProjectItem[];
}

const TestProjectContext = createContext<TestProjectContextValue | null>(null);

export function TestProjectProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<TestProjectItem[]>([]);
  const [name, setNameState] = useState("");
  const [hydrated, setHydrated] = useState(false);

  // Read whatever was saved from a previous visit once, on mount only.
  // Deliberately an effect rather than a lazy useState initializer:
  // localStorage isn't available during server rendering, so the first
  // client render has to match the server's empty-array render exactly to
  // avoid a hydration mismatch — the saved items apply a moment later here.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Backward-compatible read: before the name field existed, this
        // key stored a bare items array rather than { name, items }.
        if (Array.isArray(parsed)) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage (an external system) on mount is exactly the documented exception to this rule.
          setItems(parsed);
        } else if (parsed && typeof parsed === "object") {
          const stored = parsed as Partial<StoredShape>;
          setItems(Array.isArray(stored.items) ? stored.items : []);
          setNameState(typeof stored.name === "string" ? stored.name : "");
        }
      }
    } catch {
      // Corrupt or inaccessible storage — just start empty rather than crash.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const toStore: StoredShape = { name, items };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch {
      // Storage full or disabled (e.g. private browsing) — the list still
      // works for the rest of this session, it just won't persist.
    }
  }, [items, name, hydrated]);

  const value = useMemo<TestProjectContextValue>(
    () => ({
      items,
      name,
      setName: setNameState,
      addItem: (item, qty = 1) => {
        setItems((prev) => {
          const existing = prev.find((p) => p.sku === item.sku);
          if (existing) {
            return prev.map((p) => (p.sku === item.sku ? { ...p, qty: p.qty + qty } : p));
          }
          return [...prev, { ...item, qty }];
        });
      },
      removeItem: (sku) => setItems((prev) => prev.filter((p) => p.sku !== sku)),
      setQty: (sku, qty) =>
        setItems((prev) => (qty <= 0 ? prev.filter((p) => p.sku !== sku) : prev.map((p) => (p.sku === sku ? { ...p, qty } : p)))),
      clear: () => {
        setItems([]);
        setNameState("");
      },
      replaceAll: (newName, newItems) => {
        setNameState(newName);
        setItems(newItems);
      },
      count: items.reduce((sum, item) => sum + item.qty, 0),
    }),
    [items, name],
  );

  return <TestProjectContext.Provider value={value}>{children}</TestProjectContext.Provider>;
}

export function useTestProject() {
  const ctx = useContext(TestProjectContext);
  if (!ctx) throw new Error("useTestProject must be used within a TestProjectProvider");
  return ctx;
}

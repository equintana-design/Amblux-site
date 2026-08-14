"use client";

// Shares the currently-selected variant SKU between the hero's variant
// configurator and the specifications section further down the page — the
// two places on the original recovered page (index.html/NOTES.md) that
// react to the button-group selection. A React context (rather than URL
// state) keeps this a plain client-side toggle, matching the original's
// "clicking a button toggles .active and updates the displayed part
// number" behavior described in NOTES.md.
import { createContext, useContext, useMemo, useState } from "react";
import type { Tables } from "@/lib/supabase/database.types";

export type ProductVariant = Tables<"amblux_products">;

type VariantContextValue = {
  variants: ProductVariant[];
  axes: { key: string; label: string }[];
  selectedSku: string;
  setSelectedSku: (sku: string) => void;
  selected: ProductVariant;
};

const VariantContext = createContext<VariantContextValue | null>(null);

export function VariantProvider({
  variants,
  axes,
  defaultSku,
  children,
}: {
  variants: ProductVariant[];
  axes: { key: string; label: string }[];
  defaultSku: string;
  children: React.ReactNode;
}) {
  const [selectedSku, setSelectedSku] = useState(defaultSku);

  const value = useMemo<VariantContextValue>(() => {
    const selected = variants.find((v) => v.sku === selectedSku) ?? variants[0];
    return { variants, axes, selectedSku, setSelectedSku, selected };
  }, [variants, axes, selectedSku]);

  return <VariantContext.Provider value={value}>{children}</VariantContext.Provider>;
}

export function useVariant() {
  const ctx = useContext(VariantContext);
  if (!ctx) throw new Error("useVariant must be used within a VariantProvider");
  return ctx;
}

// Given the axes this family exposes and the SKU currently selected on each
// axis, finds the one variant matching every axis value — mirrors how the
// original's button groups jointly narrow down to a single part number.
export function findVariantForAxisValues(
  variants: ProductVariant[],
  axes: { key: string }[],
  values: Record<string, string>,
): ProductVariant | undefined {
  return variants.find((v) => {
    const options = (v.variant_options ?? {}) as Record<string, string>;
    return axes.every((axis) => options[axis.key] === values[axis.key]);
  });
}

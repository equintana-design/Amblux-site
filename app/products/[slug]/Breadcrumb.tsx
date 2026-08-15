"use client";

import Link from "next/link";
import { useTranslations } from "@/app/providers/LocaleProvider";

export function Breadcrumb() {
  const t = useTranslations();
  return (
    <div className="mx-auto w-full max-w-6xl px-6 pt-6 print:hidden">
      <Link href="/products" className="text-sm font-medium text-accent-strong hover:underline">
        ← {t("product.back")}
      </Link>
    </div>
  );
}

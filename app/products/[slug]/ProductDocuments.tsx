"use client";

import type { Tables } from "@/lib/supabase/database.types";
import { useTranslations } from "@/app/providers/LocaleProvider";

type ProductDocument = { label: string; url: string };

// Up to 5 admin-uploaded PDFs per page (spec sheets, install guides,
// certifications) — see migration product_gallery_and_documents and the
// "Documents" section of /admin/products/[slug]. Renders nothing if the
// admin hasn't added any yet, same empty-guard pattern as BenefitGrid.
export function ProductDocuments({ page }: { page: Tables<"amblux_product_pages"> }) {
  const t = useTranslations();
  const documents = (page.document_urls ?? []) as ProductDocument[];
  if (documents.length === 0) return null;

  return (
    <section className="border-t border-border print:hidden">
      <div className="mx-auto w-full max-w-6xl px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">{t("product.documents")}</p>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc, i) => (
            <a
              key={i}
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent"
            >
              <span aria-hidden="true" className="text-xl">
                📄
              </span>
              <span className="text-sm font-medium text-foreground">{doc.label}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

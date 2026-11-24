"use client";

// Direct-from-the-browser upload to Supabase Storage, used everywhere the
// admin product editor lets someone attach a photo or a PDF (hero/gallery
// images, the 5 document rows, a single SKU's product image, and the new-SKU
// form's photo).
//
// Why this exists: every one of those forms used to submit its picked
// <input type="file"> straight through the page's own Server Action
// (updateProductPageAction / updateProductVariantAction / createProductAction
// in ../actions.ts), as part of one combined multipart POST covering the
// whole form. That works fine for a single small photo, but breaks as soon
// as the combined payload (e.g. several PDF spec sheets picked at once)
// crosses roughly 4.5MB — not because of anything in this app's own code,
// but because Vercel's serverless functions have a hard request-body ceiling
// at that size, enforced by the platform in front of the function. Going
// over it doesn't produce a normal error page; the connection is cut, which
// shows up in the browser as a generic "This page couldn't load" failure
// with no indication of why (reported 2026-11-24, hardwire-driver-series'
// Documents section, 4 PDFs totaling ~7.6MB).
//
// Fix: upload the file directly from the browser to Supabase Storage (same
// bucket, same path convention, same admin-gated RLS policy that already
// governed the server-side upload — see migration 0023's comment on the
// product-images/product-documents bucket policies) and only ever send the
// resulting small public URL through the Server Action's normal form POST.
// Each file now travels in its own request straight to Supabase, never
// through a Vercel function body at all, so this ceiling no longer applies
// regardless of file count or size. resolveFileUrl() in ../actions.ts needs
// no changes for this — it already falls back to the pasted-URL field
// whenever no File is present on the matching file field, which is now
// always the case, since this component's own file input intentionally
// carries no `name` and is therefore never part of the submitted FormData.
import Image from "next/image";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  bucket: "product-images" | "product-documents";
  // Storage path prefix, without extension (e.g. "pages/undercabinet/hero",
  // "pages/undercabinet/doc0", "products/AMB-HWRDRV-24V-60W"). A timestamp
  // and the uploaded file's own extension are appended, matching the exact
  // convention the old server-side upload used, so files land in the same
  // place in the bucket as before.
  pathPrefix: string;
  // Form field name for the resulting URL — this is the only part of this
  // component that ends up in the surrounding <form>'s submission.
  name: string;
  defaultValue?: string;
  accept: string;
  placeholder?: string;
  showImagePreview?: boolean;
  label?: string;
};

export function FileUploadField({
  bucket,
  pathPrefix,
  name,
  defaultValue = "",
  accept,
  placeholder,
  showImagePreview = false,
  label,
}: Props) {
  const [url, setUrl] = useState(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset the picker immediately so choosing the same file again (e.g.
    // after fixing an error elsewhere on the page) still fires onChange.
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(null);

    const supabase = createClient();
    const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    const path = `${pathPrefix}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    setUrl(data.publicUrl);
    setUploading(false);
  }

  return (
    <div className="flex flex-col gap-2">
      {label ? <span className="text-sm font-medium text-muted">{label}</span> : null}
      {showImagePreview && url ? (
        <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-border bg-background">
          <Image src={url} alt="" fill className="object-contain p-2" sizes="96px" />
        </div>
      ) : null}
      <input
        type="text"
        name={name}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={placeholder}
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <div className="flex items-center gap-3">
        {/* Deliberately no `name` here — the file never travels through the
            page's own form submission, only the URL field above does. */}
        <input type="file" accept={accept} onChange={handleFile} disabled={uploading} className="text-xs text-muted" />
        {uploading ? <span className="text-xs text-accent-strong">Uploading…</span> : null}
      </div>
      {error ? (
        <p className="text-xs text-red-600">
          Upload failed: {error}. Nothing was changed — the field above still has whatever was there before.
        </p>
      ) : null}
    </div>
  );
}

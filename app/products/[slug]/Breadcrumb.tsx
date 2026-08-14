import Link from "next/link";

export function Breadcrumb() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 pt-6">
      <Link href="/products" className="text-sm font-medium text-accent-strong hover:underline">
        ← Back to product finder
      </Link>
    </div>
  );
}

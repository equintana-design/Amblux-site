import Link from "next/link";
import { SiteHeader } from "@/app/components/SiteHeader";

// Shared by every /admin/* page (pricing, products, distributors) via
// Next's layout nesting — one file gives all of them the site-wide header
// (with account status) plus a way back to /account, instead of editing
// each admin page individually.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <div className="border-b border-border bg-background px-6 py-3">
        <div className="mx-auto w-full max-w-6xl">
          <Link href="/account" className="text-sm font-medium text-muted hover:text-accent-strong">
            ← Back to account
          </Link>
        </div>
      </div>
      {children}
    </div>
  );
}

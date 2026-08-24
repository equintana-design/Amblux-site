import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/app/components/SiteHeader";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact us — AMBLUX",
  description: "Tell us about your business and the AMBLUX team will follow up.",
};

// Where the header's account button sends signed-out visitors (see
// AccountStatus) — a self-serve sign-up only creates a pending account
// that still needs an admin's approval, so a prospective distributor is
// better served talking to sales directly first.
export default function ContactPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">AMBLUX</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">Contact us</h1>
        <p className="mt-4 text-muted">
          Tell us a bit about your business and what you&apos;re looking for — a member of the AMBLUX team will
          follow up by email.
        </p>

        <ContactForm />

        <p className="mt-8 border-t border-border pt-6 text-sm text-muted">
          Already work with AMBLUX?{" "}
          <Link href="/sign-in" className="font-medium text-accent-strong hover:underline">
            Sign in
          </Link>{" "}
          to your account.
        </p>
      </main>
    </div>
  );
}

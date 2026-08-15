"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "@/app/providers/LocaleProvider";

// Shown instead of the configurator to anyone who isn't a signed-in,
// approved partner account — the product catalog and homepage stay fully
// public with no login at all, but the configurator itself is a benefit
// AMBLUX extends specifically to customers who buy through an authorized
// partner, not a tool anyone can use standalone.
export function ConfiguratorLocked() {
  const t = useTranslations();
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/images/amblux-logo.png" alt="AMBLUX" width={120} height={32} className="h-8 w-auto" />
          </Link>
          <Link
            href="/sign-in"
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted hover:border-accent hover:text-accent-strong"
          >
            {t("configuratorExtra.authPartnerSignIn")}
          </Link>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-24 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-soft">{t("configurator.kicker")}</p>
        <h1 className="mt-3 text-3xl font-semibold text-foreground">{t("configuratorExtra.lockedHeading")}</h1>
        <p className="mt-4 text-muted">{t("configuratorExtra.lockedText")}</p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/sign-in"
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
          >
            {t("configuratorExtra.lockedSignIn")}
          </Link>
          <Link
            href="/#partners"
            className="rounded-full border border-border px-6 py-3 text-sm font-semibold text-muted transition-colors hover:border-accent hover:text-accent-strong"
          >
            {t("configuratorExtra.lockedLearnMore")}
          </Link>
        </div>

        <p className="mt-8 text-xs text-muted">{t("configuratorExtra.lockedBrowsingNote")}</p>
      </div>
    </div>
  );
}

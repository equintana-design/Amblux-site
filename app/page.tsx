import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "./components/SiteHeader";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/images/amblux-kitchen.png" alt="" fill priority className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/10" />
        </div>
        <div className="relative mx-auto flex min-h-[560px] max-w-6xl flex-col justify-center px-6 py-24">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-soft">
            Kitchen · Furniture · Closet Lighting
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
            Integrated lighting solutions, engineered to help hardware distributors lead their market.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-white/85">
            AMBLUX designs and supplies our own line of LED lighting systems for cabinetry, closets, and
            furniture — paired with a configurator that speaks your customers&apos; language: real zones,
            real part numbers, real job costs.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/configurator"
              className="rounded-full bg-accent px-7 py-3 text-base font-semibold text-white transition-colors hover:bg-accent-strong"
            >
              Try the Configurator
            </Link>
            <a
              href="#partners"
              className="rounded-full border border-white/40 px-7 py-3 text-base font-semibold text-white transition-colors hover:bg-white/10"
            >
              Partner With AMBLUX
            </a>
          </div>
        </div>
      </section>

      <section id="products" className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Built for real cabinet installs</h2>
            <p className="mt-3 max-w-2xl text-muted">
              Puck lights, flexible and rigid linear solutions, wireless and wired controls — every zone in
              the kitchen, sized and specified automatically.
            </p>
          </div>
          <Link href="/products" className="text-sm font-semibold text-accent-strong hover:underline">
            View all products →
          </Link>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/products/recessed-puck", src: "/images/puck-recessed.png", title: "Recessed puck lighting", copy: "Selectable white recessed pucks for under-cabinet and toe-kick zones." },
            { href: "/products/silicone-6x6", src: "/images/product-silicone.webp", title: "Flexible silicone linear", copy: "Freecut recess silicone LED tape for continuous, seamless runs." },
            { href: "/products/rigid-10x15", src: "/images/product-rigid.webp", title: "Rigid linear solutions", copy: "Solder-free rigid linear fixtures for base, wall, and pantry cabinets." },
            { href: "/products/surface-puck", src: "/images/puck-surface.jpg", title: "Surface-mount pucks", copy: "Chrome and white finishes for exposed-mount applications." },
            { href: "/products", src: "/images/amblux-closet.webp", title: "Closet & furniture systems", copy: "The same engineered approach, extended to closets and furniture." },
            { href: "/products", src: "/images/amblux-linear.jpg", title: "Linear at scale", copy: "Consistent colour temperature and output across every run in the job." },
          ].map((p) => (
            <Link key={p.title} href={p.href} className="group overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-accent">
              <div className="relative h-48 w-full">
                <Image src={p.src} alt={p.title} fill className="object-cover" />
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-foreground group-hover:text-accent-strong">{p.title}</h3>
                <p className="mt-2 text-sm text-muted">{p.copy}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section id="partners" className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-2xl font-semibold text-foreground">For hardware distributors and dealers</h2>
          <p className="mt-3 max-w-2xl text-muted">
            The configurator — real zones, real part numbers, a complete bill of materials — is free for
            customers who purchase AMBLUX products through an authorized partner. Approved partner accounts
            see their own distributor pricing alongside MSRP the moment they sign in.
          </p>
        </div>
      </section>

      <footer className="mt-auto border-t border-border py-8 text-center text-sm text-muted">
        © {new Date().getFullYear()} AMBLUX. All rights reserved.
      </footer>
    </div>
  );
}

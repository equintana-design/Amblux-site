import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Image src="/images/amblux-logo.png" alt="AMBLUX" width={140} height={40} priority className="h-9 w-auto" />
          <nav className="flex items-center gap-8 text-sm font-medium text-muted">
            <a href="#products" className="hover:text-foreground">Products</a>
            <a href="#partners" className="hover:text-foreground">For Distributors</a>
            <Link
              href="/configurator"
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
            >
              Launch Configurator
            </Link>
          </nav>
        </div>
      </header>

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
        <h2 className="text-2xl font-semibold text-foreground">Built for real cabinet installs</h2>
        <p className="mt-3 max-w-2xl text-muted">
          Puck lights, flexible and rigid linear solutions, wireless and wired controls — every zone in
          the kitchen, sized and specified automatically.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { src: "/images/puck-recessed.png", title: "Recessed puck lighting", copy: "Selectable white recessed pucks for under-cabinet and toe-kick zones." },
            { src: "/images/product-silicone.webp", title: "Flexible silicone linear", copy: "Freecut recess silicone LED tape for continuous, seamless runs." },
            { src: "/images/product-rigid.webp", title: "Rigid linear solutions", copy: "Solder-free rigid linear fixtures for base, wall, and pantry cabinets." },
            { src: "/images/puck-surface.jpg", title: "Surface-mount pucks", copy: "Chrome and white finishes for exposed-mount applications." },
            { src: "/images/amblux-closet.webp", title: "Closet & furniture systems", copy: "The same engineered approach, extended to closets and furniture." },
            { src: "/images/amblux-linear.jpg", title: "Linear at scale", copy: "Consistent colour temperature and output across every run in the job." },
          ].map((p) => (
            <div key={p.title} className="overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="relative h-48 w-full">
                <Image src={p.src} alt={p.title} fill className="object-cover" />
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-foreground">{p.title}</h3>
                <p className="mt-2 text-sm text-muted">{p.copy}</p>
              </div>
            </div>
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

import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "./components/SiteHeader";

// Mirrors the original ChatGPT-built site's landing page section-for-section
// (see ambluxlandingpagespec.md, extracted from the live DOM): hero with a
// floating "project service" card over the photo, a value-prop section, a
// dark "how it works" band, an applications grid, and a "go straight to the
// product" CTA into the /products catalog. Colors reuse this app's existing
// brand tokens (globals.css) rather than the spec's raw hex values — those
// tokens were themselves recovered from the same original site in an
// earlier pass, so they already match closely.
export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      {/* Section 1 — Hero */}
      <section className="bg-background">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-16 px-6 py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">
              Cabinet lighting, simplified
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
              From your idea to a complete lighting solution.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-muted">
              AMBLUX helps cabinetmakers, designers, and distributors specify every part of the system — from the first
              fixture to the final connection.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-6">
              <Link
                href="/configurator"
                className="rounded-full bg-foreground px-7 py-3 text-base font-semibold text-white transition-colors hover:bg-foreground/90"
              >
                Start Your Project →
              </Link>
              <Link href="/products" className="text-base font-semibold text-accent-strong hover:underline">
                Explore Solutions →
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="relative h-[420px] w-full overflow-hidden rounded-2xl">
              <Image src="/images/amblux-kitchen.png" alt="Kitchen with integrated cabinet lighting" fill priority className="object-cover" />
            </div>

            <div className="absolute -bottom-10 left-4 w-[calc(100%-2rem)] rounded-2xl border border-border bg-surface p-6 shadow-xl sm:left-8 sm:w-96">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent-strong">AMBLUX Project Service</p>
              <p className="mt-2 text-lg font-semibold text-foreground">Let us build your complete system</p>
              <ol className="mt-4 space-y-3 text-sm">
                <li>
                  <p className="font-semibold text-foreground">1. Choose your project</p>
                  <p className="text-muted">Kitchen, closet, furniture or display</p>
                </li>
                <li>
                  <p className="font-semibold text-foreground">2. Tell us where light is needed</p>
                  <p className="text-muted">Under-cabinet, shelf, drawer, toe kick and more</p>
                </li>
                <li>
                  <p className="font-semibold text-foreground">3. Receive your solution</p>
                  <p className="text-muted">Parts list, controls, drivers and guidance</p>
                </li>
              </ol>
              <Link
                href="/configurator"
                className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent-strong hover:text-white"
              >
                Begin Project →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 — Value prop */}
      <section className="bg-surface">
        <div className="mx-auto w-full max-w-6xl px-6 py-24 sm:py-28">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">More than products</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold text-foreground sm:text-4xl">
            A lighting partner for every stage of the project.
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
            Great cabinet lighting depends on more than choosing a fixture. We bring the application, products, power,
            controls, connections, and installation information together as one easy-to-specify system.
          </p>
        </div>
      </section>

      {/* Section 3 — How it works */}
      <section className="bg-foreground text-white">
        <div className="mx-auto w-full max-w-6xl px-6 py-24 sm:py-28">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-soft">How AMBLUX helps</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold sm:text-4xl">
            Start with the project. We take care of the system.
          </h2>
          <div className="mt-14 grid grid-cols-1 gap-10 sm:grid-cols-3">
            {[
              {
                n: "01",
                title: "Tell us about your project",
                copy: "Start with the room, cabinet layout, or application. You do not need to know which products to choose.",
              },
              {
                n: "02",
                title: "We specify the complete system",
                copy: "AMBLUX matches the lighting, drivers, controls, sensors, cables, and accessories into one compatible solution.",
              },
              {
                n: "03",
                title: "Receive a ready-to-order plan",
                copy: "Get the part numbers, quantities, wiring guidance, and project documentation your team needs.",
              },
            ].map((step) => (
              <div key={step.n}>
                <p className="text-sm font-semibold text-accent-soft">{step.n}</p>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/70">{step.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4 — Applications */}
      <section className="bg-surface">
        <div className="mx-auto w-full max-w-6xl px-6 py-24 sm:py-28">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">Start by application</p>
              <h2 className="mt-3 text-3xl font-semibold text-foreground sm:text-4xl">What are you lighting?</h2>
            </div>
            <Link href="/products" className="text-sm font-semibold text-accent-strong hover:underline">
              View all applications →
            </Link>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              {
                title: "Kitchen",
                copy: "Task, accent and integrated cabinet lighting",
                src: "/images/amblux-kitchen.png",
              },
              {
                title: "Closet",
                copy: "Shelf, wardrobe and automatic door lighting",
                src: "/images/amblux-closet.webp",
              },
              {
                title: "Furniture & Display",
                copy: "Linear solutions that disappear into the design",
                src: "/images/amblux-linear.jpg",
              },
            ].map((app) => (
              <Link
                key={app.title}
                href="/configurator"
                className="group overflow-hidden rounded-2xl border border-border bg-background transition-colors hover:border-accent"
              >
                <div className="relative h-56 w-full">
                  <Image src={app.src} alt={app.title} fill className="object-cover" />
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-foreground group-hover:text-accent-strong">{app.title} →</h3>
                  <p className="mt-2 text-sm text-muted">{app.copy}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5 — Direct to product */}
      <section className="bg-background">
        <div className="mx-auto w-full max-w-6xl px-6 py-24 sm:py-28">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">Already know what you need?</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold text-foreground sm:text-4xl">Go directly to the product.</h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
            Browse fixtures, controls, drivers, sensors, cables, and accessories by product family or part number.
          </p>
          <Link
            href="/products"
            className="mt-8 inline-flex items-center gap-1.5 rounded-full bg-foreground px-7 py-3 text-base font-semibold text-white transition-colors hover:bg-foreground/90"
          >
            Browse Products →
          </Link>
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

      <footer className="mt-auto border-t border-border bg-surface py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-6 text-center">
          <Image src="/images/amblux-logo.png" alt="AMBLUX" width={120} height={34} className="h-8 w-auto" />
          <p className="text-sm text-muted">Integrated cabinet lighting, made easier.</p>
          <Link href="/configurator" className="text-sm font-semibold text-accent-strong hover:underline">
            Start a Project →
          </Link>
          <p className="mt-4 text-xs text-muted">© {new Date().getFullYear()} AMBLUX. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { Smartphone, Monitor, Radio, MapPin, Activity, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-gradient-brand opacity-30 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-gradient-cyan opacity-25 blur-3xl" />
      </div>

      <main className="relative mx-auto max-w-6xl px-6 pb-32 pt-16 md:pt-24">
        <div className="flex items-center gap-2 text-sm font-semibold text-brand">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-glow">
            <Sparkles className="h-4 w-4" />
          </span>
          MatchDay Command
        </div>

        <h1 className="mt-8 max-w-3xl text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl">
          Stadium ops and fan flow, <span className="text-gradient-brand">in one command deck.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          Unified operations dashboard and mobile fan PWA — real-time crowd density, AI-triaged
          incidents, accessible wayfinding, and instant multilingual broadcasts. Built for
          MatchDay.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Link
            to="/fan"
            className="group relative overflow-hidden rounded-3xl bg-white p-8 shadow-soft ring-1 ring-border transition hover:-translate-y-1 hover:shadow-glow"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-brand" />
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-brand-soft text-brand">
                <Smartphone className="h-6 w-6" />
              </div>
              <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                Mobile PWA
              </span>
            </div>
            <h2 className="mt-6 text-2xl font-bold">Fan Experience</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Accessible wayfinding, ETA-aware routes, live emergency alerts translated into your
              language.
            </p>
            <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-brand">
              Enter Fan Mode
              <span aria-hidden className="transition group-hover:translate-x-1">→</span>
            </div>
          </Link>

          <Link
            to="/ops"
            className="group relative overflow-hidden rounded-3xl bg-white p-8 shadow-soft ring-1 ring-border transition hover:-translate-y-1 hover:shadow-glow"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-cyan" />
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan/10 text-cyan">
                <Monitor className="h-6 w-6" />
              </div>
              <span className="rounded-full bg-cyan/10 px-3 py-1 text-xs font-semibold text-cyan">
                Desktop Dashboard
              </span>
            </div>
            <h2 className="mt-6 text-2xl font-bold">Ops Command</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Live crowd map, AI incident triage, Kanban response workflow, one-tap broadcast center.
            </p>
            <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-cyan">
              Enter Ops Mode
              <span aria-hidden className="transition group-hover:translate-x-1">→</span>
            </div>
          </Link>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {[
            { icon: MapPin, title: "Accessible Routing", body: "Wheelchair, visual-assist and low-sensory paths." },
            { icon: Activity, title: "Live Density", body: "Zone-by-zone occupancy with color-graded severity." },
            { icon: Radio, title: "Instant Broadcast", body: "Ops → Fan PWA in under a second." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-border">
              <f.icon className="h-5 w-5 text-brand" />
              <div className="mt-3 font-semibold">{f.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

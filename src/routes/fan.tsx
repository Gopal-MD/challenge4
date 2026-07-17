import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  MapPin, Navigation, Accessibility, Eye, Volume2, Loader2,
  ArrowRight, Footprints, ArrowUp, Flag, ChevronsRight, ArrowUpFromLine,
  Bell, X, Sparkles, Clock, Ruler, Languages,
} from "lucide-react";
import { calculateRoute, type RouteResult, type RouteStep } from "@/lib/ops.functions";
import { useLatestBroadcast } from "@/lib/broadcast-store";
import { ModeToggle } from "@/components/mode-toggle";
import { MatchScoreboard } from "@/components/Match/MatchScoreboard";

export const Route = createFileRoute("/fan")({
  head: () => ({
    meta: [
      { title: "Fan PWA — FIFA World Cup 2026" },
      { name: "description", content: "Find your way, get real-time alerts, arrive comfortably." },
    ],
  }),
  component: FanPage,
});

const LANGS = ["English", "Español", "Français", "العربية", "Português"];

function stepIcon(k: RouteStep["icon"]) {
  const cls = "h-4 w-4";
  return k === "start" ? <Flag className={cls} /> :
    k === "turn" ? <ChevronsRight className={cls} /> :
    k === "stairs" ? <ArrowUp className={cls} /> :
    k === "elevator" ? <ArrowUpFromLine className={cls} /> :
    k === "escalator" ? <ArrowUp className={cls} /> :
    <MapPin className={cls} />;
}

export function FanPage() {
  const [start, setStart] = useState("Gate B");
  const [dest, setDest] = useState("Section 101");
  const [wheelchair, setW] = useState(false);
  const [visual, setV] = useState(false);
  const [lowSensory, setL] = useState(false);
  const [lang, setLang] = useState("English");
  const [dismissed, setDismissed] = useState<string | null>(null);

  const calc = useServerFn(calculateRoute);
  const routeMut = useMutation<RouteResult, Error, void>({
    mutationFn: () =>
      calc({ data: { start, destination: dest, wheelchair, visualAssist: visual, lowSensory } }),
  });

  const broadcast = useLatestBroadcast();
  const showBroadcast = broadcast && dismissed !== broadcast.id;

  const bcColor = useMemo(() => {
    if (!broadcast) return "";
    return broadcast.severity === "critical"
      ? "from-danger to-[#c026d3]"
      : broadcast.severity === "warning"
        ? "from-warning to-danger"
        : "from-brand to-brand-2";
  }, [broadcast]);

  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-brand opacity-90" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,white,transparent_60%)] opacity-30" />

      {/* Broadcast banner */}
      {showBroadcast && (
        <div className="sticky top-0 z-40 px-3 pt-3">
          <div className={`glass overflow-hidden rounded-2xl bg-gradient-to-r ${bcColor} p-[1px] shadow-glow`}>
            <div className="flex items-start gap-3 rounded-2xl bg-white/95 p-3">
              <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r ${bcColor} text-white`}>
                <Bell className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {broadcast.severity} · {lang}
                  </span>
                </div>
                <p className="text-sm font-semibold leading-snug text-foreground">
                  {broadcast.message}
                </p>
              </div>
              <button
                onClick={() => setDismissed(broadcast.id)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative mx-auto max-w-md px-4 pt-6 pb-32 md:max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between text-white">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest opacity-80">
              FIFA WC 2026
            </div>
            <h1 className="text-2xl font-bold">Hey, Fan 👋</h1>
          </div>
          <div className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white">
            <Languages className="h-3.5 w-3.5" />
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="bg-transparent text-white outline-none"
            >
              {LANGS.map((l) => (
                <option key={l} className="text-foreground" value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Route card */}
        <div className="mt-5 rounded-3xl bg-white p-5 shadow-glow ring-1 ring-black/5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand">
            <Navigation className="h-4 w-4" /> Wayfinding
          </div>
          <h2 className="mt-1 text-xl font-bold">Where to next?</h2>

          <div className="mt-4 space-y-3">
            <Field
              icon={<MapPin className="h-4 w-4 text-brand" />}
              label="Start"
              value={start}
              onChange={setStart}
              placeholder="e.g. Gate B"
            />
            <Field
              icon={<Flag className="h-4 w-4 text-brand-2" />}
              label="Destination"
              value={dest}
              onChange={setDest}
              placeholder="e.g. Section 101"
            />
          </div>

          <div className="mt-5">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Accessibility
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Toggle label="Wheelchair" icon={<Accessibility className="h-4 w-4" />} on={wheelchair} onChange={setW} />
              <Toggle label="Visual" icon={<Eye className="h-4 w-4" />} on={visual} onChange={setV} />
              <Toggle label="Low-sensory" icon={<Volume2 className="h-4 w-4" />} on={lowSensory} onChange={setL} />
            </div>
          </div>

          <button
            onClick={() => routeMut.mutate()}
            disabled={routeMut.isPending}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand px-5 py-3.5 text-sm font-bold text-white shadow-glow transition hover:-translate-y-0.5 disabled:opacity-70"
          >
            {routeMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>Get Route <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        </div>

        {/* Results */}
        {routeMut.data && (
          <div className="mt-5 space-y-4" aria-live="polite" aria-atomic="true">
            <div className="grid grid-cols-2 gap-3">
              <Metric icon={<Clock className="h-4 w-4" />} label="ETA" value={`${routeMut.data.etaMinutes} min`} tone="brand" />
              <Metric icon={<Ruler className="h-4 w-4" />} label="Distance" value={`${routeMut.data.distanceM} m`} tone="cyan" />
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-border">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand">
                <Footprints className="h-4 w-4" /> Step by step
              </div>
              <ol className="space-y-3">
                {routeMut.data.steps.map((s, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-brand-soft text-brand">
                      {stepIcon(s.icon)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{s.instruction}</div>
                      <div className="text-xs text-muted-foreground">{s.distanceM} m</div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-2xl bg-gradient-brand-soft p-4 ring-1 ring-brand/20">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand">
                <Sparkles className="h-4 w-4" /> Personalized notes
              </div>
              <ul className="space-y-1.5">
                {routeMut.data.accessibilityNotes.map((n, i) => (
                  <li key={i} className="text-sm text-foreground/80">• {n}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {routeMut.error && (
          <div className="mt-4 rounded-2xl bg-danger/10 p-4 text-sm text-danger">
            {routeMut.error.message}
          </div>
        )}

        {/* Live Match Scoreboard */}
        <MatchScoreboard lang={lang} />
      </div>

      <ModeToggle />
    </div>
  );
}

function Field({
  icon, label, value, onChange, placeholder,
}: {
  icon: React.ReactNode; label: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2 rounded-2xl border border-border bg-secondary/50 px-3 py-3 focus-within:ring-2 focus-within:ring-brand/40">
        {icon}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/60"
        />
      </span>
    </label>
  );
}

function Toggle({
  label, icon, on, onChange,
}: { label: string; icon: React.ReactNode; on: boolean; onChange: (b: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-xs font-semibold transition ${
        on
          ? "border-transparent bg-gradient-brand text-white shadow-glow"
          : "border-border bg-white text-foreground/70 hover:border-brand/30"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Metric({
  icon, label, value, tone,
}: { icon: React.ReactNode; label: string; value: string; tone: "brand" | "cyan" }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-border">
      <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${tone === "brand" ? "text-brand" : "text-cyan"}`}>
        {icon}{label}
      </div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}

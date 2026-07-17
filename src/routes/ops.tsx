import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import {
  Map as MapIcon, Activity, AlertTriangle, Radio, Sparkles, Loader2,
  Send, Users, TrendingUp, ShieldAlert, Home, Search, Bell, CheckCircle2, X,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from "recharts";
import {
  DENSITY_HISTORY, densityColor,
  type Incident, type Zone,
} from "@/lib/mock-data";
import { triageIncident, askGroqAssistant } from "@/lib/ops.functions";
import { pushBroadcast, useBroadcasts } from "@/lib/broadcast-store";
import { ModeToggle } from "@/components/mode-toggle";
import { Link } from "@tanstack/react-router";
import { useOpsStore } from "@/store/opsStore";
import { useWebSocket } from "@/hooks/useWebSocket";

export const Route = createFileRoute("/ops")({
  head: () => ({
    meta: [
      { title: "Ops Command — FIFA World Cup 2026" },
      { name: "description", content: "Stadium operations: crowd density, incidents, broadcast center." },
    ],
  }),
  component: OpsPage,
});

type Tab = "map" | "density" | "incidents" | "broadcast" | "volunteers" | "sustainability";

export function OpsPage() {
  const { subscribe } = useWebSocket();
  const addIncident = useOpsStore((s) => s.addIncident);
  const updateIncident = useOpsStore((s) => s.updateIncident);
  const updateZone = useOpsStore((s) => s.updateZone);
  const [tab, setTab] = useState<Tab>("map");

  useEffect(() => {
    const unsubNew = subscribe("incident:new", (data) => {
      addIncident(data as Incident);
    });
    const unsubUpdate = subscribe("incident:update", (data) => {
      const incident = data as Incident;
      updateIncident(incident.id, incident);
    });
    const unsubCrowd = subscribe("crowd:density-update", (data) => {
      const zone = data as Zone;
      updateZone(zone.id, zone);
    });
    return () => {
      unsubNew();
      unsubUpdate();
      unsubCrowd();
    };
  }, [subscribe, addIncident, updateIncident, updateZone]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar tab={tab} setTab={setTab} />
      <div className="flex-1">
        <Topbar />
        <main className="mx-auto max-w-[1400px] px-6 pb-24 pt-6">
          {tab === "map" && <MapView />}
          {tab === "density" && <DensityView />}
          {tab === "incidents" && <IncidentsView />}
          {tab === "broadcast" && <BroadcastView />}
          {tab === "volunteers" && <VolunteerView />}
          {tab === "sustainability" && <SustainabilityView />}
        </main>
      </div>
      <ModeToggle />
    </div>
  );
}

/* ---------------- Sidebar ---------------- */

function Sidebar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const items: { id: Tab; label: string; icon: any }[] = [
    { id: "map", label: "Map View", icon: MapIcon },
    { id: "density", label: "Crowd Density", icon: Activity },
    { id: "incidents", label: "Incidents", icon: AlertTriangle },
    { id: "broadcast", label: "Broadcast", icon: Radio },
    { id: "volunteers", label: "Volunteers", icon: Users },
    { id: "sustainability", label: "Sustainability", icon: Sparkles },
  ];
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border bg-white/60 backdrop-blur-xl md:block">
      <div className="flex h-16 items-center gap-2 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-glow">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-extrabold leading-none">FIFA 26</div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Operations</div>
        </div>
      </div>
      <nav className="mt-4 space-y-1 px-3">
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => setTab(it.id)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              tab === it.id
                ? "bg-gradient-brand text-white shadow-glow"
                : "text-foreground/70 hover:bg-secondary"
            }`}
          >
            <it.icon className="h-4 w-4" />
            {it.label}
          </button>
        ))}
      </nav>

      <div className="absolute inset-x-3 bottom-4 rounded-2xl bg-gradient-brand-soft p-4">
        <div className="text-xs font-bold text-brand">System status</div>
        <div className="mt-1 text-sm font-semibold">All systems nominal</div>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> live
        </div>
      </div>
    </aside>
  );
}

function Topbar() {
  const [showBrief, setShowBrief] = useState(false);
  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-white/70 px-6 backdrop-blur-xl">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Ops Command</div>
          <div className="text-lg font-bold">Live MatchDay Overview</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-xl border border-border bg-secondary/60 px-3 py-2 md:flex">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input placeholder="Search zones, incidents…" className="w-56 bg-transparent text-sm outline-none" />
          </div>
          {/* Groq Situation Brief */}
          <button
            onClick={() => setShowBrief((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-brand px-3 py-2 text-xs font-bold text-white shadow-glow transition hover:-translate-y-0.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI Brief
          </button>
          <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-foreground">
            <Home className="h-4 w-4" />
          </Link>
          <button className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground">
            <Bell className="h-4 w-4" />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-danger" />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-xs font-bold text-white">OP</div>
        </div>
      </header>
      {showBrief && <GroqSituationBrief onClose={() => setShowBrief(false)} />}
    </>
  );
}

function GroqSituationBrief({ onClose }: { onClose: () => void }) {
  const incidents = useOpsStore((s) => s.incidents);
  const zones = useOpsStore((s) => s.zones);
  const askFn = useServerFn(askGroqAssistant);
  const [brief, setBrief] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const openCount = incidents.filter((i) => i.status !== "resolved").length;
    const criticalZones = zones.filter((z) => z.level === "high").map((z) => z.name).join(", ");
    const context = `${openCount} open incidents. Critical zones: ${criticalZones || "none"}.`;
    try {
      const res = await askFn({
        data: {
          question: "Give me a brief 2-sentence situation report for stadium operations staff right now.",
          context,
        },
      });
      setBrief(res.answer);
    } catch {
      setBrief("Unable to generate brief — please check manually.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate on mount
  useState(() => { generate(); });

  return (
    <div className="border-b border-border bg-gradient-brand-soft px-6 py-3">
      <div className="mx-auto flex max-w-[1400px] items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-brand" />
          <span className="text-xs font-bold uppercase tracking-wider text-brand">Groq AI Situation Brief</span>
        </div>
        <div className="flex-1 text-sm text-foreground/80">
          {loading && (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Analysing current ops status…
            </span>
          )}
          {!loading && brief && <span>{brief}</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={generate} disabled={loading} className="text-xs font-semibold text-brand hover:underline disabled:opacity-50">Refresh</button>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- KPI helpers ---------------- */

function KpiCard({
  icon, label, value, sub, tone = "brand",
}: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
  tone?: "brand" | "cyan" | "success" | "warning" | "danger";
}) {
  const grad =
    tone === "brand" ? "bg-gradient-brand"
    : tone === "cyan" ? "bg-gradient-cyan"
    : tone === "success" ? "bg-success"
    : tone === "warning" ? "bg-warning"
    : "bg-danger";
  return (
    <div className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-border">
      <div className="flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${grad} text-white shadow-glow`}>{icon}</div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
      <div className="mt-4 text-3xl font-extrabold">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

/* ---------------- Map View ---------------- */

function MapView() {
  const zones = useOpsStore((s) => s.zones);
  const stats = useMemo(() => {
    const avg = Math.round(zones.reduce((s, z) => s + z.occupancy, 0) / zones.length);
    const congested = zones.filter((z) => z.level === "high").length;
    const totalCap = zones.reduce((s, z) => s + z.capacity, 0);
    const inside = Math.round(zones.reduce((s, z) => s + (z.capacity * z.occupancy) / 100, 0));
    return { avg, congested, totalCap, inside };
  }, [zones]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard icon={<Users className="h-5 w-5" />} label="Attendance" value={stats.inside.toLocaleString()} sub={`of ${stats.totalCap.toLocaleString()} capacity`} tone="brand" />
        <KpiCard icon={<TrendingUp className="h-5 w-5" />} label="Avg density" value={`${stats.avg}%`} sub="+4% last 10 min" tone="cyan" />
        <KpiCard icon={<ShieldAlert className="h-5 w-5" />} label="Congested zones" value={String(stats.congested)} sub="Gate B, Section 205" tone="warning" />
        <KpiCard icon={<CheckCircle2 className="h-5 w-5" />} label="Response SLA" value="98%" sub="under 90s dispatch" tone="success" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-white p-6 shadow-soft ring-1 ring-border">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-brand">Stadium Map</div>
              <h3 className="text-lg font-bold">Live zone density</h3>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <Legend color="bg-success" label="Clear" />
              <Legend color="bg-warning" label="Moderate" />
              <Legend color="bg-danger" label="Congested" />
            </div>
          </div>
          <StadiumMap zones={zones} />
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-border">
          <div className="text-xs font-semibold uppercase tracking-widest text-brand">Zone breakdown</div>
          <h3 className="text-lg font-bold">Occupancy</h3>
          <div className="mt-4 space-y-3">
            {zones.map((z) => {
              const c = densityColor(z.level);
              return (
                <div key={z.id} className="rounded-2xl border border-border p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold">{z.name}</div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white ${c.bg}`}>
                      {c.label}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                    <div className={`h-full ${c.bg}`} style={{ width: `${z.occupancy}%` }} />
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>{z.occupancy}% full</span>
                    <span>{z.capacity.toLocaleString()} cap</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function StadiumMap({ zones }: { zones: ReturnType<typeof useOpsStore>["zones"] }) {
  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-gradient-to-br from-[#EEF2FF] via-white to-[#ECFEFF] ring-1 ring-border">
      {/* Field */}
      <div className="absolute left-1/2 top-1/2 h-[55%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-[40%] bg-gradient-to-br from-[#10B981] to-[#059669] shadow-inner ring-4 ring-white/70">
        <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/70" />
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/60" />
      </div>
      {/* Concentric ring */}
      <div className="absolute inset-6 rounded-[40px] border-2 border-dashed border-brand/20" />

      {/* Zone dots */}
      {zones.map((z) => {
        const c = densityColor(z.level);
        return (
          <div
            key={z.id}
            className="group absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${z.x}%`, top: `${z.y}%` }}
          >
            <div className={`h-4 w-4 rounded-full ${c.bg} ring-4 ${c.ring}/30 animate-pulse`} />
            <div className="glass absolute left-1/2 top-6 z-10 w-44 -translate-x-1/2 rounded-xl p-2.5 opacity-0 shadow-soft transition group-hover:opacity-100">
              <div className="text-xs font-bold">{z.name}</div>
              <div className={`text-[11px] font-semibold ${c.text}`}>
                {z.occupancy}% full · {c.label}
              </div>
            </div>
          </div>
        );
      })}

      {/* Floating summary cards */}
      <div className="absolute left-4 top-4 glass rounded-xl px-3 py-2 text-xs shadow-soft">
        <div className="font-bold">Gate B</div>
        <div className="text-danger">87% · Congested</div>
      </div>
      <div className="absolute right-4 bottom-4 glass rounded-xl px-3 py-2 text-xs shadow-soft">
        <div className="font-bold">Section 205</div>
        <div className="text-danger">92% · Congested</div>
      </div>
    </div>
  );
}

/* ---------------- Density View ---------------- */

function DensityView() {
  const zones = useOpsStore((s) => s.zones);
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-border">
        <div className="text-xs font-semibold uppercase tracking-widest text-brand">Trend</div>
        <h3 className="text-lg font-bold">Density over time</h3>
        <div className="mt-4 h-72">
          <ResponsiveContainer>
            <AreaChart data={DENSITY_HISTORY}>
              <defs>
                <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gb" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="time" tick={{ fontSize: 12 }} stroke="#94A3B8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94A3B8" />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 10px 40px -20px rgba(0,0,0,.2)" }}
              />
              <Area type="monotone" dataKey="gateA" stroke="#7C3AED" strokeWidth={2.5} fill="url(#ga)" name="Gate A" />
              <Area type="monotone" dataKey="gateB" stroke="#EF4444" strokeWidth={2.5} fill="url(#gb)" name="Gate B" />
              <Area type="monotone" dataKey="gateC" stroke="#06B6D4" strokeWidth={2.5} fill="url(#gc)" name="Gate C" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {zones.map((z) => {
          const c = densityColor(z.level);
          return (
            <div key={z.id} className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-border">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold">{z.name}</div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white ${c.bg}`}>
                  {c.label}
                </span>
              </div>
              <div className="mt-4 text-3xl font-extrabold">
                {z.occupancy}<span className="text-base font-bold text-muted-foreground">%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                <div className={`h-full ${c.bg}`} style={{ width: `${z.occupancy}%` }} />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">Cap {z.capacity.toLocaleString()}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Incidents (Kanban) ---------------- */

function IncidentsView() {
  const { incidents: items, updateIncident: storeUpdate } = useOpsStore();
  const setItems = (updater: (xs: Incident[]) => Incident[]) =>
    updater(items).forEach((inc) => storeUpdate(inc.id, inc));
  const triage = useServerFn(triageIncident);
  const [busyId, setBusy] = useState<string | null>(null);

  const columns: { id: Incident["status"]; label: string; tone: string }[] = [
    { id: "new", label: "New", tone: "text-danger" },
    { id: "triaged", label: "Triaged", tone: "text-warning" },
    { id: "in-progress", label: "In Progress", tone: "text-brand" },
    { id: "resolved", label: "Resolved", tone: "text-success" },
  ];

  const move = (id: string, status: Incident["status"]) =>
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, status } : x)));

  const runTriage = async (inc: Incident) => {
    setBusy(inc.id);
    try {
      const result = await triage({ data: { report: `${inc.title}. ${inc.description}` } });
      setItems((xs) =>
        xs.map((x) =>
          x.id === inc.id
            ? { ...x, priority: result.priority, actionPlan: result.actionPlan, status: x.status === "new" ? "triaged" : x.status }
            : x,
        ),
      );
    } catch (e) {
      console.error(e);
      alert("AI triage failed: " + (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {columns.map((col) => (
        <div key={col.id} className="rounded-3xl bg-white/60 p-4 ring-1 ring-border">
          <div className="mb-3 flex items-center justify-between px-1">
            <div className={`text-xs font-bold uppercase tracking-widest ${col.tone}`}>{col.label}</div>
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-muted-foreground ring-1 ring-border">
              {items.filter((i) => i.status === col.id).length}
            </span>
          </div>
          <div className="space-y-3">
            {items.filter((i) => i.status === col.id).map((inc) => (
              <IncidentCard
                key={inc.id}
                inc={inc}
                busy={busyId === inc.id}
                onTriage={() => runTriage(inc)}
                onMove={(s) => move(inc.id, s)}
              />
            ))}
            {items.filter((i) => i.status === col.id).length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                No incidents
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function IncidentCard({
  inc, busy, onTriage, onMove,
}: {
  inc: Incident; busy: boolean;
  onTriage: () => void; onMove: (s: Incident["status"]) => void;
}) {
  const priColor = inc.priority === "High" ? "bg-danger" : inc.priority === "Medium" ? "bg-warning" : inc.priority === "Low" ? "bg-success" : "bg-muted-foreground";
  const next: Record<Incident["status"], Incident["status"] | null> = {
    new: "triaged", triaged: "in-progress", "in-progress": "resolved", resolved: null,
  };
  const nxt = next[inc.status];
  return (
    <div className="group rounded-2xl bg-white p-4 shadow-soft ring-1 ring-border transition hover:-translate-y-0.5 hover:shadow-glow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold leading-snug">{inc.title}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            📍 {inc.location} · {new Date(inc.reportedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        {inc.priority && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white ${priColor}`}>
            {inc.priority}
          </span>
        )}
      </div>
      <p className="mt-2 text-xs text-foreground/70">{inc.description}</p>

      {inc.actionPlan && (
        <div className="mt-3 rounded-xl bg-gradient-brand-soft p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-brand">
            <Sparkles className="h-3 w-3" /> AI Action Plan
          </div>
          <p className="mt-1 text-xs text-foreground/80">{inc.actionPlan}</p>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          onClick={onTriage}
          disabled={busy}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-brand px-3 py-2 text-xs font-bold text-white shadow-glow transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          AI Triage
        </button>
        {nxt && (
          <button
            onClick={() => onMove(nxt)}
            className="rounded-xl border border-border bg-white px-3 py-2 text-xs font-bold text-foreground/70 hover:text-foreground"
          >
            → {nxt.replace("-", " ")}
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------- Broadcast ---------------- */

function BroadcastView() {
  const [msg, setMsg] = useState("Gate B is closed due to congestion. Please reroute to Gate C.");
  const [severity, setSev] = useState<"info" | "warning" | "critical">("warning");
  const [lang, setLang] = useState("English");
  const list = useBroadcasts();

  const send = () => {
    if (!msg.trim()) return;
    pushBroadcast({ message: msg.trim(), severity, language: lang });
  };

  const presets = [
    "Gate B is closed. Please use Gate C.",
    "Medical incident cleared at Section 205.",
    "Weather advisory: light rain expected in 15 minutes.",
    "Match starts in 10 minutes — please take your seats.",
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 rounded-3xl bg-white p-6 shadow-soft ring-1 ring-border">
        <div className="text-xs font-semibold uppercase tracking-widest text-brand">Broadcast Center</div>
        <h3 className="text-lg font-bold">Push an alert to every Fan PWA</h3>

        <div className="mt-4">
          <label className="mb-2 block text-xs font-semibold text-muted-foreground">Message</label>
          <textarea
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-border bg-secondary/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand/40"
          />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-semibold text-muted-foreground">Severity</label>
            <div className="flex gap-2">
              {(["info", "warning", "critical"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSev(s)}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold uppercase transition ${
                    severity === s
                      ? s === "critical"
                        ? "bg-danger text-white shadow-glow"
                        : s === "warning"
                          ? "bg-warning text-white shadow-glow"
                          : "bg-gradient-brand text-white shadow-glow"
                      : "border border-border bg-white text-foreground/70"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-muted-foreground">Language</label>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold outline-none"
            >
              {["English", "Español", "Français", "العربية", "Português"].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold text-muted-foreground">Quick templates</div>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => setMsg(p)}
                className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground/70 hover:border-brand/40 hover:text-brand"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={send}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand px-5 py-3.5 text-sm font-bold text-white shadow-glow transition hover:-translate-y-0.5"
        >
          <Send className="h-4 w-4" /> Send Broadcast
        </button>

        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Delivered instantly to the Fan PWA on this device and any other open tab.
        </p>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-border">
        <div className="text-xs font-semibold uppercase tracking-widest text-brand">History</div>
        <h3 className="text-lg font-bold">Recent broadcasts</h3>
        <div className="mt-4 space-y-3">
          {list.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              No broadcasts yet.
            </div>
          )}
          {list.map((b) => (
            <div key={b.id} className="rounded-2xl border border-border p-3">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                <span className={
                  b.severity === "critical" ? "text-danger"
                  : b.severity === "warning" ? "text-warning" : "text-brand"
                }>{b.severity}</span>
                <span className="text-muted-foreground">
                  {new Date(b.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="mt-1 text-sm font-semibold">{b.message}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">{b.language}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Volunteers View ---------------- */

function VolunteerView() {
  const askFn = useServerFn(askGroqAssistant);
  const [brief, setBrief] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await askFn({
        data: {
          question: "Generate a 2-sentence shift briefing for volunteers. Focus on crowd management, hydration, and assisting fans with directions.",
          context: "Live match at MetLife Stadium.",
        },
      });
      setBrief(res.answer);
    } catch {
      setBrief("Unable to generate briefing.");
    } finally {
      setLoading(false);
    }
  };

  useState(() => { generate(); });

  const volunteers = [
    { id: "v1", name: "Sarah J.", zone: "Gate A", role: "Wayfinding", status: "Active" },
    { id: "v2", name: "Miguel O.", zone: "Section 101", role: "Seating Assist", status: "Active" },
    { id: "v3", name: "Chen W.", zone: "Food Court North", role: "Information", status: "On Break" },
    { id: "v4", name: "Aisha T.", zone: "Concourse East", role: "Accessibility", status: "Active" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Volunteer Management</h2>
          <p className="text-sm text-muted-foreground">Track staff assignments and shift briefings.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-1.5 text-sm font-semibold">
          <Users className="h-4 w-4 text-brand" /> {volunteers.length} Active
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand">
            <Sparkles className="h-4 w-4" /> AI Shift Briefing
          </div>
          <button onClick={generate} disabled={loading} className="text-xs font-semibold text-brand hover:underline disabled:opacity-50">Refresh</button>
        </div>
        <div className="mt-3 rounded-2xl bg-secondary/50 p-4 text-sm font-medium">
          {loading ? (
            <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating...</span>
          ) : (
            brief
          )}
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-border">
        <h3 className="text-lg font-bold">Current Assignments</h3>
        <div className="mt-4 space-y-3">
          {volunteers.map(v => (
            <div key={v.id} className="flex items-center justify-between rounded-2xl border border-border p-3">
              <div>
                <div className="font-semibold">{v.name}</div>
                <div className="text-[11px] text-muted-foreground">{v.role} • {v.zone}</div>
              </div>
              <div className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${v.status === 'Active' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                {v.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Sustainability View ---------------- */

function SustainabilityView() {
  const askFn = useServerFn(askGroqAssistant);
  const [tip, setTip] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await askFn({
        data: {
          question: "Give a 1-sentence quick operational tip to improve stadium sustainability right now during a live match.",
          context: "Live match at MetLife Stadium.",
        },
      });
      setTip(res.answer);
    } catch {
      setTip("Unable to generate tip.");
    } finally {
      setLoading(false);
    }
  };

  useState(() => { generate(); });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sustainability</h2>
          <p className="text-sm text-muted-foreground">Monitor waste management and carbon impact.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-1.5 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-success" /> Eco-Track Active
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <KpiCard icon={<Activity />} label="Recycling Rate" value="68%" sub="+4% from last match" tone="success" />
        <KpiCard icon={<TrendingUp />} label="Energy Saved" value="1.2 MWh" sub="Smart lighting optimization" tone="brand" />
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand">
            <Sparkles className="h-4 w-4" /> AI Eco-Tip
          </div>
          <button onClick={generate} disabled={loading} className="text-xs font-semibold text-brand hover:underline disabled:opacity-50">Refresh</button>
        </div>
        <div className="mt-3 rounded-2xl bg-secondary/50 p-4 text-sm font-medium">
          {loading ? (
            <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating...</span>
          ) : (
            tip
          )}
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-border">
        <h3 className="text-lg font-bold">Waste Bins Status</h3>
        <div className="mt-4 space-y-3">
          {[
            { id: 1, loc: "Concourse East - Bin Cluster 4", fill: 85, type: "Mixed Recycling" },
            { id: 2, loc: "Food Court North - Bin Cluster 1", fill: 92, type: "Compost" },
            { id: 3, loc: "Gate A - Exit Bin", fill: 30, type: "Landfill" },
          ].map(bin => (
            <div key={bin.id} className="flex flex-col gap-2 rounded-2xl border border-border p-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm">{bin.loc} <span className="ml-1 text-[10px] text-muted-foreground uppercase">{bin.type}</span></div>
                <div className={`text-xs font-bold ${bin.fill > 80 ? 'text-danger' : 'text-success'}`}>{bin.fill}% Full</div>
              </div>
              <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                <div className={`h-full ${bin.fill > 80 ? 'bg-danger' : 'bg-success'}`} style={{ width: `${bin.fill}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

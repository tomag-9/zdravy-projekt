import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "../../context/auth";
import { Card } from "./ui";

const API = import.meta.env.VITE_API_URL || "/api";
const COLORS = ["#425422", "#C48116", "#007784", "#D2551A"];
const mealLabels = { breakfast: "Raňajky", lunch: "Obed", olovrant: "Olovrant" };

function iso(value: Date) { return value.toISOString().slice(0, 10); }
function weekStart() { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return iso(d); }
function weekEnd() { const d = new Date(weekStart()); d.setDate(d.getDate() + 4); return iso(d); }

export default function ClusterSummaryChart() {
  const { apiFetch } = useAuth();
  const [from, setFrom] = useState(weekStart);
  const [to, setTo] = useState(weekEnd);
  const [meals, setMeals] = useState(["lunch"]);
  const [scope, setScope] = useState("all");
  const [metric, setMetric] = useState("heads");
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [menus, setMenus] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [chart, setChart] = useState<{ points: Array<Record<string, number | string>>; clusters: string[] }>({ points: [], clusters: [] });

  const query = useMemo(() => {
    const p = new URLSearchParams({ from, to, scope, metric });
    meals.forEach((x) => p.append("meal", x)); selected.forEach((x) => p.append("vydaj", x)); menus.forEach((x) => p.append("menu", x));
    return p.toString();
  }, [from, to, meals, scope, metric, selected, menus]);
  useEffect(() => { void (async () => {
    const r = await apiFetch(`${API}/admin/meal-plans/cluster-summary-chart/?${query}`);
    if (!r.ok) return;
    const data = await r.json();
    // Backend vždy vracia points/clusters (viď cluster_summary_chart view), ale
    // nedôverujeme tvaru naslepo — chybná/neúplná odpoveď nesmie zhodiť celú
    // stránku s .map na undefined (spadlo aj v teste s iným mockom endpointu).
    setChart({ points: Array.isArray(data?.points) ? data.points : [], clusters: Array.isArray(data?.clusters) ? data.clusters : [] });
  })(); }, [apiFetch, query]);
  const clusters = selected.length ? selected : chart.clusters;
  const toggle = (value: string) => setMeals((x) => x.includes(value) ? (x.length === 1 ? x : x.filter((v) => v !== value)) : [...x, value]);
  return <Card pad className="zpa-summary-chart">
    <div className="zpa-card-head"><div><h3>Vývoj objednávok</h3><p>Pracovné dni, zoskupené podľa obedového clustra.</p></div></div>
    <div className="zpa-summary-chart-controls">
      <label>Od<input className="zpa-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
      <label>Do<input className="zpa-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      <label>Y os<select className="zpa-input" value={metric} onChange={(e) => setMetric(e.target.value)}><option value="heads">Počet porcií</option><option value="ms">MŠ porcie</option></select></label>
      <label>Obsah<select className="zpa-input" value={scope} onChange={(e) => setScope(e.target.value)}><option value="all">Všetko</option><option value="standard">Iba štandard</option><option value="diets">Iba diéty</option></select></label>
      <label>Typ grafu<select className="zpa-input" value={chartType} onChange={(e) => setChartType(e.target.value as "bar" | "line")}><option value="bar">Stĺpcový</option><option value="line">Bodový / čiarový</option></select></label>
    </div>
    <div className="zpa-summary-chart-filters">{Object.entries(mealLabels).map(([key, label]) => <button key={key} className={meals.includes(key) ? "active" : ""} onClick={() => toggle(key)}>{label}</button>)}{["A", "B", "C", "D", "V"].map((key) => <button key={key} className={menus.includes(key) ? "active" : ""} onClick={() => setMenus((x) => x.includes(key) ? x.filter((v) => v !== key) : [...x, key])}>Menu {key}</button>)}{chart.clusters.map((key) => <button key={key} className={selected.includes(key) ? "active" : ""} onClick={() => setSelected((x) => x.includes(key) ? x.filter((v) => v !== key) : [...x, key])}>Cluster {key}</button>)}</div>
    <div className="zpa-summary-chart-canvas"><ResponsiveContainer width="100%" height="100%">{chartType === "bar" ? <BarChart data={chart.points} margin={{ top: 14, right: 12, left: -12, bottom: 0 }}><CartesianGrid stroke="#D5DDCF" strokeDasharray="3 4" vertical={false} /><XAxis dataKey="date" tickFormatter={(v) => v.slice(5).replace("-", ".")} stroke="#7C9853" /><YAxis stroke="#7C9853" /><Tooltip cursor={{ fill: "rgba(114,136,75,.10)" }} contentStyle={{ borderRadius: 12, border: "1px solid #D5DDCF", background: "#FEF9F1" }} /><Legend />{clusters.map((key, i) => <Bar key={key} dataKey={key} name={`Cluster ${key}`} fill={COLORS[i % COLORS.length]} radius={[6, 6, 0, 0]} />)}</BarChart> : <LineChart data={chart.points} margin={{ top: 14, right: 12, left: -12, bottom: 0 }}><CartesianGrid stroke="#D5DDCF" strokeDasharray="3 4" vertical={false} /><XAxis dataKey="date" tickFormatter={(v) => v.slice(5).replace("-", ".")} stroke="#7C9853" /><YAxis stroke="#7C9853" /><Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #D5DDCF", background: "#FEF9F1" }} /><Legend />{clusters.map((key, i) => <Line key={key} dataKey={key} name={`Cluster ${key}`} stroke={COLORS[i % COLORS.length]} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#FEF9F1" }} activeDot={{ r: 6 }} />)}</LineChart>}</ResponsiveContainer></div>
  </Card>;
}

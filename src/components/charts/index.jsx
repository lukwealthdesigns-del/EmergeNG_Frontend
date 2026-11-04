import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useI18n } from "../../i18n";
import { fmtN } from "./util";

// Palette: validated categorical tones that stay legible in light and dark (read from CSS tokens at render).
export const TONES = ["#3858ce", "#16a34a", "#ea580c", "#9333ea", "#0891b2", "#dc2626", "#6b7280", "#ca8a04"];
const axis = { stroke: "rgb(var(--ink-3))", fontSize: 11, tickLine: false, axisLine: false };
const tip = { contentStyle: { background: "rgb(var(--surface))", border: "1px solid rgb(var(--line))", borderRadius: 14, fontSize: 12, color: "rgb(var(--ink))" }, cursor: { fill: "rgb(var(--surface-3) / .6)" } };

export function Empty() { const { t } = useI18n(); return <p className="flex h-40 items-center justify-center text-sm text-ink-3">{t("state.not_enough_data")}</p>; }

export function TrendChart({ data, height = 240 }) {
  if (!data?.length) return <Empty />;
  return (<div role="img" aria-label="trend" style={{ height }}><ResponsiveContainer><AreaChart data={data} margin={{ left: -18, right: 8, top: 8 }}>
    <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3858ce" stopOpacity={0.4} /><stop offset="100%" stopColor="#3858ce" stopOpacity={0} /></linearGradient></defs>
    <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" vertical={false} /><XAxis dataKey="bucket" {...axis} /><YAxis allowDecimals={false} {...axis} /><Tooltip {...tip} />
    <Area type="monotone" dataKey="count" stroke="#3858ce" strokeWidth={2} fill="url(#g1)" /></AreaChart></ResponsiveContainer></div>);
}
export function BarsChart({ data, color = "#3858ce", height = 240, horizontal = false, colors }) {
  if (!data?.length) return <Empty />;
  return (<div role="img" aria-label="bars" style={{ height: horizontal ? Math.max(height, data.length * 34) : height }}><ResponsiveContainer>
    <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ left: horizontal ? 24 : -18, right: 12, top: 8 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" horizontal={!horizontal} vertical={horizontal} />
      {horizontal ? <><XAxis type="number" allowDecimals={false} {...axis} /><YAxis type="category" dataKey="name" width={130} {...axis} /></> : <><XAxis dataKey="name" {...axis} /><YAxis allowDecimals={false} {...axis} /></>}
      <Tooltip {...tip} /><Bar dataKey="value" radius={8} fill={color}>{colors && data.map((d, i) => <Cell key={i} fill={colors[d.key] || color} />)}</Bar></BarChart></ResponsiveContainer></div>);
}
export function DonutChart({ data, height = 220, colors }) {
  const total = (data || []).reduce((a, b) => a + b.value, 0);
  if (!total) return <Empty />;
  return (<div className="flex flex-wrap items-center gap-4"><div role="img" aria-label="share" style={{ height, width: height }}><ResponsiveContainer><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none">{data.map((d, i) => <Cell key={i} fill={colors?.[d.key] || TONES[i % TONES.length]} />)}</Pie><Tooltip {...tip} /></PieChart></ResponsiveContainer></div>
    <ul className="min-w-0 flex-1 space-y-1.5 text-sm">{data.map((d, i) => <li key={d.key ?? d.name} className="flex items-center justify-between gap-3"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: colors?.[d.key] || TONES[i % TONES.length] }} />{d.name}</span><span className="tabular-nums text-ink-2">{fmtN(d.value)} <span className="text-ink-3">({Math.round((d.value / total) * 100)}%)</span></span></li>)}</ul></div>);
}

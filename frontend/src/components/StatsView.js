import React, { useEffect, useState, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Users, Eye, Layers, TrendingUp, BarChart3, Activity, Megaphone, MessageSquare, AlertTriangle, Calendar } from "lucide-react";
import { fetchStatsFiltered } from "../api";

const COLORS = ["#6366f1", "#a855f7", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];

function formatNum(n) {
  if (!n) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export default function StatsView({ filters, search }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState({ subs: false, views: false, er: false });

  const load = useCallback(() => {
    setLoading(true);
    fetchStatsFiltered({
      search,
      type: filters?.type,
      min_subs: filters?.min_subs || undefined,
    })
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters, search]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={styles.loading}>Загрузка статистики…</div>;
  if (!stats) return <div style={styles.loading}>Ошибка загрузки</div>;

  const subsList = showAll.subs ? stats.top_by_subscribers : stats.top_by_subscribers.slice(0, 15);
  const viewsList = showAll.views ? stats.top_by_views : stats.top_by_views.slice(0, 15);
  const erList = showAll.er ? (stats.top_by_er || []) : (stats.top_by_er || []).slice(0, 15);

  return (
    <div style={styles.container}>
      {/* KPI row 1 — основные */}
      <div style={styles.kpiRow}>
        <KPI icon={<Layers size={20} />} label="Каналов" value={stats.total_channels} color="var(--accent)" />
        <KPI icon={<Users size={20} />} label="Ср. подписчиков" value={formatNum(stats.avg_subscribers)} color="var(--blue)" />
        <KPI icon={<Eye size={20} />} label="Ср. просмотров" value={formatNum(stats.avg_views)} color="var(--green)" />
        <KPI icon={<TrendingUp size={20} />} label="Ср. ER" value={(stats.avg_er || 0).toFixed(3) + "%"} color="var(--orange)" />
      </div>

      {/* KPI row 2 — аналитика */}
      <div style={styles.kpiRow}>
        <KPI icon={<TrendingUp size={20} />} label="Ср. ERR" value={(stats.avg_err || 0).toFixed(3) + "%"} color="var(--accent)" />
        <KPI icon={<BarChart3 size={20} />} label="Ср. видимость" value={(stats.avg_visibility || 0).toFixed(1) + "%"} color="var(--green)" />
        <KPI icon={<Activity size={20} />} label="Ср. частота" value={(stats.avg_frequency || 0).toFixed(1) + "/день"} color="var(--blue)" />
        <KPI icon={<BarChart3 size={20} />} label="Ср. стабильность" value={(stats.avg_stability || 0).toFixed(0) + "%"} color="var(--orange)" />
      </div>

      {/* KPI row 3 — доп. */}
      <div style={styles.kpiRow}>
        <KPI icon={<Megaphone size={20} />} label="Ср. доля рекламы" value={(stats.avg_ad_pct || 0).toFixed(1) + "%"} color="var(--orange)" />
        <KPI icon={<AlertTriangle size={20} />} label="Ср. доля гемблинга" value={(stats.avg_gambling_pct || 0).toFixed(1) + "%"} color="var(--red)" />
        <KPI icon={<MessageSquare size={20} />} label="С привяз. чатом" value={stats.channels_with_chat || 0} color="var(--accent)" />
        <KPI icon={<Calendar size={20} />} label="Ср. возраст" value={
          (stats.avg_channel_age_days || 0) > 365
            ? Math.floor(stats.avg_channel_age_days / 365) + " лет"
            : (stats.avg_channel_age_days || 0) + " дней"
        } color="var(--blue)" />
      </div>

      {/* Типы каналов */}
      {stats.types.length > 0 && (
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Типы каналов</h3>
          <div style={styles.pieRow}>
            <ResponsiveContainer width="50%" height={260}>
              <PieChart>
                <Pie data={stats.types} dataKey="count" nameKey="type" cx="50%" cy="50%"
                  innerRadius={60} outerRadius={100} stroke="var(--bg-secondary)" strokeWidth={3}>
                  {stats.types.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(val, name) => [val, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={styles.legend}>
              {stats.types.map((t, i) => (
                <div key={i} style={styles.legendItem}>
                  <div style={{ ...styles.legendDot, background: COLORS[i % COLORS.length] }} />
                  <span style={styles.legendText}>{t.type}</span>
                  <span style={styles.legendCount}>{t.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Топ по ER */}
      {erList.length > 0 && (
        <div style={styles.chartCard}>
          <div style={styles.chartHeader}>
            <h3 style={styles.chartTitle}>Топ по вовлечённости (ER)</h3>
            {(stats.top_by_er || []).length > 15 && (
              <button style={styles.showAllBtn} onClick={() => setShowAll(p => ({ ...p, er: !p.er }))}>
                {showAll.er ? "Свернуть" : "Показать все"}
              </button>
            )}
          </div>
          <ResponsiveContainer width="100%" height={erList.length * 34 + 40}>
            <BarChart data={erList} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" tick={{ fill: "#686878", fontSize: 11 }} tickFormatter={v => v.toFixed(2) + "%"} />
              <YAxis dataKey="username" type="category" width={130}
                tick={{ fill: "#9898a8", fontSize: 11 }}
                tickFormatter={v => "@" + (v.length > 16 ? v.slice(0, 16) + "…" : v)} />
              <Tooltip contentStyle={tooltipStyle} formatter={(val) => [val.toFixed(3) + "%", "ER"]} />
              <Bar dataKey="er_pct" fill="#22c55e" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Топ по подписчикам */}
      <div style={styles.chartCard}>
        <div style={styles.chartHeader}>
          <h3 style={styles.chartTitle}>Топ по подписчикам ({stats.top_by_subscribers.length})</h3>
          {stats.top_by_subscribers.length > 15 && (
            <button style={styles.showAllBtn} onClick={() => setShowAll(p => ({ ...p, subs: !p.subs }))}>
              {showAll.subs ? "Свернуть" : "Показать все"}
            </button>
          )}
        </div>
        <ResponsiveContainer width="100%" height={subsList.length * 34 + 40}>
          <BarChart data={subsList} layout="vertical" margin={{ left: 10, right: 20 }}>
            <XAxis type="number" tick={{ fill: "#686878", fontSize: 11 }} tickFormatter={formatNum} />
            <YAxis dataKey="username" type="category" width={130}
              tick={{ fill: "#9898a8", fontSize: 11 }}
              tickFormatter={v => "@" + (v.length > 16 ? v.slice(0, 16) + "…" : v)} />
            <Tooltip contentStyle={tooltipStyle} formatter={(val) => [formatNum(val), "Подписчики"]} />
            <Bar dataKey="subscribers" fill="#6366f1" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Топ по просмотрам */}
      <div style={styles.chartCard}>
        <div style={styles.chartHeader}>
          <h3 style={styles.chartTitle}>Топ по средним просмотрам ({stats.top_by_views.length})</h3>
          {stats.top_by_views.length > 15 && (
            <button style={styles.showAllBtn} onClick={() => setShowAll(p => ({ ...p, views: !p.views }))}>
              {showAll.views ? "Свернуть" : "Показать все"}
            </button>
          )}
        </div>
        <ResponsiveContainer width="100%" height={viewsList.length * 34 + 40}>
          <BarChart data={viewsList} layout="vertical" margin={{ left: 10, right: 20 }}>
            <XAxis type="number" tick={{ fill: "#686878", fontSize: 11 }} tickFormatter={formatNum} />
            <YAxis dataKey="username" type="category" width={130}
              tick={{ fill: "#9898a8", fontSize: 11 }}
              tickFormatter={v => "@" + (v.length > 16 ? v.slice(0, 16) + "…" : v)} />
            <Tooltip contentStyle={tooltipStyle} formatter={(val) => [formatNum(val), "Просмотры"]} />
            <Bar dataKey="avg_views" fill="#a855f7" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function KPI({ icon, label, value, color }) {
  return (
    <div style={styles.kpi}>
      <div style={{ color, marginBottom: 6 }}>{icon}</div>
      <div style={styles.kpiValue}>{value}</div>
      <div style={styles.kpiLabel}>{label}</div>
    </div>
  );
}

const tooltipStyle = {
  background: "var(--bg-card)", border: "1px solid var(--border)",
  borderRadius: 8, fontSize: 12, color: "var(--text-primary)",
};

const styles = {
  container: { display: "flex", flexDirection: "column", gap: 20, paddingTop: 12 },
  loading: { textAlign: "center", padding: 60, color: "var(--text-secondary)" },
  kpiRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 },
  kpi: {
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: "20px 16px", textAlign: "center",
  },
  kpiValue: { fontSize: 26, fontWeight: 800 },
  kpiLabel: { fontSize: 11, color: "var(--text-secondary)", marginTop: 4, textTransform: "uppercase", letterSpacing: 0.3 },
  chartCard: {
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: 24,
  },
  chartHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  chartTitle: { fontSize: 15, fontWeight: 600 },
  showAllBtn: {
    background: "var(--accent-muted)", color: "var(--accent)",
    border: "1px solid rgba(99,102,241,0.3)", borderRadius: 6,
    padding: "5px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer",
  },
  pieRow: { display: "flex", alignItems: "center", gap: 20 },
  legend: { display: "flex", flexDirection: "column", gap: 8, flex: 1 },
  legendItem: { display: "flex", alignItems: "center", gap: 8, fontSize: 13 },
  legendDot: { width: 10, height: 10, borderRadius: 3, flexShrink: 0 },
  legendText: { color: "var(--text-secondary)", flex: 1 },
  legendCount: { fontWeight: 600, color: "var(--text-primary)" },
};

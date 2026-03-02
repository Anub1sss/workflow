import React, { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  Users, Eye, Layers, TrendingUp, BarChart3, Activity,
  Megaphone, MessageSquare, AlertTriangle, Calendar, Clock,
  GitCompare, Search, X,
} from "lucide-react";
import { fetchStatsFiltered, fetchPostingHours, fetchCompareChannels, fetchChannelsList } from "../api";
import { useFavorites } from "../hooks/useFavorites";

const COLORS = ["#5ea5e5", "#9b7cd5", "#4fae4e", "#e8a447", "#e05353", "#5bcbcf", "#d75fa0", "#e88a47"];

function formatNum(n) {
  if (!n) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export default function StatsView() {
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState({ subs: false, views: false, er: false });

  const [hours, setHours] = useState([]);
  const [hoursLoading, setHoursLoading] = useState(false);

  const [compareSearch, setCompareSearch] = useState("");
  const [channelsList, setChannelsList] = useState([]);
  const [compareSelected, setCompareSelected] = useState([]);
  const [compareData, setCompareData] = useState([]);
  const [compareLoading, setCompareLoading] = useState(false);

  const { favorites } = useFavorites();

  const load = useCallback(() => {
    setLoading(true);
    fetchStatsFiltered({})
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (tab === "hours") {
      setHoursLoading(true);
      const params = favorites.length > 0
        ? { channels: favorites.map(f => f.username).join(",") }
        : {};
      fetchPostingHours(params)
        .then(setHours)
        .catch(console.error)
        .finally(() => setHoursLoading(false));
    }
  }, [tab, favorites]);

  useEffect(() => {
    fetchChannelsList().then(setChannelsList).catch(() => {});
  }, []);

  const toggleCompareChannel = (username) => {
    setCompareSelected(prev =>
      prev.includes(username) ? prev.filter(u => u !== username) : [...prev, username]
    );
  };

  const runCompare = () => {
    if (compareSelected.length < 2) return;
    setCompareLoading(true);
    fetchCompareChannels({ channels: compareSelected.join(",") })
      .then(setCompareData)
      .catch(console.error)
      .finally(() => setCompareLoading(false));
  };

  useEffect(() => {
    if (compareSelected.length >= 2) runCompare();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compareSelected]);

  if (loading) return <div style={styles.loading}>Загрузка статистики...</div>;
  if (!stats) return <div style={styles.loading}>Ошибка загрузки</div>;

  const subsList = showAll.subs ? stats.top_by_subscribers : stats.top_by_subscribers.slice(0, 15);
  const viewsList = showAll.views ? stats.top_by_views : stats.top_by_views.slice(0, 15);
  const erList = showAll.er ? (stats.top_by_er || []) : (stats.top_by_er || []).slice(0, 15);

  const filteredCompareList = compareSearch
    ? channelsList.filter(ch =>
        ch.username.toLowerCase().includes(compareSearch.toLowerCase()) ||
        (ch.title && ch.title.toLowerCase().includes(compareSearch.toLowerCase()))
      )
    : channelsList;

  const radarData = compareData.length > 0 ? (() => {
    const maxSubs = Math.max(...compareData.map(c => c.tg_participants || c.subscribers || 1));
    const maxViews = Math.max(...compareData.map(c => c.avg_views_30d || c.avg_views || 1));
    const maxER = Math.max(...compareData.map(c => c.er_pct || 0.01));
    const maxFreq = Math.max(...compareData.map(c => c.publish_frequency || 0.01));
    const maxReactions = Math.max(...compareData.map(c => c.avg_reactions_30d || 0.01));

    const metrics = ["Подписчики", "Просмотры", "ER", "Частота", "Реакции"];
    return metrics.map((name, i) => {
      const point = { metric: name };
      compareData.forEach(ch => {
        const vals = [
          ((ch.tg_participants || ch.subscribers || 0) / maxSubs) * 100,
          ((ch.avg_views_30d || ch.avg_views || 0) / maxViews) * 100,
          ((ch.er_pct || 0) / maxER) * 100,
          ((ch.publish_frequency || 0) / maxFreq) * 100,
          ((ch.avg_reactions_30d || 0) / maxReactions) * 100,
        ];
        point[ch.username] = Math.round(vals[i]);
      });
      return point;
    });
  })() : [];

  return (
    <div style={styles.container}>
      {/* Tab bar */}
      <div style={styles.tabBar}>
        {[
          { id: "overview", label: "Обзор", icon: <Layers size={14} /> },
          { id: "hours", label: "Время публикаций", icon: <Clock size={14} /> },
          { id: "compare", label: "Сравнение каналов", icon: <GitCompare size={14} /> },
        ].map(t => (
          <button
            key={t.id}
            style={{ ...styles.tab, ...(tab === t.id ? styles.tabActive : {}) }}
            onClick={() => setTab(t.id)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <>
          <div style={styles.kpiRow}>
            <KPI icon={<Layers size={20} />} label="Каналов" value={stats.total_channels} color="var(--tg-accent)" />
            <KPI icon={<Users size={20} />} label="Ср. подписчиков" value={formatNum(stats.avg_subscribers)} color="var(--tg-blue)" />
            <KPI icon={<Eye size={20} />} label="Ср. просмотров" value={formatNum(stats.avg_views)} color="var(--tg-green)" />
            <KPI icon={<TrendingUp size={20} />} label="Ср. ER" value={(stats.avg_er || 0).toFixed(3) + "%"} color="var(--tg-orange)" />
          </div>

          <div style={styles.kpiRow}>
            <KPI icon={<TrendingUp size={20} />} label="Ср. ERR" value={(stats.avg_err || 0).toFixed(3) + "%"} color="var(--tg-accent)" />
            <KPI icon={<BarChart3 size={20} />} label="Ср. видимость" value={(stats.avg_visibility || 0).toFixed(1) + "%"} color="var(--tg-green)" />
            <KPI icon={<Activity size={20} />} label="Ср. частота" value={(stats.avg_frequency || 0).toFixed(1) + "/день"} color="var(--tg-blue)" />
            <KPI icon={<BarChart3 size={20} />} label="Ср. стабильность" value={(stats.avg_stability || 0).toFixed(0) + "%"} color="var(--tg-orange)" />
          </div>

          <div style={styles.kpiRow}>
            <KPI icon={<Megaphone size={20} />} label="Ср. реклама" value={(stats.avg_ad_pct || 0).toFixed(1) + "%"} color="var(--tg-orange)" />
            <KPI icon={<AlertTriangle size={20} />} label="Ср. гемблинг" value={(stats.avg_gambling_pct || 0).toFixed(1) + "%"} color="var(--tg-red)" />
            <KPI icon={<MessageSquare size={20} />} label="С чатом" value={stats.channels_with_chat || 0} color="var(--tg-accent)" />
            <KPI icon={<Calendar size={20} />} label="Ср. возраст" value={
              (stats.avg_channel_age_days || 0) > 365
                ? Math.floor(stats.avg_channel_age_days / 365) + " лет"
                : (stats.avg_channel_age_days || 0) + " дней"
            } color="var(--tg-blue)" />
          </div>

          {/* Types pie */}
          {stats.types.length > 0 && (
            <div style={styles.chartCard}>
              <h3 style={styles.chartTitle}>Типы каналов</h3>
              <div style={styles.pieRow}>
                <ResponsiveContainer width="50%" height={260}>
                  <PieChart>
                    <Pie data={stats.types} dataKey="count" nameKey="type" cx="50%" cy="50%"
                      innerRadius={60} outerRadius={100} stroke="var(--tg-bg-secondary)" strokeWidth={3}>
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

          {/* Top by ER */}
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
                  <XAxis type="number" tick={{ fill: "var(--tg-text-muted)", fontSize: 11 }} tickFormatter={v => v.toFixed(2) + "%"} />
                  <YAxis dataKey="username" type="category" width={130}
                    tick={{ fill: "var(--tg-text-secondary)", fontSize: 11 }}
                    tickFormatter={v => "@" + (v.length > 16 ? v.slice(0, 16) + "..." : v)} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(val) => [val.toFixed(3) + "%", "ER"]} />
                  <Bar dataKey="er_pct" fill="var(--tg-green)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top by subscribers */}
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
                <XAxis type="number" tick={{ fill: "var(--tg-text-muted)", fontSize: 11 }} tickFormatter={formatNum} />
                <YAxis dataKey="username" type="category" width={130}
                  tick={{ fill: "var(--tg-text-secondary)", fontSize: 11 }}
                  tickFormatter={v => "@" + (v.length > 16 ? v.slice(0, 16) + "..." : v)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(val) => [formatNum(val), "Подписчики"]} />
                <Bar dataKey="subscribers" fill="var(--tg-accent)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top by views */}
          <div style={styles.chartCard}>
            <div style={styles.chartHeader}>
              <h3 style={styles.chartTitle}>Топ по просмотрам ({stats.top_by_views.length})</h3>
              {stats.top_by_views.length > 15 && (
                <button style={styles.showAllBtn} onClick={() => setShowAll(p => ({ ...p, views: !p.views }))}>
                  {showAll.views ? "Свернуть" : "Показать все"}
                </button>
              )}
            </div>
            <ResponsiveContainer width="100%" height={viewsList.length * 34 + 40}>
              <BarChart data={viewsList} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" tick={{ fill: "var(--tg-text-muted)", fontSize: 11 }} tickFormatter={formatNum} />
                <YAxis dataKey="username" type="category" width={130}
                  tick={{ fill: "var(--tg-text-secondary)", fontSize: 11 }}
                  tickFormatter={v => "@" + (v.length > 16 ? v.slice(0, 16) + "..." : v)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(val) => [formatNum(val), "Просмотры"]} />
                <Bar dataKey="avg_views" fill="var(--tg-purple)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Posting hours tab */}
      {tab === "hours" && (
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>
            <Clock size={16} /> Лучшее время публикации
          </h3>
          <p style={styles.chartSubtitle}>
            {favorites.length > 0
              ? `По избранным каналам (${favorites.length})`
              : "По всем каналам"}
          </p>
          {hoursLoading ? (
            <div style={styles.loading}>Загрузка...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hours} margin={{ left: 0, right: 10 }}>
                <XAxis
                  dataKey="hour"
                  tick={{ fill: "var(--tg-text-secondary)", fontSize: 11 }}
                  tickFormatter={h => `${h}:00`}
                />
                <YAxis tick={{ fill: "var(--tg-text-muted)", fontSize: 11 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(val) => [val, "Постов"]}
                  labelFormatter={(h) => `${h}:00 — ${h}:59`}
                />
                <Bar dataKey="count" fill="var(--tg-accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          {hours.length > 0 && (() => {
            const best = [...hours].sort((a, b) => b.count - a.count).slice(0, 3);
            return (
              <div style={styles.bestHours}>
                <span style={styles.bestHoursLabel}>Пиковые часы:</span>
                {best.map(h => (
                  <span key={h.hour} style={styles.bestHourChip}>{h.hour}:00 ({h.count} постов)</span>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Compare tab */}
      {tab === "compare" && (
        <div style={styles.compareSection}>
          <div style={styles.compareSelector}>
            <h3 style={styles.chartTitle}>
              <GitCompare size={16} /> Сравнение каналов
            </h3>
            <div style={styles.compareSearch}>
              <Search size={14} color="var(--tg-text-muted)" />
              <input
                style={styles.compareInput}
                placeholder="Найти канал..."
                value={compareSearch}
                onChange={e => setCompareSearch(e.target.value)}
              />
              {compareSearch && (
                <button style={styles.compareClear} onClick={() => setCompareSearch("")}>
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Selected chips */}
            {compareSelected.length > 0 && (
              <div style={styles.selectedChips}>
                {compareSelected.map(u => (
                  <span key={u} style={styles.selectedChip}>
                    @{u}
                    <button style={styles.chipRemove} onClick={() => toggleCompareChannel(u)}>
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div style={styles.compareList}>
              {filteredCompareList.slice(0, 30).map(ch => {
                const active = compareSelected.includes(ch.username);
                return (
                  <button
                    key={ch.username}
                    style={{ ...styles.compareItem, ...(active ? styles.compareItemActive : {}) }}
                    onClick={() => toggleCompareChannel(ch.username)}
                  >
                    <span style={styles.compareCheck}>{active ? "✓" : ""}</span>
                    @{ch.username}
                    {ch.title && <span style={styles.compareTitle}>{ch.title}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {compareLoading && <div style={styles.loading}>Загрузка...</div>}

          {compareData.length >= 2 && (
            <>
              {/* Radar */}
              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>Радар-сравнение</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="var(--tg-border)" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: "var(--tg-text-secondary)", fontSize: 12 }} />
                    <PolarRadiusAxis tick={false} axisLine={false} />
                    {compareData.map((ch, i) => (
                      <Radar
                        key={ch.username}
                        name={ch.title || ch.username}
                        dataKey={ch.username}
                        stroke={COLORS[i % COLORS.length]}
                        fill={COLORS[i % COLORS.length]}
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    ))}
                    <Tooltip contentStyle={tooltipStyle} />
                  </RadarChart>
                </ResponsiveContainer>
                <div style={styles.radarLegend}>
                  {compareData.map((ch, i) => (
                    <span key={ch.username} style={{ ...styles.radarLegendItem, color: COLORS[i % COLORS.length] }}>
                      <div style={{ ...styles.legendDot, background: COLORS[i % COLORS.length] }} />
                      {ch.title || ch.username}
                    </span>
                  ))}
                </div>
              </div>

              {/* Comparison table */}
              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>Детальное сравнение</h3>
                <div style={styles.compareTableWrap}>
                  <table style={styles.compareTable}>
                    <thead>
                      <tr>
                        <th style={styles.compareTh}>Метрика</th>
                        {compareData.map(ch => (
                          <th key={ch.username} style={styles.compareTh}>
                            {ch.title || ch.username}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: "Подписчики", key: "tg_participants", alt: "subscribers", fmt: formatNum },
                        { label: "Ср. просмотры", key: "avg_views_30d", alt: "avg_views", fmt: formatNum },
                        { label: "ER %", key: "er_pct", fmt: v => (v || 0).toFixed(3) + "%" },
                        { label: "ERR %", key: "err_pct", fmt: v => (v || 0).toFixed(3) + "%" },
                        { label: "Видимость %", key: "visibility_pct", fmt: v => (v || 0).toFixed(1) + "%" },
                        { label: "Постов/мес", key: "posts_30d", fmt: v => v || 0 },
                        { label: "Частота/день", key: "publish_frequency", fmt: v => (v || 0).toFixed(1) },
                        { label: "Стабильность %", key: "publish_stability", fmt: v => (v || 0).toFixed(0) + "%" },
                        { label: "Ср. реакции", key: "avg_reactions_30d", fmt: v => (v || 0).toFixed(1) },
                        { label: "Ср. репосты", key: "avg_forwards_30d", fmt: v => (v || 0).toFixed(1) },
                        { label: "Возраст (дней)", key: "channel_age_days", fmt: v => v || 0 },
                        { label: "Реклама %", key: "ad_pct_30d", fmt: v => (v || 0).toFixed(1) + "%" },
                      ].map(row => (
                        <tr key={row.label}>
                          <td style={styles.compareTdLabel}>{row.label}</td>
                          {compareData.map(ch => (
                            <td key={ch.username} style={styles.compareTd}>
                              {row.fmt(ch[row.key] || (row.alt ? ch[row.alt] : 0))}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
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
  background: "var(--tg-bg-panel)", border: "1px solid var(--tg-border)",
  borderRadius: 8, fontSize: 12, color: "var(--tg-text)",
};

const styles = {
  container: { display: "flex", flexDirection: "column", gap: 20 },
  loading: { textAlign: "center", padding: 60, color: "var(--tg-text-secondary)" },
  tabBar: {
    display: "flex",
    gap: 4,
    background: "var(--tg-bg-secondary)",
    padding: 4,
    borderRadius: 12,
  },
  tab: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "10px 16px",
    border: "none",
    borderRadius: 10,
    background: "transparent",
    color: "var(--tg-text-muted)",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  tabActive: {
    background: "var(--tg-accent-muted)",
    color: "var(--tg-accent)",
    fontWeight: 600,
  },
  kpiRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 },
  kpi: {
    background: "var(--tg-bg-panel)", border: "1px solid var(--tg-border)",
    borderRadius: 12, padding: "20px 16px", textAlign: "center",
  },
  kpiValue: { fontSize: 24, fontWeight: 800 },
  kpiLabel: { fontSize: 11, color: "var(--tg-text-secondary)", marginTop: 4, textTransform: "uppercase", letterSpacing: 0.3 },
  chartCard: {
    background: "var(--tg-bg-panel)", border: "1px solid var(--tg-border)",
    borderRadius: 12, padding: 24,
  },
  chartHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  chartTitle: {
    fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 8,
  },
  chartSubtitle: {
    fontSize: 12, color: "var(--tg-text-muted)", marginTop: 4, marginBottom: 16,
  },
  showAllBtn: {
    background: "var(--tg-accent-muted)", color: "var(--tg-accent)",
    border: "1px solid rgba(94,165,229,0.3)", borderRadius: 6,
    padding: "5px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer",
  },
  pieRow: { display: "flex", alignItems: "center", gap: 20 },
  legend: { display: "flex", flexDirection: "column", gap: 8, flex: 1 },
  legendItem: { display: "flex", alignItems: "center", gap: 8, fontSize: 13 },
  legendDot: { width: 10, height: 10, borderRadius: 3, flexShrink: 0 },
  legendText: { color: "var(--tg-text-secondary)", flex: 1 },
  legendCount: { fontWeight: 600, color: "var(--tg-text)" },
  bestHours: {
    display: "flex", alignItems: "center", gap: 8, marginTop: 16, flexWrap: "wrap",
  },
  bestHoursLabel: { fontSize: 12, fontWeight: 600, color: "var(--tg-text-secondary)" },
  bestHourChip: {
    padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 500,
    background: "var(--tg-accent-muted)", color: "var(--tg-accent)",
  },
  compareSection: { display: "flex", flexDirection: "column", gap: 20 },
  compareSelector: {
    background: "var(--tg-bg-panel)", border: "1px solid var(--tg-border)",
    borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 12,
  },
  compareSearch: {
    display: "flex", alignItems: "center", gap: 8,
    background: "var(--tg-bg-input)", border: "1px solid var(--tg-border)",
    borderRadius: 10, padding: "6px 12px",
  },
  compareInput: {
    flex: 1, background: "transparent", border: "none",
    color: "var(--tg-text)", fontSize: 13, outline: "none",
  },
  compareClear: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 18, height: 18, borderRadius: "50%", border: "none",
    background: "var(--tg-bg-panel)", color: "var(--tg-text-muted)", cursor: "pointer",
  },
  selectedChips: { display: "flex", gap: 6, flexWrap: "wrap" },
  selectedChip: {
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "3px 8px", borderRadius: 6, fontSize: 12, fontWeight: 500,
    background: "var(--tg-accent-muted)", color: "var(--tg-accent)",
  },
  chipRemove: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 14, height: 14, border: "none", background: "transparent",
    color: "var(--tg-accent)", cursor: "pointer",
  },
  compareList: {
    maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1,
    border: "1px solid var(--tg-border)", borderRadius: 8, padding: 3,
  },
  compareItem: {
    display: "flex", alignItems: "center", gap: 8, padding: "5px 8px",
    background: "transparent", border: "none", borderRadius: 6,
    color: "var(--tg-text-secondary)", fontSize: 12, cursor: "pointer",
    textAlign: "left", width: "100%",
  },
  compareItemActive: {
    background: "var(--tg-accent-muted)", color: "var(--tg-accent)",
  },
  compareCheck: { width: 14, fontSize: 11, color: "var(--tg-accent)", fontWeight: 700 },
  compareTitle: {
    fontSize: 11, color: "var(--tg-text-muted)", marginLeft: 4,
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  radarLegend: { display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" },
  radarLegendItem: {
    display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500,
  },
  compareTableWrap: { overflowX: "auto" },
  compareTable: {
    width: "100%", borderCollapse: "collapse", fontSize: 13,
  },
  compareTh: {
    padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: 600,
    color: "var(--tg-text-muted)", textTransform: "uppercase",
    borderBottom: "1px solid var(--tg-border)", whiteSpace: "nowrap",
  },
  compareTdLabel: {
    padding: "8px 12px", fontSize: 13, fontWeight: 500, color: "var(--tg-text-secondary)",
    borderBottom: "1px solid rgba(255,255,255,0.03)",
  },
  compareTd: {
    padding: "8px 12px", fontSize: 14, fontWeight: 600, color: "var(--tg-text)",
    borderBottom: "1px solid rgba(255,255,255,0.03)",
  },
};

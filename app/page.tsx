"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────
interface Ticket {
  id: number;
  sender: string;
  timestamp: string;
  subject: string;
  body: string;
  category: string;
  generated: boolean;
}

interface DayVolume {
  date: string;
  count: number;
}

interface CatVolume {
  category: string;
  count: number;
}

interface Stats {
  total: number;
  volumeByDay: DayVolume[];
  volumeByCat: CatVolume[];
}

// ── Palette ────────────────────────────────────────────────────────────────
const COLORS = {
  // Mirrored from the requested palette
  bg: "#fffbf5",            // --floral-white
  surface: "whitesmoke",     // --white-smoke
  border: "#f76754ff",       // --white-smoke-2
  accent: "#f24029",       // --red
  accentDim: "#f2402980",  // translucent red for subtle hover/cursor
  accentMid: "#f2402940",
  gold: "#f0c040",
  rose: "#f24029",
  text: "#1a1a1aff",         // --dark-slate-grey
  muted: "#1a1a1aff",        // --grey
  bars: "#E78B48ff",
} as const;

// ── Chart Card ─────────────────────────────────────────────────────────────
interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  span?: number;
}

function ChartCard({ title, children, span = 1 }: ChartCardProps) {
  return (
    <div style={{
      background: COLORS.surface, border: `2px solid ${COLORS.border}`,
      borderRadius: 16, padding: "20px 24px", gridColumn: `span ${span}`,
    }}>
      <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: COLORS.muted, fontFamily: "'DM Mono', monospace", marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}

const tooltipStyle = {
  contentStyle: { background: "#b2b2b2ff", border: `2px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontSize: 12 },
  labelStyle: { color: COLORS.accent },
  itemStyle: { color: COLORS.text },
  cursor: { fill: COLORS.accentDim },
};

// ── Main Page ──────────────────────────────────────────────────────────────
export default function Home() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [generatedFilter, setGeneratedFilter] = useState<string>("all");
  // generation UI state
  const [generating, setGenerating] = useState<boolean>(false);
  const [generateStatus, setGenerateStatus] = useState<string | null>(null);
  const [showGenerateTooltip, setShowGenerateTooltip] = useState<boolean>(false);
  const [showRefreshTooltip, setShowRefreshTooltip] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errors, setErrors] = useState<string[]>([]);

  const fetchData = useCallback(async (showLoadingSpinner = false) => {
    try {
      if (showLoadingSpinner) setLoading(true);
      const [ticketsRes, statsRes] = await Promise.all([
        fetch('/api/ticket', { method: 'GET' }),
        fetch('/api/ticket/stats', { method: 'GET' })
      ]);

      if (!ticketsRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const ticketsData = await ticketsRes.json();
      const statsData = await statsRes.json();

      setTickets(ticketsData.tickets || []);
      setStats(statsData);
    } catch (err) {
      setErrors(prev => [...prev, err instanceof Error ? err.message : 'Failed to load data']);
      setTickets([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);


  // ── Loading State ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Noto Sans', sans-serif", color: COLORS.text }}>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: ${COLORS.bg}; }
        `}</style>
        <div style={{ fontSize: 14 }}>Loading tickets...</div>
      </div>
    );
  }

  // ── Empty State ────────────────────────────────────────────────────────
  if (!tickets || tickets.length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Noto Sans', sans-serif", color: COLORS.text }}>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: ${COLORS.bg}; }
        `}</style>
        <div style={{ maxWidth: 520, textAlign: "center" }}>
          <h1 style={{ fontSize: 36, fontWeight: 700, color: COLORS.text, fontFamily: "'Noto Sans', sans-serif", marginBottom: 12 }}>
            No Tickets Yet
          </h1>
          <p style={{ color: COLORS.muted, fontSize: 13, lineHeight: 1.7 }}>
            Send emails to your configured Mailgun inbox to start collecting support tickets.
          </p>
        </div>
      </div>
    );
  }

  const displayedTickets = (tickets ?? [])
    .filter(t => categoryFilter === "all" || t.category === categoryFilter)
    .filter(t => generatedFilter === "all" || (generatedFilter === "generated" ? t.generated : !t.generated))
    .sort((a, b) => {
      const diff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      return sortOrder === "asc" ? diff : -diff;
    });

  // ── Dashboard ──────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'Noto Sans', sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${COLORS.bg}; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${COLORS.bg}; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 3px; }
        .refresh-btn { transition: color .15s; }
        .refresh-btn:hover { color: ${COLORS.accent} !important; }
      `}</style>

      {/* Top Nav */}
      <div style={{ borderBottom: `2px solid ${COLORS.border}`, padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", background: COLORS.surface }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: "'Noto Sans', sans-serif", fontWeight: 600, fontSize: 15 }}>Support Ticket Classifier</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* <span style={{ color: COLORS.muted, fontSize: 11 }}>{stats?.total} tickets</span> */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ position: "relative" }}>
              <button
                onClick={async () => {
                  if (generating) return;
                  setGenerating(true);
                  setGenerateStatus("Generating…");
                  try {
                    const response = await fetch('/api/ticket/generate', { method: 'POST' });
                    if (!response.ok) throw new Error(`Generate failed (${response.status})`);
                    const result = await response.json();
                    console.log(result);
                    setGenerateStatus("Generated");
                    await fetchData();
                  } catch (err) {
                    const msg = err instanceof Error ? err.message : "Failed to generate";
                    console.error(err);
                    setGenerateStatus(msg);
                  } finally {
                    setGenerating(false);
                    // clear status after a short delay
                    setTimeout(() => setGenerateStatus(null), 3500);
                  }
                }}
                disabled={generating}
                style={{
                  background: "none",
                  border: "none",
                  color: generating ? "#ff5959ff" : COLORS.muted,
                  fontSize: 11,
                  cursor: generating ? "not-allowed" : "pointer",
                  letterSpacing: 1,
                  transition: "color 0.15s",
                  opacity: generating ? 0.85 : 1,
                  fontFamily: "'DM Mono', monospace",
                }}
                onMouseEnter={(e) => { if (!generating) e.currentTarget.style.color = COLORS.accent; setShowGenerateTooltip(true); }}
                onMouseLeave={(e) => { if (!generating) e.currentTarget.style.color = COLORS.muted; setShowGenerateTooltip(false); }}
              >
                {generating ? "GENERATING..." : "+ GENERATE"}
              </button>
              <div
                role="status"
                aria-hidden={!showGenerateTooltip}
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  background: COLORS.surface,
                  border: `2px solid ${COLORS.border}`,
                  color: COLORS.text,
                  padding: "8px 10px",
                  borderRadius: 8,
                  fontSize: 11,
                  width: 260,
                  boxShadow: "0 8px 24px rgba(2,6,23,0.6)",
                  zIndex: 40,
                  // animation: fade + slight slide (matches recharts feeling)
                  opacity: showGenerateTooltip ? 1 : 0,
                  transform: showGenerateTooltip ? "translateY(0)" : "translateY(-6px)",
                  transition: "opacity 180ms ease, transform 180ms ease",
                  pointerEvents: showGenerateTooltip ? "auto" : "none",
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 6, color: COLORS.accent }}>Generate synthetic tickets</div>
                <div style={{ color: COLORS.muted, lineHeight: 1.3 }}>
                  Creates a small batch of synthetic support tickets for testing and demo purposes.
                </div>
              </div>
            </div>
          </div>
          <div style={{ position: "relative" }}>
            <button
              className="refresh-btn"
              onClick={async () => {
                if (refreshing) return;
                setRefreshing(true);
                await fetchData();
                setRefreshing(false);
              }}
              disabled={refreshing}
              onMouseEnter={() => setShowRefreshTooltip(true)}
              onMouseLeave={() => setShowRefreshTooltip(false)}
              style={{ background: "none", border: "none", color: refreshing ? "#ff5959ff" : COLORS.muted, fontSize: 11, cursor: refreshing ? "not-allowed" : "pointer", letterSpacing: 1, fontFamily: "'DM Mono', monospace", opacity: refreshing ? 0.85 : 1, transition: "color 0.15s" }}
            >
              {refreshing ? "REFRESHING..." : "↻ REFRESH"}
            </button>
            <div
              role="status"
              aria-hidden={!showRefreshTooltip}
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                background: COLORS.surface,
                border: `2px solid ${COLORS.border}`,
                color: COLORS.text,
                padding: "8px 10px",
                borderRadius: 8,
                fontSize: 11,
                width: 220,
                boxShadow: "0 8px 24px rgba(2,6,23,0.6)",
                zIndex: 40,
                opacity: showRefreshTooltip ? 1 : 0,
                transform: showRefreshTooltip ? "translateY(0)" : "translateY(-6px)",
                transition: "opacity 180ms ease, transform 180ms ease",
                pointerEvents: showRefreshTooltip ? "auto" : "none",
                fontFamily: "'DM Mono', monospace",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 6, color: COLORS.accent }}>Refresh data</div>
              <div style={{ color: COLORS.muted, lineHeight: 1.3 }}>
                Reloads the dashboard and fetches the latest tickets and stats from the server.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "28px 32px", maxWidth: 1280, margin: "0 auto" }}>
        {/* Charts Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 24 }}>
          {/* Volume by Category */}
          <ChartCard title="Volume by Category" span={2}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats!.volumeByCat} layout="vertical" barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} horizontal={false} />
                <XAxis type="number" tick={{ fill: COLORS.muted, fontSize: 11, fontFamily: "'Noto Sans', sans-serif" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="category" tick={{ fill: COLORS.text, fontSize: 11, fontFamily: "'Noto Sans', sans-serif" }} axisLine={false} tickLine={false} width={110} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Tickets">
                  {stats!.volumeByCat.map((_, i) => (
                    <Cell
                      key={i}
                      fill={COLORS.bars}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Volume by Day */}
          <ChartCard title="Volume by Day" span={2}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats!.volumeByDay} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
                <XAxis dataKey="date" tick={{ fill: COLORS.muted, fontSize: 11, fontFamily: "'Noto Sans', sans-serif" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: COLORS.muted, fontSize: 11, fontFamily: "'Noto Sans', sans-serif" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="count" fill={COLORS.bars} radius={[4, 4, 0, 0]} name="Tickets" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>



        </div>

        {/* Raw Table */}
        <div style={{ background: COLORS.surface, border: `2px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "14px 24px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 11, letterSpacing: 2, color: COLORS.muted, textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "'DM Mono', monospace" }}>
            <span>Ticket Log — {displayedTickets.length} records</span>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>




            </div>
          </div>
          <div style={{ overflowX: "auto", maxHeight: "600px", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead style={{ position: "sticky", top: 0, background: COLORS.surface }}>
                <tr>
                  <th style={{ padding: "10px 16px", textAlign: "left", color: COLORS.muted, fontWeight: 400, borderBottom: `1px solid ${COLORS.border}`, whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: 1, fontSize: 10, width: 30, fontFamily: "'DM Mono', monospace" }}></th>
                  <th style={{ padding: "10px 16px", textAlign: "left", color: COLORS.muted, fontWeight: 400, borderBottom: `1px solid ${COLORS.border}`, whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: 1, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>Sender</th>
                  <th style={{ padding: "10px 16px", textAlign: "left", color: COLORS.muted, fontWeight: 400, borderBottom: `1px solid ${COLORS.border}`, whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: 1, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>Subject</th>
                  <th style={{ padding: "10px 16px", textAlign: "left", color: COLORS.muted, fontWeight: 400, borderBottom: `1px solid ${COLORS.border}`, whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: 1, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>
                    <button
                      onClick={() => setSortOrder(o => o === "desc" ? "asc" : "desc")}
                      style={{ background: "none", border: "none", color: COLORS.muted, fontSize: 11, cursor: "pointer", letterSpacing: 1, textTransform: "uppercase", transition: "color 0.15s", fontFamily: "'DM Mono', monospace" }}
                      onMouseEnter={(e) => e.currentTarget.style.color = COLORS.accent}
                      onMouseLeave={(e) => e.currentTarget.style.color = COLORS.muted}
                    >
                      Date {sortOrder === "desc" ? "↓" : "↑"}
                    </button>
                  </th>
                  <th style={{ padding: "10px 16px", textAlign: "left", color: COLORS.muted, fontWeight: 400, borderBottom: `1px solid ${COLORS.border}`, whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: 1, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      style={{ background: COLORS.surface, color: COLORS.muted, fontSize: 11, cursor: "pointer", letterSpacing: 1, textTransform: "uppercase", borderRadius: 4, padding: "2px 6px", fontFamily: "'DM Mono', monospace" }}
                    >
                      <option value="all">All Categories</option>
                      <option value="usage">Usage</option>
                      <option value="account">Account</option>
                      <option value="feedback">Feedback</option>
                      <option value="education">Education</option>
                      <option value="career">Career</option>
                    </select>
                  </th>
                  <th style={{ padding: "10px 16px", textAlign: "left", color: COLORS.muted, fontWeight: 400, borderBottom: `1px solid ${COLORS.border}`, whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: 1, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>
                    <select
                      value={generatedFilter}
                      onChange={(e) => setGeneratedFilter(e.target.value)}
                      style={{ background: COLORS.surface, color: COLORS.muted, fontSize: 11, cursor: "pointer", letterSpacing: 1, textTransform: "uppercase", borderRadius: 4, padding: "2px 6px", fontFamily: "'DM Mono', monospace" }}
                    >
                      <option value="all">All Sources</option>
                      <option value="generated">Generated</option>
                      <option value="real">Real</option>
                    </select>
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedTickets.map((t, i) => (
                  <>
                    <tr key={t.id}
                      onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                      style={{
                        borderBottom: `1px solid ${COLORS.border}20`,
                        background: i % 2 === 0 ? "transparent" : "#ffffff04",
                        cursor: "pointer",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = COLORS.accentDim}
                      onMouseLeave={(e) => e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "#ffffff04"}
                    >
                      <td style={{ padding: "9px 16px", color: COLORS.accent, whiteSpace: "nowrap", fontSize: 14 }}>
                        {expandedId === t.id ? "▼" : "▶"}
                      </td>
                      <td style={{ padding: "9px 16px", color: COLORS.text, whiteSpace: "nowrap" }}>{t.sender}</td>
                      <td style={{ padding: "9px 16px", color: COLORS.text, maxWidth: 400, overflow: "hidden", textOverflow: "ellipsis" }}>{t.subject}</td>
                      <td style={{ padding: "9px 16px", color: COLORS.muted, whiteSpace: "nowrap", fontSize: 11 }}>{new Date(t.timestamp).toLocaleDateString()}</td>
                      <td style={{ padding: "9px 16px", color: COLORS.accent, whiteSpace: "nowrap" }}>{t.category}</td>
                      <td style={{ padding: "9px 16px", color: COLORS.accent, whiteSpace: "nowrap" }}>{t.generated ? "generated" : "real"}</td>
                    </tr>
                    {expandedId === t.id && (
                      <tr style={{ background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}` }}>
                        <td colSpan={5} style={{ padding: "16px 24px" }}>
                          <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 16 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 16 }}>
                              <div>
                                <div style={{ fontSize: 10, color: COLORS.rose, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>From</div>
                                <div style={{ color: COLORS.muted, fontSize: 12 }}>{t.sender}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 10, color: COLORS.rose, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Category</div>
                                <div style={{ color: COLORS.muted, fontSize: 12 }}>{t.category}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 10, color: COLORS.rose, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Date and Time</div>
                                <div style={{ color: COLORS.muted, fontSize: 12 }}>{new Date(t.timestamp).toLocaleString()}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 10, color: COLORS.rose, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Subject</div>
                                <div style={{ color: COLORS.muted, fontSize: 12 }}>{t.subject}</div>
                              </div>
                            </div>
                            <div style={{ marginTop: 16 }}>
                              <div style={{ fontSize: 10, color: COLORS.rose, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Body</div>
                              <div style={{
                                background: COLORS.bg,
                                border: `2px solid ${COLORS.border}`,
                                borderRadius: 6,
                                padding: 12,
                                color: COLORS.text,
                                fontSize: 12,
                                lineHeight: 1.6,
                                maxHeight: 300,
                                overflowY: "auto",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word"
                              }}>
                                {t.body}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Error Overlay */}
      {errors.length > 0 && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000, maxWidth: 300 }}>
          {errors.map((err, i) => (
            <div key={i} style={{ background: COLORS.surface, border: `2px solid ${COLORS.border}`, borderRadius: 8, padding: 12, marginBottom: 8, color: COLORS.text, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', fontFamily: "'DM Mono', monospace" }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: COLORS.rose, fontWeight: 600 }}>Error</div>
                <button onClick={() => setErrors(prev => prev.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: COLORS.muted, cursor: 'pointer', fontSize: 14 }}>×</button>
              </div>
              <div style={{ marginTop: 8 }}>{err}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

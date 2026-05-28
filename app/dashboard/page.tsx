"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Friend, FriendCategory, Interaction } from "@/types/friend";
import { getFriends } from "@/lib/storage";
import { formatLastInteraction } from "@/lib/date";
import AppNav from "@/components/AppNav";
import {
  AreaChart,
  Area,
  XAxis,
  Tooltip as RechartTooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDaysAgo(date?: string) {
  if (!date) return Infinity;
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

function getUrgency(friend: Friend) {
  return Math.max(
    getDaysAgo(friend.lastTexted) - friend.textFrequencyDays,
    getDaysAgo(friend.lastHungOut) - friend.hangoutFrequencyDays
  );
}

function getHealthScore(friend: Friend) {
  const urgency = getUrgency(friend);
  if (urgency === Infinity) return 0;
  return Math.max(Math.min(100 - Math.max(urgency, 0) * 8, 100), 0);
}

function getHealthLabel(score: number) {
  if (score >= 75) return "Healthy";
  if (score >= 45) return "Needs attention";
  return "Overdue";
}

const AVATAR_PALETTE = [
  "#7A5A3F", "#5E6E5A", "#A06A4A", "#604838",
  "#7C5840", "#4A5E7A", "#7A4A5E", "#5A5E7A",
];

function friendColor(f: Friend): string {
  if (f.color) return f.color;
  const h = f.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

const CATEGORIES: FriendCategory[] = [
  "close friend", "family", "classmate", "coworker", "other",
];

function floorToMonday(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.getTime();
}

function calculateStreaks(friends: Friend[]): { current: number; longest: number } {
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const weekSet = new Set<number>();
  friends.forEach((f) =>
    (f.interactions ?? []).forEach((i) => weekSet.add(floorToMonday(new Date(i.date))))
  );
  if (weekSet.size === 0) return { current: 0, longest: 0 };

  const sorted = Array.from(weekSet).sort((a, b) => a - b);

  let longest = 1, run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] === weekMs) { run++; longest = Math.max(longest, run); }
    else run = 1;
  }

  const thisWeek = floorToMonday(new Date());
  const lastWeek = thisWeek - weekMs;
  const startWeek = weekSet.has(thisWeek) ? thisWeek : weekSet.has(lastWeek) ? lastWeek : null;

  let current = 0;
  if (startWeek !== null) {
    let check = startWeek;
    while (weekSet.has(check)) { current++; check -= weekMs; }
  }

  return { current, longest };
}

function rankForOutreach(friends: Friend[]): Friend[] {
  return [...friends]
    .map((f) => {
      const daysSince = Math.min(getDaysAgo(f.lastTexted), getDaysAgo(f.lastHungOut));
      const overdueBy = Math.max(0, daysSince - f.textFrequencyDays);
      const health = getHealthScore(f);
      const score = overdueBy * 3 + (daysSince / f.textFrequencyDays) * 10 + (100 - health);
      return { f, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ f }) => f);
}

function getISOWeekKey(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, "0")}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{ fontFamily: "var(--font-lora)", fontSize: 17, fontWeight: 500, letterSpacing: "-0.005em", color: "#2E2A24", marginBottom: 12 }}>
      {children}<span>:</span>
    </div>
  );
}

function Rule() {
  return <hr style={{ height: 1, border: "none", background: "#E0D9CE", margin: "24px 0" }} />;
}

function EmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, textAlign: "center" }}>
      <p style={{ fontFamily: "var(--font-lora)", fontSize: 22, color: "#2E2A24", margin: "0 0 8px" }}>No data yet</p>
      <p style={{ fontSize: 13, color: "#9A8F82" }}>Add some friends to see your circle analytics.</p>
    </div>
  );
}

function AiCard({ label, loading, loadingText, children }: {
  label: string;
  loading: boolean;
  loadingText: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ borderRadius: 6, padding: "14px 16px", background: "#F0EBE0", border: "1px solid #D9C9A8" }}>
      <p style={{ fontFamily: "monospace", fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#A68B50", margin: "0 0 8px" }}>
        {label}
      </p>
      {loading ? (
        <p style={{ fontSize: 12, color: "#B0A070", margin: 0, fontStyle: "italic" }}>{loadingText}</p>
      ) : children}
    </div>
  );
}

function Avatar({ friend, size = 28 }: { friend: Friend; size?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: 999, background: friendColor(friend), color: "#FFFBF1", fontFamily: "var(--font-lora)", fontSize: size * 0.43, display: "grid", placeItems: "center", flexShrink: 0 }}>
      {friend.name[0]}
    </span>
  );
}

// ─── Feature 1: Heatmap ──────────────────────────────────────────────────────

type HeatmapDay = { date: Date; count: number; key: string; future: boolean };

function InteractionHeatmap({ friends }: { friends: Friend[] }) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const dateCounts = new Map<string, number>();
  friends.forEach((f) =>
    (f.interactions ?? []).forEach((i) => {
      const k = i.date.slice(0, 10);
      dateCounts.set(k, (dateCounts.get(k) ?? 0) + 1);
    })
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start from 52 weeks ago, aligned to Monday
  const start = new Date(today);
  start.setDate(today.getDate() - 363);
  const startDay = start.getDay();
  start.setDate(start.getDate() - (startDay === 0 ? 6 : startDay - 1));

  const days: HeatmapDay[] = [];
  const cursor = new Date(start);
  while (cursor <= today) {
    const key = cursor.toISOString().slice(0, 10);
    days.push({ date: new Date(cursor), count: dateCounts.get(key) ?? 0, key, future: false });
    cursor.setDate(cursor.getDate() + 1);
  }

  // Group into weeks (columns of 7)
  const weeks: HeatmapDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    const week = days.slice(i, i + 7);
    while (week.length < 7) week.push({ date: new Date(), count: 0, key: `pad-${i}-${week.length}`, future: true });
    weeks.push(week);
  }

  // Month labels
  const monthLabels: { col: number; label: string }[] = [];
  weeks.forEach((week, col) => {
    if (col === 0) {
      monthLabels.push({ col, label: week[0].date.toLocaleString("en-US", { month: "short" }) });
    } else {
      const prev = weeks[col - 1][0].date;
      const cur = week[0].date;
      if (prev.getMonth() !== cur.getMonth()) {
        monthLabels.push({ col, label: cur.toLocaleString("en-US", { month: "short" }) });
      }
    }
  });

  const cellSize = 11;
  const gap = 2;
  const cellStep = cellSize + gap;

  function cellColor(count: number, future: boolean) {
    if (future) return "transparent";
    if (count === 0) return "#F0E9DE";
    if (count === 1) return "#B8D4C8";
    if (count === 2) return "#6BAF85";
    return "#3D7A58";
  }

  // Weekly trend for recharts (last 12 weeks)
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const trendData = Array.from({ length: 12 }, (_, i) => {
    const wStart = new Date(floorToMonday(new Date()) - (11 - i) * weekMs);
    const wEnd = new Date(wStart.getTime() + weekMs);
    const count = days.filter((d) => d.date >= wStart && d.date < wEnd && !d.future).reduce((s, d) => s + d.count, 0);
    return { week: wStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }), count };
  });

  return (
    <>
      {tooltip && (
        <div style={{ position: "fixed", left: tooltip.x + 12, top: tooltip.y - 36, background: "#2E2A24", color: "#FAF7F2", fontSize: 11, padding: "4px 8px", borderRadius: 4, pointerEvents: "none", zIndex: 1000, whiteSpace: "nowrap" }}>
          {tooltip.text}
        </div>
      )}

      {/* Weekly trend sparkline */}
      <div style={{ marginBottom: 16, height: 48 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trendData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#A68B50" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#A68B50" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="week" hide />
            <RechartTooltip
              contentStyle={{ background: "#2E2A24", border: "none", borderRadius: 4, fontSize: 11, color: "#FAF7F2" }}
              itemStyle={{ color: "#FAF7F2" }}
              formatter={(v) => [`${v} interaction${v !== 1 ? "s" : ""}`, ""]}
            />
            <Area type="monotone" dataKey="count" stroke="#A68B50" strokeWidth={1.5} fill="url(#trendGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Grid */}
      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "flex", gap: gap, minWidth: "max-content" }}>
          {/* Day labels */}
          <div style={{ display: "flex", flexDirection: "column", gap, paddingTop: 18, width: 24, flexShrink: 0 }}>
            {["Mon", "", "Wed", "", "Fri", "", ""].map((lbl, i) => (
              <div key={i} style={{ height: cellSize, fontSize: 9, color: "#9A8F82", lineHeight: `${cellSize}px`, userSelect: "none" }}>
                {lbl}
              </div>
            ))}
          </div>

          {/* Weeks */}
          <div>
            {/* Month labels */}
            <div style={{ position: "relative", height: 16, marginBottom: 2 }}>
              {monthLabels.map(({ col, label }) => (
                <span key={`${col}-${label}`} style={{ position: "absolute", left: col * cellStep, fontSize: 9.5, color: "#9A8F82", userSelect: "none" }}>
                  {label}
                </span>
              ))}
            </div>

            {/* Cell grid */}
            <div style={{ display: "flex", gap }}>
              {weeks.map((week, wi) => (
                <div key={wi} style={{ display: "flex", flexDirection: "column", gap }}>
                  {week.map((day) => {
                    const dateLabel = day.date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    const tipText = day.future
                      ? ""
                      : day.count === 0
                        ? `No interactions on ${dateLabel}`
                        : `${day.count} interaction${day.count !== 1 ? "s" : ""} on ${dateLabel}`;
                    return (
                      <div
                        key={day.key}
                        style={{ width: cellSize, height: cellSize, borderRadius: 2, background: cellColor(day.count, day.future), cursor: day.future ? "default" : "default", flexShrink: 0 }}
                        onMouseEnter={(e) => { if (!day.future) setTooltip({ text: tipText, x: e.clientX, y: e.clientY }); }}
                        onMouseMove={(e) => { if (!day.future) setTooltip({ text: tipText, x: e.clientX, y: e.clientY }); }}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
        <span style={{ fontSize: 9.5, color: "#9A8F82" }}>Less</span>
        {["#F0E9DE", "#B8D4C8", "#6BAF85", "#3D7A58"].map((c) => (
          <div key={c} style={{ width: cellSize, height: cellSize, borderRadius: 2, background: c }} />
        ))}
        <span style={{ fontSize: 9.5, color: "#9A8F82" }}>More</span>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  const [isGuest, setIsGuest] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [ready, setReady] = useState(false);

  // Feature 3: Monthly report
  const [monthlyReport, setMonthlyReport] = useState<string | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  // Feature 4: Conversation starter
  const [convoStarter, setConvoStarter] = useState<string | null>(null);
  const [convoFriend, setConvoFriend] = useState<Friend | null>(null);
  const [convoLoading, setConvoLoading] = useState(false);
  const [convoExcluded, setConvoExcluded] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // Feature 5: Who to message next
  const [reachOutReasons, setReachOutReasons] = useState<Record<string, string>>({});
  const [reachOutLoading, setReachOutLoading] = useState(false);

  // Existing AI summary
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);

  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;
    const guestMode = localStorage.getItem("friendkeeper-guest") === "1";
    if (!isSignedIn && !guestMode) { router.push("/sign-in"); return; }
    const uid = isSignedIn ? user!.id : "guest";
    setIsGuest(!isSignedIn && guestMode);
    setUserId(uid);
    setFriends(getFriends(uid));
    setReady(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  // All AI fetches — run once after ready
  useEffect(() => {
    if (!ready || !userId || friends.length === 0 || fetchedRef.current) return;
    fetchedRef.current = true;

    // Existing AI overview
    const friendsData = friends.map((f) => {
      const score = getHealthScore(f);
      const textDays = getDaysAgo(f.lastTexted);
      const hangoutDays = getDaysAgo(f.lastHungOut);
      const minDays = Math.min(textDays, hangoutDays);
      const lastContact = minDays === Infinity ? "never" : minDays === 0 ? "today" : `${minDays} days ago`;
      return { name: f.name, category: f.category, healthLabel: getHealthLabel(score), lastContact };
    });
    setAiSummaryLoading(true);
    fetch("/api/ai/summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ friends: friendsData }) })
      .then((r) => r.json())
      .then((d: { summary: string | null }) => setAiSummary(d.summary ?? null))
      .catch(() => {})
      .finally(() => setAiSummaryLoading(false));

    // Feature 3: Monthly report (cached)
    const monthKey = new Date().toISOString().slice(0, 7);
    const monthCacheKey = `friendkeeper-monthly-report-${monthKey}-${userId}`;
    const cachedReport = localStorage.getItem(monthCacheKey);
    if (cachedReport) {
      setMonthlyReport(cachedReport);
    } else {
      const monthName = new Date().toLocaleString("en-US", { month: "long" });
      const monthlyFriends = friends.map((f) => ({
        name: f.name,
        interactions: (f.interactions ?? []).filter((i) => i.date.startsWith(monthKey)),
      })).filter((f) => f.interactions.length > 0);
      if (monthlyFriends.length > 0) {
        setMonthlyLoading(true);
        fetch("/api/ai/monthly", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ friends: monthlyFriends, monthName }) })
          .then((r) => r.json())
          .then((d: { report: string | null }) => {
            if (d.report) { setMonthlyReport(d.report); localStorage.setItem(monthCacheKey, d.report); }
          })
          .catch(() => {})
          .finally(() => setMonthlyLoading(false));
      }
    }

    // Feature 4: Conversation starter (cached per week)
    const weekKey = getISOWeekKey();
    const convoCacheKey = `friendkeeper-convo-starter-${weekKey}-${userId}`;
    const cachedConvo = localStorage.getItem(convoCacheKey);
    if (cachedConvo) {
      try {
        const parsed = JSON.parse(cachedConvo) as { friendId: string; starter: string };
        const cf = friends.find((f) => f.id === parsed.friendId);
        if (cf) { setConvoFriend(cf); setConvoStarter(parsed.starter); }
      } catch { /* ignore stale cache */ }
    } else {
      const sorted = [...friends].sort((a, b) => Math.min(getDaysAgo(b.lastTexted), getDaysAgo(b.lastHungOut)) - Math.min(getDaysAgo(a.lastTexted), getDaysAgo(a.lastHungOut)));
      if (sorted.length > 0) fetchConvoStarter(sorted[0], userId, convoCacheKey);
    }

    // Feature 5: Who to message next (always fresh)
    const top3 = rankForOutreach(friends);
    if (top3.length > 0) {
      const reachFriends = top3.map((f) => {
        const daysSince = Math.min(getDaysAgo(f.lastTexted), getDaysAgo(f.lastHungOut));
        return {
          name: f.name,
          category: f.category,
          daysSince: daysSince === Infinity ? 9999 : daysSince,
          frequencyDays: f.textFrequencyDays,
          overdueBy: Math.max(0, (daysSince === Infinity ? 9999 : daysSince) - f.textFrequencyDays),
          healthScore: getHealthScore(f),
        };
      });
      setReachOutLoading(true);
      fetch("/api/ai/reach-out", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ friends: reachFriends }) })
        .then((r) => r.json())
        .then((d: { reasons: Array<{ name: string; reason: string }> }) => {
          const map: Record<string, string> = {};
          (d.reasons ?? []).forEach(({ name, reason }) => { map[name] = reason; });
          setReachOutReasons(map);
        })
        .catch(() => {})
        .finally(() => setReachOutLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, userId]);

  function fetchConvoStarter(friend: Friend, uid: string, cacheKey: string) {
    setConvoFriend(friend);
    setConvoStarter(null);
    setConvoLoading(true);
    fetch("/api/ai/starter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: friend.name,
        notes: friend.notes,
        interactions: (friend.interactions ?? []).slice(0, 6),
      }),
    })
      .then((r) => r.json())
      .then((d: { starter: string | null }) => {
        if (d.starter) {
          setConvoStarter(d.starter);
          localStorage.setItem(cacheKey, JSON.stringify({ friendId: friend.id, starter: d.starter }));
        }
      })
      .catch(() => {})
      .finally(() => setConvoLoading(false));
  }

  function handleSuggestAnother() {
    const weekKey = getISOWeekKey();
    const convoCacheKey = `friendkeeper-convo-starter-${weekKey}-${userId}`;
    const excluded = convoFriend ? [...convoExcluded, convoFriend.id] : convoExcluded;
    setConvoExcluded(excluded);
    const sorted = [...friends]
      .filter((f) => !excluded.includes(f.id))
      .sort((a, b) => Math.min(getDaysAgo(b.lastTexted), getDaysAgo(b.lastHungOut)) - Math.min(getDaysAgo(a.lastTexted), getDaysAgo(a.lastHungOut)));
    if (sorted.length > 0 && userId) fetchConvoStarter(sorted[0], userId, convoCacheKey);
  }

  function handleRegenerateMonthly() {
    if (!userId) return;
    const monthKey = new Date().toISOString().slice(0, 7);
    const monthCacheKey = `friendkeeper-monthly-report-${monthKey}-${userId}`;
    localStorage.removeItem(monthCacheKey);
    setMonthlyReport(null);
    const monthName = new Date().toLocaleString("en-US", { month: "long" });
    const monthlyFriends = friends.map((f) => ({
      name: f.name,
      interactions: (f.interactions ?? []).filter((i) => i.date.startsWith(monthKey)),
    })).filter((f) => f.interactions.length > 0);
    if (monthlyFriends.length === 0) return;
    setMonthlyLoading(true);
    fetch("/api/ai/monthly", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ friends: monthlyFriends, monthName }) })
      .then((r) => r.json())
      .then((d: { report: string | null }) => {
        if (d.report) { setMonthlyReport(d.report); localStorage.setItem(monthCacheKey, d.report); }
      })
      .catch(() => {})
      .finally(() => setMonthlyLoading(false));
  }

  async function copyToClipboard(text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* noop */ }
  }

  function exitGuestMode() {
    localStorage.removeItem("friendkeeper-guest");
    router.push("/sign-in");
  }

  if (!ready) return <div style={{ height: "100%", background: "#FAF7F2" }} />;

  // ── Analytics ─────────────────────────────────────────────────────────────

  const total = friends.length;
  const healthy = friends.filter((f) => getHealthScore(f) >= 75);
  const needsAttention = friends.filter((f) => { const s = getHealthScore(f); return s >= 45 && s < 75; });
  const overdue = friends.filter((f) => getHealthScore(f) < 45);
  const pct = (n: number) => total === 0 ? "0%" : `${Math.round((n / total) * 100)}%`;
  const overdueByUrgency = [...overdue].sort((a, b) => getUrgency(b) - getUrgency(a));
  const recentlyActive = friends.filter((f) => { const last = Math.min(getDaysAgo(f.lastTexted), getDaysAgo(f.lastHungOut)); return last <= 7; }).sort((a, b) => Math.min(getDaysAgo(a.lastTexted), getDaysAgo(a.lastHungOut)) - Math.min(getDaysAgo(b.lastTexted), getDaysAgo(b.lastHungOut)));
  const neverContacted = friends.filter((f) => !f.lastTexted && !f.lastHungOut);
  const byCategory = CATEGORIES.map((cat) => ({ cat, count: friends.filter((f) => f.category === cat).length })).filter((c) => c.count > 0);
  const recentMoments: { friend: Friend; interaction: Interaction }[] = friends
    .flatMap((f) => (f.interactions ?? []).map((i) => ({ friend: f, interaction: i })))
    .sort((a, b) => b.interaction.date.localeCompare(a.interaction.date));

  const { current: streakCurrent, longest: streakLongest } = calculateStreaks(friends);
  const top3ForOutreach = rankForOutreach(friends);
  const monthName = new Date().toLocaleString("en-US", { month: "long" });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full" style={{ background: "#FAF7F2", position: "relative", zIndex: 1 }}>
      {isGuest && (
        <div style={{ flexShrink: 0, background: "transparent", borderBottom: "1px solid #E0D9CE", padding: "6px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <p style={{ fontSize: 11.5, color: "#9A8F82", margin: 0 }}>You&apos;re using guest mode. Sign in to keep your data tied to your account.</p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <a href="/sign-in" style={{ fontSize: 11.5, color: "#A68B50", textDecoration: "underline", textUnderlineOffset: 2 }}>Sign in</a>
            <button onClick={exitGuestMode} style={{ background: "transparent", border: 0, fontSize: 11.5, color: "#9A8F82", cursor: "pointer" }}>Exit guest</button>
          </div>
        </div>
      )}

      <AppNav />

      <main style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "32px 32px 48px" }}>
          {total === 0 ? <EmptyState /> : (
            <>
              {/* Hero */}
              <header style={{ marginBottom: 18 }}>
                <div style={{ fontFamily: "monospace", fontSize: 9.5, letterSpacing: "0.18em", textTransform: "uppercase", color: "#6B6259", marginBottom: 8 }}>
                  {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}
                </div>
                <h1 style={{ fontFamily: "var(--font-lora)", fontWeight: 400, fontSize: 36, letterSpacing: "-0.02em", margin: "0 0 10px", color: "#2E2A24", lineHeight: 1.05 }}>
                  Your circle.
                </h1>
                <p style={{ fontSize: 13.5, color: "#6B6259", margin: 0, lineHeight: 1.55 }}>
                  <strong style={{ color: "#2E2A24", fontWeight: 500 }}>{total}</strong>{" "}friend{total !== 1 ? "s" : ""} across{" "}
                  <strong style={{ color: "#2E2A24", fontWeight: 500 }}>{byCategory.length}</strong>{" "}categor{byCategory.length !== 1 ? "ies" : "y"}.
                </p>
              </header>

              {/* Feature 2: Streak cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
                <div style={{ background: "#F3EDE3", border: "1px solid #E0D9CE", borderRadius: 6, padding: "14px 16px" }}>
                  <p style={{ fontFamily: "monospace", fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9A8F82", margin: "0 0 6px" }}>Current streak</p>
                  {streakCurrent === 0 ? (
                    <p style={{ fontSize: 12, color: "#9A8F82", margin: 0, fontStyle: "italic" }}>Start your streak today!</p>
                  ) : (
                    <p style={{ fontFamily: "var(--font-lora)", fontSize: 28, fontWeight: 400, color: "#2E2A24", margin: 0, letterSpacing: "-0.02em" }}>
                      {streakCurrent} <span style={{ fontSize: 14, color: "#6B6259" }}>week{streakCurrent !== 1 ? "s" : ""}</span> {"🔥"}
                    </p>
                  )}
                </div>
                <div style={{ background: "#F3EDE3", border: "1px solid #E0D9CE", borderRadius: 6, padding: "14px 16px" }}>
                  <p style={{ fontFamily: "monospace", fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9A8F82", margin: "0 0 6px" }}>Longest streak</p>
                  <p style={{ fontFamily: "var(--font-lora)", fontSize: 28, fontWeight: 400, color: "#2E2A24", margin: 0, letterSpacing: "-0.02em" }}>
                    {streakLongest} <span style={{ fontSize: 14, color: "#6B6259" }}>week{streakLongest !== 1 ? "s" : ""}</span> {"⭐"}
                  </p>
                </div>
              </div>

              <Rule />

              {/* Feature 5: Who to message next */}
              <section style={{ marginBottom: 24 }}>
                <SectionLabel>Who to message next</SectionLabel>
                {top3ForOutreach.length === 0 ? (
                  <p style={{ fontSize: 12, color: "#9A8F82", fontStyle: "italic" }}>Everyone is up to date!</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {top3ForOutreach.map((f, idx) => {
                      const score = getHealthScore(f);
                      const dotColor = score >= 75 ? "#6BAF85" : score >= 45 ? "#D4A855" : "#C46060";
                      const daysSince = Math.min(getDaysAgo(f.lastTexted), getDaysAgo(f.lastHungOut));
                      const reason = reachOutReasons[f.name];
                      return (
                        <div key={f.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 12, padding: "12px 14px", background: "#F3EDE3", border: "1px solid #E0D9CE", borderRadius: 6, alignItems: "center" }}>
                          <div style={{ position: "relative" }}>
                            <Avatar friend={f} size={36} />
                            <span style={{ position: "absolute", top: -2, right: -2, width: 10, height: 10, borderRadius: 999, background: dotColor, border: "2px solid #F3EDE3" }} />
                            {idx === 0 && (
                              <span style={{ position: "absolute", bottom: -2, left: "50%", transform: "translateX(-50%)", fontSize: 8, fontFamily: "monospace", background: "#A68B50", color: "#fff", padding: "1px 4px", borderRadius: 999, whiteSpace: "nowrap" }}>
                                #1
                              </span>
                            )}
                          </div>
                          <div>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
                              <span style={{ fontSize: 13.5, fontWeight: 500, color: "#2E2A24" }}>{f.name}</span>
                              <span style={{ fontSize: 11, color: "#9A8F82" }}>
                                {daysSince === Infinity ? "never contacted" : `${daysSince}d ago`}
                              </span>
                            </div>
                            {reachOutLoading ? (
                              <div style={{ height: 12, width: "70%", background: "#E8E1D6", borderRadius: 4 }} />
                            ) : reason ? (
                              <p style={{ fontSize: 12, color: "#6B6259", margin: 0, lineHeight: 1.5 }}>{reason}</p>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <Rule />

              {/* AI overview */}
              {(aiSummaryLoading || aiSummary) && (
                <section style={{ marginBottom: 20 }}>
                  <AiCard label="AI overview" loading={aiSummaryLoading} loadingText="Reading your circle...">
                    <ul style={{ margin: 0, padding: "0 0 0 14px", display: "flex", flexDirection: "column", gap: 4 }}>
                      {(aiSummary ?? "").split("\n").filter((l) => l.trim()).map((line, i) => (
                        <li key={i} style={{ fontSize: 12.5, color: "#6B5E40", lineHeight: 1.5 }}>{line.replace(/^[-*]\s*/, "")}</li>
                      ))}
                    </ul>
                  </AiCard>
                </section>
              )}

              {/* Feature 4: Conversation starter of the week */}
              {(convoLoading || convoFriend) && (
                <section style={{ marginBottom: 20 }}>
                  <AiCard label={`💬 Conversation starter of the week`} loading={convoLoading} loadingText="Finding the right opener...">
                    {convoFriend && (
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                          <Avatar friend={convoFriend} size={26} />
                          <span style={{ fontSize: 12.5, fontWeight: 500, color: "#2E2A24" }}>{convoFriend.name}</span>
                        </div>
                        {convoStarter && (
                          <p style={{ fontSize: 13, color: "#6B5E40", margin: "0 0 10px", lineHeight: 1.6, fontStyle: "italic" }}>
                            &ldquo;{convoStarter}&rdquo;
                          </p>
                        )}
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => convoStarter && copyToClipboard(convoStarter)}
                            disabled={!convoStarter}
                            style={{ fontSize: 11, padding: "4px 10px", borderRadius: 999, border: "1px solid rgba(166,139,80,0.4)", background: "transparent", color: "#A68B50", cursor: "pointer" }}
                          >
                            {copied ? "Copied!" : `Message ${convoFriend.name}`}
                          </button>
                          <button
                            onClick={handleSuggestAnother}
                            style={{ fontSize: 11, padding: "4px 10px", borderRadius: 999, border: "1px solid #E0D9CE", background: "transparent", color: "#9A8F82", cursor: "pointer" }}
                          >
                            Suggest another
                          </button>
                        </div>
                      </div>
                    )}
                  </AiCard>
                </section>
              )}

              {/* Feature 3: Monthly report */}
              {(monthlyLoading || monthlyReport) && (
                <section style={{ marginBottom: 0 }}>
                  <AiCard label={`${monthName} report`} loading={monthlyLoading} loadingText="Reflecting on your month...">
                    {monthlyReport && (
                      <div>
                        <p style={{ fontSize: 13, color: "#6B5E40", margin: "0 0 10px", lineHeight: 1.65 }}>{monthlyReport}</p>
                        <button
                          onClick={handleRegenerateMonthly}
                          style={{ fontSize: 11, padding: "3px 9px", borderRadius: 999, border: "1px solid rgba(166,139,80,0.3)", background: "transparent", color: "#A68B50", cursor: "pointer" }}
                        >
                          Regenerate
                        </button>
                      </div>
                    )}
                  </AiCard>
                </section>
              )}

              <Rule />

              {/* Circle health */}
              <section style={{ marginBottom: 0 }}>
                <SectionLabel>Circle health</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ height: 10, display: "flex", gap: 2, background: "rgba(224,217,206,0.5)", borderRadius: 999, overflow: "hidden" }}>
                    {healthy.length > 0 && <div style={{ flex: healthy.length, background: "#6BAF85" }} />}
                    {needsAttention.length > 0 && <div style={{ flex: needsAttention.length, background: "#D4A855" }} />}
                    {overdue.length > 0 && <div style={{ flex: overdue.length, background: "#C46060" }} />}
                  </div>
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                    {[
                      { label: "Healthy", count: healthy.length, dotColor: "#6BAF85" },
                      { label: "Attention", count: needsAttention.length, dotColor: "#D4A855" },
                      { label: "Overdue", count: overdue.length, dotColor: "#C46060" },
                    ].map(({ label, count, dotColor }) => (
                      <div key={label} style={{ display: "inline-flex", alignItems: "baseline", gap: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: 999, background: dotColor, alignSelf: "center", flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: "#2E2A24" }}>{label}</span>
                        <span style={{ fontFamily: "var(--font-lora)", fontSize: 17, lineHeight: 1, letterSpacing: "-0.01em", color: "#2E2A24", fontWeight: 500, marginLeft: 2 }}>{count}</span>
                        <span style={{ fontSize: 10.5, color: "#9A8F82", fontFamily: "monospace", letterSpacing: "0.04em" }}>{pct(count)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <Rule />

              {/* 2-column: Needs love + Recent moments */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60 }}>
                <section>
                  <SectionLabel>Needs a little love</SectionLabel>
                  {overdueByUrgency.length === 0 ? (
                    <p style={{ fontSize: 12, color: "#9A8F82", fontStyle: "italic" }}>Everyone&apos;s doing great!</p>
                  ) : (
                    <ul style={{ listStyle: "none", padding: 0, margin: "0 0 10px" }}>
                      {overdueByUrgency.slice(0, 4).map((f) => {
                        const st = getHealthScore(f) >= 75 ? "healthy" : getHealthScore(f) >= 45 ? "attention" : "overdue";
                        const chipColors = st === "healthy" ? { color: "#6BAF85", borderColor: "rgba(107,175,133,0.35)" } : st === "attention" ? { color: "#D4A855", borderColor: "rgba(212,168,85,0.4)" } : { color: "#C46060", borderColor: "rgba(196,96,96,0.4)" };
                        const lastDays = Math.min(getDaysAgo(f.lastTexted), getDaysAgo(f.lastHungOut));
                        return (
                          <li key={f.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 10, padding: "8px 4px", borderBottom: "1px dashed #E0D9CE", borderRadius: 3 }}>
                            <Avatar friend={f} size={28} />
                            <span style={{ display: "flex", flexDirection: "column", gap: 0, minWidth: 0 }}>
                              <span style={{ fontSize: 13, fontWeight: 500, color: "#2E2A24", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                              <span style={{ fontSize: 11, color: "#9A8F82" }}>{f.category} · last {lastDays === Infinity ? "never" : `${lastDays}d ago`}</span>
                            </span>
                            <span style={{ fontFamily: "monospace", fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 7px", borderRadius: 999, border: "1px solid", background: "transparent", whiteSpace: "nowrap", ...chipColors }}>{st}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>

                <section>
                  <SectionLabel>Recent moments</SectionLabel>
                  {recentMoments.length === 0 ? (
                    <p style={{ color: "#9A8F82", fontStyle: "italic", fontSize: 12, padding: "10px 4px" }}>No moments logged yet.</p>
                  ) : (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {recentMoments.slice(0, 4).map(({ friend: f, interaction: a }) => (
                        <li key={a.id} style={{ display: "grid", gridTemplateColumns: "54px 1fr", padding: "8px 4px", borderBottom: "1px dashed #E0D9CE", gap: 8, alignItems: "baseline", borderRadius: 3 }}>
                          <span style={{ fontFamily: "monospace", fontSize: 9.5, letterSpacing: "0.06em", color: "#9A8F82", textTransform: "uppercase", paddingTop: 2 }}>
                            {formatLastInteraction(a.date).replace(" days ago", "d").replace(" day ago", "d")}
                          </span>
                          <span style={{ display: "flex", flexDirection: "column", gap: 1, fontSize: 12.5 }}>
                            <span style={{ color: "#A68B50", fontWeight: 500 }}>{a.type === "text" ? "Texted" : "Hung out"}</span>
                            <span style={{ color: "#2E2A24", fontWeight: 500 }}>{f.name}</span>
                            {a.notes && <span style={{ fontSize: 11.5, color: "#9A8F82", fontStyle: "italic", marginTop: 2 }}>{a.notes}</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              <Rule />

              {/* Feature 1: Heatmap */}
              <section>
                <SectionLabel>Interaction frequency</SectionLabel>
                <InteractionHeatmap friends={friends} />
              </section>

              <Rule />

              {/* By category */}
              <section>
                <SectionLabel>By category</SectionLabel>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {byCategory.map(({ cat, count }) => (
                    <li key={cat} style={{ display: "grid", gridTemplateColumns: "110px 1fr 26px", alignItems: "center", gap: 12, padding: "6px 0" }}>
                      <span style={{ fontSize: 12.5, color: "#2E2A24", textTransform: "capitalize" }}>{cat}</span>
                      <span style={{ height: 3, background: "rgba(224,217,206,0.6)", borderRadius: 999, position: "relative", overflow: "hidden", display: "block" }}>
                        <span style={{ position: "absolute", inset: "0 auto 0 0", background: "#A68B50", borderRadius: 999, width: (count / total) * 100 + "%" }} />
                      </span>
                      <span style={{ fontFamily: "monospace", fontSize: 10.5, color: "#9A8F82", textAlign: "right" }}>{count}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {recentlyActive.length > 0 && (
                <>
                  <Rule />
                  <section>
                    <SectionLabel>Active this week</SectionLabel>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {recentlyActive.map((f) => {
                        const days = Math.min(getDaysAgo(f.lastTexted), getDaysAgo(f.lastHungOut));
                        return (
                          <li key={f.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 10, padding: "8px 4px", borderBottom: "1px dashed #E0D9CE" }}>
                            <Avatar friend={f} size={26} />
                            <span style={{ fontSize: 13, fontWeight: 500, color: "#2E2A24" }}>{f.name}</span>
                            <span style={{ fontFamily: "monospace", fontSize: 10.5, color: "#6BAF85", letterSpacing: "0.04em" }}>{days === 0 ? "Today" : `${days}d ago`}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                </>
              )}

              {neverContacted.length > 0 && (
                <>
                  <Rule />
                  <section>
                    <SectionLabel>Not yet reached out</SectionLabel>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {neverContacted.map((f) => (
                        <li key={f.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 10, padding: "8px 4px", borderBottom: "1px dashed #E0D9CE" }}>
                          <span style={{ width: 26, height: 26, borderRadius: 999, background: "#E0D9CE", color: "#9A8F82", fontFamily: "var(--font-lora)", fontSize: 11, display: "grid", placeItems: "center" }}>{f.name[0]}</span>
                          <span style={{ fontSize: 13, fontWeight: 500, color: "#2E2A24" }}>{f.name}</span>
                          <span style={{ fontFamily: "monospace", fontSize: 10.5, color: "#9A8F82", letterSpacing: "0.04em" }}>Never contacted</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

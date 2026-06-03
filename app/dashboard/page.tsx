"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Friend, Interaction } from "@/types/friend";
import { getFriends } from "@/lib/storage";
import AppNav from "@/components/AppNav";
import { FriendAvatar } from "@/components/Avatar";
import { AreaChart, Area, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDaysAgo(date?: string): number {
  if (!date) return Infinity;
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

function lastTextedDays(f: Friend): number { return getDaysAgo(f.lastTexted); }
function lastHungDays(f: Friend): number { return getDaysAgo(f.lastHungOut); }

function statusFor(f: Friend): "healthy" | "attention" | "overdue" {
  const td = lastTextedDays(f);
  const hd = lastHungDays(f);
  const tRatio = td === Infinity ? 2 : td / f.textFrequencyDays;
  const hRatio = hd === Infinity ? 2 : hd / f.hangoutFrequencyDays;
  const worst = Math.max(tRatio, hRatio);
  if (worst >= 1.2) return "overdue";
  if (worst >= 0.85) return "attention";
  return "healthy";
}

function daysAgoLabel(d: number): string {
  if (d === Infinity) return "never";
  if (d <= 0) return "today";
  if (d < 7) return d + "d ago";
  if (d < 30) return Math.round(d / 7) + "w ago";
  if (d < 365) return Math.round(d / 30) + "mo ago";
  return Math.round(d / 365) + "y ago";
}

function initialsOf(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("");
}

function kindWord(k: string): string {
  if (k === "hangout") return "Hung out";
  if (k === "text") return "Texted";
  return "Noted";
}

function catColor(cat: string): string {
  switch (cat.toLowerCase()) {
    case "close friend": return "#A68B50";
    case "family": return "#7B9E70";
    case "coworker": return "#9A8B75";
    case "classmate": return "#8A9BA8";
    default: return "#B0A89E";
  }
}

function formatToday(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toUpperCase();
}

function timeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}


// ─── Heatmap ─────────────────────────────────────────────────────────────────

type HeatCell = { date: Date; count: number; level: number; moments: Array<{ friend: Friend; interaction: Interaction }> };
type HeatWeek = HeatCell[];

function buildHeatmap(friends: Friend[]): HeatWeek[] {
  const WEEKS = 26;
  const DAYS = 7;
  const grid: HeatCell[][] = Array.from({ length: WEEKS }, () =>
    Array.from({ length: DAYS }, () => ({ date: new Date(), count: 0, level: 0, moments: [] }))
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastSunday = new Date(today);
  lastSunday.setDate(today.getDate() - today.getDay());

  // Place real interactions on their actual dates
  friends.forEach((f) => {
    (f.interactions ?? []).forEach((i) => {
      const d = new Date(i.date);
      d.setHours(0, 0, 0, 0);
      const diffDays = Math.round((lastSunday.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      const wBack = Math.floor(diffDays / 7);
      const dayOfWeek = d.getDay();
      const wi = WEEKS - 1 - wBack;
      if (wi < 0 || wi >= WEEKS) return;
      grid[wi][dayOfWeek].moments.push({ friend: f, interaction: i });
      grid[wi][dayOfWeek].count++;
    });
  });

  return grid.map((week, wi) =>
    week.map((cell, di) => {
      const date = new Date(lastSunday);
      date.setDate(lastSunday.getDate() - (WEEKS - 1 - wi) * 7 + di);
      let level = 0;
      if (cell.count === 1) level = 1;
      else if (cell.count === 2) level = 2;
      else if (cell.count === 3) level = 3;
      else if (cell.count >= 4) level = 4;
      return { ...cell, level, date };
    })
  );
}

function computeStreaks(weeks: HeatWeek[]): { current: number; longest: number } {
  const active = weeks.map((w) => w.some((c) => c.count > 0));
  let longest = 0, run = 0;
  for (const a of active) {
    if (a) { run++; longest = Math.max(longest, run); }
    else run = 0;
  }
  let current = 0;
  for (let i = active.length - 1; i >= 0; i--) {
    if (active[i]) current++; else break;
  }
  return { current, longest };
}

function monthLabels(weekCount: number): Array<{ label: string; start: number; span: number }> {
  const today = new Date();
  const startOfLast = new Date(today);
  startOfLast.setDate(today.getDate() - (weekCount - 1) * 7);
  const result: Array<{ label: string; start: number; span: number }> = [];
  let prevMonth = -1;
  for (let i = 0; i < weekCount; i++) {
    const d = new Date(startOfLast);
    d.setDate(startOfLast.getDate() + i * 7);
    const m = d.getMonth();
    if (m !== prevMonth) {
      result.push({ label: d.toLocaleString("en-US", { month: "short" }), start: i, span: 1 });
      prevMonth = m;
    } else {
      result[result.length - 1].span++;
    }
  }
  return result.filter((m) => m.span >= 2);
}

// ─── Heatmap component ───────────────────────────────────────────────────────

function Heatmap({ weeks, onCellClick }: { weeks: HeatWeek[]; onCellClick: (cell: HeatCell) => void }) {
  const labels = monthLabels(weeks.length);
  const dayLabels = ["", "Mon", "", "Wed", "", "Fri", ""];

  return (
    <div className="heatmap-wrap" aria-hidden="true">
      <div className="hm-months">
        <span />
        {labels.map((m, i) => (
          <span
            key={i}
            className="hm-month"
            style={{ gridColumn: `${m.start + 2} / span ${m.span}`, fontSize: 9.5, fontFamily: "var(--mono)", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--hint)", alignSelf: "center" }}
          >{m.label}</span>
        ))}
      </div>
      <div className="hm-grid">
        <div className="hm-days">
          {dayLabels.map((d, i) => <span key={i} className="hm-day">{d}</span>)}
        </div>
        <div className="heatmap">
          {weeks.map((week, wi) => (
            <div className="hm-week" key={wi}>
              {week.map((cell, di) => {
                const dateLabel = cell.date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                const title = cell.count === 0 ? `${dateLabel} — no moments` : `${dateLabel} — ${cell.count} moment${cell.count === 1 ? "" : "s"}`;
                return (
                  <button
                    key={di}
                    type="button"
                    className={`hm-cell hm-l${cell.level}${cell.count > 0 ? " hm-has" : ""}`}
                    onClick={() => cell.count > 0 && onCellClick(cell)}
                    title={title}
                    aria-label={title}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── HealthPopover ────────────────────────────────────────────────────────────

function HealthPopover({
  group,
  friends,
  onClose,
  onOpenFriend,
  onMouseEnter,
  onMouseLeave,
}: {
  group: "healthy" | "attention" | "overdue";
  friends: Friend[];
  onClose: () => void;
  onOpenFriend: (id: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current) return;
      if (ref.current.contains(e.target as Node)) return;
      const t = (e.target as Element).closest?.(".health-leg-btn, .health-seg");
      if (t) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const title = group === "healthy" ? "In rhythm" : group === "attention" ? "Due soon" : "Overdue";
  const subtitle =
    group === "healthy" ? "Friends you're seeing on cadence."
    : group === "attention" ? "About time for a check-in."
    : "Past your usual rhythm — worth reaching out.";

  return (
    <div
      ref={ref}
      className={`health-pop health-pop-${group}`}
      role="dialog"
      aria-label={title}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <span className="health-pop-tail" aria-hidden="true" />
      <header className="health-pop-head">
        <span className="health-pop-title">
          <span className={`dot dot-${group}`} /> {title}
          <span className="health-pop-count">{friends.length}</span>
        </span>
        <button className="health-pop-x" onClick={onClose} aria-label="Close">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </header>
      <p className="health-pop-sub">{subtitle}</p>
      {friends.length === 0 ? (
        <p className="health-pop-empty">None right now.</p>
      ) : (
        <ul className="health-pop-list">
          {friends.map((f) => {
            const td = lastTextedDays(f);
            const hd = lastHungDays(f);
            const dayLabel =
              group === "overdue"
                ? `${Math.max(td === Infinity ? 0 : td - f.textFrequencyDays, hd === Infinity ? 0 : hd - f.hangoutFrequencyDays)}d over`
                : group === "attention"
                ? `due ~${Math.max(0, f.textFrequencyDays - (td === Infinity ? 0 : td))}d`
                : "on cadence";
            return (
              <li key={f.id}>
                <button className="health-pop-item" onClick={() => onOpenFriend(f.id)}>
                  <FriendAvatar friend={f} size="sm" />
                  <span className="health-pop-name">{f.name}</span>
                  <span className={`health-pop-status fp-status-${group}`}>{dayLabel}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── Monthly Report Modal ────────────────────────────────────────────────────

type ReportData = {
  monthLabel: string;
  monthShort: string;
  headline: string;
  totalMoments: number;
  texts: number;
  hangs: number;
  uniqueFriends: number;
  topTwo: Array<{ f: Friend; n: number }>;
  priorityText: string;
  slipped: Array<{ f: Friend; weeks: number }>;
  slippedText: string;
  drifting: Array<{ f: Friend; ratio: number }>;
  opener: string;
  suggestion: { target: Friend; text: string } | null;
  insight: { dayName: string; topFriend: Friend | null };
};

function buildMonthReport(friends: Friend[]): ReportData {
  const now = new Date();
  const currentMonthName = now.toLocaleString("en-US", { month: "long" });

  // Previous month boundaries
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59); // last moment of prev month
  const monthLabel = prev.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const monthShort = monthLabel.split(" ")[0];
  const monthKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;

  // Count interactions that happened in the previous month only
  let texts = 0, hangs = 0;
  const byFriend = new Map<string, number>();
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];

  friends.forEach((f) => {
    (f.interactions ?? []).forEach((i) => {
      if (!i.date.startsWith(monthKey)) return;
      if (i.type === "hangout") hangs++;
      else if (i.type === "text") texts++;
      byFriend.set(f.id, (byFriend.get(f.id) ?? 0) + 1);
      dayCounts[new Date(i.date).getDay()]++;
    });
  });

  const totalMoments = texts + hangs;
  const uniqueFriends = byFriend.size;

  // Top friends ranked by last month's interaction count
  const topThree = [...byFriend.entries()]
    .map(([id, n]) => ({ f: friends.find((x) => x.id === id)!, n }))
    .filter((x) => x.f)
    .sort((a, b) => b.n - a.n)
    .slice(0, 3);

  const topTwo = topThree.slice(0, 2);

  // "Slipped through" = friends with zero interactions last month.
  // Weeks count is from their last contact date as of the end of last month.
  const slipped = friends
    .filter((f) => !byFriend.has(f.id))
    .map((f) => {
      const lastBefore = (f.interactions ?? [])
        .filter((i) => new Date(i.date) <= prevEnd)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      const days = lastBefore
        ? Math.floor((prevEnd.getTime() - new Date(lastBefore.date).getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      return { f, days, weeks: Math.max(1, Math.round(days / 7)) };
    })
    .sort((a, b) => b.days - a.days)
    .slice(0, 2);

  // "Drifting" = currently overdue (used for this month's suggestion)
  const drifting = friends
    .map((f) => {
      const td = lastTextedDays(f);
      const hd = lastHungDays(f);
      const tR = td === Infinity ? 2 : td / f.textFrequencyDays;
      const hR = hd === Infinity ? 2 : hd / f.hangoutFrequencyDays;
      return { f, ratio: Math.max(tR, hR) };
    })
    .filter((x) => x.ratio > 1)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 3);

  // Peak day of the week — last month only
  const peakDay = totalMoments > 0 ? dayCounts.indexOf(Math.max(...dayCounts)) : -1;
  const dayName = peakDay >= 0
    ? ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"][peakDay]
    : "weekdays";

  // Top friend = most interactions last month
  const topFriend = topThree[0]?.f ?? null;

  const opener =
    totalMoments >= 14
      ? `${monthShort} was a solid month. ${totalMoments} interactions across ${uniqueFriends} friends, ${hangs} of them in person.`
      : totalMoments >= 6
      ? `${monthShort} was decent. ${totalMoments} interactions with ${uniqueFriends} friends. Not your busiest but you kept things moving.`
      : totalMoments > 0
      ? `${monthShort} was pretty quiet. Only ${totalMoments} interaction${totalMoments === 1 ? "" : "s"} logged. Easy to pick back up in ${currentMonthName}.`
      : `Nothing logged in ${monthShort}. ${currentMonthName} is a good time to start fresh.`;

  const priorityText =
    topTwo.length >= 2
      ? `You put the most into ${topTwo[0].f.name.split(" ")[0]} and ${topTwo[1].f.name.split(" ")[0]}. Together that was ${topTwo[0].n + topTwo[1].n} out of ${totalMoments} interactions.`
      : topTwo.length === 1
      ? `${topTwo[0].f.name.split(" ")[0]} got most of your energy. ${topTwo[0].n} out of ${totalMoments} interactions.`
      : "No standout last month. You spread your attention pretty evenly.";

  const slippedText =
    slipped.length >= 2
      ? `${slipped[0].f.name.split(" ")[0]} and ${slipped[1].f.name.split(" ")[0]} got no contact in ${monthShort}. ${slipped[0].f.name.split(" ")[0]} was ${slipped[0].weeks} week${slipped[0].weeks === 1 ? "" : "s"} out by end of month.`
      : slipped.length === 1
      ? `${slipped[0].f.name.split(" ")[0]} got no contact in ${monthShort}. It had been ${slipped[0].weeks} week${slipped[0].weeks === 1 ? "" : "s"} by the end of the month.`
      : `Everyone got at least some contact in ${monthShort}.`;

  // Suggestion: prioritize most overdue friend for this month
  const sgTarget = drifting[0]?.f ?? slipped[0]?.f ?? null;
  const suggestion = sgTarget
    ? { target: sgTarget, text: `Reach out to ${sgTarget.name.split(" ")[0]} in ${currentMonthName}. A quick message is enough.` }
    : null;

  return {
    monthLabel, monthShort, headline: `${monthShort} looked like this.`,
    totalMoments, texts, hangs, uniqueFriends,
    topTwo, priorityText, slipped, slippedText, drifting,
    opener, suggestion,
    insight: { dayName, topFriend },
  };
}

function MonthReportContent({
  report,
  friends,
  aiReport,
  onOpenFriend,
}: {
  report: ReportData;
  friends: Friend[];
  aiReport: string | null;
  onOpenFriend: (id: string) => void;
}) {
  const nextMonthName = new Date().toLocaleString("en-US", { month: "long" });

  return (
    <div className="report-doc">
      <header className="report-doc-head">
        <div className="report-doc-eyebrow">
          <span>monthly report</span>
        </div>
        <h2 className="report-doc-title">{report.monthLabel}</h2>
        <p className="report-doc-sub">{report.headline}</p>
      </header>

      <div className="report-stats">
        {[
          { num: report.totalMoments, lbl: "Interactions" },
          { num: report.uniqueFriends, lbl: "Friends" },
          { num: report.texts, lbl: "Texts" },
          { num: report.hangs, lbl: "Hangouts" },
        ].map(({ num, lbl }) => (
          <div className="report-stat" key={lbl}>
            <span className="report-stat-num">{num}</span>
            <span className="report-stat-lbl">{lbl}</span>
          </div>
        ))}
      </div>

      {/* 01 — Snapshot */}
      <section className="rd-section">
        <div className="rd-num">01</div>
        <h3 className="rd-h">This month</h3>
        <p className="rd-p rd-p-large">{aiReport ?? report.opener}</p>
      </section>

      {/* 02 — Who you prioritized */}
      {report.topTwo.length > 0 && (
        <section className="rd-section">
          <div className="rd-num">02</div>
          <h3 className="rd-h">Who you prioritized</h3>
          <p className="rd-p">{report.priorityText}</p>
          <ul className="rd-friends" style={{ marginTop: 10 }}>
            {report.topTwo.map(({ f, n }, i) => (
              <li key={f.id}>
                <button className="rd-friend" onClick={() => onOpenFriend(f.id)}>
                  <span className="rd-friend-rank">{i + 1}</span>
                  <FriendAvatar friend={f} size="sm" />
                  <span className="rd-friend-main">
                    <span className="rd-friend-name">{f.name}</span>
                    <span className="rd-friend-sub">{n} interaction{n === 1 ? "" : "s"} · {f.category}</span>
                  </span>
                  <span className="rd-friend-arr">→</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 03 — Who slipped */}
      {report.slipped.length > 0 && (
        <section className="rd-section">
          <div className="rd-num">03</div>
          <h3 className="rd-h">Who slipped through</h3>
          <p className="rd-p">{report.slippedText}</p>
          <ul className="rd-friends" style={{ marginTop: 10 }}>
            {report.slipped.map(({ f, weeks }) => (
              <li key={f.id}>
                <button className="rd-friend" onClick={() => onOpenFriend(f.id)}>
                  <span className="rd-friend-rank rd-friend-rank-warn">!</span>
                  <FriendAvatar friend={f} size="sm" />
                  <span className="rd-friend-main">
                    <span className="rd-friend-name">{f.name}</span>
                    <span className="rd-friend-sub">{weeks} week{weeks === 1 ? "" : "s"} since last contact</span>
                  </span>
                  <span className="rd-friend-arr">→</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 04 — Pattern */}
      <section className="rd-section">
        <div className="rd-num">04</div>
        <h3 className="rd-h">Pattern noticed</h3>
        <p className="rd-p">
          You tend to reach out on <strong>{report.insight.dayName}</strong>.{" "}
          {report.hangs >= report.texts
            ? "You showed up in person about as much as over text. That's rare."
            : `Texts outpaced hangouts ${report.texts} to ${report.hangs}. The connection is there, it just lives mostly over text.`}
        </p>
      </section>

      {/* 05 — Suggestion */}
      {report.suggestion && (
        <section className="rd-section rd-section-suggest">
          <div className="rd-num">05</div>
          <h3 className="rd-h">For {nextMonthName}</h3>
          <p className="rd-p rd-p-large">{report.suggestion.text}</p>
          <button className="rd-cta" onClick={() => onOpenFriend(report.suggestion!.target.id)}>
            Open {report.suggestion.target.name.split(" ")[0]}&apos;s page <span className="arr">→</span>
          </button>
        </section>
      )}

      <footer className="report-doc-foot">
        <span className="report-doc-foot-mark">friendkeeper</span>
        <span className="report-doc-foot-meta">Generated {formatToday()}</span>
      </footer>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({
  open,
  title,
  onClose,
  children,
  size,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="modal-scrim" onClick={onClose}>
      <div className={`modal${size === "lg" ? " modal-lg" : ""}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="modal-head">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-x" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { isLoaded, isSignedIn, user } = useUser();
  const firstName = user?.firstName ?? "there";
  const router = useRouter();

  const [isGuest, setIsGuest] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [ready, setReady] = useState(false);

  const [monthlyReport, setMonthlyReport] = useState<string | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<HeatCell | null>(null);
  const [healthGroup, setHealthGroup] = useState<"healthy" | "attention" | "overdue" | null>(null);
  const [openCat, setOpenCat] = useState<string | null>(null);

  const healthHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showHealth = (g: "healthy" | "attention" | "overdue") => {
    if (healthHideTimer.current) clearTimeout(healthHideTimer.current);
    setHealthGroup(g);
  };
  const cancelHealthHide = () => { if (healthHideTimer.current) clearTimeout(healthHideTimer.current); };
  const scheduleHealthHide = () => {
    if (healthHideTimer.current) clearTimeout(healthHideTimer.current);
    healthHideTimer.current = setTimeout(() => setHealthGroup(null), 120);
  };

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

  useEffect(() => {
    if (!ready || !userId || friends.length === 0 || fetchedRef.current) return;
    fetchedRef.current = true;

    // Monthly report (previous month)
    const prevMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
    const monthKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
    const cacheKey = `friendkeeper-monthly-report-v2-${monthKey}-${userId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      setMonthlyReport(cached);
    } else {
      const monthName = prevMonth.toLocaleString("en-US", { month: "long" });
      const mFriends = friends.map((f) => ({
        name: f.name,
        interactions: (f.interactions ?? []).filter((i) => i.date.startsWith(monthKey)),
      })).filter((f) => f.interactions.length > 0);
      if (mFriends.length > 0) {
        setMonthlyLoading(true);
        fetch("/api/ai/monthly", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ friends: mFriends, monthName }) })
          .then((r) => r.json())
          .then((d: { report: string | null }) => {
            if (d.report) { setMonthlyReport(d.report); localStorage.setItem(cacheKey, d.report); }
          })
          .catch(() => {})
          .finally(() => setMonthlyLoading(false));
      }
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, userId]);

  function getTop3ForOutreach(fs: Friend[]): Friend[] {
    return [...fs]
      .map((f) => {
        const td = lastTextedDays(f);
        const hd = lastHungDays(f);
        const tR = td === Infinity ? 2 : td / f.textFrequencyDays;
        const hR = hd === Infinity ? 2 : hd / f.hangoutFrequencyDays;
        return { f, ratio: Math.max(tR, hR) };
      })
      .filter(({ ratio }) => ratio >= 0.7)
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 3)
      .map(({ f }) => f);
  }

  function exitGuestMode() {
    localStorage.removeItem("friendkeeper-guest");
    router.push("/sign-in");
  }

  function goToFriend(id: string) {
    sessionStorage.setItem("friendkeeper-selected-friend", id);
    router.push("/");
  }

  // ── Computed data (all hooks must be before any conditional return) ────────
  const buckets = useMemo(() => {
    const out: Record<string, Friend[]> = { healthy: [], attention: [], overdue: [] };
    friends.forEach((f) => out[statusFor(f)].push(f));
    return out;
  }, [friends]);

  const heatmap = useMemo(() => buildHeatmap(friends), [friends]);
  const streaks = useMemo(() => computeStreaks(heatmap), [heatmap]);
  const report = useMemo(() => buildMonthReport(friends), [friends]);

  const reachOut = useMemo(() => {
    return [...friends]
      .map((f) => {
        const td = lastTextedDays(f);
        const hd = lastHungDays(f);
        const tR = td === Infinity ? 2 : td / f.textFrequencyDays;
        const hR = hd === Infinity ? 2 : hd / f.hangoutFrequencyDays;
        const worst = Math.max(tR, hR);
        const dim = tR >= hR ? "text" : "hangout";
        return { f, ratio: worst, dim };
      })
      .filter(({ ratio }) => ratio >= 0.7)
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 3)
      .map(({ f, dim }) => {
        const days = dim === "text"
          ? (lastTextedDays(f) === Infinity ? "∞" : String(lastTextedDays(f)))
          : (lastHungDays(f) === Infinity ? "∞" : String(lastHungDays(f)));
        return { f, dim, days };
      });
  }, [friends]);

  const recent = useMemo((): Array<{ friend: Friend; interaction: Interaction; key: string }> => {
    const items: Array<{ friend: Friend; interaction: Interaction; key: string }> = [];
    friends.forEach((f) => (f.interactions ?? []).forEach((i, idx) => items.push({ friend: f, interaction: i, key: f.id + idx })));
    return items.sort((a, b) => b.interaction.date.localeCompare(a.interaction.date)).slice(0, 5);
  }, [friends]);

  const categories = useMemo(() => {
    const order = ["close friend", "family", "coworker", "classmate", "other"];
    const m: Record<string, number> = {};
    friends.forEach((f) => { m[f.category] = (m[f.category] ?? 0) + 1; });
    return order.filter((k) => m[k]).map((k) => [k, m[k]] as [string, number]);
  }, [friends]);

  const insight = report.insight;
  const total = friends.length;

  if (!ready) return <div style={{ height: "100%", background: "var(--bg)" }} />;

  if (total === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg)", position: "relative", zIndex: 1 }}>
        <AppNav />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1 }}>
          <div style={{ textAlign: "center", padding: "48px" }}>
            <p style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--ink)", margin: "0 0 8px" }}>No friends yet</p>
            <p style={{ fontSize: 13, color: "var(--hint)", margin: "0 0 20px" }}>Add friends on the Friends page to see your circle analytics.</p>
            <button className="btn-prim" onClick={() => router.push("/")}>Go to Friends →</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg)", position: "relative", zIndex: 1 }}>
      {isGuest && (
        <div className="guest-banner">
          <p style={{ fontSize: 11.5, color: "var(--hint)", margin: 0 }}>You&apos;re using guest mode. Sign in to keep your data.</p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <a href="/sign-in" style={{ fontSize: 11.5, color: "var(--accent)", textDecoration: "underline" }}>Sign in</a>
            <button onClick={exitGuestMode} style={{ background: "transparent", border: 0, fontSize: 11.5, color: "var(--hint)", cursor: "pointer" }}>Exit guest</button>
          </div>
        </div>
      )}

      <AppNav />

      <div className="dash-scroll" style={{ position: "relative", zIndex: 1 }}>
        <div className="dash">

          {/* ─── Top: left (hero + panel) | right (reach out) ─── */}
          <div className="dash-top">

            {/* Left column */}
            <div className="dash-left">
              <header className="dash-hero">
                <div className="dash-hero-eyebrow">{formatToday()}</div>
                <h1 className="dash-hero-title">Good {timeOfDay()}, {firstName}.</h1>
                <p className="dash-hero-sub" style={{ fontStyle: "italic" }}>
                  {(() => {
                    const overdueCount = friends.filter((f) => statusFor(f) === "overdue").length;
                    const allHealthy = friends.length > 0 && friends.every((f) => statusFor(f) === "healthy");
                    if (allHealthy) return "Your circle is in good shape.";
                    if (streaks.current > 0) return `${total} friends. ${streaks.current}-week streak going.`;
                    if (overdueCount > 0) return `${total} friends. ${overdueCount} need${overdueCount === 1 ? "s" : ""} a little love.`;
                    return `${total} friend${total !== 1 ? "s" : ""} you're keeping close.`;
                  })()}
                </p>
              </header>

              {/* Monthly report — plain text */}
              <div>
                <p style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9A8F82", margin: "16px 0 6px" }}>
                  {report.monthLabel.split(" ")[0]} report
                  {monthlyLoading && <span style={{ marginLeft: 6, opacity: 0.6 }}>…</span>}
                </p>
                <p style={{ fontFamily: "var(--serif)", fontSize: 15, fontWeight: 500, color: "#2E2A24", margin: "0 0 4px" }}>
                  Your monthly report is out.
                </p>
                <p style={{ fontFamily: "var(--sans)", fontSize: 13, fontStyle: "italic", color: "#6B6259", margin: 0, lineHeight: 1.5 }}>
                  {report.topTwo[0] ? (
                    <><strong style={{ color: "#2E2A24", fontWeight: 500, fontStyle: "normal" }}>{report.topTwo[0].f.name.split(" ")[0]}</strong> shows up most{report.drifting[0] ? <>, <strong style={{ color: "#2E2A24", fontWeight: 500, fontStyle: "normal" }}>{report.drifting[0].f.name.split(" ")[0]}</strong> may be drifting.</> : "."}</>
                  ) : (
                    `${total} friends tracked this month.`
                  )}
                </p>
                <button
                  onClick={() => setReportOpen(true)}
                  style={{ background: "transparent", border: 0, padding: 0, marginTop: 6, fontSize: 13, color: "#A68B50", cursor: "pointer", display: "block" }}
                >
                  Read full report →
                </button>
              </div>
            </div>

            {/* Right column — Reach out today */}
            <div className="dash-reach">
              <div className="section-label">Reach out today</div>
              {reachOut.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--hint)", fontStyle: "italic" }}>Everyone is up to date!</p>
              ) : (
                <ul className="reach-list">
                  {reachOut.map(({ f, dim, days }) => {
                    const st = statusFor(f);
                    const topic = f.nextTopics?.[0];
                    const nudge = topic
                      ? `Ask about ${topic.replace(/[.?!]$/, "").toLowerCase()}`
                      : dim === "hangout" ? "Plan something in person" : "Send them a message";
                    return (
                      <li key={f.id} className="reach-row">
                        <button className="reach-main" onClick={() => goToFriend(f.id)}>
                          <span className="reach-avatar" style={{ position: "relative" }}>
                            <FriendAvatar friend={f} size="reach" />
                            <span className={`reach-dot dot-${st}`} />
                          </span>
                          <span className="reach-text">
                            <span className="reach-top">
                              <span className="reach-name" style={{ whiteSpace: "nowrap" }}>{f.name}</span>
                              <span className="reach-days">{days}d</span>
                            </span>
                            <span className="reach-reason">{nudge}</span>
                          </span>
                        </button>
                        <button className="reach-action" onClick={() => goToFriend(f.id)}>
                          {dim === "text" ? "Text" : "Plan"} →
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <hr className="rule" />

          {/* ─── Heatmap + Recent moments ─── */}
          <div className="dash-two">
            <section>
              <div className="section-label">Interactions</div>
              {/* Sparkline + heatmap share one container so widths stay in sync */}
              <div>
                <p style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9A8F82", margin: "0 0 8px" }}>Weekly trend</p>
                {(() => {
                  const trendData = heatmap.slice(-12).map((week) => ({
                    week: `Week of ${week[0].date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
                    count: week.reduce((s, c) => s + c.count, 0),
                  }));
                  const SparkTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { week: string; count: number } }> }) => {
                    if (!active || !payload?.length) return null;
                    const { week, count } = payload[0].payload;
                    return (
                      <div style={{ background: "#2E2A24", color: "#FAF7F2", fontSize: 11, padding: "5px 10px", borderRadius: 4, border: "none", whiteSpace: "nowrap" }}>
                        {week} · {count} interaction{count !== 1 ? "s" : ""}
                      </div>
                    );
                  };
                  return (
                    <div style={{ height: 64, marginBottom: 36 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#A68B50" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#A68B50" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <RechartsTooltip content={<SparkTooltip />} />
                          <Area type="monotone" dataKey="count" stroke="#A68B50" strokeWidth={1.5} fill="url(#sparkGrad)" dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}
                <p style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9A8F82", margin: "0 0 8px" }}>Daily activity</p>
                <Heatmap weeks={heatmap} onCellClick={setSelectedCell} />
              </div>
              <div className="heatmap-foot">
                <span className="heatmap-foot-label">last 6 months</span>
                <span className="heatmap-scale">
                  <span>less</span>
                  <span className="heatmap-scale-cells">
                    {[0, 1, 2, 3, 4].map((l) => <span key={l} className={`hm-cell hm-l${l}`} />)}
                  </span>
                  <span>more</span>
                </span>
              </div>

              {insight.topFriend && (
                <div style={{ marginTop: 10 }}>
                  <p style={{ margin: 0, fontSize: 12, color: "#9A8F82", lineHeight: 1.5, fontStyle: "italic" }}>
                    Most active on <strong style={{ color: "#9A8F82", fontWeight: 500 }}>{insight.dayName}</strong>. <strong style={{ color: "#A68B50", fontWeight: 500 }}>{insight.topFriend.name.split(" ")[0]}</strong> shows up more than anyone.
                  </p>
                  <button
                    onClick={() => goToFriend(insight.topFriend!.id)}
                    style={{ background: "transparent", border: 0, padding: 0, marginTop: 3, fontSize: 11, color: "#A68B50", cursor: "pointer", display: "block" }}
                  >
                    See {insight.topFriend.name.split(" ")[0]}&apos;s page →
                  </button>
                </div>
              )}
            </section>

            <section>
              <div className="section-label">Recent moments</div>
              {recent.length === 0 ? (
                <p style={{ color: "var(--hint)", fontStyle: "italic", fontSize: 12 }}>No moments logged yet.</p>
              ) : (
                <ul className="moment-list">
                  {recent.map(({ friend: f, interaction: i, key }) => (
                    <li key={key} className="moment" onClick={() => goToFriend(f.id)}>
                      <span className="moment-when">{daysAgoLabel(getDaysAgo(i.date))}</span>
                      <span className="moment-body">
                        <span className="moment-line">
                          <span className="moment-who">{f.name.split(" ")[0]}</span>
                          <span className="moment-kind"> · {kindWord(i.type)}</span>
                        </span>
                        {i.notes && <span className="moment-note">{i.notes}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <hr className="rule" />

          {/* ─── Circle health + By category ─── */}
          <div className="dash-two">
            <section className="health-section">
              <div className="section-label">Circle health</div>
              <div className="health-bar-wrap" onMouseLeave={scheduleHealthHide}>
                <div className="health-bar" role="img" aria-label="Health distribution">
                  {buckets.healthy.length > 0 && (
                    <button
                      type="button"
                      className="health-seg health-seg-healthy"
                      style={{ flex: buckets.healthy.length }}
                      onMouseEnter={() => showHealth("healthy")}
                      onClick={() => setHealthGroup(healthGroup === "healthy" ? null : "healthy")}
                      title={`${buckets.healthy.length} healthy`}
                    />
                  )}
                  {buckets.attention.length > 0 && (
                    <button
                      type="button"
                      className="health-seg health-seg-attention"
                      style={{ flex: buckets.attention.length }}
                      onMouseEnter={() => showHealth("attention")}
                      onClick={() => setHealthGroup(healthGroup === "attention" ? null : "attention")}
                      title={`${buckets.attention.length} due soon`}
                    />
                  )}
                  {buckets.overdue.length > 0 && (
                    <button
                      type="button"
                      className="health-seg health-seg-overdue"
                      style={{ flex: buckets.overdue.length }}
                      onMouseEnter={() => showHealth("overdue")}
                      onClick={() => setHealthGroup(healthGroup === "overdue" ? null : "overdue")}
                      title={`${buckets.overdue.length} overdue`}
                    />
                  )}
                </div>
                {healthGroup && (
                  <HealthPopover
                    group={healthGroup}
                    friends={buckets[healthGroup]}
                    onClose={() => setHealthGroup(null)}
                    onMouseEnter={cancelHealthHide}
                    onMouseLeave={scheduleHealthHide}
                    onOpenFriend={(id) => { goToFriend(id); setHealthGroup(null); }}
                  />
                )}
              </div>
              <div className="health-legend">
                {(["healthy", "attention", "overdue"] as const).filter((g) => buckets[g].length > 0).map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={`health-leg health-leg-btn${healthGroup === g ? " is-active" : ""}`}
                    style={{ flex: buckets[g].length }}
                    onClick={() => setHealthGroup(healthGroup === g ? null : g)}
                  >
                    <span className={`dot dot-${g}`} />
                    {buckets[g].length} {g === "attention" ? "soon" : g}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="section-label">By category</div>
              <ul className="cat-list">
                {categories.map(([name, count]) => {
                  const isOpen = openCat === name;
                  const catFriends = friends.filter((f) => f.category === name);
                  return (
                    <li key={name} className={`cat-row${isOpen ? " is-open" : ""}`}>
                      <button
                        type="button"
                        className="cat-row-btn"
                        onClick={() => setOpenCat(isOpen ? null : name)}
                        aria-expanded={isOpen}
                      >
                        <span className="cat-chev" aria-hidden="true">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6"/></svg>
                        </span>
                        <span className="cat-name" style={{ textTransform: "capitalize" }}>{name}</span>
                        <span className="cat-bar">
                          <span className="cat-bar-fill" style={{ width: `${(count / total) * 100}%`, background: catColor(name) }} />
                        </span>
                        <span className="cat-count">{count}</span>
                      </button>
                      {isOpen && (
                        <div className="cat-drop">
                          <ul className="cat-drop-list">
                            {catFriends.map((f) => {
                              const st = statusFor(f);
                              const td = lastTextedDays(f);
                              const hd = lastHungDays(f);
                              return (
                                <li key={f.id}>
                                  <button className="cat-drop-item" onClick={() => goToFriend(f.id)}>
                                    <FriendAvatar friend={f} size="sm" />
                                    <span className="cat-drop-body">
                                      <span className="cat-drop-name">{f.name}</span>
                                      <span className={`cat-drop-status fp-status-${st}`}>
                                        {st === "healthy" ? "in rhythm"
                                          : st === "attention" ? `due ~${Math.max(0, f.textFrequencyDays - (td === Infinity ? 0 : td))}d`
                                          : `${Math.max(0, (td === Infinity ? 0 : td) - f.textFrequencyDays)}d overdue`}
                                      </span>
                                    </span>
                                    <span className="cat-drop-arr">→</span>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

        </div>
      </div>

      {/* ─── Day cell modal ─── */}
      <Modal
        open={!!selectedCell}
        title={selectedCell ? selectedCell.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : ""}
        onClose={() => setSelectedCell(null)}
      >
        {selectedCell && (
          <ul className="cell-moments">
            {selectedCell.moments.map((m, i) => (
              <li
                key={i}
                className="cell-moment"
                onClick={() => { goToFriend(m.friend.id); setSelectedCell(null); }}
              >
                <FriendAvatar friend={m.friend} size="sm" />
                <span className="cell-moment-body">
                  <span style={{ fontSize: 13 }}>
                    <span className="cell-moment-who">{m.friend.name}</span>
                    <span className="cell-moment-kind"> · {kindWord(m.interaction.type).toLowerCase()}</span>
                  </span>
                  {m.interaction.notes && <span className="cell-moment-note">{m.interaction.notes}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      {/* ─── Monthly report modal ─── */}
      <Modal
        open={reportOpen}
        title=""
        onClose={() => setReportOpen(false)}
        size="lg"
      >
        <MonthReportContent
          report={report}
          friends={friends}
          aiReport={monthlyReport}
          onOpenFriend={(id) => { goToFriend(id); setReportOpen(false); }}
        />
      </Modal>
    </div>
  );
}

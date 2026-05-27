"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Friend, FriendCategory, Interaction } from "@/types/friend";
import { getFriends } from "@/lib/storage";
import { formatLastInteraction } from "@/lib/date";
import AppNav from "@/components/AppNav";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getHealthLabel(score: number) {
  if (score >= 75) return "Healthy";
  if (score >= 45) return "Needs attention";
  return "Overdue";
}

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

const AVATAR_PALETTE = [
  "#7A5A3F",
  "#5E6E5A",
  "#A06A4A",
  "#604838",
  "#7C5840",
  "#4A5E7A",
  "#7A4A5E",
  "#5A5E7A",
];

function friendColor(f: Friend): string {
  if (f.color) return f.color;
  const h = f.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

const CATEGORIES: FriendCategory[] = [
  "close friend",
  "family",
  "classmate",
  "coworker",
  "other",
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-lora)",
        fontSize: 17,
        fontWeight: 500,
        letterSpacing: "-0.005em",
        color: "#2E2A24",
        marginBottom: 12,
      }}
    >
      {children}
      <span>:</span>
    </div>
  );
}

function Rule() {
  return (
    <hr style={{ height: 1, border: "none", background: "#E0D9CE", margin: "24px 0" }} />
  );
}

function EmptyState() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 400,
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-lora)",
          fontSize: 22,
          color: "#2E2A24",
          margin: "0 0 8px",
        }}
      >
        No data yet
      </p>
      <p style={{ fontSize: 13, color: "#9A8F82" }}>
        Add some friends to see your circle analytics.
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [isGuest, setIsGuest] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [ready, setReady] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    const guestMode = localStorage.getItem("friendkeeper-guest") === "1";
    if (!isSignedIn && !guestMode) {
      router.push("/sign-in");
      return;
    }
    const uid = isSignedIn ? user!.id : "guest";
    setIsGuest(!isSignedIn && guestMode);
    setFriends(getFriends(uid));
    setReady(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (!ready || friends.length === 0) return;
    const friendsData = friends.map((f) => {
      const score = getHealthScore(f);
      const textDays = getDaysAgo(f.lastTexted);
      const hangoutDays = getDaysAgo(f.lastHungOut);
      const minDays = Math.min(textDays, hangoutDays);
      const lastContact =
        minDays === Infinity ? "never" : minDays === 0 ? "today" : `${minDays} days ago`;
      return { name: f.name, category: f.category, healthLabel: getHealthLabel(score), lastContact };
    });
    setAiSummaryLoading(true);
    fetch("/api/ai/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friends: friendsData }),
    })
      .then((r) => r.json())
      .then((data: { summary: string | null }) => setAiSummary(data.summary ?? null))
      .catch(() => {})
      .finally(() => setAiSummaryLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  function exitGuestMode() {
    localStorage.removeItem("friendkeeper-guest");
    router.push("/sign-in");
  }

  if (!ready) {
    return <div style={{ height: "100%", background: "#FAF7F2" }} />;
  }

  // ── Analytics ────────────────────────────────────────────────────────────────

  const total = friends.length;
  const healthy = friends.filter((f) => getHealthScore(f) >= 75);
  const needsAttention = friends.filter((f) => {
    const s = getHealthScore(f);
    return s >= 45 && s < 75;
  });
  const overdue = friends.filter((f) => getHealthScore(f) < 45);

  const pct = (n: number) =>
    total === 0 ? "0%" : `${Math.round((n / total) * 100)}%`;

  const overdueByUrgency = [...overdue].sort(
    (a, b) => getUrgency(b) - getUrgency(a)
  );

  const recentlyActive = friends
    .filter((f) => {
      const last = Math.min(getDaysAgo(f.lastTexted), getDaysAgo(f.lastHungOut));
      return last <= 7;
    })
    .sort((a, b) => {
      const aLast = Math.min(getDaysAgo(a.lastTexted), getDaysAgo(a.lastHungOut));
      const bLast = Math.min(getDaysAgo(b.lastTexted), getDaysAgo(b.lastHungOut));
      return aLast - bLast;
    });

  const neverContacted = friends.filter(
    (f) => !f.lastTexted && !f.lastHungOut
  );

  const byCategory = CATEGORIES.map((cat) => ({
    cat,
    count: friends.filter((f) => f.category === cat).length,
  })).filter((c) => c.count > 0);

  // Recent moments: all interactions across all friends, sorted by date desc
  const recentMoments: { friend: Friend; interaction: Interaction }[] = friends
    .flatMap((f) => (f.interactions ?? []).map((i) => ({ friend: f, interaction: i })))
    .sort((a, b) => b.interaction.date.localeCompare(a.interaction.date));

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full" style={{ background: "#FAF7F2", position: "relative", zIndex: 1 }}>
      {/* Guest banner */}
      {isGuest && (
        <div
          style={{
            flexShrink: 0,
            background: "transparent",
            borderBottom: "1px solid #E0D9CE",
            padding: "6px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <p style={{ fontSize: 11.5, color: "#9A8F82", margin: 0 }}>
            You&apos;re using guest mode. Sign in to keep your data tied to your account.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <a
              href="/sign-in"
              style={{
                fontSize: 11.5,
                color: "#A68B50",
                textDecoration: "underline",
                textUnderlineOffset: 2,
              }}
            >
              Sign in
            </a>
            <button
              onClick={exitGuestMode}
              style={{
                background: "transparent",
                border: 0,
                fontSize: 11.5,
                color: "#9A8F82",
                cursor: "pointer",
              }}
            >
              Exit guest
            </button>
          </div>
        </div>
      )}

      <AppNav />

      <main style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "32px 32px 48px" }}>
          {total === 0 ? (
            <EmptyState />
          ) : (
            <>
              {/* Hero */}
              <header style={{ marginBottom: 18 }}>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: 9.5,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "#6B6259",
                    marginBottom: 8,
                  }}
                >
                  {new Date()
                    .toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })
                    .toUpperCase()}
                </div>
                <h1
                  style={{
                    fontFamily: "var(--font-lora)",
                    fontWeight: 400,
                    fontSize: 36,
                    letterSpacing: "-0.02em",
                    margin: "0 0 10px",
                    color: "#2E2A24",
                    lineHeight: 1.05,
                  }}
                >
                  Your circle.
                </h1>
                <p style={{ fontSize: 13.5, color: "#6B6259", margin: 0, lineHeight: 1.55 }}>
                  <strong style={{ color: "#2E2A24", fontWeight: 500 }}>{total}</strong>{" "}
                  friend{total !== 1 ? "s" : ""} across{" "}
                  <strong style={{ color: "#2E2A24", fontWeight: 500 }}>
                    {byCategory.length}
                  </strong>{" "}
                  categor{byCategory.length !== 1 ? "ies" : "y"}.
                </p>
              </header>

              <Rule />

              {/* AI summary */}
              {(aiSummaryLoading || aiSummary) && (
                <section style={{ marginBottom: 24 }}>
                  <div
                    style={{
                      borderRadius: 6,
                      padding: "14px 16px",
                      background: "#F0EBE0",
                      border: "1px solid #D9C9A8",
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "monospace",
                        fontSize: 9.5,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "#A68B50",
                        margin: "0 0 8px",
                      }}
                    >
                      AI overview
                    </p>
                    {aiSummaryLoading ? (
                      <p style={{ fontSize: 12, color: "#B0A070", margin: 0, fontStyle: "italic" }}>
                        Reading your circle...
                      </p>
                    ) : (
                      <ul style={{ margin: 0, padding: "0 0 0 14px", display: "flex", flexDirection: "column", gap: 4 }}>
                        {(aiSummary ?? "").split("\n").filter((l) => l.trim()).map((line, i) => (
                          <li key={i} style={{ fontSize: 12.5, color: "#6B5E40", lineHeight: 1.5 }}>
                            {line.replace(/^[-*]\s*/, "")}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
              )}

              {/* Circle health */}
              <section style={{ marginBottom: 0 }}>
                <SectionLabel>Circle health</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Proportional health bar */}
                  <div
                    style={{
                      height: 10,
                      display: "flex",
                      gap: 2,
                      background: "rgba(224,217,206,0.5)",
                      borderRadius: 999,
                      overflow: "hidden",
                    }}
                  >
                    {healthy.length > 0 && (
                      <div style={{ flex: healthy.length, background: "#6BAF85" }} />
                    )}
                    {needsAttention.length > 0 && (
                      <div style={{ flex: needsAttention.length, background: "#D4A855" }} />
                    )}
                    {overdue.length > 0 && (
                      <div style={{ flex: overdue.length, background: "#C46060" }} />
                    )}
                  </div>

                  {/* Legend */}
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                    {[
                      { label: "Healthy", count: healthy.length, dotColor: "#6BAF85" },
                      { label: "Attention", count: needsAttention.length, dotColor: "#D4A855" },
                      { label: "Overdue", count: overdue.length, dotColor: "#C46060" },
                    ].map(({ label, count, dotColor }) => (
                      <div
                        key={label}
                        style={{ display: "inline-flex", alignItems: "baseline", gap: 6 }}
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: 999,
                            background: dotColor,
                            alignSelf: "center",
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: 12, color: "#2E2A24" }}>{label}</span>
                        <span
                          style={{
                            fontFamily: "var(--font-lora)",
                            fontSize: 17,
                            lineHeight: 1,
                            letterSpacing: "-0.01em",
                            color: "#2E2A24",
                            fontWeight: 500,
                            marginLeft: 2,
                          }}
                        >
                          {count}
                        </span>
                        <span
                          style={{
                            fontSize: 10.5,
                            color: "#9A8F82",
                            fontFamily: "monospace",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {pct(count)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <Rule />

              {/* 2-column grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60 }}>
                {/* Needs love */}
                <section>
                  <SectionLabel>Needs a little love</SectionLabel>
                  {overdueByUrgency.length === 0 ? (
                    <p style={{ fontSize: 12, color: "#9A8F82", fontStyle: "italic" }}>
                      Everyone&apos;s doing great!
                    </p>
                  ) : (
                    <ul style={{ listStyle: "none", padding: 0, margin: "0 0 10px" }}>
                      {overdueByUrgency.slice(0, 4).map((f) => {
                        const st =
                          getHealthScore(f) >= 75
                            ? "healthy"
                            : getHealthScore(f) >= 45
                              ? "attention"
                              : "overdue";
                        const chipColors =
                          st === "healthy"
                            ? {
                                color: "#6BAF85",
                                borderColor: "rgba(107,175,133,0.35)",
                              }
                            : st === "attention"
                              ? {
                                  color: "#D4A855",
                                  borderColor: "rgba(212,168,85,0.4)",
                                }
                              : {
                                  color: "#C46060",
                                  borderColor: "rgba(196,96,96,0.4)",
                                };
                        const lastDays = Math.min(
                          getDaysAgo(f.lastTexted),
                          getDaysAgo(f.lastHungOut)
                        );
                        return (
                          <li
                            key={f.id}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "auto 1fr auto",
                              alignItems: "center",
                              gap: 10,
                              padding: "8px 4px",
                              borderBottom: "1px dashed #E0D9CE",
                              cursor: "pointer",
                              borderRadius: 3,
                            }}
                          >
                            <span
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 999,
                                background: friendColor(f),
                                color: "#FFFBF1",
                                fontFamily: "var(--font-lora)",
                                fontSize: 12,
                                display: "grid",
                                placeItems: "center",
                              }}
                            >
                              {f.name[0]}
                            </span>
                            <span
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 0,
                                minWidth: 0,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 500,
                                  color: "#2E2A24",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {f.name}
                              </span>
                              <span style={{ fontSize: 11, color: "#9A8F82" }}>
                                {f.category} · last{" "}
                                {lastDays === Infinity ? "never" : `${lastDays}d ago`}
                              </span>
                            </span>
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontSize: 9.5,
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                                padding: "2px 7px",
                                borderRadius: 999,
                                border: "1px solid",
                                background: "transparent",
                                whiteSpace: "nowrap",
                                ...chipColors,
                              }}
                            >
                              {st}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>

                {/* Recent moments */}
                <section>
                  <SectionLabel>Recent moments</SectionLabel>
                  {recentMoments.length === 0 ? (
                    <p style={{ color: "#9A8F82", fontStyle: "italic", fontSize: 12, padding: "10px 4px" }}>
                      No moments logged yet.
                    </p>
                  ) : (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {recentMoments.slice(0, 4).map(({ friend: f, interaction: a }) => (
                        <li
                          key={a.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "54px 1fr",
                            padding: "8px 4px",
                            borderBottom: "1px dashed #E0D9CE",
                            gap: 8,
                            alignItems: "baseline",
                            borderRadius: 3,
                            cursor: "pointer",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: 9.5,
                              letterSpacing: "0.06em",
                              color: "#9A8F82",
                              textTransform: "uppercase",
                              paddingTop: 2,
                            }}
                          >
                            {formatLastInteraction(a.date)
                              .replace(" days ago", "d")
                              .replace(" day ago", "d")}
                          </span>
                          <span
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 1,
                              fontSize: 12.5,
                            }}
                          >
                            <span style={{ color: "#A68B50", fontWeight: 500 }}>
                              {a.type === "text" ? "Texted" : "Hung out"}
                            </span>
                            <span style={{ color: "#2E2A24", fontWeight: 500 }}>
                              {f.name}
                            </span>
                            {a.notes && (
                              <span
                                style={{
                                  fontSize: 11.5,
                                  color: "#9A8F82",
                                  fontStyle: "italic",
                                  marginTop: 2,
                                }}
                              >
                                {a.notes}
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              <Rule />

              {/* By category bar chart */}
              <section>
                <SectionLabel>By category</SectionLabel>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {byCategory.map(({ cat, count }) => (
                    <li
                      key={cat}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "110px 1fr 26px",
                        alignItems: "center",
                        gap: 12,
                        padding: "6px 0",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12.5,
                          color: "#2E2A24",
                          textTransform: "capitalize",
                        }}
                      >
                        {cat}
                      </span>
                      <span
                        style={{
                          height: 3,
                          background: "rgba(224,217,206,0.6)",
                          borderRadius: 999,
                          position: "relative",
                          overflow: "hidden",
                          display: "block",
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            inset: "0 auto 0 0",
                            background: "#A68B50",
                            borderRadius: 999,
                            width: (count / total) * 100 + "%",
                          }}
                        />
                      </span>
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: 10.5,
                          color: "#9A8F82",
                          textAlign: "right",
                        }}
                      >
                        {count}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Recently active */}
              {recentlyActive.length > 0 && (
                <>
                  <Rule />
                  <section>
                    <SectionLabel>Active this week</SectionLabel>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {recentlyActive.map((f) => {
                        const days = Math.min(
                          getDaysAgo(f.lastTexted),
                          getDaysAgo(f.lastHungOut)
                        );
                        return (
                          <li
                            key={f.id}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "auto 1fr auto",
                              alignItems: "center",
                              gap: 10,
                              padding: "8px 4px",
                              borderBottom: "1px dashed #E0D9CE",
                            }}
                          >
                            <span
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: 999,
                                background: friendColor(f),
                                color: "#FFFBF1",
                                fontFamily: "var(--font-lora)",
                                fontSize: 11,
                                display: "grid",
                                placeItems: "center",
                              }}
                            >
                              {f.name[0]}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 500, color: "#2E2A24" }}>
                              {f.name}
                            </span>
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontSize: 10.5,
                                color: "#6BAF85",
                                letterSpacing: "0.04em",
                              }}
                            >
                              {days === 0 ? "Today" : `${days}d ago`}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                </>
              )}

              {/* Never contacted */}
              {neverContacted.length > 0 && (
                <>
                  <Rule />
                  <section>
                    <SectionLabel>Not yet reached out</SectionLabel>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {neverContacted.map((f) => (
                        <li
                          key={f.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "auto 1fr auto",
                            alignItems: "center",
                            gap: 10,
                            padding: "8px 4px",
                            borderBottom: "1px dashed #E0D9CE",
                          }}
                        >
                          <span
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 999,
                              background: "#E0D9CE",
                              color: "#9A8F82",
                              fontFamily: "var(--font-lora)",
                              fontSize: 11,
                              display: "grid",
                              placeItems: "center",
                            }}
                          >
                            {f.name[0]}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 500, color: "#2E2A24" }}>
                            {f.name}
                          </span>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: 10.5,
                              color: "#9A8F82",
                              letterSpacing: "0.04em",
                            }}
                          >
                            Never contacted
                          </span>
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

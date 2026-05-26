"use client";

import { useEffect, useState } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Friend, FriendCategory } from "@/types/friend";
import { getFriends } from "@/lib/storage";
import AppNav from "@/components/AppNav";

// ─── helpers (mirrored from page.tsx) ────────────────────────────────────────

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

const CATEGORIES: FriendCategory[] = [
  "close friend",
  "family",
  "classmate",
  "coworker",
  "other",
];

// ─── page ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [isGuest, setIsGuest] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [ready, setReady] = useState(false);

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

  function exitGuestMode() {
    localStorage.removeItem("friendkeeper-guest");
    router.push("/sign-in");
  }

  if (!ready) {
    return <div className="flex h-full items-center justify-center bg-cream" />;
  }

  // ── analytics ──────────────────────────────────────────────────────────────

  const total = friends.length;
  const healthy = friends.filter((f) => getHealthScore(f) >= 75);
  const needsAttention = friends.filter((f) => {
    const s = getHealthScore(f);
    return s >= 45 && s < 75;
  });
  const overdue = friends.filter((f) => getHealthScore(f) < 45);

  const pct = (n: number) =>
    total === 0 ? "—" : `${Math.round((n / total) * 100)}%`;

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

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Guest banner */}
      {isGuest && (
        <div className="shrink-0 bg-parchment border-b border-sand px-6 py-2.5 flex items-center justify-between gap-4">
          <p className="text-xs text-clay">
            You&apos;re using guest mode. Sign in to keep your data tied to your account.
          </p>
          <div className="flex items-center gap-4 shrink-0">
            <a
              href="/sign-in"
              className="text-xs text-bark underline underline-offset-2 hover:text-earth transition-colors"
            >
              Sign in
            </a>
            <button
              onClick={exitGuestMode}
              className="text-xs text-clay hover:text-earth transition-colors"
            >
              Exit guest
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0 bg-cream">
        {/* Sidebar */}
        <aside className="w-72 shrink-0 flex flex-col border-r border-sand bg-parchment">
          <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-2">
            <div>
              <h1 className="font-serif text-2xl text-earth tracking-wide">friendkeeper</h1>
              <p className="text-xs text-clay mt-0.5">your people</p>
            </div>
            {isSignedIn ? (
              <UserButton />
            ) : (
              <button
                onClick={exitGuestMode}
                className="text-xs text-clay hover:text-earth transition-colors mt-1"
              >
                Sign in
              </button>
            )}
          </div>
          <AppNav />
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto px-10 py-10 max-w-2xl">
          {total === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="font-serif text-2xl text-earth mb-2">No data yet</p>
              <p className="text-sm text-clay">Add some friends to see your circle analytics.</p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="font-serif text-4xl text-earth">Your circle.</h2>
                <p className="text-clay mt-2">
                  {total} friend{total !== 1 ? "s" : ""} across{" "}
                  {byCategory.length} categor{byCategory.length !== 1 ? "ies" : "y"}.
                </p>
              </div>

              {/* Health overview */}
              <section className="mb-8">
                <h3 className="text-xs text-clay uppercase tracking-wider mb-3">
                  Circle health
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-white border border-sand p-5">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="w-2 h-2 rounded-full bg-sage shrink-0" />
                      <p className="text-xs text-clay">Healthy</p>
                    </div>
                    <p className="text-2xl font-bold text-earth">{healthy.length}</p>
                    <p className="text-xs text-clay mt-0.5">{pct(healthy.length)}</p>
                  </div>
                  <div className="rounded-2xl border border-sand p-5" style={{ backgroundColor: "#FBF0E0" }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="w-2 h-2 rounded-full bg-goldenrod shrink-0" />
                      <p className="text-xs text-clay">Attention</p>
                    </div>
                    <p className="text-2xl font-bold text-goldenrod">{needsAttention.length}</p>
                    <p className="text-xs text-clay mt-0.5">{pct(needsAttention.length)}</p>
                  </div>
                  <div className="rounded-2xl border border-sand p-5" style={{ backgroundColor: "#FAECE9" }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="w-2 h-2 rounded-full bg-rust shrink-0" />
                      <p className="text-xs text-clay">Overdue</p>
                    </div>
                    <p className="text-2xl font-bold text-rust">{overdue.length}</p>
                    <p className="text-xs text-clay mt-0.5">{pct(overdue.length)}</p>
                  </div>
                </div>
              </section>

              {/* Category breakdown */}
              <section className="mb-8">
                <h3 className="text-xs text-clay uppercase tracking-wider mb-3">
                  By category
                </h3>
                <div className="rounded-2xl bg-white border border-sand divide-y divide-sand">
                  {byCategory.map(({ cat, count }) => (
                    <div
                      key={cat}
                      className="flex items-center justify-between px-5 py-3"
                    >
                      <span className="text-sm text-earth capitalize">{cat}</span>
                      <span className="text-sm font-medium text-clay">{count}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Overdue */}
              {overdueByUrgency.length > 0 && (
                <section className="mb-8">
                  <h3 className="text-xs text-clay uppercase tracking-wider mb-3">
                    Reach out soon
                  </h3>
                  <div className="rounded-2xl bg-white border border-sand divide-y divide-sand">
                    {overdueByUrgency.map((f) => {
                      const urgency = getUrgency(f);
                      return (
                        <div
                          key={f.id}
                          className="flex items-center justify-between px-5 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-bark flex items-center justify-center shrink-0">
                              <span className="font-serif text-sm text-cream">{f.name[0]}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-earth">{f.name}</p>
                              <p className="text-xs text-clay capitalize">{f.category}</p>
                            </div>
                          </div>
                          <span className="text-xs text-rust font-medium">
                            {urgency === Infinity ? "Never contacted" : `${urgency}d overdue`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Recently active */}
              {recentlyActive.length > 0 && (
                <section className="mb-8">
                  <h3 className="text-xs text-clay uppercase tracking-wider mb-3">
                    Active this week
                  </h3>
                  <div className="rounded-2xl bg-white border border-sand divide-y divide-sand">
                    {recentlyActive.map((f) => {
                      const days = Math.min(
                        getDaysAgo(f.lastTexted),
                        getDaysAgo(f.lastHungOut)
                      );
                      return (
                        <div
                          key={f.id}
                          className="flex items-center justify-between px-5 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-sage flex items-center justify-center shrink-0">
                              <span className="font-serif text-sm text-cream">{f.name[0]}</span>
                            </div>
                            <p className="text-sm font-medium text-earth">{f.name}</p>
                          </div>
                          <span className="text-xs text-sage font-medium">
                            {days === 0 ? "Today" : `${days}d ago`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Never contacted */}
              {neverContacted.length > 0 && (
                <section className="mb-8">
                  <h3 className="text-xs text-clay uppercase tracking-wider mb-3">
                    Not yet reached out
                  </h3>
                  <div className="rounded-2xl bg-white border border-sand divide-y divide-sand">
                    {neverContacted.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between px-5 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-sand flex items-center justify-center shrink-0">
                            <span className="font-serif text-sm text-clay">{f.name[0]}</span>
                          </div>
                          <p className="text-sm font-medium text-earth">{f.name}</p>
                        </div>
                        <span className="text-xs text-clay">Never contacted</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

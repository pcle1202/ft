"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Friend, FriendCategory } from "@/types/friend";
import FriendForm from "@/components/FriendForm";
import FriendCard from "@/components/FriendCard";
import { getFriends, addFriend, updateFriend, deleteFriend } from "@/lib/storage";
import { loadSampleData, clearSampleData, hasSampleData } from "@/lib/sampleData";
import AppNav from "@/components/AppNav";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDaysAgo(date?: string) {
  if (!date) return Infinity;
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

function getUrgency(friend: Friend) {
  const textOverdue = getDaysAgo(friend.lastTexted) - friend.textFrequencyDays;
  const hangoutOverdue = getDaysAgo(friend.lastHungOut) - friend.hangoutFrequencyDays;
  return Math.max(textOverdue, hangoutOverdue);
}

function getHealthScore(friend: Friend) {
  const urgency = getUrgency(friend);
  if (urgency === Infinity) return 0;
  return Math.max(Math.min(100 - Math.max(urgency, 0) * 8, 100), 0);
}

function getRecommendationReason(friend: Friend): string {
  const textDays = getDaysAgo(friend.lastTexted);
  const hangoutDays = getDaysAgo(friend.lastHungOut);
  const textOverdue = textDays > friend.textFrequencyDays ? textDays - friend.textFrequencyDays : 0;
  const hangoutOverdue = hangoutDays > friend.hangoutFrequencyDays ? hangoutDays - friend.hangoutFrequencyDays : 0;

  if (textOverdue >= hangoutOverdue) {
    return `Usually text every ${friend.textFrequencyDays} days, been ${textDays === Infinity ? "a while" : `${textDays} days`}.`;
  }
  return `Usually hang out every ${friend.hangoutFrequencyDays} days, been ${hangoutDays === Infinity ? "a while" : `${hangoutDays} days`}.`;
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

// ─── FriendSidebarItem ────────────────────────────────────────────────────────

function FriendSidebarItem({
  friend,
  isSelected,
  onClick,
}: {
  friend: Friend;
  isSelected: boolean;
  onClick: () => void;
}) {
  const score = getHealthScore(friend);
  const color = friendColor(friend);
  const statusColor = score >= 75 ? "#6BAF85" : score >= 45 ? "#D4A855" : "#C46060";
  const days = getDaysAgo(friend.lastTexted || friend.lastHungOut);
  const lastLabel =
    days === Infinity ? "Never contacted" : days === 0 ? "Today" : `${days}d ago`;

  return (
    <li
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: 10,
        alignItems: "center",
        padding: "7px 8px 7px 10px",
        borderRadius: 3,
        cursor: "pointer",
        position: "relative",
        background: isSelected ? "#F3EDE3" : "transparent",
        listStyle: "none",
      }}
      onClick={onClick}
    >
      {isSelected && (
        <span
          style={{
            position: "absolute",
            left: 0,
            top: 5,
            bottom: 5,
            width: 2,
            background: "#A68B50",
            borderRadius: 2,
          }}
        />
      )}
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: 999,
          background: color,
          color: "#FFFBF1",
          fontFamily: "var(--font-lora)",
          fontSize: 11,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          boxShadow:
            "0 1px 0 rgba(50,30,10,0.12), inset 0 -2px 0 rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.25)",
        }}
      >
        {friend.name[0]}
      </span>
      <span
        style={{ display: "flex", flexDirection: "column", gap: 0, minWidth: 0 }}
      >
        <span
          style={{
            fontSize: 12.5,
            fontWeight: 500,
            color: "#2E2A24",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {friend.name}
        </span>
        <span
          style={{
            fontSize: 10.5,
            color: "#9A8F82",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: statusColor,
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          {friend.category} · {lastLabel}
        </span>
      </span>
    </li>
  );
}

// ─── WelcomePanel ─────────────────────────────────────────────────────────────

function WelcomePanel({
  friends,
  totalFriends,
  needAttention,
  overdue,
  nextBestCheckIn,
  onAddFirst,
  onSelectFriend,
}: {
  friends: Friend[];
  totalFriends: number;
  needAttention: number;
  overdue: number;
  nextBestCheckIn: Friend | undefined;
  onAddFirst: () => void;
  onSelectFriend: (id: string) => void;
}) {
  if (friends.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          textAlign: "center",
          padding: "48px",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 999,
            background: "#F3EDE3",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <span
            style={{ fontFamily: "var(--font-lora)", fontSize: 28, color: "#A68B50" }}
          >
            k
          </span>
        </div>
        <h2
          style={{
            fontFamily: "var(--font-lora)",
            fontSize: 28,
            color: "#2E2A24",
            margin: "0 0 10px",
          }}
        >
          Welcome to friendkeeper
        </h2>
        <p style={{ color: "#6B6259", marginBottom: 24, maxWidth: 320, lineHeight: 1.6 }}>
          Start tracking your friendships by adding someone you care about.
        </p>
        <button
          onClick={onAddFirst}
          style={{
            border: "1px solid rgba(166,139,80,0.35)",
            background: "transparent",
            color: "#A68B50",
            padding: "7px 18px",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
            borderRadius: 999,
          }}
        >
          Add your first friend
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "36px 40px", maxWidth: 580 }}>
      <h2
        style={{
          fontFamily: "var(--font-lora)",
          fontSize: 36,
          color: "#2E2A24",
          letterSpacing: "-0.02em",
          margin: "0 0 6px",
          fontWeight: 400,
        }}
      >
        Good to see you.
      </h2>
      <p style={{ color: "#6B6259", marginBottom: 28, marginTop: 0 }}>
        Here&apos;s how your circle is doing.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        <div
          style={{
            borderRadius: 4,
            border: "1px solid #E0D9CE",
            background: "#F3EDE3",
            padding: "14px 16px",
          }}
        >
          <p
            style={{
              fontFamily: "monospace",
              fontSize: 9.5,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#9A8F82",
              margin: "0 0 6px",
            }}
          >
            Friends
          </p>
          <p
            style={{
              fontFamily: "var(--font-lora)",
              fontSize: 28,
              fontWeight: 500,
              color: "#2E2A24",
              margin: 0,
              lineHeight: 1,
            }}
          >
            {totalFriends}
          </p>
        </div>
        <div
          style={{
            borderRadius: 4,
            border: "1px solid rgba(212,168,85,0.3)",
            background: "#FCF4E4",
            padding: "14px 16px",
          }}
        >
          <p
            style={{
              fontFamily: "monospace",
              fontSize: 9.5,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#9A8F82",
              margin: "0 0 6px",
            }}
          >
            Attention
          </p>
          <p
            style={{
              fontFamily: "var(--font-lora)",
              fontSize: 28,
              fontWeight: 500,
              color: "#D4A855",
              margin: 0,
              lineHeight: 1,
            }}
          >
            {needAttention}
          </p>
        </div>
        <div
          style={{
            borderRadius: 4,
            border: "1px solid rgba(196,96,96,0.3)",
            background: "#FBF0F0",
            padding: "14px 16px",
          }}
        >
          <p
            style={{
              fontFamily: "monospace",
              fontSize: 9.5,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#9A8F82",
              margin: "0 0 6px",
            }}
          >
            Overdue
          </p>
          <p
            style={{
              fontFamily: "var(--font-lora)",
              fontSize: 28,
              fontWeight: 500,
              color: "#C46060",
              margin: 0,
              lineHeight: 1,
            }}
          >
            {overdue}
          </p>
        </div>
      </div>

      {nextBestCheckIn && (
        <div
          style={{
            borderRadius: 4,
            border: "1px solid #E0D9CE",
            background: "#F3EDE3",
            padding: "16px 18px",
          }}
        >
          <p
            style={{
              fontFamily: "monospace",
              fontSize: 9.5,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#9A8F82",
              margin: "0 0 12px",
            }}
          >
            Who to reach out to
          </p>
          <button
            onClick={() => onSelectFriend(nextBestCheckIn.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              width: "100%",
              background: "transparent",
              border: 0,
              cursor: "pointer",
              padding: 0,
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                background: friendColor(nextBestCheckIn),
                color: "#FFFBF1",
                fontFamily: "var(--font-lora)",
                fontSize: 15,
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              {nextBestCheckIn.name[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: "#2E2A24", margin: "0 0 2px" }}>
                {nextBestCheckIn.name}
              </p>
              <p
                style={{
                  fontSize: 11.5,
                  color: "#9A8F82",
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {getRecommendationReason(nextBestCheckIn)}
              </p>
            </div>
            <span style={{ fontSize: 12, color: "#A68B50", flexShrink: 0 }}>View →</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [isGuest, setIsGuest] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<FriendCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sampleLoaded, setSampleLoaded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    const guestMode = localStorage.getItem("friendkeeper-guest") === "1";
    if (!isSignedIn && !guestMode) {
      router.push("/sign-in");
      return;
    }
    const uid = isSignedIn ? user!.id : "guest";
    setIsGuest(!isSignedIn && guestMode);
    setUserId(uid);
    setFriends(getFriends(uid));
    setSampleLoaded(hasSampleData(uid));
    setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  function reload(uid: string) {
    setFriends(getFriends(uid));
    setSampleLoaded(hasSampleData(uid));
  }

  function handleAddFriend(friend: Friend) {
    if (!userId) return;
    addFriend(friend, userId);
    reload(userId);
    setShowAddForm(false);
    setSelectedFriendId(friend.id);
  }

  function handleUpdateFriend(friend: Friend) {
    if (!userId) return;
    updateFriend(friend, userId);
    reload(userId);
  }

  function handleDeleteFriend(friendId: string) {
    if (!userId) return;
    deleteFriend(friendId, userId);
    if (selectedFriendId === friendId) setSelectedFriendId(null);
    reload(userId);
  }

  function exitGuestMode() {
    localStorage.removeItem("friendkeeper-guest");
    router.push("/sign-in");
  }

  function handleToggleSample() {
    if (!userId) return;
    if (sampleLoaded) {
      const updated = clearSampleData(userId, friends);
      setFriends(updated);
      setSampleLoaded(false);
      if (selectedFriendId && !updated.find((f) => f.id === selectedFriendId)) {
        setSelectedFriendId(null);
      }
      showToast("Sample data cleared");
    } else {
      const updated = loadSampleData(userId, friends);
      setFriends(updated);
      setSampleLoaded(true);
      showToast("Sample data loaded");
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }

  const filteredFriends = friends.filter((f) => {
    const matchesCategory = categoryFilter === "all" || f.category === categoryFilter;
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const sortedFriends = [...filteredFriends].sort((a, b) => getUrgency(b) - getUrgency(a));

  const totalFriends = friends.length;
  const needAttention = friends.filter((f) => {
    const s = getHealthScore(f);
    return s < 75 && s >= 45;
  }).length;
  const overdue = friends.filter((f) => getHealthScore(f) < 45).length;
  const nextBestCheckIn = [...friends].sort((a, b) => getUrgency(b) - getUrgency(a))[0];

  const selectedFriend = friends.find((f) => f.id === selectedFriendId) ?? null;

  if (isLoading) {
    return <div style={{ height: "100%", background: "#FAF7F2" }} />;
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "#FAF7F2", position: "relative", zIndex: 1 }}
    >
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

      {/* Top nav */}
      <AppNav />

      {/* Content */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside
          style={{
            width: 270,
            borderRight: "1px solid #E0D9CE",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            background: "color-mix(in oklab, #FAF7F2 70%, #F3EDE3 30%)",
          }}
        >
          {/* Search + filter */}
          <div
            style={{
              padding: "16px 16px 10px",
              borderBottom: "1px solid #E8E1D6",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {/* Search */}
            <div
              style={{
                position: "relative",
                borderBottom: "1px solid #E0D9CE",
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "4px 0",
                color: "#9A8F82",
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ flexShrink: 0 }}
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search by name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  flex: 1,
                  border: 0,
                  outline: 0,
                  background: "transparent",
                  fontSize: 13,
                  color: "#2E2A24",
                }}
              />
            </div>

            {/* Category filter */}
            <div
              style={{ display: "flex", alignItems: "baseline", gap: 8 }}
            >
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 9.5,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#9A8F82",
                  flexShrink: 0,
                }}
              >
                Show
              </span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as FriendCategory | "all")}
                style={{
                  flex: 1,
                  border: 0,
                  borderBottom: "1px solid #E0D9CE",
                  background: "transparent",
                  fontSize: 12.5,
                  color: "#2E2A24",
                  padding: "3px 0 4px",
                  outline: "none",
                  fontFamily: "var(--font-lora)",
                }}
              >
                <option value="all">All categories</option>
                <option value="close friend">Close friend</option>
                <option value="family">Family</option>
                <option value="classmate">Classmate</option>
                <option value="coworker">Coworker</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Friends list */}
          <ul
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "6px 8px",
              margin: 0,
              listStyle: "none",
            }}
          >
            {!isLoading && sortedFriends.length === 0 && friends.length > 0 && (
              <li
                style={{
                  padding: "12px 10px",
                  fontSize: 12,
                  color: "#9A8F82",
                  fontStyle: "italic",
                }}
              >
                No matches.
              </li>
            )}
            {sortedFriends.map((friend) => (
              <FriendSidebarItem
                key={friend.id}
                friend={friend}
                isSelected={selectedFriendId === friend.id}
                onClick={() => setSelectedFriendId(friend.id)}
              />
            ))}
          </ul>

          {/* Pinned add + sample */}
          <div
            style={{
              padding: "10px 14px 14px",
              borderTop: "1px solid #E8E1D6",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                border: "1px solid rgba(166,139,80,0.3)",
                background: "transparent",
                color: "#A68B50",
                padding: "5px 14px",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 999,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>+</span> Add a friend
            </button>
            <button
              onClick={handleToggleSample}
              style={{
                background: "transparent",
                border: 0,
                cursor: "pointer",
                fontSize: 10.5,
                color: "#B0A89E",
                fontFamily: "monospace",
                letterSpacing: "0.05em",
                textDecoration: "underline",
                textUnderlineOffset: 3,
                textDecorationColor: "rgba(176,168,158,0.35)",
              }}
            >
              {sampleLoaded ? "Clear sample data" : "Try sample data"}
            </button>
          </div>
        </aside>

        {/* Detail */}
        <main style={{ flex: 1, overflowY: "auto" }}>
          {selectedFriend ? (
            <FriendCard
              key={selectedFriendId!}
              friend={selectedFriend}
              onUpdateFriend={handleUpdateFriend}
              onDeleteFriend={handleDeleteFriend}
            />
          ) : (
            <WelcomePanel
              friends={friends}
              totalFriends={totalFriends}
              needAttention={needAttention}
              overdue={overdue}
              nextBestCheckIn={nextBestCheckIn}
              onAddFirst={() => setShowAddForm(true)}
              onSelectFriend={setSelectedFriendId}
            />
          )}
        </main>
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#2E2A24",
            color: "#FAF7F2",
            borderRadius: 4,
            fontSize: 12,
            padding: "7px 14px",
            zIndex: 200,
            pointerEvents: "none",
          }}
        >
          {toast}
        </div>
      )}

      {/* Add friend modal */}
      {showAddForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(46,42,36,0.4)",
            backdropFilter: "blur(2px)",
            zIndex: 100,
            display: "grid",
            placeItems: "center",
            animation: "scrim-in 0.15s ease-out",
          }}
          onClick={() => setShowAddForm(false)}
        >
          <div
            style={{
              width: "min(480px, calc(100vw - 32px))",
              maxHeight: "calc(100vh - 48px)",
              background: "#F3EDE3",
              border: "1px solid #E0D9CE",
              borderRadius: 6,
              boxShadow:
                "0 18px 48px -16px rgba(50,30,10,0.35), 0 2px 6px rgba(50,30,10,0.08)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              animation: "modal-in 0.18s cubic-bezier(.34,1.4,.6,1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <header
              style={{
                padding: "14px 16px 10px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #E8E1D6",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontFamily: "var(--font-lora)",
                  fontSize: 19,
                  fontWeight: 500,
                  color: "#2E2A24",
                }}
              >
                Add someone
              </h2>
              <button
                onClick={() => setShowAddForm(false)}
                style={{
                  background: "transparent",
                  border: "1px solid transparent",
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                  color: "#6B6259",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </header>
            <div style={{ padding: "14px 16px 4px", overflowY: "auto" }}>
              <FriendForm
                onAddFriend={handleAddFriend}
                onCancel={() => setShowAddForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

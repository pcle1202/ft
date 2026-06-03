"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Friend, FriendCategory } from "@/types/friend";
import FriendCard from "@/components/FriendCard";
import FriendForm from "@/components/FriendForm";
import { getFriends, addFriend, updateFriend, deleteFriend } from "@/lib/storage";
import { loadSampleData, clearSampleData, hasSampleData } from "@/lib/sampleData";
import AppNav from "@/components/AppNav";
import { FriendAvatar } from "@/components/Avatar";

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

function statusFor(f: Friend): "healthy" | "attention" | "overdue" {
  const td = getDaysAgo(f.lastTexted);
  const hd = getDaysAgo(f.lastHungOut);
  const tR = td === Infinity ? 2 : td / f.textFrequencyDays;
  const hR = hd === Infinity ? 2 : hd / f.hangoutFrequencyDays;
  const worst = Math.max(tR, hR);
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

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
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
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
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

// ─── Empty/welcome detail pane ────────────────────────────────────────────────

function EmptyDetail({ onAddFirst }: { onAddFirst: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: 48, textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: 999, background: "var(--paper)", border: "1px solid var(--hair)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21s-7-4.5-9-9.5C1.5 7 4.5 4 8 4c1.7 0 3.2.8 4 2 .8-1.2 2.3-2 4-2 3.5 0 6.5 3 5 7.5-2 5-9 9.5-9 9.5z"/>
        </svg>
      </div>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 26, color: "var(--ink)", margin: "0 0 8px", fontWeight: 400 }}>
        Welcome to friendkeeper
      </h2>
      <p style={{ color: "var(--muted)", marginBottom: 24, maxWidth: 300, lineHeight: 1.6, fontSize: 13 }}>
        Start tracking your friendships by adding someone you care about.
      </p>
      <button className="btn-prim" onClick={onAddFirst}>
        <span style={{ fontSize: 15, lineHeight: 1 }}>+</span>
        Add your first friend
      </button>
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
  const [sortBy, setSortBy] = useState<"urgency" | "alpha">("urgency");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sampleLoaded, setSampleLoaded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    const guestMode = localStorage.getItem("friendkeeper-guest") === "1";
    if (!isSignedIn && !guestMode) { router.push("/sign-in"); return; }
    const uid = isSignedIn ? user!.id : "guest";
    setIsGuest(!isSignedIn && guestMode);
    setUserId(uid);
    let currentFriends = getFriends(uid);
    if (hasSampleData(uid)) {
      currentFriends = loadSampleData(uid, currentFriends);
    }
    setFriends(currentFriends);
    setSampleLoaded(hasSampleData(uid));
    if (currentFriends.length > 0) {
      const saved = sessionStorage.getItem("friendkeeper-selected-friend");
      const sorted = [...currentFriends].sort((a, b) => getUrgency(b) - getUrgency(a));
      const initial = (saved && currentFriends.find((f) => f.id === saved)) ? saved : sorted[0].id;
      setSelectedFriendId(initial);
    }
    setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (selectedFriendId) sessionStorage.setItem("friendkeeper-selected-friend", selectedFriendId);
  }, [selectedFriendId]);

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
    if (selectedFriendId === friendId) {
      const remaining = getFriends(userId).filter((f) => f.id !== friendId);
      setSelectedFriendId(remaining.length > 0 ? [...remaining].sort((a, b) => getUrgency(b) - getUrgency(a))[0].id : null);
    }
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
      if (selectedFriendId && !updated.find((f) => f.id === selectedFriendId)) setSelectedFriendId(null);
      showToast("Sample data cleared");
    } else {
      const updated = loadSampleData(userId, friends);
      setFriends(updated);
      setSampleLoaded(true);
      if (updated.length > 0) setSelectedFriendId(updated[0].id);
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

  const sortedFriends = [...filteredFriends].sort((a, b) => {
    const mul = sortDir === "desc" ? -1 : 1;
    if (sortBy === "alpha") return mul * a.name.localeCompare(b.name);
    return mul * (getUrgency(b) - getUrgency(a));
  });
  const selectedFriend = friends.find((f) => f.id === selectedFriendId) ?? null;

  if (isLoading) return <div style={{ height: "100%", background: "var(--bg)" }} />;

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

      <div className="friends-page" style={{ flex: 1, minHeight: 0 }}>
        {/* ─── Sidebar ─── */}
        <aside className="sidebar">
          <div className="sidebar-controls">
            <div className="search">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
              </svg>
              <input
                type="text"
                placeholder="Search by name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="cat-filter">
              <span className="cat-filter-label">Show</span>
              <div className="cat-filter-select">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as FriendCategory | "all")}
                >
                  <option value="all">All</option>
                  <option value="close friend">Close friend</option>
                  <option value="family">Family</option>
                  <option value="classmate">Classmate</option>
                  <option value="coworker">Coworker</option>
                  <option value="other">Other</option>
                </select>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
            <div className="cat-filter">
              <span className="cat-filter-label">Sort</span>
              <div className="cat-filter-select">
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "urgency" | "alpha")}>
                  <option value="urgency">Urgency</option>
                  <option value="alpha">A-Z</option>
                </select>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
              </div>
              <button
                onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
                title={sortDir === "desc" ? "Descending" : "Ascending"}
                style={{ background: "transparent", border: 0, padding: "0 0 0 6px", cursor: "pointer", color: "var(--muted)", display: "flex", alignItems: "center", flexShrink: 0 }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  {sortDir === "desc"
                    ? <path d="M12 5v14M5 12l7 7 7-7"/>
                    : <path d="M12 19V5M5 12l7-7 7 7"/>}
                </svg>
              </button>
            </div>
          </div>

          <ul className="friend-list">
            {sortedFriends.length === 0 && (
              <li className="sidebar-empty">
                {friends.length === 0 ? "No friends yet." : "No matches."}
              </li>
            )}
            {sortedFriends.map((f) => {
              const st = statusFor(f);
              const td = getDaysAgo(f.lastTexted);
              const hd = getDaysAgo(f.lastHungOut);
              const lastContact = Math.min(td, hd);
              return (
                <li
                  key={f.id}
                  className={`friend-row${selectedFriendId === f.id ? " is-selected" : ""}`}
                  onClick={() => setSelectedFriendId(f.id)}
                >
                  <FriendAvatar friend={f} size="sm" />
                  <span className="friend-row-main">
                    <span className="friend-row-name">{f.name}</span>
                    <span className="friend-row-sub">
                      <span className={`dot dot-${st}`} />
                      <span style={{ textTransform: "capitalize" }}>{f.category}</span>
                      {" · "}
                      {daysAgoLabel(lastContact)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="add-friend-wrap">
            <button className="btn-prim" onClick={() => setShowAddForm(true)}>
              <span style={{ fontSize: 15, lineHeight: 1, fontWeight: 600 }}>+</span>
              Add a friend
            </button>
            <button className="sample-link" onClick={handleToggleSample}>
              {sampleLoaded ? "Clear sample data" : "Try sample data"}
            </button>
          </div>
        </aside>

        {/* ─── Detail ─── */}
        <main className="detail">
          {selectedFriend ? (
            <FriendCard
              key={selectedFriendId!}
              friend={selectedFriend}
              onUpdateFriend={handleUpdateFriend}
              onDeleteFriend={handleDeleteFriend}
            />
          ) : (
            <EmptyDetail onAddFirst={() => setShowAddForm(true)} />
          )}
        </main>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "var(--ink)", color: "var(--bg)", borderRadius: 4, fontSize: 12, padding: "7px 14px", zIndex: 200, pointerEvents: "none" }}>
          {toast}
        </div>
      )}

      {/* Add friend modal */}
      <Modal open={showAddForm} title="Add a friend" onClose={() => setShowAddForm(false)}>
        <FriendForm onAddFriend={handleAddFriend} onCancel={() => setShowAddForm(false)} />
      </Modal>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Friend, FriendCategory } from "@/types/friend";
import FriendForm from "@/components/FriendForm";
import FriendCard from "@/components/FriendCard";
import { getFriends, addFriend, updateFriend, deleteFriend } from "@/lib/storage";
import AppNav from "@/components/AppNav";

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
    return `Usually text every ${friend.textFrequencyDays} days — it's been ${textDays === Infinity ? "a while" : `${textDays} days`}.`;
  }
  return `Usually hang out every ${friend.hangoutFrequencyDays} days — it's been ${hangoutDays === Infinity ? "a while" : `${hangoutDays} days`}.`;
}

function healthDotClass(score: number): string {
  if (score >= 75) return "bg-sage";
  if (score >= 45) return "bg-goldenrod";
  return "bg-rust";
}

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
  const dotClass = healthDotClass(score);
  const lastContact = friend.lastTexted || friend.lastHungOut;
  const days = getDaysAgo(lastContact);
  const lastLabel = days === Infinity ? "Never contacted" : days === 0 ? "Today" : `${days}d ago`;
  const catShort =
    friend.category === "close friend"
      ? "close"
      : friend.category === "classmate"
        ? "school"
        : friend.category;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 flex items-center gap-3 border-l-2 transition-colors ${
        isSelected
          ? "bg-cream border-bark"
          : "border-transparent hover:bg-cream/70"
      }`}
    >
      <span className={`shrink-0 w-2.5 h-2.5 rounded-full ${dotClass}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-earth">{friend.name}</p>
        <p className="text-xs text-clay">{lastLabel}</p>
      </div>
      <span className="shrink-0 text-xs text-clay capitalize">{catShort}</span>
    </button>
  );
}

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
      <div className="flex flex-col items-center justify-center h-full text-center px-12 py-16">
        <div className="w-20 h-20 rounded-full bg-parchment flex items-center justify-center mb-6">
          <span className="font-serif text-4xl text-bark">k</span>
        </div>
        <h2 className="font-serif text-3xl text-earth mb-3">Welcome to friendkeeper</h2>
        <p className="text-clay mb-8 max-w-sm leading-relaxed">
          Start tracking your friendships by adding someone you care about.
        </p>
        <button
          onClick={onAddFirst}
          className="rounded-xl bg-bark text-cream px-7 py-3 text-sm font-medium hover:bg-earth transition-colors"
        >
          Add your first friend
        </button>
      </div>
    );
  }

  return (
    <div className="px-10 py-10 max-w-2xl">
      <div className="mb-8">
        <h2 className="font-serif text-4xl text-earth">Good to see you.</h2>
        <p className="text-clay mt-2">Here's how your circle is doing.</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl bg-white border border-sand p-5">
          <p className="text-xs text-clay uppercase tracking-wider">Friends</p>
          <p className="text-3xl font-bold text-earth mt-2">{totalFriends}</p>
        </div>
        <div
          className="rounded-2xl border border-sand p-5"
          style={{ backgroundColor: "#FBF0E0" }}
        >
          <p className="text-xs text-clay uppercase tracking-wider">Needs attention</p>
          <p className="text-3xl font-bold text-goldenrod mt-2">{needAttention}</p>
        </div>
        <div
          className="rounded-2xl border border-sand p-5"
          style={{ backgroundColor: "#FAECE9" }}
        >
          <p className="text-xs text-clay uppercase tracking-wider">Overdue</p>
          <p className="text-3xl font-bold text-rust mt-2">{overdue}</p>
        </div>
      </div>

      {nextBestCheckIn && (
        <div className="rounded-2xl bg-white border border-sand p-6">
          <h3 className="font-serif text-lg text-earth mb-4">Who to reach out to</h3>
          <button
            onClick={() => onSelectFriend(nextBestCheckIn.id)}
            className="flex items-center gap-4 w-full text-left group"
          >
            <div className="w-12 h-12 rounded-full bg-bark flex items-center justify-center shrink-0">
              <span className="font-serif text-xl text-cream">{nextBestCheckIn.name[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-earth group-hover:underline">
                {nextBestCheckIn.name}
              </p>
              <p className="text-sm text-clay mt-0.5 truncate">
                {getRecommendationReason(nextBestCheckIn)}
              </p>
            </div>
            <span className="text-clay text-sm shrink-0">View →</span>
          </button>
        </div>
      )}
    </div>
  );
}

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
    setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  function reload(uid: string) {
    setFriends(getFriends(uid));
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
    return <div className="flex h-full items-center justify-center bg-cream" />;
  }

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
          {/* Logo */}
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

          {/* Search + Filter */}
          <div className="px-4 pb-4 pt-3 space-y-2 border-b border-sand">
            <input
              type="text"
              placeholder="Search friends…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-sm text-earth placeholder:text-clay outline-none focus:ring-2 focus:ring-bark/30"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as FriendCategory | "all")}
              className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-sm text-earth outline-none"
            >
              <option value="all">All categories</option>
              <option value="close friend">Close friend</option>
              <option value="family">Family</option>
              <option value="classmate">Classmate</option>
              <option value="coworker">Coworker</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Friends list */}
          <div className="flex-1 overflow-y-auto py-2">
            {!isLoading && sortedFriends.length === 0 && friends.length > 0 && (
              <p className="px-5 py-4 text-sm text-clay">No matches.</p>
            )}
            {sortedFriends.map((friend) => (
              <FriendSidebarItem
                key={friend.id}
                friend={friend}
                isSelected={selectedFriendId === friend.id}
                onClick={() => setSelectedFriendId(friend.id)}
              />
            ))}
          </div>

          {/* Add button */}
          <div className="p-4 border-t border-sand">
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full rounded-xl bg-bark text-cream py-2.5 text-sm font-medium hover:bg-earth transition-colors"
            >
              + Add friend
            </button>
          </div>
        </aside>

        {/* Detail panel */}
        <main className="flex-1 overflow-y-auto">
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

      {/* Add friend modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <button
              onClick={() => setShowAddForm(false)}
              className="absolute right-4 top-4 text-xl text-clay hover:text-earth leading-none"
            >
              ×
            </button>
            <FriendForm onAddFriend={handleAddFriend} />
          </div>
        </div>
      )}
    </div>
  );
}

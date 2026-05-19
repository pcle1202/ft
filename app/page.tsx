"use client";

import { useEffect, useState } from "react";
import { Friend, FriendCategory } from "@/types/friend";
import FriendForm from "@/components/FriendForm";
import FriendCard from "@/components/FriendCard";
import {
  addFriend,
  deleteFriend,
  getFriends,
  updateFriend,
} from "@/lib/storage";

function getDaysAgo(date?: string) {
  if (!date) return Infinity;

  return Math.floor(
    (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
  );
}

function getUrgency(friend: Friend) {
  const textDays = getDaysAgo(friend.lastTexted);
  const hangoutDays = getDaysAgo(friend.lastHungOut);

  const textOverdueBy = textDays - friend.textFrequencyDays;
  const hangoutOverdueBy = hangoutDays - friend.hangoutFrequencyDays;

  return Math.max(textOverdueBy, hangoutOverdueBy);
}

function getHealthScore(friend: Friend) {
  const urgency = getUrgency(friend);
  if (urgency === Infinity) return 0;

  const score = 100 - Math.max(urgency, 0) * 8;
  return Math.max(Math.min(score, 100), 0);
}

function getStatus(score: number) {
  if (score >= 75) return "Healthy";
  if (score >= 45) return "Needs attention";
  return "Overdue";
}

function DashboardCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-stone-900">{value}</p>
    </div>
  );
}

export default function Home() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<FriendCategory | "all">(
    "all"
  );
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    setFriends(getFriends());
  }, []);

  function handleAddFriend(friend: Friend) {
    addFriend(friend);
    setFriends(getFriends());
    setShowAddForm(false);
  }

  function handleUpdateFriend(friend: Friend) {
    updateFriend(friend);
    setFriends(getFriends());
  }

  function handleDeleteFriend(friendId: string) {
    deleteFriend(friendId);
    setFriends(getFriends());
  }

  const filteredFriends = friends.filter((friend) => {
    const matchesCategory =
      categoryFilter === "all" || friend.category === categoryFilter;

    const matchesSearch = friend.name
      .toLowerCase()
      .includes(search.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const sortedFriends = [...filteredFriends].sort(
    (a, b) => getUrgency(b) - getUrgency(a)
  );

  const totalFriends = friends.length;

  const averageHealth =
    friends.length === 0
      ? 0
      : Math.round(
          friends.reduce((sum, friend) => sum + getHealthScore(friend), 0) /
            friends.length
        );

  const needAttention = friends.filter((friend) => {
    const score = getHealthScore(friend);
    return score < 75 && score >= 45;
  }).length;

  const overdue = friends.filter(
    (friend) => getHealthScore(friend) < 45
  ).length;

  const suggestedFriend = [...friends].sort(
    (a, b) => getHealthScore(a) - getHealthScore(b)
  )[0];

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">
            Friendship Tracker
          </h1>
          <p className="mt-2 text-stone-600">
            Track relationship health, reminders, and recent interactions.
          </p>
        </div>

        {friends.length > 0 && (
          <button
            onClick={() => setShowAddForm(true)}
            className="rounded-xl bg-stone-900 px-5 py-3 text-white shadow-sm hover:bg-stone-700"
          >
            + Add Friend
          </button>
        )}
      </header>

        <section className="grid gap-4 md:grid-cols-4">
          <DashboardCard label="Total Friends" value={totalFriends} />
          <DashboardCard label="Need Attention" value={needAttention} />
          <DashboardCard label="Overdue" value={overdue} />
          <DashboardCard label="Average Health" value={`${averageHealth}%`} />
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">
            Smart Reminder
          </h2>

          {suggestedFriend ? (
            <p className="mt-2 text-stone-600">
              Check in with{" "}
              <span className="font-semibold text-stone-900">
                {suggestedFriend.name}
              </span>{" "}
              soon. Their relationship health score is{" "}
              <span className="font-semibold">
                {getHealthScore(suggestedFriend)}%
              </span>
              .
            </p>
          ) : (
            <p className="mt-2 text-stone-500">
              Add your first friend to get smart reminders.
            </p>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-stone-900">
                Your Friends
              </h2>
              <p className="text-sm text-stone-500">
                Sorted by who needs attention most.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                placeholder="Search friends..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-lg border bg-white px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-stone-300"
              />

              <select
                className="rounded-lg border bg-white px-3 py-2 text-sm shadow-sm"
                value={categoryFilter}
                onChange={(e) =>
                  setCategoryFilter(e.target.value as FriendCategory | "all")
                }
              >
                <option value="all">All</option>
                <option value="close friend">Close friend</option>
                <option value="family">Family</option>
                <option value="classmate">Classmate</option>
                <option value="coworker">Coworker</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {friends.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-white p-10 text-center shadow-sm">
              <h3 className="text-xl font-semibold text-stone-900">
                No friends added yet
              </h3>
              <p className="mt-2 text-stone-500">
                Start tracking your friendships by adding your first friend.
              </p>

              <button
                onClick={() => setShowAddForm(true)}
                className="mt-5 rounded-xl bg-stone-900 px-5 py-3 text-white hover:bg-stone-700"
              >
                Add Friend
              </button>
            </div>
          ) : sortedFriends.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-stone-500">
              No friends match your search.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {sortedFriends.map((friend) => (
                <FriendCard
                  key={friend.id}
                  friend={friend}
                  onUpdateFriend={handleUpdateFriend}
                  onDeleteFriend={handleDeleteFriend}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-4 shadow-xl">
            <button
              onClick={() => setShowAddForm(false)}
              className="absolute right-4 top-4 rounded-full px-2 text-xl text-stone-500 hover:bg-stone-100"
            >
              ×
            </button>

            <FriendForm onAddFriend={handleAddFriend} />
          </div>
        </div>
      )}
    </main>
  );
}
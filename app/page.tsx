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

function getUrgency(friend: Friend) {
  const textDays = friend.lastTexted
    ? Math.floor(
        (Date.now() - new Date(friend.lastTexted).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : Infinity;

  const hangoutDays = friend.lastHungOut
    ? Math.floor(
        (Date.now() - new Date(friend.lastHungOut).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : Infinity;

  const textOverdueBy = textDays - friend.textFrequencyDays;
  const hangoutOverdueBy = hangoutDays - friend.hangoutFrequencyDays;

  return Math.max(textOverdueBy, hangoutOverdueBy);
}

export default function Home() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<FriendCategory | "all">(
    "all"
    );
  const filteredFriends =
    categoryFilter === "all"
      ? friends
      : friends.filter((friend) => friend.category === categoryFilter);

  const sortedFriends = [...filteredFriends].sort(
    (a, b) => getUrgency(b) - getUrgency(a)
  );

  useEffect(() => {
    setFriends(getFriends());
  }, []);

  function handleAddFriend(friend: Friend) {
    addFriend(friend);
    setFriends(getFriends());
  }

  function handleUpdateFriend(friend: Friend) {
    updateFriend(friend);
    setFriends(getFriends());
  }

  function handleDeleteFriend(friendId: string) {
    deleteFriend(friendId);
    setFriends(getFriends());
  }

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <section>
          <h1 className="text-3xl font-bold">Friendship Tracker</h1>
          <p className="mt-2 text-gray-600">
            Keep track of when you last texted or hung out with your friends.
          </p>
        </section>

        <div className="grid gap-6 md:grid-cols-[360px_1fr]">
          <FriendForm onAddFriend={handleAddFriend} />

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Your friends</h2>

        <select
          className="rounded-lg border bg-white px-3 py-2 text-sm"
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

            {sortedFriends.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-white p-6 text-gray-500">
                No friends added yet.
              </div>
            ) : (
              <div className="grid gap-4">
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
      </div>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import { Friend } from "@/types/friend";
import FriendForm from "@/components/FriendForm";
import FriendCard from "@/components/FriendCard";
import {
  addFriend,
  deleteFriend,
  getFriends,
  updateFriend,
} from "@/lib/storage";

export default function Home() {
  const [friends, setFriends] = useState<Friend[]>([]);

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
            <h2 className="text-xl font-semibold">Your friends</h2>

            {friends.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-white p-6 text-gray-500">
                No friends added yet.
              </div>
            ) : (
              <div className="grid gap-4">
                {friends.map((friend) => (
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
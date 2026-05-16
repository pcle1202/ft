"use client";

import { useState } from "react";
import { Friend } from "@/types/friend";

type FriendFormProps = {
  onAddFriend: (friend: Friend) => void;
};

export default function FriendForm({ onAddFriend }: FriendFormProps) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [textFrequencyDays, setTextFrequencyDays] = useState(14);
  const [hangoutFrequencyDays, setHangoutFrequencyDays] = useState(30);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const newFriend: Friend = {
      id: crypto.randomUUID(),
      name,
      notes,
      textFrequencyDays,
      hangoutFrequencyDays,
      createdAt: new Date().toISOString(),
    };

    onAddFriend(newFriend);

    setName("");
    setNotes("");
    setTextFrequencyDays(14);
    setHangoutFrequencyDays(30);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border p-4 space-y-4">
      <h2 className="text-xl font-semibold">Add a friend</h2>

      <input
        className="w-full rounded-lg border px-3 py-2"
        placeholder="Friend's name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <textarea
        className="w-full rounded-lg border px-3 py-2"
        placeholder="Notes, like where you met or what they like"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-sm">Text every</span>
          <input
            type="number"
            className="w-full rounded-lg border px-3 py-2"
            value={textFrequencyDays}
            onChange={(e) => setTextFrequencyDays(Number(e.target.value))}
            min={1}
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm">Hang out every</span>
          <input
            type="number"
            className="w-full rounded-lg border px-3 py-2"
            value={hangoutFrequencyDays}
            onChange={(e) => setHangoutFrequencyDays(Number(e.target.value))}
            min={1}
          />
        </label>
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-black px-4 py-2 text-white"
      >
        Add friend
      </button>
    </form>
  );
}
"use client";

import { useState } from "react";
import { Friend } from "@/types/friend";

type FriendFormProps = {
  onAddFriend: (friend: Friend) => void;
};

export default function FriendForm({ onAddFriend }: FriendFormProps) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  const [lastTexted, setLastTexted] = useState("");
  const [lastHungOut, setLastHungOut] = useState("");

  const [textAmount, setTextAmount] = useState(14);
  const [textUnit, setTextUnit] = useState<"days" | "months">("days");

  const [hangoutAmount, setHangoutAmount] = useState(1);
  const [hangoutUnit, setHangoutUnit] = useState<"days" | "months">("months");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const newFriend: Friend = {
      id: crypto.randomUUID(),
      name,
      notes,
      lastTexted: lastTexted ? new Date(lastTexted).toISOString() : undefined,
      lastHungOut: lastHungOut ? new Date(lastHungOut).toISOString() : undefined,
      textFrequencyDays: textUnit === "months" ? textAmount * 30 : textAmount,
      hangoutFrequencyDays:
        hangoutUnit === "months" ? hangoutAmount * 30 : hangoutAmount,
      createdAt: new Date().toISOString(),
    };

    onAddFriend(newFriend);

    setName("");
    setNotes("");
    setLastTexted("");
    setLastHungOut("");
    setTextAmount(14);
    setTextUnit("days");
    setHangoutAmount(1);
    setHangoutUnit("months");
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
        placeholder="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm">Last texted</span>
          <input
            type="date"
            className="w-full rounded-lg border px-3 py-2"
            value={lastTexted}
            onChange={(e) => setLastTexted(e.target.value)}
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm">Last hung out</span>
          <input
            type="date"
            className="w-full rounded-lg border px-3 py-2"
            value={lastHungOut}
            onChange={(e) => setLastHungOut(e.target.value)}
          />
        </label>
      </div>

      <div className="space-y-3">
        <label className="space-y-1 block">
          <span className="text-sm">Text every</span>

          <div className="grid grid-cols-[minmax(90px,1fr)_120px] gap-2">
            <input
              type="number"
              className="w-full rounded-lg border px-3 py-2"
              value={textAmount}
              onChange={(e) => setTextAmount(Number(e.target.value))}
              min={1}
            />

            <select
              className="w-full rounded-lg border px-3 py-2"
              value={textUnit}
              onChange={(e) =>
                setTextUnit(e.target.value as "days" | "months")
              }
            >
              <option value="days">days</option>
              <option value="months">months</option>
            </select>
          </div>
        </label>

        <label className="space-y-1 block">
          <span className="text-sm">Hang out every</span>

          <div className="grid grid-cols-[minmax(90px,1fr)_120px] gap-2">
            <input
              type="number"
              className="w-full rounded-lg border px-3 py-2"
              value={hangoutAmount}
              onChange={(e) => setHangoutAmount(Number(e.target.value))}
              min={1}
            />

            <select
              className="w-full rounded-lg border px-3 py-2"
              value={hangoutUnit}
              onChange={(e) =>
                setHangoutUnit(e.target.value as "days" | "months")
              }
            >
              <option value="days">days</option>
              <option value="months">months</option>
            </select>
          </div>
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
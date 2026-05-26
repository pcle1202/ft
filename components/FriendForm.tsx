"use client";

import { useState } from "react";
import { Friend, FriendCategory } from "@/types/friend";

type FriendFormProps = {
  onAddFriend: (friend: Friend) => void;
};

const INPUT_CLASS =
  "w-full rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-earth placeholder:text-clay outline-none focus:ring-2 focus:ring-bark/30 transition";

export default function FriendForm({ onAddFriend }: FriendFormProps) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState<FriendCategory>("close friend");
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
      category,
      lastTexted: lastTexted ? new Date(lastTexted).toISOString() : undefined,
      lastHungOut: lastHungOut ? new Date(lastHungOut).toISOString() : undefined,
      textFrequencyDays: textUnit === "months" ? textAmount * 30 : textAmount,
      hangoutFrequencyDays: hangoutUnit === "months" ? hangoutAmount * 30 : hangoutAmount,
      createdAt: new Date().toISOString(),
      interactions: [],
    };

    onAddFriend(newFriend);

    setName("");
    setNotes("");
    setCategory("close friend");
    setLastTexted("");
    setLastHungOut("");
    setTextAmount(14);
    setTextUnit("days");
    setHangoutAmount(1);
    setHangoutUnit("months");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="mb-2">
        <h2 className="font-serif text-2xl text-earth">Add someone</h2>
        <p className="text-sm text-clay mt-1">Someone you want to keep close.</p>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-clay">Name</span>
        <input
          className={INPUT_CLASS}
          placeholder="Their name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-clay">Notes</span>
        <textarea
          className={INPUT_CLASS + " resize-none"}
          rows={3}
          placeholder="Anything important to remember?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-clay">Category</span>
        <select
          className={INPUT_CLASS}
          value={category}
          onChange={(e) => setCategory(e.target.value as FriendCategory)}
        >
          <option value="close friend">Close friend</option>
          <option value="family">Family</option>
          <option value="classmate">Classmate</option>
          <option value="coworker">Coworker</option>
          <option value="other">Other</option>
        </select>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-sm font-medium text-clay">Last texted</span>
          <input
            type="date"
            className={INPUT_CLASS}
            value={lastTexted}
            onChange={(e) => setLastTexted(e.target.value)}
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-medium text-clay">Last hung out</span>
          <input
            type="date"
            className={INPUT_CLASS}
            value={lastHungOut}
            onChange={(e) => setLastHungOut(e.target.value)}
          />
        </label>
      </div>

      <div className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-clay">Text every</span>
          <div className="grid grid-cols-[1fr_130px] gap-2">
            <input
              type="number"
              className={INPUT_CLASS}
              value={textAmount}
              min={1}
              onChange={(e) => setTextAmount(Number(e.target.value))}
            />
            <select
              className={INPUT_CLASS}
              value={textUnit}
              onChange={(e) => setTextUnit(e.target.value as "days" | "months")}
            >
              <option value="days">days</option>
              <option value="months">months</option>
            </select>
          </div>
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-clay">Hang out every</span>
          <div className="grid grid-cols-[1fr_130px] gap-2">
            <input
              type="number"
              className={INPUT_CLASS}
              value={hangoutAmount}
              min={1}
              onChange={(e) => setHangoutAmount(Number(e.target.value))}
            />
            <select
              className={INPUT_CLASS}
              value={hangoutUnit}
              onChange={(e) => setHangoutUnit(e.target.value as "days" | "months")}
            >
              <option value="days">days</option>
              <option value="months">months</option>
            </select>
          </div>
        </label>
      </div>

      <button
        type="submit"
        className="w-full rounded-xl bg-bark text-cream py-3 text-sm font-medium hover:bg-earth transition-colors"
      >
        Add to my circle
      </button>
    </form>
  );
}

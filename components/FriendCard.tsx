"use client";

import { useState } from "react";
import { Friend, FriendCategory } from "@/types/friend";
import { formatLastInteraction, getStatus } from "@/lib/date";

type FriendCardProps = {
  friend: Friend;
  onUpdateFriend: (friend: Friend) => void;
  onDeleteFriend: (friendId: string) => void;
};

function daysToAmountAndUnit(days: number) {
  if (days % 30 === 0) {
    return { amount: days / 30, unit: "months" as const };
  }

  return { amount: days, unit: "days" as const };
}

function formatFrequency(days: number) {
  if (days % 30 === 0) {
    const months = days / 30;

    return `${months} month${months > 1 ? "s" : ""}`;
  }

  return `${days} day${days > 1 ? "s" : ""}`;
}

function isoToDateInput(value?: string) {
  if (!value) return "";
  return value.slice(0, 10);
}

export default function FriendCard({
  friend,
  onUpdateFriend,
  onDeleteFriend,
}: FriendCardProps) {
  const initialText = daysToAmountAndUnit(friend.textFrequencyDays);
  const initialHangout = daysToAmountAndUnit(friend.hangoutFrequencyDays);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(friend.name);
  const [notes, setNotes] = useState(friend.notes ?? "");
  const [category, setCategory] = useState<FriendCategory>(
    friend.category ?? "other"
  );
  const [lastTexted, setLastTexted] = useState(
    isoToDateInput(friend.lastTexted)
  );
  const [lastHungOut, setLastHungOut] = useState(
    isoToDateInput(friend.lastHungOut)
  );

  const [textAmount, setTextAmount] = useState(initialText.amount);
  const [textUnit, setTextUnit] = useState<"days" | "months">(initialText.unit);

  const [hangoutAmount, setHangoutAmount] = useState(initialHangout.amount);
  const [hangoutUnit, setHangoutUnit] = useState<"days" | "months">(
    initialHangout.unit
  );

  const textStatus = getStatus(friend.lastTexted, friend.textFrequencyDays);
  const hangoutStatus = getStatus(
    friend.lastHungOut,
    friend.hangoutFrequencyDays
  );

  function statusLabel(status: "good" | "dueSoon" | "overdue") {
    if (status === "good") return "Good";
    if (status === "dueSoon") return "Due soon";
    return "Overdue";
  }

  function statusClass(status: "good" | "dueSoon" | "overdue") {
    if (status === "good") return "bg-green-100 text-green-700";
    if (status === "dueSoon") return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  }

  function handleSave() {
    onUpdateFriend({
      ...friend,
      name,
      notes,
      category,
      lastTexted: lastTexted ? new Date(lastTexted).toISOString() : undefined,
      lastHungOut: lastHungOut ? new Date(lastHungOut).toISOString() : undefined,
      textFrequencyDays: textUnit === "months" ? textAmount * 30 : textAmount,
      hangoutFrequencyDays:
        hangoutUnit === "months" ? hangoutAmount * 30 : hangoutAmount,
    });

    setIsEditing(false);
  }

  function handleCancel() {
    const resetText = daysToAmountAndUnit(friend.textFrequencyDays);
    const resetHangout = daysToAmountAndUnit(friend.hangoutFrequencyDays);

    setName(friend.name);
    setCategory(friend.category ?? "other");
    setNotes(friend.notes ?? "");
    setLastTexted(isoToDateInput(friend.lastTexted));
    setLastHungOut(isoToDateInput(friend.lastHungOut));
    setTextAmount(resetText.amount);
    setTextUnit(resetText.unit);
    setHangoutAmount(resetHangout.amount);
    setHangoutUnit(resetHangout.unit);
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-4">
        <input
          className="w-full rounded-lg border px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <textarea
          className="w-full rounded-lg border px-3 py-2"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes"
          />
        <label className="space-y-1 block">
          <span className="text-sm">Category</span>

          <select
            className="w-full rounded-lg border px-3 py-2"
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

        <div className="grid grid-cols-2 gap-2">
          <button
            className="rounded-lg bg-black px-3 py-2 text-sm text-white"
            onClick={handleSave}
          >
            Save
          </button>

          <button
            className="rounded-lg border px-3 py-2 text-sm"
            onClick={handleCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{friend.name}</h3>
        <p className="text-xs uppercase tracking-wide text-gray-400">
          {friend.category ?? "other"}
        </p>
        {friend.notes && <p className="text-sm text-gray-500">{friend.notes}</p>}
      </div>

      <div className="space-y-2 text-sm">
        <div className="text-sm text-gray-500 space-y-1">
          <p>
            Text every:{" "}
            <span className="font-medium text-black">
              {formatFrequency(friend.textFrequencyDays)}
            </span>
          </p>

          <p>
            Hang out every:{" "}
            <span className="font-medium text-black">
              {formatFrequency(friend.hangoutFrequencyDays)}
            </span>
          </p>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Last texted: {formatLastInteraction(friend.lastTexted)}</span>
          <span
            className={`shrink-0 rounded-full px-2 py-1 text-xs ${statusClass(
              textStatus
            )}`}
          >
            {statusLabel(textStatus)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span>Last hung out: {formatLastInteraction(friend.lastHungOut)}</span>
          <span
            className={`shrink-0 rounded-full px-2 py-1 text-xs ${statusClass(
              hangoutStatus
            )}`}
          >
            {statusLabel(hangoutStatus)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          className="rounded-lg border px-3 py-2 text-sm"
          onClick={() =>
            onUpdateFriend({
              ...friend,
              lastTexted: new Date().toISOString(),
            })
          }
        >
          Texted today
        </button>

        <button
          className="rounded-lg border px-3 py-2 text-sm"
          onClick={() =>
            onUpdateFriend({
              ...friend,
              lastHungOut: new Date().toISOString(),
            })
          }
        >
          Hung out today
        </button>
      </div>

      <div className="flex justify-between">
        <button
          className="text-sm text-gray-600"
          onClick={() => setIsEditing(true)}
        >
          Edit
        </button>

        <button
          className="text-sm text-red-500"
          onClick={() => onDeleteFriend(friend.id)}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
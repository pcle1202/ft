"use client";

import { useState } from "react";
import { Friend, FriendCategory } from "@/types/friend";
import { formatLastInteraction, getStatus } from "@/lib/date";

type InteractionType = "text" | "hangout";

type Interaction = {
  id: string;
  type: InteractionType;
  date: string;
  notes?: string;
  location?: string;
};

type FriendWithInteractions = Friend & {
  interactions?: Interaction[];
};

type FriendCardProps = {
  friend: FriendWithInteractions;
  onUpdateFriend: (friend: FriendWithInteractions) => void;
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

function getHealthLabel(score: number) {
  if (score >= 75) return "Healthy";
  if (score >= 45) return "Needs attention";
  return "Overdue";
}

export default function FriendCard({
  friend,
  onUpdateFriend,
  onDeleteFriend,
}: FriendCardProps) {
  const initialText = daysToAmountAndUnit(friend.textFrequencyDays);
  const initialHangout = daysToAmountAndUnit(friend.hangoutFrequencyDays);

  const [isEditing, setIsEditing] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
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
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [editingInteractionId, setEditingInteractionId] = useState<string | null>(
    null
  );
  const [textAmount, setTextAmount] = useState(initialText.amount);
  const [textUnit, setTextUnit] = useState<"days" | "months">(initialText.unit);

  const [hangoutAmount, setHangoutAmount] = useState(initialHangout.amount);
  const [hangoutUnit, setHangoutUnit] = useState<"days" | "months">(
    initialHangout.unit
  );

  const [logType, setLogType] = useState<InteractionType | null>(null);
  const [logNotes, setLogNotes] = useState("");
  const [logLocation, setLogLocation] = useState("");

  const textStatus = getStatus(friend.lastTexted, friend.textFrequencyDays);
  const hangoutStatus = getStatus(
    friend.lastHungOut,
    friend.hangoutFrequencyDays
  );

  const healthScore = getHealthScore(friend);
  const healthLabel = getHealthLabel(healthScore);
  const interactions = friend.interactions ?? [];

  function statusLabel(status: "good" | "dueSoon" | "overdue") {
    if (status === "good") return "Good";
    if (status === "dueSoon") return "Due soon";
    return "Overdue";
  }

  function statusClass(status: "good" | "dueSoon" | "overdue") {
    if (status === "good") return "bg-emerald-100 text-emerald-700";
    if (status === "dueSoon") return "bg-amber-100 text-amber-700";
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
      interactions,
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

  function openLogModal(type: InteractionType) {
    setLogType(type);
    setLogNotes("");
    setLogLocation("");
    setLogDate(new Date().toISOString().slice(0, 10));
    setEditingInteractionId(null);
  }

  function closeLogModal() {
    setLogType(null);
    setLogNotes("");
    setLogLocation("");
    setLogDate(new Date().toISOString().slice(0, 10));
    setEditingInteractionId(null);
  }

  function handleLogInteraction() {
    if (!logType) return;

    const selectedDate = new Date(logDate).toISOString();

    if (editingInteractionId) {
      const updatedInteractions = interactions.map((interaction) =>
        interaction.id === editingInteractionId
          ? {
              ...interaction,
              type: logType,
              date: selectedDate,
              notes: logNotes.trim() || undefined,
              location:
                logType === "hangout"
                  ? logLocation.trim() || undefined
                  : undefined,
            }
          : interaction
      );

      onUpdateFriend({
        ...friend,
        lastTexted:
          logType === "text" ? selectedDate : friend.lastTexted,
        lastHungOut:
          logType === "hangout" ? selectedDate : friend.lastHungOut,
        interactions: updatedInteractions,
      });

      closeLogModal();
      return;
    }

    const newInteraction: Interaction = {
      id: crypto.randomUUID(),
      type: logType,
      date: selectedDate,
      notes: logNotes.trim() || undefined,
      location:
        logType === "hangout" ? logLocation.trim() || undefined : undefined,
    };

    onUpdateFriend({
      ...friend,
      lastTexted: logType === "text" ? selectedDate : friend.lastTexted,
      lastHungOut: logType === "hangout" ? selectedDate : friend.lastHungOut,
      interactions: [newInteraction, ...interactions],
    });

    closeLogModal();
  }
  function handleEditInteraction(interaction: Interaction) {
    setLogType(interaction.type);
    setLogDate(interaction.date.slice(0, 10));
    setLogNotes(interaction.notes ?? "");
    setLogLocation(interaction.location ?? "");
    setEditingInteractionId(interaction.id);
  }

  function handleDeleteInteraction(interactionId: string) {
    const updatedInteractions = interactions.filter(
      (interaction) => interaction.id !== interactionId
    );

    onUpdateFriend({
      ...friend,
      interactions: updatedInteractions,
    });
  }
  
  
  if (isEditing) {
    return (
      <div className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
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

        <label className="block space-y-1">
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

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="rounded-lg bg-stone-900 px-3 py-2 text-sm text-white"
            onClick={handleSave}
          >
            Save
          </button>

          <button
            type="button"
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
    <>
      <div className="space-y-5 rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <h3 className="truncate text-xl font-semibold text-stone-900">
              {friend.name}
            </h3>

            <p className="mt-1 text-xs uppercase tracking-wide text-stone-400">
              {friend.category ?? "other"}
            </p>

            {friend.notes && (
              <p className="mt-3 line-clamp-2 text-sm text-stone-500">
                {friend.notes}
              </p>
            )}
          </div>

          <div className="shrink-0 rounded-2xl bg-stone-900 px-4 py-3 text-center text-white">
            <p className="text-3xl font-bold leading-none">{healthScore}%</p>
            <p className="mt-1 text-xs">{healthLabel}</p>
          </div>
        </div>

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-stone-50 p-3">
            <p className="text-stone-400">Text cadence</p>
            <p className="font-medium text-stone-900">
              Every {formatFrequency(friend.textFrequencyDays)}
            </p>
          </div>

          <div className="rounded-xl bg-stone-50 p-3">
            <p className="text-stone-400">Hangout cadence</p>
            <p className="font-medium text-stone-900">
              Every {formatFrequency(friend.hangoutFrequencyDays)}
            </p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-stone-600">
              Last texted: {formatLastInteraction(friend.lastTexted)}
            </span>

            <span
              className={`shrink-0 rounded-full px-2 py-1 text-xs ${statusClass(
                textStatus
              )}`}
            >
              {statusLabel(textStatus)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-stone-600">
              Last hung out: {formatLastInteraction(friend.lastHungOut)}
            </span>

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
            type="button"
            className="rounded-lg border px-3 py-2 text-sm hover:bg-stone-50"
            onClick={() => openLogModal("text")}
          >
            Texted today
          </button>

          <button
            type="button"
            className="rounded-lg border px-3 py-2 text-sm hover:bg-stone-50"
            onClick={() => openLogModal("hangout")}
          >
            Hung out today
          </button>
        </div>

        {interactions.length > 0 && (
          <div className="rounded-xl border bg-stone-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-stone-900">
                Recent interactions
              </p>
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="text-xs text-stone-500 hover:text-stone-900"
            >
              View all
            </button>
            </div>

            <div className="space-y-2">
{interactions.slice(0, 3).map((interaction) => (
  <div
    key={interaction.id}
    className="rounded-lg bg-white p-3 text-sm text-stone-600"
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <p>
          <span className="font-medium capitalize text-stone-900">
            {interaction.type}
          </span>{" "}
          · {formatLastInteraction(interaction.date)}
        </p>

        {interaction.location && (
          <p className="mt-1 text-xs text-stone-500">
            📍 {interaction.location}
          </p>
        )}

        {interaction.notes && (
          <p className="mt-1 text-xs text-stone-500">
            {interaction.notes}
          </p>
        )}
      </div>

      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => handleEditInteraction(interaction)}
          className="text-xs text-stone-500 hover:text-stone-900"
        >
          Edit
        </button>

        <button
          type="button"
          onClick={() => handleDeleteInteraction(interaction.id)}
          className="text-xs text-red-500 hover:text-red-600"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
))}
            </div>
          </div>
        )}
        <div className="flex justify-between border-t pt-3">
          <button
            type="button"
            className="text-sm text-stone-600 hover:text-stone-900"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </button>

          <button
            type="button"
            className="text-sm text-red-500 hover:text-red-600"
            onClick={() => onDeleteFriend(friend.id)}
          >
            Delete
          </button>
        </div>
      </div>

      {logType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
            <h2 className="text-xl font-semibold text-stone-900">
              {editingInteractionId ? "Edit" : "Log"}{" "}
              {logType === "text" ? "Text" : "Hangout"}
            </h2>

                <p className="mt-1 text-sm text-stone-500">
                  Confirm now, or add details first.
                </p>
              </div>

              <button
                type="button"
                onClick={closeLogModal}
                className="rounded-full px-2 text-xl text-stone-500 hover:bg-stone-100"
              >
                ×
              </button>
            </div>
            <label className="mt-5 block space-y-1">
              <span className="text-sm">Date</span>

              <input
                type="date"
                className="w-full rounded-lg border px-3 py-2"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
              />
            </label>
            {logType === "hangout" && (
              <label className="mt-5 block space-y-1">
                <span className="text-sm">Where did you hang out?</span>

                <input
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="Coffee shop, campus, restaurant..."
                  value={logLocation}
                  onChange={(e) => setLogLocation(e.target.value)}
                />
              </label>
            )}

            <label className="mt-5 block space-y-1">
              <span className="text-sm">
                {logType === "text"
                  ? "What did you talk about?"
                  : "What did you do?"}
              </span>

              <textarea
                className="w-full rounded-lg border px-3 py-2"
                placeholder="Optional details..."
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
              />
            </label>

            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={closeLogModal}
                className="rounded-xl border px-4 py-3 text-sm hover:bg-stone-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleLogInteraction}
                className="rounded-xl bg-stone-900 px-4 py-3 text-sm text-white hover:bg-stone-700"
              >
                {editingInteractionId ? "Save Changes" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    {showHistoryModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
    <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-stone-900">
            Interaction History
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            {friend.name} · {interactions.length} total
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowHistoryModal(false)}
          className="rounded-full px-2 text-xl text-stone-500 hover:bg-stone-100"
        >
          ×
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {interactions.map((interaction) => (
          <div
            key={interaction.id}
            className="rounded-xl border bg-stone-50 p-4 text-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p>
                  <span className="font-medium capitalize text-stone-900">
                    {interaction.type}
                  </span>{" "}
                  · {formatLastInteraction(interaction.date)}
                </p>

                {interaction.location && (
                  <p className="mt-1 text-xs text-stone-500">
                    📍 {interaction.location}
                  </p>
                )}

                {interaction.notes && (
                  <p className="mt-1 text-xs text-stone-500">
                    {interaction.notes}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowHistoryModal(false);
                    handleEditInteraction(interaction);
                  }}
                  className="text-xs text-stone-500 hover:text-stone-900"
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteInteraction(interaction.id)}
                  className="text-xs text-red-500 hover:text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)}
    </>
  );
}
"use client";

import { useState } from "react";
import { Friend, FriendCategory, Interaction, InteractionType } from "@/types/friend";
import { formatLastInteraction, getStatus } from "@/lib/date";

type FriendCardProps = {
  friend: Friend;
  onUpdateFriend: (friend: Friend) => void;
  onDeleteFriend: (friendId: string) => void;
};

function daysToAmountAndUnit(days: number) {
  if (days % 30 === 0) return { amount: days / 30, unit: "months" as const };
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
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

function getUrgency(friend: Friend) {
  return Math.max(
    getDaysAgo(friend.lastTexted) - friend.textFrequencyDays,
    getDaysAgo(friend.lastHungOut) - friend.hangoutFrequencyDays
  );
}

function getHealthScore(friend: Friend) {
  const urgency = getUrgency(friend);
  if (urgency === Infinity) return 0;
  return Math.max(Math.min(100 - Math.max(urgency, 0) * 8, 100), 0);
}

function getHealthLabel(score: number) {
  if (score >= 75) return "Healthy";
  if (score >= 45) return "Needs attention";
  return "Overdue";
}

function getHealthDotClass(score: number) {
  if (score >= 75) return "bg-sage";
  if (score >= 45) return "bg-goldenrod";
  return "bg-rust";
}

function getHealthTextClass(score: number) {
  if (score >= 75) return "text-sage";
  if (score >= 45) return "text-goldenrod";
  return "text-rust";
}

function statusLabel(status: "good" | "dueSoon" | "overdue") {
  if (status === "good") return "Good";
  if (status === "dueSoon") return "Due soon";
  return "Overdue";
}

function statusClass(status: "good" | "dueSoon" | "overdue") {
  if (status === "good") return "text-sage";
  if (status === "dueSoon") return "text-goldenrod";
  return "text-rust";
}

function statusBgClass(status: "good" | "dueSoon" | "overdue") {
  if (status === "good") return "bg-[#EAF2ED]";
  if (status === "dueSoon") return "bg-[#FBF0E0]";
  return "bg-[#FAECE9]";
}

const INPUT_CLASS =
  "w-full rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-earth placeholder:text-clay outline-none focus:ring-2 focus:ring-bark/30 transition";

export default function FriendCard({ friend, onUpdateFriend, onDeleteFriend }: FriendCardProps) {
  const initialText = daysToAmountAndUnit(friend.textFrequencyDays);
  const initialHangout = daysToAmountAndUnit(friend.hangoutFrequencyDays);

  const [isEditing, setIsEditing] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [name, setName] = useState(friend.name);
  const [notes, setNotes] = useState(friend.notes ?? "");
  const [category, setCategory] = useState<FriendCategory>(friend.category ?? "other");
  const [lastTexted, setLastTexted] = useState(isoToDateInput(friend.lastTexted));
  const [lastHungOut, setLastHungOut] = useState(isoToDateInput(friend.lastHungOut));
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [editingInteractionId, setEditingInteractionId] = useState<string | null>(null);
  const [textAmount, setTextAmount] = useState(initialText.amount);
  const [textUnit, setTextUnit] = useState<"days" | "months">(initialText.unit);
  const [hangoutAmount, setHangoutAmount] = useState(initialHangout.amount);
  const [hangoutUnit, setHangoutUnit] = useState<"days" | "months">(initialHangout.unit);
  const [logType, setLogType] = useState<InteractionType | null>(null);
  const [logNotes, setLogNotes] = useState("");
  const [logLocation, setLogLocation] = useState("");

  const textStatus = getStatus(friend.lastTexted, friend.textFrequencyDays);
  const hangoutStatus = getStatus(friend.lastHungOut, friend.hangoutFrequencyDays);
  const healthScore = getHealthScore(friend);
  const healthLabel = getHealthLabel(healthScore);
  const interactions = friend.interactions ?? [];

  function handleSave() {
    onUpdateFriend({
      ...friend,
      name,
      notes,
      category,
      lastTexted: lastTexted ? new Date(lastTexted).toISOString() : undefined,
      lastHungOut: lastHungOut ? new Date(lastHungOut).toISOString() : undefined,
      textFrequencyDays: textUnit === "months" ? textAmount * 30 : textAmount,
      hangoutFrequencyDays: hangoutUnit === "months" ? hangoutAmount * 30 : hangoutAmount,
    });
    setIsEditing(false);
  }

  function handleCancel() {
    const rt = daysToAmountAndUnit(friend.textFrequencyDays);
    const rh = daysToAmountAndUnit(friend.hangoutFrequencyDays);
    setName(friend.name);
    setCategory(friend.category ?? "other");
    setNotes(friend.notes ?? "");
    setLastTexted(isoToDateInput(friend.lastTexted));
    setLastHungOut(isoToDateInput(friend.lastHungOut));
    setTextAmount(rt.amount);
    setTextUnit(rt.unit);
    setHangoutAmount(rh.amount);
    setHangoutUnit(rh.unit);
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
      const updated = interactions.map((i) =>
        i.id === editingInteractionId
          ? {
              ...i,
              type: logType,
              date: selectedDate,
              notes: logNotes.trim() || undefined,
              location: logType === "hangout" ? logLocation.trim() || undefined : undefined,
            }
          : i
      );
      const latestText = updated
        .filter((i) => i.type === "text")
        .sort((a, b) => b.date.localeCompare(a.date))[0]?.date;
      const latestHangout = updated
        .filter((i) => i.type === "hangout")
        .sort((a, b) => b.date.localeCompare(a.date))[0]?.date;
      onUpdateFriend({
        ...friend,
        lastTexted: latestText ?? friend.lastTexted,
        lastHungOut: latestHangout ?? friend.lastHungOut,
        interactions: updated,
      });
      closeLogModal();
      return;
    }

    const newInteraction: Interaction = {
      id: crypto.randomUUID(),
      type: logType,
      date: selectedDate,
      notes: logNotes.trim() || undefined,
      location: logType === "hangout" ? logLocation.trim() || undefined : undefined,
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
    onUpdateFriend({
      ...friend,
      interactions: interactions.filter((i) => i.id !== interactionId),
    });
  }

  /* ─── Edit mode ─── */
  if (isEditing) {
    return (
      <div className="px-10 py-8 max-w-2xl">
        <h2 className="font-serif text-2xl text-earth mb-6">Edit {friend.name}</h2>

        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-clay">Name</span>
            <input
              className={INPUT_CLASS}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-clay">Notes</span>
            <textarea
              className={INPUT_CLASS + " resize-none"}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything important to remember?"
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

        <div className="flex gap-3 mt-8">
          <button
            onClick={handleSave}
            className="flex-1 rounded-xl bg-bark text-cream py-2.5 text-sm font-medium hover:bg-earth transition-colors"
          >
            Save changes
          </button>
          <button
            onClick={handleCancel}
            className="flex-1 rounded-xl border border-sand py-2.5 text-sm text-clay hover:bg-parchment transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  /* ─── Detail view ─── */
  return (
    <>
      <div className="px-10 py-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-start gap-5 mb-6">
          <div className="w-16 h-16 rounded-full bg-bark flex items-center justify-center shrink-0">
            <span className="font-serif text-2xl text-cream">{friend.name[0]}</span>
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <h2 className="font-serif text-3xl text-earth leading-tight">{friend.name}</h2>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-xs rounded-full px-3 py-1 bg-parchment border border-sand text-clay capitalize">
                {friend.category}
              </span>
              <span
                className={`flex items-center gap-1.5 text-sm font-medium ${getHealthTextClass(healthScore)}`}
              >
                <span className={`w-2 h-2 rounded-full ${getHealthDotClass(healthScore)}`} />
                {healthLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {friend.notes && (
          <p className="text-clay text-sm italic mb-6 pl-4 border-l-2 border-sand leading-relaxed">
            {friend.notes}
          </p>
        )}

        {/* Cadence */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="rounded-xl bg-parchment border border-sand p-4">
            <p className="text-xs text-clay mb-1 uppercase tracking-wider">Text every</p>
            <p className="text-earth text-sm font-medium">
              Every {formatFrequency(friend.textFrequencyDays)}
            </p>
          </div>
          <div className="rounded-xl bg-parchment border border-sand p-4">
            <p className="text-xs text-clay mb-1 uppercase tracking-wider">Hang out every</p>
            <p className="text-earth text-sm font-medium">
              Every {formatFrequency(friend.hangoutFrequencyDays)}
            </p>
          </div>
        </div>

        {/* Last contact */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center justify-between rounded-xl bg-white border border-sand px-4 py-3">
            <span className="text-sm text-clay">Last texted</span>
            <div className="flex items-center gap-3">
              <span className="text-sm text-earth">{formatLastInteraction(friend.lastTexted)}</span>
              <span
                className={`text-xs rounded-full px-2.5 py-1 font-medium ${statusClass(textStatus)} ${statusBgClass(textStatus)}`}
              >
                {statusLabel(textStatus)}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-white border border-sand px-4 py-3">
            <span className="text-sm text-clay">Last hung out</span>
            <div className="flex items-center gap-3">
              <span className="text-sm text-earth">
                {formatLastInteraction(friend.lastHungOut)}
              </span>
              <span
                className={`text-xs rounded-full px-2.5 py-1 font-medium ${statusClass(hangoutStatus)} ${statusBgClass(hangoutStatus)}`}
              >
                {statusLabel(hangoutStatus)}
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <button
            onClick={() => openLogModal("text")}
            className="rounded-xl border border-sand bg-white px-4 py-3 text-sm text-earth hover:bg-parchment transition-colors"
          >
            Log text
          </button>
          <button
            onClick={() => openLogModal("hangout")}
            className="rounded-xl border border-sand bg-white px-4 py-3 text-sm text-earth hover:bg-parchment transition-colors"
          >
            Log hangout
          </button>
        </div>

        {/* Interactions */}
        {interactions.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-earth">Recent interactions</h3>
              <button
                onClick={() => setShowHistoryModal(true)}
                className="text-xs text-clay hover:text-earth transition-colors"
              >
                View all →
              </button>
            </div>

            <div className="space-y-2">
              {interactions.slice(0, 3).map((interaction) => (
                <div
                  key={interaction.id}
                  className="rounded-xl bg-white border border-sand p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${
                            interaction.type === "text"
                              ? "bg-[#EAF2ED] text-sage"
                              : "bg-[#FBF0E0] text-goldenrod"
                          }`}
                        >
                          {interaction.type === "text" ? "Text" : "Hangout"}
                        </span>
                        <span className="text-xs text-clay">
                          {formatLastInteraction(interaction.date)}
                        </span>
                      </div>
                      {interaction.location && (
                        <p className="text-xs text-clay">📍 {interaction.location}</p>
                      )}
                      {interaction.notes && (
                        <p className="text-sm text-clay italic mt-1">
                          &ldquo;{interaction.notes}&rdquo;
                        </p>
                      )}
                    </div>
                    <div className="flex gap-3 shrink-0 pt-0.5">
                      <button
                        onClick={() => handleEditInteraction(interaction)}
                        className="text-xs text-clay hover:text-earth transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteInteraction(interaction.id)}
                        className="text-xs text-rust hover:text-earth transition-colors"
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

        {/* Footer */}
        <div className="flex justify-between pt-6 border-t border-sand">
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm text-clay hover:text-earth transition-colors"
          >
            Edit friend
          </button>
          <button
            onClick={() => onDeleteFriend(friend.id)}
            className="text-sm text-rust hover:text-earth transition-colors"
          >
            Remove
          </button>
        </div>
      </div>

      {/* Log modal */}
      {logType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="font-serif text-xl text-earth">
                  {editingInteractionId ? "Edit" : "Log"}{" "}
                  {logType === "text" ? "text" : "hangout"}
                </h2>
                <p className="text-sm text-clay mt-0.5">Confirm now, or add details first.</p>
              </div>
              <button
                onClick={closeLogModal}
                className="text-xl text-clay hover:text-earth leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-clay">Date</span>
                <input
                  type="date"
                  className={INPUT_CLASS}
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                />
              </label>

              {logType === "hangout" && (
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-clay">Where?</span>
                  <input
                    className={INPUT_CLASS}
                    placeholder="Coffee shop, campus, their place…"
                    value={logLocation}
                    onChange={(e) => setLogLocation(e.target.value)}
                  />
                </label>
              )}

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-clay">
                  {logType === "text" ? "What did you talk about?" : "What did you do?"}
                </span>
                <textarea
                  className={INPUT_CLASS + " resize-none"}
                  rows={3}
                  placeholder="Optional…"
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={closeLogModal}
                className="rounded-xl border border-sand py-2.5 text-sm text-clay hover:bg-parchment transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogInteraction}
                className="rounded-xl bg-bark text-cream py-2.5 text-sm font-medium hover:bg-earth transition-colors"
              >
                {editingInteractionId ? "Save changes" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="font-serif text-xl text-earth">Interaction history</h2>
                <p className="text-sm text-clay mt-0.5">
                  {friend.name} · {interactions.length} total
                </p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-xl text-clay hover:text-earth leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-2">
              {interactions.map((interaction) => (
                <div
                  key={interaction.id}
                  className="rounded-xl border border-sand bg-cream p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${
                            interaction.type === "text"
                              ? "bg-[#EAF2ED] text-sage"
                              : "bg-[#FBF0E0] text-goldenrod"
                          }`}
                        >
                          {interaction.type === "text" ? "Text" : "Hangout"}
                        </span>
                        <span className="text-xs text-clay">
                          {formatLastInteraction(interaction.date)}
                        </span>
                      </div>
                      {interaction.location && (
                        <p className="text-xs text-clay">📍 {interaction.location}</p>
                      )}
                      {interaction.notes && (
                        <p className="text-sm text-clay italic mt-1">
                          &ldquo;{interaction.notes}&rdquo;
                        </p>
                      )}
                    </div>
                    <div className="flex gap-3 shrink-0 pt-0.5">
                      <button
                        onClick={() => {
                          setShowHistoryModal(false);
                          handleEditInteraction(interaction);
                        }}
                        className="text-xs text-clay hover:text-earth transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteInteraction(interaction.id)}
                        className="text-xs text-rust hover:text-earth transition-colors"
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

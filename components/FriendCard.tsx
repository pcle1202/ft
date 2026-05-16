"use client";

import { Friend } from "@/types/friend";
import { formatLastInteraction, getStatus } from "@/lib/date";

type FriendCardProps = {
  friend: Friend;
  onUpdateFriend: (friend: Friend) => void;
  onDeleteFriend: (friendId: string) => void;
};

export default function FriendCard({
  friend,
  onUpdateFriend,
  onDeleteFriend,
}: FriendCardProps) {
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

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{friend.name}</h3>
        {friend.notes && <p className="text-sm text-gray-500">{friend.notes}</p>}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span>Last texted: {formatLastInteraction(friend.lastTexted)}</span>
          <span className={`rounded-full px-2 py-1 text-xs ${statusClass(textStatus)}`}>
            {statusLabel(textStatus)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span>Last hung out: {formatLastInteraction(friend.lastHungOut)}</span>
          <span className={`rounded-full px-2 py-1 text-xs ${statusClass(hangoutStatus)}`}>
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

      <button
        className="text-sm text-red-500"
        onClick={() => onDeleteFriend(friend.id)}
      >
        Delete
      </button>
    </div>
  );
}
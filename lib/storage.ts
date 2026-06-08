import { Friend } from "@/types/friend";

// ─── Guest detection ──────────────────────────────────────────────────────────

export function isGuest(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("friendkeeper-guest") === "1";
}

// ─── localStorage helpers (guest mode only) ───────────────────────────────────

function lsKey(userId: string) {
  return `friendkeeper-friends-${userId}`;
}

function lsGet(userId: string): Friend[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(lsKey(userId));
    return raw ? (JSON.parse(raw) as Friend[]) : [];
  } catch {
    return [];
  }
}

function lsSave(userId: string, friends: Friend[]): void {
  localStorage.setItem(lsKey(userId), JSON.stringify(friends));
}

// ─── API helpers (authenticated users) ───────────────────────────────────────

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${options?.method ?? "GET"} ${url} failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

// ─── Public API — called by components, transparent to storage backend ────────

export async function getFriends(userId: string): Promise<Friend[]> {
  if (userId === "guest") return lsGet(userId);
  return apiFetch<Friend[]>("/api/friends");
}

export async function addFriend(friend: Friend, userId: string): Promise<void> {
  if (userId === "guest") {
    lsSave(userId, [...lsGet(userId), friend]);
    return;
  }
  await apiFetch("/api/friends", { method: "POST", body: JSON.stringify(friend) });
}

export async function updateFriend(friend: Friend, userId: string): Promise<void> {
  if (userId === "guest") {
    lsSave(userId, lsGet(userId).map((f) => (f.id === friend.id ? friend : f)));
    return;
  }
  await apiFetch(`/api/friends/${friend.id}`, { method: "PUT", body: JSON.stringify(friend) });
}

export async function deleteFriend(friendId: string, userId: string): Promise<void> {
  if (userId === "guest") {
    lsSave(userId, lsGet(userId).filter((f) => f.id !== friendId));
    return;
  }
  await apiFetch(`/api/friends/${friendId}`, { method: "DELETE" });
}

// ─── Migration helpers ────────────────────────────────────────────────────────

export function hasLocalData(userId: string): boolean {
  if (typeof window === "undefined") return false;
  // Check both the user-specific key and the guest key
  for (const key of [lsKey(userId), lsKey("guest")]) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const friends = JSON.parse(raw) as Friend[];
      if (friends.length > 0) return true;
    } catch {
      // ignore
    }
  }
  return false;
}

export function hasGuestData(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(lsKey("guest"));
  if (!raw) return false;
  try {
    return (JSON.parse(raw) as Friend[]).length > 0;
  } catch {
    return false;
  }
}

export function getLocalFriends(userId: string): Friend[] {
  // Return user-specific data, falling back to guest data
  const userFriends = lsGet(userId);
  if (userFriends.length > 0) return userFriends;
  return lsGet("guest");
}

export function clearLocalData(userId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(lsKey(userId));
  localStorage.removeItem(lsKey("guest"));
  localStorage.removeItem(`friendkeeper-sample-${userId}`);
  localStorage.removeItem(`friendkeeper-sample-version-${userId}`);
}

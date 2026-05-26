import { Friend } from "@/types/friend";

function friendsKey(userId: string) {
  return `friendkeeper-friends-${userId}`;
}

export function getFriends(userId: string): Friend[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(friendsKey(userId));
    return raw ? (JSON.parse(raw) as Friend[]) : [];
  } catch {
    return [];
  }
}

function saveFriends(userId: string, friends: Friend[]): void {
  localStorage.setItem(friendsKey(userId), JSON.stringify(friends));
}

export function addFriend(friend: Friend, userId: string): void {
  saveFriends(userId, [...getFriends(userId), friend]);
}

export function updateFriend(friend: Friend, userId: string): void {
  saveFriends(
    userId,
    getFriends(userId).map((f) => (f.id === friend.id ? friend : f))
  );
}

export function deleteFriend(friendId: string, userId: string): void {
  saveFriends(
    userId,
    getFriends(userId).filter((f) => f.id !== friendId)
  );
}

import { Friend } from "@/types/friend";

const STORAGE_KEY = "friendship-tracker-friends";

export function getFriends(): Friend[] {
  if (typeof window === "undefined") return [];

  const stored = localStorage.getItem(STORAGE_KEY);

  if (!stored) return [];

  return JSON.parse(stored);
}

export function saveFriends(friends: Friend[]) {
  if (typeof window === "undefined") return;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(friends));
}

export function addFriend(friend: Friend) {
  const friends = getFriends();
  saveFriends([...friends, friend]);
}

export function updateFriend(updatedFriend: Friend) {
  const friends = getFriends();

  const updatedFriends = friends.map((friend) =>
    friend.id === updatedFriend.id ? updatedFriend : friend
  );

  localStorage.setItem("friends", JSON.stringify(updatedFriends));
}

export function deleteFriend(friendId: string) {
  const friends = getFriends();

  const updatedFriends = friends.filter((friend) => friend.id !== friendId);

  saveFriends(updatedFriends);
}
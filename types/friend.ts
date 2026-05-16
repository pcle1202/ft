export type FriendCategory =
  | "close friend"
  | "family"
  | "classmate"
  | "coworker"
  | "other";

export type Friend = {
  id: string;
  name: string;
  notes?: string;
  category: FriendCategory;
  lastTexted?: string;
  lastHungOut?: string;
  textFrequencyDays: number;
  hangoutFrequencyDays: number;
  createdAt: string;
};
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
  interactions: Interaction[];
  bio?: string;
  livesIn?: string;
  birthday?: string;
  metAt?: string;
  color?: string;
  photoUrl?: string;
  nextTopics?: string[];
};

export type InteractionType = "text" | "call" | "other" | "hangout" | "note";

export type Interaction = {
  id: string;
  type: InteractionType;
  date: string;
  notes?: string;
  location?: string;
  mood?: string;
  topics?: string[];
};

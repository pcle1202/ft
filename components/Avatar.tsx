"use client";

import { Friend } from "@/types/friend";

function initialsOf(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("");
}

type AvatarSize = "sm" | "md" | "reach" | "lg";

const sizeClass: Record<AvatarSize, string> = {
  sm: "avatar avatar-sm",
  md: "avatar",
  reach: "avatar",
  lg: "avatar avatar-lg",
};

const sizePx: Record<AvatarSize, number> = {
  sm: 26,
  md: 30,
  reach: 38,
  lg: 56,
};

export function FriendAvatar({
  friend,
  size = "md",
  className,
  style,
}: {
  friend: Friend;
  size?: AvatarSize;
  className?: string;
  style?: React.CSSProperties;
}) {
  const px = sizePx[size];
  const cssClass = [sizeClass[size], className].filter(Boolean).join(" ");

  if (friend.photoUrl) {
    return (
      <span
        className={cssClass}
        style={{ background: "transparent", overflow: "hidden", width: px, height: px, ...style }}
      >
        <img
          src={friend.photoUrl}
          alt={friend.name}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </span>
    );
  }

  return (
    <span
      className={cssClass}
      style={{ background: friend.color ?? "#7A5A3F", fontSize: size === "lg" ? 22 : size === "reach" ? 14 : undefined, width: size === "reach" ? px : undefined, height: size === "reach" ? px : undefined, ...style }}
    >
      {initialsOf(friend.name)}
    </span>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";

export default function AppNav() {
  const pathname = usePathname();
  const { isSignedIn } = useUser();

  return (
    <header
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        padding: "10px 20px",
        borderBottom: "1px solid #E0D9CE",
        background: "transparent",
        position: "relative",
        zIndex: 10,
      }}
    >
      {/* Left: Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            color: "#A68B50",
            fontSize: 18,
            transform: "rotate(-15deg)",
            display: "inline-block",
            lineHeight: 1,
          }}
        >
          ✦
        </span>
        <span
          style={{
            fontFamily: "var(--font-lora)",
            fontSize: 17,
            color: "#2E2A24",
            letterSpacing: "-0.01em",
          }}
        >
          friendkeeper
        </span>
      </div>

      {/* Center: Nav links */}
      <nav style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Link
          href="/dashboard"
          className={pathname === "/dashboard" ? "nav-link-active" : ""}
          style={{
            fontFamily: "var(--font-lora)",
            fontSize: 15,
            color: pathname === "/dashboard" ? "#2E2A24" : "#9A8F82",
            textDecoration: "none",
            paddingBottom: 4,
          }}
        >
          Dashboard
        </Link>
        <Link
          href="/"
          className={pathname === "/" ? "nav-link-active" : ""}
          style={{
            fontFamily: "var(--font-lora)",
            fontSize: 15,
            color: pathname === "/" ? "#2E2A24" : "#9A8F82",
            textDecoration: "none",
            paddingBottom: 4,
          }}
        >
          Friends
        </Link>
      </nav>

      {/* Right: User */}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
        {isSignedIn ? (
          <UserButton />
        ) : (
          <Link
            href="/sign-in"
            style={{
              fontSize: 12,
              color: "#9A8F82",
              textDecoration: "none",
            }}
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}

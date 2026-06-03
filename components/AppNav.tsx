"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";

export default function AppNav() {
  const pathname = usePathname();
  const { isSignedIn } = useUser();

  return (
    <header className="topnav">
      {/* Left: Brand */}
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21s-7-4.5-9-9.5C1.5 7 4.5 4 8 4c1.7 0 3.2.8 4 2 .8-1.2 2.3-2 4-2 3.5 0 6.5 3 5 7.5-2 5-9 9.5-9 9.5z"/>
          </svg>
        </span>
        <div className="brand-name">friendkeeper</div>
      </div>

      {/* Center: Nav links */}
      <nav className="topnav-links">
        <Link
          href="/dashboard"
          className={"navlink " + (pathname === "/dashboard" ? "is-on" : "")}
        >
          Dashboard
        </Link>
        <Link
          href="/"
          className={"navlink " + (pathname === "/" ? "is-on" : "")}
        >
          Friends
        </Link>
      </nav>

      {/* Right: User */}
      <div className="topnav-right">
        {isSignedIn ? (
          <UserButton />
        ) : (
          <Link href="/sign-in" className="navlink" style={{ fontSize: 13 }}>
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}

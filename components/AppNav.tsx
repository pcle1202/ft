"use client";

import { useEffect, useRef, useState } from "react";
import { useUser, UserButton, SignIn } from "@clerk/nextjs";

export default function AppNav() {
  const { isSignedIn } = useUser();
  const [showSignIn, setShowSignIn] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showSignIn) return;
    function onDown(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowSignIn(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowSignIn(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [showSignIn]);

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

      {/* Right: User */}
      <div className="topnav-right" style={{ gridColumn: "3", position: "relative" }} ref={popupRef}>
        {isSignedIn ? (
          <UserButton />
        ) : (
          <>
            <button
              onClick={() => setShowSignIn((v) => !v)}
              style={{ background: "transparent", border: 0, padding: 0, fontSize: 13, color: "var(--accent)", fontFamily: "var(--sans)", fontWeight: 500, cursor: "pointer" }}
            >
              Sign in
            </button>
            {showSignIn && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 10px)",
                right: 0,
                zIndex: 200,
                transform: "scale(0.78)",
                transformOrigin: "top right",
                filter: "drop-shadow(0 8px 24px rgba(50,30,10,0.18))",
              }}>
                <SignIn routing="hash" />
              </div>
            )}
          </>
        )}
      </div>
    </header>
  );
}

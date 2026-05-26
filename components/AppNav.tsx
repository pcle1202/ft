"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppNav() {
  const pathname = usePathname();

  return (
    <div className="px-4 py-3 flex gap-2 border-b border-sand">
      <Link
        href="/"
        className={`flex-1 text-center rounded-lg py-1.5 text-xs font-medium transition-colors ${
          pathname === "/"
            ? "bg-bark text-cream"
            : "text-clay hover:text-earth hover:bg-cream/60"
        }`}
      >
        Friends
      </Link>
      <Link
        href="/dashboard"
        className={`flex-1 text-center rounded-lg py-1.5 text-xs font-medium transition-colors ${
          pathname === "/dashboard"
            ? "bg-bark text-cream"
            : "text-clay hover:text-earth hover:bg-cream/60"
        }`}
      >
        Dashboard
      </Link>
    </div>
  );
}

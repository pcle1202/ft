"use client";

import { SignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();

  function continueAsGuest() {
    localStorage.setItem("friendkeeper-guest", "1");
    router.push("/");
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-cream px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-4xl text-earth">friendkeeper</h1>
          <p className="mt-2 text-sm text-clay">your people, remembered</p>
        </div>
        <SignIn />
        <div className="mt-6 text-center">
          <button
            onClick={continueAsGuest}
            className="text-sm text-clay hover:text-earth underline underline-offset-2 transition-colors"
          >
            Continue as guest
          </button>
        </div>
      </div>
    </div>
  );
}

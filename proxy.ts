import { clerkMiddleware } from "@clerk/nextjs/server";

// All routes are public by default. Individual API routes enforce auth
// via auth() from @clerk/nextjs/server when they need it.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
    "/(api|trpc)(.*)",
  ],
};

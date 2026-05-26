import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublic = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/", "/dashboard(.*)"]);


export default clerkMiddleware(async (auth, request) => {
  if (!isPublic(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
    "/(api|trpc)(.*)",
  ],
};

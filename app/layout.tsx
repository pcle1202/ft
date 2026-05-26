import type { Metadata } from "next";
import { Lora, DM_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "friendkeeper",
  description: "Track your friendships with care",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
    >
      <html lang="en" className={`${lora.variable} ${dmSans.variable} h-full`}>
        <body className="h-full">{children}</body>
      </html>
    </ClerkProvider>
  );
}

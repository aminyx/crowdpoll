import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "crowdpoll — live audience Q&A and polls",
    template: "%s · crowdpoll",
  },
  description:
    "Run live Q&A and polls for talks, streams and meetings. Audiences join with a code — no accounts, no apps — and results update in real time.",
  openGraph: {
    title: "crowdpoll",
    description: "Live audience Q&A and polls. Join with a code, vote in real time.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}

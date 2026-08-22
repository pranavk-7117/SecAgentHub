import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SecAgent Hub",
  description: "AI Security Agent Marketplace powered by HTTP 402 micropayments"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

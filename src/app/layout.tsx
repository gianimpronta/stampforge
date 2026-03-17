import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StampForge",
  description: "AI-assisted themed print design system",
};

export default function RootLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

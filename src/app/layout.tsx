import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Offside - Vanishing Point Tool",
  description:
    "Verify offside calls using vanishing point perspective geometry",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZeroCredits — Privacy-Preserving Lending",
  description:
    "Confidential DeFi lending powered by Fully Homomorphic Encryption on Fhenix CoFHE",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}

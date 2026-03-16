import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Game Manager",
  description: "Manage your game library JSON easily",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body className={`${inter.className} bg-[#0b0c10] text-[#c5c6c7] antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

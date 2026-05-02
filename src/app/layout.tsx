import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Zorbaya Dur - Anonim Bildirim Sistemi",
  description: "Okullarda zorbalığa karşı %100 anonim, yapay zeka destekli ve şeffaf bildirim sistemi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark">
      <body className={inter.className}>
        {children}
        <Toaster theme="dark" />
      </body>
    </html>
  );
}

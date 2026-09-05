import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://kozadestek.vercel.app'),
  title: "KOZA - Anonim Bildirim ve Koruma Sistemi",
  description: "KOZA: Korkularına teslim olma, omuzundaki yükü paylaş, zorda kalana el ver, aydınlığa birlikte kanat aç. Okullarda akran zorbalığına karşı %100 güvenli ve anonim koruma sistemi.",
  icons: {
    icon: [
      { url: "/icon.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "KOZA - Anonim Bildirim ve Koruma Sistemi",
    description: "Korkularına teslim olma, omuzundaki yükü paylaş, zorda kalana el ver, aydınlığa birlikte kanat aç.",
    url: "https://kozadestek.vercel.app",
    siteName: "KOZA",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "KOZA - Okullarda Akran Zorbalığına Karşı Koruma Platformu",
      },
    ],
    locale: "tr_TR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

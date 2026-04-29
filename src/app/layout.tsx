import type { Metadata } from "next";
import { Inter, Outfit, Geist_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-heading",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sunday Fun Day",
  description: "An app for our Sunday rounds.",
  applicationName: "Sunday Fun Day",
  appleWebApp: {
    capable: true,
    title: "SunFunDay",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/sun.webp",
    apple: "/icons/sun.webp",
  },
};

export const viewport = {
  themeColor: "#1f7d8a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

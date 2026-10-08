import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { aktivesThemeCss } from "@/lib/domain/theme";
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
  title: "Nik Huber Guitars",
  description: "Auftrags- und Fertigungsverwaltung",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Aktives Theme (Einstellungen → Themes) überschreibt die Farb-Tokens aus globals.css.
  // themeCss() lässt nur geprüfte Farbwerte durch.
  const themeCss = await aktivesThemeCss();
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {themeCss ? <style id="theme-vars">{`:root{${themeCss}}`}</style> : null}
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

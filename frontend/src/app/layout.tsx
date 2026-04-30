import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import SplineBackground from "@/components/ui/SplineBackground";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "SnakeOS — Gaming meets Operating Systems",
  description:
    "A premium Snake game platform that visualizes Operating System concepts in real-time. Play Solo, Multiplayer, AI modes while exploring process management, memory allocation, CPU scheduling, and more.",
  keywords: ["snake game", "operating systems", "visualization", "OS concepts", "gaming"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-slate-950 text-foreground font-sans selection:bg-primary/30">
        <SplineBackground />
        <Navbar />
        <main className="flex-1 pt-16 relative z-0">{children}</main>
      </body>
    </html>
  );
}

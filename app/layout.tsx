import type { Metadata } from "next";
import { Press_Start_2P, Orbitron } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const pixelFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
});

const hudFont = Orbitron({
  weight: ["400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-hud",
});

export const metadata: Metadata = {
  title: "CodeSprint'26 | Retro RPG",
  description: "A High-Stakes Coding Casino",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* PYODIDE LOADER - Removed as we are using server action Piston engine now */}
      </head>
      <body className={cn(
        pixelFont.variable,
        hudFont.variable,
        "bg-casino-void text-white font-pixel antialiased min-h-screen selection:bg-retro-green selection:text-black"
      )}>
        <main className="flex flex-col items-center justify-center min-h-screen w-full">
          {children}
        </main>
      </body>
    </html>
  );
}
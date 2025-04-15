import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";
import { Toaster } from "@/app/components/ui/toaster"

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AWS Dashboard",
  description: "AWS Services Management Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50`}>
        <div className="min-h-screen">
          <Navbar />
          <Sidebar />
          <main className="p-4 md:ml-16 lg:ml-64 pt-20 transition-all duration-300">
            {children}
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}

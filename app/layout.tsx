import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Navbar } from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";

const geist = Geist({
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
      <body className={`${geist.className} bg-gray-50`}>
        <div className="min-h-screen">
          <Navbar />
          <Sidebar />
          <main className="p-4 sm:ml-64 pt-20">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

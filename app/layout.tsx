import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SnackProvider } from "./SnackProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DWV",
  description: "Social Media Management App for FBA Care",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-gray-200">
      <body className={inter.className}>
        <SnackProvider>
          {children}
        </ SnackProvider>
      </body>
    </html>
  );
}

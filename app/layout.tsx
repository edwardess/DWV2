import type { Metadata } from "next";
import { Inter as FontSans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SnackProvider } from "@/components/common/feedback/Snackbar";
import { AuthProvider } from "@/components/services/AuthProvider";
import { MobileRestriction } from "@/components/common/MobileRestriction";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "DWV Calendar",
  description: "Manage your content calendar and social media assets",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        <AuthProvider>
          <SnackProvider>
              {children}
          </SnackProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

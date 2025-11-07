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
  title: "DWVA",
  description: "Manage your content calendar and social media assets",
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
            <MobileRestriction>
              {children}
            </MobileRestriction>
          </SnackProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

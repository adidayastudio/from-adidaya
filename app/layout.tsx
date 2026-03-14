import "./globals.css";
import "../shared/styles/tokens.css";
import "../shared/styles/typography.css";
import type { ReactNode } from "react";
import SidebarWrapper from "./SidebarWrapper";
import ServiceWorkerRegister from "@/components/dashboard/shared/ServiceWorkerRegister";
import { ThemeProvider } from "@/providers/ThemeProvider";

export const metadata = {
  title: "Adidaya Studio",
  description: "Architecture • Design • Development",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    manifest: "/manifest.json",
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/logo-adidaya-red.svg",
        color: "#E11D48", // Adidaya Red
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Adidaya",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="overflow-x-hidden" suppressHydrationWarning>
      <body className="bg-bg-100 dark:bg-neutral-900 text-text-primary dark:text-neutral-50 font-sans overflow-x-hidden transition-colors duration-300" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ServiceWorkerRegister />
          {/* Tooltip Layer */}
          <div
            id="tooltip-layer"
            className="fixed inset-0 pointer-events-none z-[9999]"
          />

          {/* macOS Desktop Background - Desktop only */}
          <div className="hidden md:block fixed inset-0 z-[-1] pointer-events-none bg-gradient-to-br from-[#E2E8F0] via-[#CBD5E1] to-[#94A3B8] dark:from-[#0F172A] dark:via-[#1E293B] dark:to-[#020617]" />
          <div className="hidden md:block fixed inset-0 z-[-1] pointer-events-none opacity-50 dark:opacity-20">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/20 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-400/20 blur-[120px] rounded-full" />
          </div>

          <SidebarWrapper>{children}</SidebarWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}

import "./globals.css";
import "../shared/styles/tokens.css";
import "../shared/styles/typography.css";
import type { ReactNode } from "react";
import SidebarWrapper from "./SidebarWrapper";
import ServiceWorkerRegister from "@/components/dashboard/shared/ServiceWorkerRegister";

export const metadata = {
  title: "Adidaya Studio",
  description: "Architecture • Design • Development",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="overflow-x-hidden" suppressHydrationWarning>
      <body className="bg-bg-100 text-text-primary font-sans overflow-x-hidden" suppressHydrationWarning>
        <ServiceWorkerRegister />
        {/* Tooltip Layer */}
        <div
          id="tooltip-layer"
          className="fixed inset-0 pointer-events-none z-[9999]"
        />

        <SidebarWrapper>{children}</SidebarWrapper>
      </body>
    </html>
  );
}

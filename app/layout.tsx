import "./globals.css";
import "../shared/styles/tokens.css";
import "../shared/styles/typography.css";
import type { ReactNode } from "react";
import SidebarWrapper from "./SidebarWrapper";

export const metadata = {
  title: "Adidaya Studio",
  description: "Architecture • Design • Development",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="overflow-x-hidden" suppressHydrationWarning>
      <body className="bg-bg-100 text-text-primary font-sans overflow-x-hidden" suppressHydrationWarning>

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

"use client";

import { useState, Suspense } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "../components/sidebar/Sidebar";
import MobileBottomBar from "../components/layout/MobileBottomBar";

export default function SidebarWrapper({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const pathname = usePathname();
  const isPublicPage = pathname === "/" || pathname === "/login";

  if (isPublicPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar onWidthChange={setSidebarWidth} />
      <main
        style={
          {
            "--sidebar-width": `${sidebarWidth}px`,
          } as React.CSSProperties
        }
        className="transition-all ml-0 md:ml-[var(--sidebar-width)]"
      >
        {children}
      </main>
      <Suspense fallback={null}>
        <MobileBottomBar />
      </Suspense>
    </>
  );
}

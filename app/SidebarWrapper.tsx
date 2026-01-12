"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "../components/sidebar/Sidebar";

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
      <main style={{ marginLeft: sidebarWidth }} className="transition-all">
        {children}
      </main>
    </>
  );
}

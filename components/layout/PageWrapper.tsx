"use client";

import React from "react";
import clsx from "clsx";
import { usePathname } from "next/navigation";

type PageWrapperProps = {
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  children: React.ReactNode;
  isTransparent?: boolean;
  fullWidth?: boolean;
};

export default function PageWrapper({
  sidebar,
  header,
  children,
  isTransparent = false,
  fullWidth = false,
}: PageWrapperProps) {
  const pathname = usePathname();
  const effectiveIsTransparent = isTransparent || pathname?.includes("/settings");

  return (
    <div className="md:mt-0 flex gap-4">
      {/* SUB SIDE BAR - Desktop only */}
      {sidebar && (
        <aside className="hidden lg:block w-[240px] shrink-0">
          <div className="sticky top-0">
            {sidebar}
          </div>
        </aside>
      )}

      {/* MAIN CONTENT CONTAINER */}
      <main className="flex-1 min-w-0">
        {header && <div className="mb-0 lg:mb-6 px-0">{header}</div>}
        <div className={clsx(
          "px-0 pb-32 md:pb-4",
          !effectiveIsTransparent && "lg:bg-white/40 lg:dark:bg-neutral-800/10 lg:backdrop-blur-md lg:rounded-3xl lg:border lg:border-white/40 lg:dark:border-white/5 lg:shadow-sm",
          !header && "mt-0"
        )}>
          <div className={clsx(!fullWidth && !effectiveIsTransparent && "p-6 lg:p-8")}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

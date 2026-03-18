import React from "react";
import clsx from "clsx";

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
  return (
    <div className="md:mt-0 flex gap-4">
      {/* SUB SIDE BAR - Desktop only */}
      {sidebar && (
        <aside className="hidden lg:block w-[240px] shrink-0">
          <div className="sticky top-0">
            <div className="bg-white/20 dark:bg-neutral-800/20 backdrop-blur-md rounded-2xl p-4 border border-white/40 dark:border-neutral-700/30 shadow-sm">
              {sidebar}
            </div>
          </div>
        </aside>
      )}

      {/* MAIN CONTENT CONTAINER */}
      <main className="flex-1 min-w-0">
        {header && <div className="mb-0 lg:mb-6 px-4 md:px-0">{header}</div>}
        <div className={clsx(
          "px-4 md:px-0 h-full pb-32 md:pb-4",
          !isTransparent && "lg:bg-white/40 lg:dark:bg-neutral-800/10 lg:backdrop-blur-md lg:rounded-3xl lg:border lg:border-white/40 lg:dark:border-white/5 lg:shadow-sm",
          !header && "mt-0"
        )}>
          <div className={clsx(!isTransparent && "p-6 lg:p-8")}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

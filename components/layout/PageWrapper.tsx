import React from "react";
import clsx from "clsx";

type PageWrapperProps = {
  sidebar: React.ReactNode;
  header?: React.ReactNode;
  children: React.ReactNode;
};

export default function PageWrapper({
  sidebar,
  header,
  children,
}: PageWrapperProps) {
  return (
    <div className="mt-2 flex gap-4">
      {/* SUB SIDE BAR - Desktop only */}
      <aside className="hidden lg:block w-[240px] shrink-0">
        <div className="sticky top-6">
          <div className="bg-white rounded-3xl p-4 shadow-sm">
            {sidebar}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT CONTAINER */}
      <main className="flex-1 min-w-0">
        {header && <div className="mb-6">{header}</div>}
        <div className={clsx("bg-white rounded-3xl p-4 h-full pb-24 md:pb-4 shadow-sm", !header && "mt-0")}>
          {children}
        </div>
      </main>

      {/* Mobile Sidebar Elements - Rendered outside hidden container */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
        {sidebar}
      </div>
    </div>
  );
}

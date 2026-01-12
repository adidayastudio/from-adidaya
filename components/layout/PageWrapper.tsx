import React from "react";

type PageWrapperProps = {
  sidebar: React.ReactNode;
  children: React.ReactNode;
};

export default function PageWrapper({
  sidebar,
  children,
}: PageWrapperProps) {
  return (
    <div className="mt-2 rounded-[24px] bg-neutral-100 p-4">
      <div className="flex gap-4">
        {/* SUB SIDE BAR - Desktop only */}
        <aside className="hidden lg:block w-[240px] shrink-0">
          <div className="sticky top-6">
            <div className="bg-white rounded-[16px] p-4">
              {sidebar}
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT CONTAINER */}
        <main className="flex-1 min-w-0">
          <div className="bg-white rounded-[16px] p-4 h-full pb-24 md:pb-4">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Elements - Rendered outside hidden container */}
      <div className="lg:hidden">
        {sidebar}
      </div>
    </div>
  );
}

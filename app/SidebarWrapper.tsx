"use client";

import { useState, Suspense, useEffect } from "react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import Sidebar from "../components/sidebar/Sidebar";
import { useHeader, HeaderProvider } from "@/components/providers/HeaderProvider";
import WebHeader from "@/components/layout/WebHeader";
import MobileBottomBar from "../components/layout/MobileBottomBarV2";
import ClockAccessoryBar from "../components/layout/ClockAccessoryBar";
import NotificationDrawer from "../components/dashboard/notifications/NotificationDrawer";
import { Toaster } from "react-hot-toast";
import { UserProvider } from "@/components/providers/UserProvider";

function MainLayout({
  children,
  isSidebarOpen,
  setIsSidebarOpen,
  sidebarWidth,
  setSidebarWidth,
  setIsNotifSheetOpen,
  isNotifSheetOpen,
  isMobile
}: {
  children: React.ReactNode,
  isSidebarOpen: boolean,
  setIsSidebarOpen: (v: boolean) => void,
  sidebarWidth: number,
  setSidebarWidth: (n: number) => void,
  setIsNotifSheetOpen: (v: boolean) => void,
  isNotifSheetOpen: boolean,
  isMobile: boolean
}) {
  const pathname = usePathname();
  const isVibePage = pathname === "/dashboard/vibe";
  const { headerContent } = useHeader();

  return (
    <>
      {/* DESKTOP WINDOW SHELL */}
      <div
        style={headerContent.shellBackground ? {
          background: headerContent.shellBackground,
        } : {
          background: 'rgba(255, 255, 255, 0.4)',
          // Dark mode variant handled via CSS class or inline check if possible, 
          // but since this is style object, let's use a CSS variable or a conditional.
        }}
        className={clsx(
          "hidden md:flex fixed inset-4 z-50 transition-all duration-1000 rounded-[32px] overflow-hidden p-4 gap-4",
          !headerContent.shellBackground && "bg-white/40 dark:bg-black/20 backdrop-blur-[32px] border border-white/60 dark:border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)]"
        )}
      >
        {/* Standard soft white/dark overlay - keep it subtle for Vibe */}
        <div className={clsx(
          "absolute inset-0 transition-opacity duration-1000 pointer-events-none z-0",
          headerContent.shellBackground ? "bg-white/[0.02]" : "bg-transparent"
        )} />

        <div className="relative z-10 flex h-full w-full gap-4 overflow-hidden">
          <Sidebar
            isOpen={isSidebarOpen}
            onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
            onWidthChange={setSidebarWidth}
          />

          <div className="flex-1 flex flex-col min-w-0 h-full relative rounded-[18px] overflow-hidden">
            <WebHeader
              onOpenNotifications={() => setIsNotifSheetOpen(true)}
            />

            <div className="flex-1 overflow-y-auto no-scrollbar pt-[60px] pointer-events-auto">
              {children}
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE LAYOUT */}
      <div
        className="md:hidden min-h-screen transition-all duration-1000"
        style={headerContent.shellBackground ? {
          background: headerContent.shellBackground,
        } : undefined}
      >
        {headerContent.shellBackground && (
          <div className="fixed inset-0 bg-white/60 dark:bg-neutral-950/60 pointer-events-none -z-10" />
        )}

        <Sidebar onWidthChange={setSidebarWidth} />
        <main
          style={
            {
              "--sidebar-width": `${sidebarWidth}px`,
            } as React.CSSProperties
          }
          className="transition-all"
        >
          {children}
        </main>

        {/* Hide bottom bar on Vibe page as requested */}
        {!isVibePage && (
          <Suspense fallback={null}>
            <MobileBottomBar />
          </Suspense>
        )}
      </div>

      <Suspense fallback={null}>
        <ClockAccessoryBar />
      </Suspense>

      <NotificationDrawer
        isOpen={isNotifSheetOpen}
        onClose={() => setIsNotifSheetOpen(false)}
      />

      <Toaster
        position="bottom-right"
        containerStyle={isMobile ? {
          bottom: 100, // Above bottom bar
          right: 20,
          left: 'auto',
          top: 'auto',
          zIndex: 99999,
        } : {
          bottom: 12,
          right: 12,
          zIndex: 99999,
        }}
        toastOptions={{
          className: '',
          style: {
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            padding: '12px 16px',
            color: '#1f2937',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            fontSize: '0.9rem',
            fontWeight: 500
          },
        }}
      />
    </>
  );
}

export default function SidebarWrapper({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  // Responsive check for toaster positioning
  const [isMobile, setIsMobile] = useState(false);
  const [isNotifSheetOpen, setIsNotifSheetOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const pathname = usePathname();
  const isPublicPage = pathname === "/" || pathname === "/login" || pathname?.startsWith("/flow/finance/purchasing/share");


  if (isPublicPage) {
    return (
      <UserProvider>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: '',
            style: {
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              padding: '12px 16px',
              color: '#1f2937',
              borderRadius: '12px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              fontSize: '0.9rem',
              fontWeight: 500
            },
          }}
        />
      </UserProvider>
    );
  }

  return (
    <UserProvider>
      <HeaderProvider>
        <MainLayout
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          sidebarWidth={sidebarWidth}
          setSidebarWidth={setSidebarWidth}
          setIsNotifSheetOpen={setIsNotifSheetOpen}
          isNotifSheetOpen={isNotifSheetOpen}
          isMobile={isMobile}
        >
          {children}
        </MainLayout>
      </HeaderProvider>
    </UserProvider>
  );
}

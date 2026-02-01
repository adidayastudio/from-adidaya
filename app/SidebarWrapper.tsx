"use client";

import { useState, Suspense, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "../components/sidebar/Sidebar";
import MobileBottomBar from "../components/layout/MobileBottomBar";
import { Toaster } from "react-hot-toast";
import { UserProvider } from "@/components/providers/UserProvider";

export default function SidebarWrapper({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(256);
  // Responsive check for toaster positioning
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const pathname = usePathname();
  const isPublicPage = pathname === "/" || pathname === "/login";

  return (
    <UserProvider>
      {isPublicPage ? (
        <>
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
              success: {
                style: {
                  background: 'rgba(236, 253, 245, 0.9)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  color: '#047857',
                },
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#ffffff',
                },
              },
              error: {
                style: {
                  background: 'rgba(254, 242, 242, 0.9)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#b91c1c',
                },
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#ffffff',
                },
              }
            }}
          />
        </>
      ) : (
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
          <Toaster
            position="bottom-right"
            containerStyle={isMobile ? {
              bottom: 100, // Above bottom bar
              right: 20,
              left: 'auto',
              top: 'auto',
              zIndex: 99999,
            } : {
              bottom: 80,
              right: 40,
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
              success: {
                style: {
                  background: 'rgba(236, 253, 245, 0.9)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  color: '#047857',
                },
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#ffffff',
                },
              },
              error: {
                style: {
                  background: 'rgba(254, 242, 242, 0.9)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#b91c1c',
                },
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#ffffff',
                },
              }
            }}
          />
        </>
      )}
    </UserProvider>
  );
}

import { DarkTheme, DefaultTheme, ThemeProvider as NativeThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View, Image } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { SearchProvider } from '@/context/SearchContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { UserProvider, useUserContext } from '@/context/UserProvider';
import { FinanceProvider } from '@/context/FinanceContext';
import { TenantProvider, useTenantContext } from '@/context/TenantContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { HeaderCircleButton } from '@/components/ui/HeaderCircleButton';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore errors during Fast Refresh or hot reload
});

// Suppress benign cancellation errors on Web (e.g. Abort due to cancellation of share)
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const msg = event?.reason?.message || String(event?.reason || '');
    const name = event?.reason?.name;
    if (
      name === 'AbortError' ||
      msg.includes('cancellation of share') ||
      msg.includes('Abort due to') ||
      msg.includes('Share canceled')
    ) {
      event.preventDefault?.();
    }
  });

  // Prevent mobile browser auto-zoom on input focus
  try {
    const styleId = 'prevent-zoom-mobile-style';
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.innerHTML = `
        @media screen and (max-width: 768px) {
          input, select, textarea {
            font-size: 16px !important;
          }
        }
      `;
      document.head.appendChild(styleEl);
    }
  } catch (e) {
    // Ignore runtime DOM errors
  }
}

export default function RootLayout() {
  return (
    <UserProvider>
      <TenantProvider>
        <FinanceProvider>
          <SearchProvider>
            <ThemeProvider>
              <InnerLayout />
            </ThemeProvider>
          </SearchProvider>
        </FinanceProvider>
      </TenantProvider>
    </UserProvider>
  );
}

function useProtectedRoute(user: any, authStatus: string) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (authStatus === 'unknown') return;

    const inAuthGroup = (segments[0] as string) === '(auth)' || segments[0] === 'login';

    if (authStatus === 'authenticated' && inAuthGroup) {
      // Redirect away from the login page.
      router.replace('/(tabs)/home');
    }
  }, [user, authStatus, segments]);
}

import { prepareAttendancePositionOnce } from '@/lib/attendanceLocation';
import { setupNotificationResponseListener } from '@/lib/notificationService';
import { isAdidayaTenant } from '@/components/ui/TenantBrandLogo';

function InnerLayout() {
  const { resolvedTheme } = useTheme();
  const { user, authStatus } = useUserContext();
  const { activeTenant } = useTenantContext();
  const router = useRouter();

  useProtectedRoute(user, authStatus);

  useEffect(() => {
    if (authStatus !== 'authenticated' || !user) return;
    prepareAttendancePositionOnce();
  }, [authStatus, user?.id]);

  useEffect(() => {
    const unsub = setupNotificationResponseListener(router);
    return () => {
      unsub();
    };
  }, [router]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const isAuth = authStatus === 'authenticated' && !!user;
      const isAdidaya = isAdidayaTenant(activeTenant);

      // 1. Dynamic Web Browser Tab Title
      if (!isAuth || !activeTenant) {
        document.title = 'Adidaya Studio';
      } else if (isAdidaya) {
        document.title = 'Adidaya Studio';
      } else {
        const tenantName = (activeTenant.branding_name || activeTenant.name || 'Workspace').trim();
        document.title = `Forma: ${tenantName}`;
      }

      // 2. Dynamic Web Browser Favicon (Instant Data URIs for maximum browser compatibility)
      const ADIDAYA_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1080 1080'%3E%3Cpath fill='%23D91011' d='M623.19,809.47h-169.09c-8.8,10.26-14.27,22.13-19.73,34.13-8.88,19.53-18.13,38.9-27.44,58.23-16.73,34.76-68.56,49.38-105.02,27.6-38.35-22.9-46.29-75.23-25.66-106.05,12.38-18.49,26.35-35.94,40.04-53.52,27.89-35.82,56.06-71.42,84.12-107.11,15.3-19.45,30.86-38.69,45.82-58.4,6.83-9,15.11-17.31,19.08-30.67-5.5.58-9.44.62-13.22,1.44-53.22,11.54-106.42,23.22-159.64,34.78-8.06,1.75-16.16,3.69-24.35,4.5-30.52,3.03-55.14-7.56-72.5-33.26-15.69-23.21-16.08-48.06-5.85-73.25,8.52-20.97,37.84-46.95,71.46-44.56,14.79,1.05,29.5,3.53,44.2,5.67,49,7.15,97.98,14.47,146.99,21.58,2.88.42,5.94-.43,10.94-.87-4.45-11.93-11.91-19.64-18.34-27.83-37.74-48.03-75.72-95.89-113.54-143.86-13.28-16.84-26.18-33.99-39.59-50.74-19.55-24.42-22.36-51.87-10.14-79.19,12.16-27.18,34.86-43.79,65.09-47.39,38.48-4.59,66.98,12.95,82.69,48.94,33.69,77.17,67.57,154.25,101.51,231.3,2.57,5.83,6.2,11.18,9.06,16.27,9.46-.66,9.51-7.77,11.37-12.6,13.61-35.45,26.7-71.1,40.27-106.57,4.42-11.55,9.06-23.12,14.82-34.03,18.71-35.42,64.92-46.98,100.8-28.68,49.25,25.12,56.1,88.15,17.43,124.99-33.47,31.88-65.7,65.07-98.36,97.79-3.8,3.81-6.87,8.35-12.38,15.15,9.22-.95,14.92-1.09,20.43-2.17,51-9.99,101.96-20.18,152.96-30.2,8.09-1.59,16.28-2.65,24.43-3.93,54.53-8.55,101.86,44.24,79.72,103.41-10.35,27.66-31.35,44.2-61.29,46.96-10.55.97-21.53.11-32.02-1.65-52.08-8.72-104.05-18.07-156.09-27.05-7.89-1.36-15.93-3.88-23.85-.5-1.71,8.39,4.46,12.63,8.32,17.48,43.2,54.24,86.65,108.29,130.06,162.37,11.88,14.8,24.32,29.19,35.6,44.44,6.82,9.21,13.48,19.12,17.46,29.74,13.56,36.2-.86,74.11-34.44,93.55-12.89,7.46-25.71,14.32-41.53,14.27-30.78-.08-54.76-12.07-69.26-39.31-10.05-18.88-17.68-39.05-26.46-58.62-4.69-10.45-9.51-20.84-14.9-32.61ZM540.29,622.33c-1.8,1.05-3.91,1.52-4.46,2.71-17.24,37.27-34.36,74.59-51.31,111.99-.89,1.96-.11,4.68-.11,7.43,2.41.6,4.67,1.66,6.92,1.66,32.86-.05,65.72-.23,98.59-.43.77,0,1.68-.4,2.25-.92.52-.48.66-1.37,1.6-3.55-13.29-38.47-32.17-75.86-48.37-114.35-.81-1.94-3.44-3.11-5.1-4.54Z'/%3E%3C/svg%3E`;
      const FORMA_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='48' fill='%230036F8'/%3E%3Cpath fill='%23FFFFFF' d='M50 18 C52 18 53 28 53 36 C59 30 67 25 69 27 C71 29 66 37 60 43 C68 43 78 44 78 46 C78 48 68 49 60 49 C66 55 71 63 69 65 C67 67 59 62 53 56 C53 64 52 74 50 74 C48 74 47 64 47 56 C41 62 33 67 31 65 C29 63 34 55 40 49 C32 49 22 48 22 46 C22 44 32 43 40 43 C34 37 29 29 31 27 C33 25 41 30 47 36 C47 28 48 18 50 18 Z'/%3E%3C/svg%3E`;

      let faviconUrl = ADIDAYA_SVG;
      try {
        if (!isAuth || !activeTenant) {
          faviconUrl = ADIDAYA_SVG;
        } else if (isAdidaya) {
          faviconUrl = ADIDAYA_SVG;
        } else {
          faviconUrl = activeTenant.branding_logo_url || activeTenant.logo_url || FORMA_SVG;
        }

        if (faviconUrl) {
          // Remove old icon tags to bust browser cache
          const oldIcons = document.querySelectorAll("link[rel*='icon'], link[rel='apple-touch-icon']");
          oldIcons.forEach(el => el.parentNode?.removeChild(el));

          const iconLink = document.createElement('link');
          iconLink.rel = 'icon';
          iconLink.type = faviconUrl.startsWith('data:image/svg') || faviconUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
          iconLink.href = faviconUrl;
          document.head.appendChild(iconLink);

          const shortcutLink = document.createElement('link');
          shortcutLink.rel = 'shortcut icon';
          shortcutLink.href = faviconUrl;
          document.head.appendChild(shortcutLink);

          const appleLink = document.createElement('link');
          appleLink.rel = 'apple-touch-icon';
          appleLink.setAttribute('sizes', '180x180');
          appleLink.href = (!isAuth || !activeTenant || isAdidaya)
            ? '/apple-touch-icon.png'
            : (activeTenant.branding_logo_url && !activeTenant.branding_logo_url.endsWith('.svg') ? activeTenant.branding_logo_url : '/apple-touch-icon.png');
          document.head.appendChild(appleLink);
        }
      } catch (e) {
        // Safe fallback
      }
    }
  }, [authStatus, user, activeTenant]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const bg = resolvedTheme === 'dark' ? '#000000' : '#F2F2F7';
      document.body.style.backgroundColor = bg;
      document.documentElement.style.backgroundColor = bg;
      let metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.setAttribute('name', 'theme-color');
        document.head.appendChild(metaThemeColor);
      }
      metaThemeColor.setAttribute('content', bg);

      let globalStyle = document.getElementById('forma-web-global-styles');
      if (!globalStyle) {
        globalStyle = document.createElement('style');
        globalStyle.id = 'forma-web-global-styles';
        globalStyle.innerHTML = `
          input, textarea, select, [contenteditable="true"], button {
            outline: none !important;
            -webkit-tap-highlight-color: transparent !important;
          }
          input:focus, textarea:focus, select:focus, [contenteditable="true"]:focus, button:focus {
            outline: none !important;
            box-shadow: none !important;
          }
          *:focus {
            outline: none !important;
          }
          input:focus-visible, textarea:focus-visible, select:focus-visible, [contenteditable="true"]:focus-visible, button:focus-visible {
            outline: none !important;
            box-shadow: none !important;
          }
        `;
        document.head.appendChild(globalStyle);
      }
    }
  }, [resolvedTheme]);

  useEffect(() => {
    // Safety fallback: force hide splash screen after 1.5s in case of slow auth
    const safetyTimer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 1500);

    if (authStatus !== 'unknown') {
      SplashScreen.hideAsync().catch(() => {});
      clearTimeout(safetyTimer);
    }

    return () => clearTimeout(safetyTimer);
  }, [authStatus]);

  if (authStatus === 'unknown') {
    return null;
  }

  const customLightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: '#F2F2F7',
      card: '#FFFFFF',
    },
  };

  const customDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: '#000000',
      card: '#000000',
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NativeThemeProvider value={resolvedTheme === 'dark' ? customDarkTheme : customLightTheme}>
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: resolvedTheme === 'dark' ? '#000000' : '#F2F2F7' },
            ...(Platform.OS === 'ios' ? { headerBackButtonDisplayMode: 'minimal' as const } : {}),
            headerLeft: Platform.OS !== 'ios' ? (props) => props.canGoBack ? (
              <View style={{ marginLeft: Platform.OS === 'web' ? 12 : 0, marginRight: 10 }}>
                <HeaderCircleButton
                  type="back"
                  isDark={resolvedTheme === 'dark'}
                  onPress={props.onPress}
                />
              </View>
            ) : undefined : undefined,
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false, headerBackTitle: ' ' }} />
          <Stack.Screen name="login" options={{ headerShown: true, headerTransparent: Platform.OS === 'ios', animation: 'fade' }} />
          <Stack.Screen name="tenant-setup" options={{ headerShown: true, headerTransparent: Platform.OS === 'ios', animation: 'slide_from_right' }} />
          <Stack.Screen name="join-tenant" options={{ headerShown: true, headerTransparent: Platform.OS === 'ios', animation: 'slide_from_right' }} />
          <Stack.Screen name="organization-settings" options={{ headerShown: true, headerTransparent: Platform.OS === 'ios', animation: 'slide_from_right' }} />
          <Stack.Screen name="organization-settings/general" options={{ headerShown: true, headerTransparent: Platform.OS === 'ios', animation: 'slide_from_right' }} />
          <Stack.Screen name="organization-settings/account" options={{ headerShown: true, headerTransparent: Platform.OS === 'ios', animation: 'slide_from_right' }} />
          <Stack.Screen name="organization-settings/team" options={{ headerShown: true, headerTransparent: Platform.OS === 'ios', animation: 'slide_from_right' }} />
          <Stack.Screen name="organization-settings/roles" options={{ headerShown: true, headerTransparent: Platform.OS === 'ios', animation: 'slide_from_right' }} />
          <Stack.Screen name="organization-settings/permissions" options={{ headerShown: true, headerTransparent: Platform.OS === 'ios', animation: 'slide_from_right' }} />
          <Stack.Screen name="organization-settings/notifications" options={{ headerShown: true, headerTransparent: Platform.OS === 'ios', animation: 'slide_from_right' }} />
          <Stack.Screen name="organization-settings/integrations" options={{ headerShown: true, headerTransparent: Platform.OS === 'ios', animation: 'slide_from_right' }} />
          <Stack.Screen name="organization-settings/security" options={{ headerShown: true, headerTransparent: Platform.OS === 'ios', animation: 'slide_from_right' }} />
          <Stack.Screen
            name="notifications"
            options={{
              presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
              headerShown: false,
              ...(Platform.OS === 'ios' ? {
                sheetGrabberVisible: true,
                sheetCornerRadius: 36,
                sheetAllowedDetents: [0.85, 1.0],
              } : {}),
              contentStyle: { backgroundColor: resolvedTheme === 'dark' ? '#1C1C1E' : '#F2F2F7' },
            }}
          />
          <Stack.Screen
            name="search-modal"
            options={{
              presentation: 'transparentModal',
              headerShown: false,
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen name="notification-history" options={{ headerShown: true, headerTransparent: Platform.OS === 'ios', animation: 'slide_from_right' }} />
          <Stack.Screen name="people-setup/[id]" options={{ headerShown: true, headerTransparent: Platform.OS === 'ios', animation: 'slide_from_right' }} />
          <Stack.Screen name="clock-setup/[id]" options={{ headerShown: true, headerTransparent: Platform.OS === 'ios', animation: 'slide_from_right' }} />
          <Stack.Screen name="finance-setup/[id]" options={{ headerShown: true, headerTransparent: Platform.OS === 'ios', animation: 'slide_from_right' }} />
          <Stack.Screen
            name="ui-playground"
            options={{ headerShown: true, animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="ui-playground-add"
            options={{
              presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
              headerShown: false,
              ...(Platform.OS === 'ios' ? {
                sheetAllowedDetents: [0.5, 1.0],
                sheetGrabberVisible: true,
              } : {}),
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen name="file-preview" options={{ headerShown: true, headerTransparent: Platform.OS === 'ios', animation: 'slide_from_right' }} />
          <Stack.Screen name="profile-details/account" options={{ headerShown: true, headerTransparent: Platform.OS === 'ios', animation: 'slide_from_right' }} />
          <Stack.Screen name="profile-details/identity" options={{ headerShown: true, headerTransparent: Platform.OS === 'ios', animation: 'slide_from_right' }} />
          <Stack.Screen name="profile-details/employment" options={{ headerShown: true, headerTransparent: Platform.OS === 'ios', animation: 'slide_from_right' }} />
          <Stack.Screen name="profile-details/access" options={{ headerShown: true, headerTransparent: Platform.OS === 'ios', animation: 'slide_from_right' }} />
          <Stack.Screen name="member-profile/[id]" options={{ headerShown: true, headerTransparent: Platform.OS === 'ios', animation: 'slide_from_right' }} />
          <Stack.Screen name="project-settings" options={{ headerShown: true, headerTransparent: Platform.OS === 'ios', animation: 'slide_from_right' }} />
          <Stack.Screen name="project-settings/[id]" options={{ headerShown: true, headerTransparent: Platform.OS === 'ios', animation: 'slide_from_right' }} />
          <Stack.Screen name="project-milestones/[id]" options={{ headerShown: true, headerTransparent: Platform.OS === 'ios', animation: 'slide_from_right' }} />
          <Stack.Screen name="project-tasks/[id]" options={{ headerShown: true, headerTransparent: Platform.OS === 'ios', animation: 'slide_from_right' }} />
          <Stack.Screen name="project-actions/[id]" options={{ headerShown: true, headerTransparent: Platform.OS === 'ios', animation: 'slide_from_right' }} />
          <Stack.Screen name="project-details/[id]" options={{ headerShown: true, headerTransparent: Platform.OS === 'ios', animation: 'slide_from_right' }} />
          <Stack.Screen name="project-activity-details/[id]" options={{ headerShown: true, headerTransparent: Platform.OS === 'ios', animation: 'slide_from_right' }} />
          <Stack.Screen name="project-setup/[id]/index" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="project-setup/[id]/general" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="project-setup/[id]/team" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="project-setup/[id]/management" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="project-setup/[id]/stages" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="project-setup/[id]/work-structure" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="project-setup/[id]/cost-system" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="project-setup/[id]/price-library" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="project-setup/[id]/time-system" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="project-setup/[id]/control" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="project-setup/[id]/reports" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="announcement-detail" options={{ headerShown: true, headerTransparent: Platform.OS === 'ios', animation: 'slide_from_right' }} />
          <Stack.Screen name="chat-details/[id]" options={{ headerShown: true, headerTransparent: Platform.OS === 'ios', animation: 'slide_from_right' }} />
          <Stack.Screen name="chat-info/[id]" options={{ headerShown: true, headerTransparent: Platform.OS === 'ios', animation: 'slide_from_right' }} />
        </Stack>
        <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
      </NativeThemeProvider>
    </GestureHandlerRootView>
  );
}

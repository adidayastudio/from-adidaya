import { useAdidayaNotifications } from '@/hooks/useAdidayaNotifications';
import { HeaderToolbar, HeaderToolbarAction } from '@/components/ui/HeaderToolbar';
import { DESKTOP_SIDEBAR_WIDTH, DESKTOP_COLLAPSED_SIDEBAR_WIDTH } from '@/constants/desktopLayout';
import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { useUserContext } from '@/context/UserProvider';
import { useTenantContext } from '@/context/TenantContext';
import { FormaLogo } from '@/components/ui/FormaLogo';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { TenantBrandLogo, getTenantDisplayName, isAdidayaTenant } from '@/components/ui/TenantBrandLogo';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string;
}

const DESKTOP_MENU_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', path: '/home', icon: 'house' },
  { id: 'tasks', label: 'Tasks', path: '/tasks', icon: 'checklist' },
  { id: 'actions', label: 'Actions', path: '/actions', icon: 'bolt' },
  { id: 'projects', label: 'Projects', path: '/projects', icon: 'folder' },
  { id: 'chat', label: 'Chat', path: '/chat', icon: 'bubble.left.and.bubble.right' },
];

const BOTTOM_TAB_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', path: '/home', icon: 'house.fill' },
  { id: 'tasks', label: 'Tasks', path: '/tasks', icon: 'checkmark.square.fill' },
  { id: 'actions', label: 'Actions', path: '/actions', icon: 'bolt.fill' },
  { id: 'projects', label: 'Projects', path: '/projects', icon: 'folder.fill' },
  { id: 'chat', label: 'Chat', path: '/chat', icon: 'bubble.left.fill' },
];

const ALL_WORKSPACE_ITEMS: NavItem[] = [
  { id: 'finance', label: 'Finance', path: '/home/finance', icon: 'creditcard' },
  { id: 'resources', label: 'Resources', path: '/home/resources', icon: 'archivebox' },
  { id: 'people', label: 'People', path: '/home/people', icon: 'person.2' },
  { id: 'clock', label: 'Clock', path: '/home/clock-module', icon: 'clock' },
  { id: 'report', label: 'Report', path: '/home/reports', icon: 'doc.text' },
  { id: 'crew', label: 'Crew', path: '/home/crew-module', icon: 'hardhat' },
  { id: 'ai', label: 'Forma AI', path: '/home/adidaya-ai', icon: 'sparkles' },
];

export default function ResponsiveWebLayout() {
  const { width } = useWindowDimensions();
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, signOut } = useUserContext();
  const { activeTenant } = useTenantContext();

  const { unreadCount } = useAdidayaNotifications();
  const [isCollapsed, setIsCollapsed] = useState(false);
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      [data-testid="desktop-sidebar-card"] { transition: width 180ms cubic-bezier(0.2, 0, 0, 1); overflow: hidden !important; }
      [data-testid="desktop-sidebar-card"] [dir="auto"] { white-space: nowrap; }
      @media (prefers-reduced-motion: reduce) {
        [data-testid="desktop-sidebar-card"] { transition: none; }
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);
  const [activeTooltip, setActiveTooltip] = useState<{ label: string; top: number } | null>(null);

  // Mobile Tab Bar sliding bubble layout
  const [mobileTabLayouts, setMobileTabLayouts] = useState<Record<string, { x: number; width: number }>>({});
  const activeMobileLayout = mobileTabLayouts[pathname.includes('/tasks') ? 'tasks' : pathname.includes('/actions') ? 'actions' : pathname.includes('/projects') ? 'projects' : pathname.includes('/chat') ? 'chat' : 'home'];
  const mobileBubbleSpringConfig = { damping: 22, stiffness: 240, mass: 0.8 };

  const mobileBubbleStyle = useAnimatedStyle(() => {
    const w = activeMobileLayout?.width || 0;
    const x = activeMobileLayout?.x || 0;
    return {
      width: withSpring(w, mobileBubbleSpringConfig),
      transform: [
        {
          translateX: withSpring(x, mobileBubbleSpringConfig),
        },
      ],
      opacity: w > 0 ? 1 : 0,
    };
  }, [activeMobileLayout]);

  const handleMobileTabLayout = (id: string, layout: { x: number; width: number }) => {
    setMobileTabLayouts(prev => {
      if (prev[id]?.x === layout.x && prev[id]?.width === layout.width) return prev;
      return { ...prev, [id]: layout };
    });
  };

  // Tablet Tab Bar sliding bubble layout
  const [tabletTabLayouts, setTabletTabLayouts] = useState<Record<string, { x: number; width: number }>>({});
  const activeTabletLayout = tabletTabLayouts[pathname.includes('/tasks') ? 'tasks' : pathname.includes('/actions') ? 'actions' : pathname.includes('/projects') ? 'projects' : pathname.includes('/chat') ? 'chat' : 'home'];
  const tabletBubbleSpringConfig = { damping: 22, stiffness: 240, mass: 0.8 };

  const tabletBubbleStyle = useAnimatedStyle(() => {
    const w = activeTabletLayout?.width || 0;
    const x = activeTabletLayout?.x || 0;
    return {
      width: withSpring(w, tabletBubbleSpringConfig),
      transform: [
        {
          translateX: withSpring(x, tabletBubbleSpringConfig),
        },
      ],
      opacity: w > 0 ? 1 : 0,
    };
  }, [activeTabletLayout]);

  const handleTabletTabLayout = (id: string, layout: { x: number; width: number }) => {
    setTabletTabLayouts(prev => {
      if (prev[id]?.x === layout.x && prev[id]?.width === layout.width) return prev;
      return { ...prev, [id]: layout };
    });
  };

  // Hover handlers for unclipped tooltip
  const handleItemHover = (label: string, e: any) => {
    if (!isCollapsed) return;
    const target = e?.currentTarget || e?.target;
    if (target && typeof target.getBoundingClientRect === 'function') {
      const rect = target.getBoundingClientRect();
      setActiveTooltip({ label, top: rect.top + rect.height / 2 });
    }
  };

  const handleItemLeave = () => {
    setActiveTooltip(null);
  };

  // 3-tier layout breakpoints
  const isMobileWeb = width < 768;
  const isTabletWeb = width >= 768 && width < 1100;
  const isDesktopWeb = width >= 1100;

  const isAdidaya = isAdidayaTenant(activeTenant);

  const visibleWorkspaceItems = useMemo(() => {
    return ALL_WORKSPACE_ITEMS.filter(item => {
      if ((item.id === 'crew' || item.id === 'ai') && !isAdidaya) {
        return false;
      }
      return true;
    }).map(item => {
      if (item.id === 'ai') {
        return {
          ...item,
          label: isAdidaya ? 'AskAI' : 'Forma AI',
        };
      }
      return item;
    });
  }, [isAdidaya]);

  const activeTab = useMemo(() => {
    if (pathname.includes('organization-settings')) return 'settings';
    if (pathname.includes('/home/finance')) return 'finance';
    if (pathname.includes('/home/resources')) return 'resources';
    if (pathname.includes('/home/people')) return 'people';
    if (pathname.includes('/home/clock-module')) return 'clock';
    if (pathname.includes('/home/reports')) return 'report';
    if (pathname.includes('/home/crew-module')) return 'crew';
    if (pathname.includes('/home/adidaya-ai')) return 'ai';
    if (pathname.includes('/tasks')) return 'tasks';
    if (pathname.includes('/actions')) return 'actions';
    if (pathname.includes('/projects')) return 'projects';
    if (pathname.includes('/chat')) return 'chat';
    if (pathname === '/notifications' || pathname.startsWith('/notifications/') || (pathname.includes('/notifications') && !pathname.includes('organization-settings'))) return 'notifications';
    return 'home';
  }, [pathname]);

  const borderCol = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  const finderActivePillBg = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)';
  const formaBlue = isDark ? '#4D82FF' : '#007AFF';
  const normalItemText = isDark ? '#EDEDED' : '#1C1D21';
  const normalIconColor = isDark ? '#D1D5DB' : '#1C1D21';
  const groupLabelText = isDark ? '#8A8F98' : '#8E8E93';
  const hoverItemBg = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';

  // Render Sidebar Nav Item
  const renderSidebarItem = (item: NavItem) => {
    const isSelected = activeTab === item.id;
    const isAi = item.id === 'ai';
    const formaAiColor = isDark ? '#A78BFA' : '#7C3AED';
    const formaAiTextColor = isDark ? '#DDD6FE' : '#6D28D9';

    const itemColor = isAi
      ? (isSelected ? formaAiColor : formaAiTextColor)
      : (isSelected ? formaBlue : normalItemText);

    const iconColor = isAi
      ? formaAiColor
      : (isSelected ? formaBlue : normalIconColor);

    const activeBg = isAi
      ? (isDark ? 'rgba(167, 139, 250, 0.18)' : 'rgba(124, 58, 237, 0.1)')
      : finderActivePillBg;

    const hoverBg = isAi
      ? (isDark ? 'rgba(167, 139, 250, 0.08)' : 'rgba(124, 58, 237, 0.05)')
      : hoverItemBg;

    return (
      <Pressable
        key={item.id}
        onPress={() => router.push(item.path as any)}
        // @ts-ignore
        onMouseEnter={(e: any) => handleItemHover(item.label, e)}
        // @ts-ignore
        onMouseLeave={handleItemLeave}
        style={({ hovered }: any) => [
          styles.navRow,
          isSelected && { backgroundColor: activeBg },
          hovered && !isSelected && { backgroundColor: hoverBg },
          isCollapsed && styles.navRowCollapsed,
        ]}
      >
        <View style={styles.navIconBox}>
          <PlatformIcon
            name={item.icon as any}
            size={18}
            tintColor={iconColor}
          />
        </View>
        {!isCollapsed && (
          <Text
            style={[
              styles.navLabel,
              {
                color: itemColor,
                fontWeight: isSelected || isAi ? '600' : '500',
              },
            ]}
            numberOfLines={1}
          >
            {item.label}
          </Text>
        )}
      </Pressable>
    );
  };

  return (
    <View style={[styles.shell, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
      {/* ════════════════════════════════════════════════════════════════════════
          TIER 3: FULL DESKTOP (width >= 1100) -> Floating macOS Finder Sidebar
         ════════════════════════════════════════════════════════════════════════ */}
      {isDesktopWeb && (
        <View style={styles.sidebarContainer}>
          <View
            testID="desktop-sidebar-card"
            style={[
              styles.floatingSidebarCard,
              {
                width: isCollapsed ? DESKTOP_COLLAPSED_SIDEBAR_WIDTH : DESKTOP_SIDEBAR_WIDTH,
                flexShrink: 0,
                borderColor: borderCol,
              },
              isDark ? styles.sidebarCardDark : styles.sidebarCardLight,
            ]}
          >
            {/* Header */}
            {isCollapsed ? (
              <View style={styles.collapsedHeaderBox}>
                <Pressable
                  onPress={() => setIsCollapsed(false)}
                  // @ts-ignore
                  onMouseEnter={(e: any) => handleItemHover('Expand Sidebar', e)}
                  // @ts-ignore
                  onMouseLeave={handleItemLeave}
                  style={({ hovered }: any) => [
                    styles.collapsedLogoBtn,
                    hovered && { backgroundColor: hoverItemBg },
                  ]}
                >
                  <TenantBrandLogo tenant={isAuthenticated ? activeTenant : null} size={24} isDark={isDark} />
                </Pressable>
              </View>
            ) : (
              <View style={styles.brandHeader}>
                <Pressable
                  onPress={() => router.push('/(tabs)/home')}
                  style={styles.brandTitleWrap}
                >
                  <TenantBrandLogo tenant={isAuthenticated ? activeTenant : null} size={isAdidaya ? 22 : 26} isDark={isDark} />
                  <View style={styles.brandInfo}>
                    {!isAuthenticated || !activeTenant ? (
                      <Text style={[styles.brandNameText, { color: isDark ? '#FFFFFF' : '#0F172A' }]} numberOfLines={1}>
                        Adidaya Studio
                      </Text>
                    ) : isAdidaya ? (
                      <Text style={[styles.brandNameText, { color: isDark ? '#FFFFFF' : '#0F172A' }]} numberOfLines={1}>
                        Adidaya Studio
                      </Text>
                    ) : (
                      <View style={{ justifyContent: 'center' }}>
                        <Text style={[styles.brandNameText, { color: isDark ? '#FFFFFF' : '#0F172A' }]} numberOfLines={1}>
                          Adidaya Studio
                        </Text>
                        <Text style={[styles.tenantSubtitle, { color: isDark ? '#94A3B8' : '#64748B', marginTop: 1 }]} numberOfLines={1}>
                          {(activeTenant.branding_name || activeTenant.name || 'Workspace').trim()}
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => setIsCollapsed(true)}
                  style={({ hovered }: any) => [
                    styles.toggleSidebarBtn,
                    hovered && { backgroundColor: hoverItemBg },
                  ]}
                >
                  <Feather name="sidebar" size={16} color={groupLabelText} />
                </Pressable>
              </View>
            )}

            {/* Nav Items */}
            <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
              {/* MENU SECTION */}
              <View style={styles.sectionGroup}>
                {!isCollapsed && <Text style={[styles.sectionHeader, { color: groupLabelText }]}>MENU</Text>}
                {DESKTOP_MENU_ITEMS.map(renderSidebarItem)}
              </View>

              {/* WORKSPACE SECTION */}
              <View style={styles.sectionGroup}>
                {!isCollapsed && <Text style={[styles.sectionHeader, { color: groupLabelText }]}>WORKSPACE</Text>}
                {visibleWorkspaceItems.map(renderSidebarItem)}
              </View>
            </ScrollView>

            {/* Inset Divider (Short & Centered) */}
            <View style={[styles.insetDivider, { backgroundColor: borderCol }]} />

            {/* Bottom Controls */}
            <View style={styles.footerWrap}>
              {/* Notifications */}
              {isAuthenticated && (
                <Pressable
                  onPress={() => router.push('/(tabs)/home/notifications' as any)}
                  // @ts-ignore
                  onMouseEnter={(e: any) => handleItemHover('Notifications', e)}
                  // @ts-ignore
                  onMouseLeave={handleItemLeave}
                  style={({ hovered }: any) => [
                    styles.navRow,
                    activeTab === 'notifications' && { backgroundColor: finderActivePillBg },
                    hovered && activeTab !== 'notifications' && { backgroundColor: hoverItemBg },
                    isCollapsed && styles.navRowCollapsed,
                  ]}
                >
                  <View style={styles.navIconBox}>
                    <Ionicons
                      name="notifications-outline"
                      size={18}
                      color={activeTab === 'notifications' ? formaBlue : normalIconColor}
                    />
                  </View>
                  {!isCollapsed && (
                    <Text style={[styles.navLabel, { color: activeTab === 'notifications' ? formaBlue : normalItemText, fontWeight: '500' }]}>
                      Notifications
                    </Text>
                  )}
                </Pressable>
              )}

              {/* Theme Toggle */}
              <Pressable
                onPress={toggleTheme}
                // @ts-ignore
                onMouseEnter={(e: any) => handleItemHover(isDark ? 'Light Mode' : 'Dark Mode', e)}
                // @ts-ignore
                onMouseLeave={handleItemLeave}
                style={({ hovered }: any) => [
                  styles.navRow,
                  hovered && { backgroundColor: hoverItemBg },
                  isCollapsed && styles.navRowCollapsed,
                ]}
              >
                <View style={styles.navIconBox}>
                  <Ionicons
                    name={isDark ? 'sunny-outline' : 'moon-outline'}
                    size={18}
                    color={normalIconColor}
                  />
                </View>
                {!isCollapsed && (
                  <Text style={[styles.navLabel, { color: normalItemText, fontWeight: '500' }]}>
                    {isDark ? 'Light Mode' : 'Dark Mode'}
                  </Text>
                )}
              </Pressable>

              {/* Auth Controls */}
              {!isAuthenticated ? (
                <Pressable
                  onPress={() => router.push('/login')}
                  // @ts-ignore
                  onMouseEnter={(e: any) => handleItemHover('Sign In', e)}
                  // @ts-ignore
                  onMouseLeave={handleItemLeave}
                  style={({ hovered }: any) => [
                    styles.navRow,
                    hovered && { backgroundColor: hoverItemBg },
                    isCollapsed && styles.navRowCollapsed,
                  ]}
                >
                  <View style={styles.navIconBox}>
                    <Ionicons
                      name="log-in-outline"
                      size={19}
                      color={formaBlue}
                    />
                  </View>
                  {!isCollapsed && (
                    <Text style={[styles.navLabel, { color: formaBlue, fontWeight: '600' }]}>
                      Sign In
                    </Text>
                  )}
                </Pressable>
              ) : (
                <>
                  <Pressable
                    onPress={() => router.push('/(tabs)/home/organization-settings' as any)}
                    // @ts-ignore
                    onMouseEnter={(e: any) => handleItemHover('Settings', e)}
                    // @ts-ignore
                    onMouseLeave={handleItemLeave}
                    style={({ hovered }: any) => [
                      styles.navRow,
                      activeTab === 'settings' && { backgroundColor: finderActivePillBg },
                      hovered && activeTab !== 'settings' && { backgroundColor: hoverItemBg },
                      isCollapsed && styles.navRowCollapsed,
                    ]}
                  >
                    <View style={styles.navIconBox}>
                      <Ionicons
                        name="settings-outline"
                        size={18}
                        color={activeTab === 'settings' ? formaBlue : normalIconColor}
                      />
                    </View>
                    {!isCollapsed && (
                      <Text
                        style={[
                          styles.navLabel,
                          {
                            color: activeTab === 'settings' ? formaBlue : normalItemText,
                            fontWeight: activeTab === 'settings' ? '600' : '500',
                          },
                        ]}
                      >
                        Settings
                      </Text>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={signOut}
                    // @ts-ignore
                    onMouseEnter={(e: any) => handleItemHover('Sign Out', e)}
                    // @ts-ignore
                    onMouseLeave={handleItemLeave}
                    style={({ hovered }: any) => [
                      styles.navRow,
                      hovered && { backgroundColor: hoverItemBg },
                      isCollapsed && styles.navRowCollapsed,
                    ]}
                  >
                    <View style={styles.navIconBox}>
                      <Ionicons
                        name="log-out-outline"
                        size={18}
                        color={isDark ? '#EF4444' : '#DC2626'}
                      />
                    </View>
                    {!isCollapsed && (
                      <Text style={[styles.navLabel, { color: isDark ? '#EF4444' : '#DC2626', fontWeight: '500' }]}>
                        Sign Out
                      </Text>
                    )}
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </View>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          GLOBAL UNCLIPPED LIQUID GLASS TOOLTIP (DESKTOP COLLAPSED)
         ════════════════════════════════════════════════════════════════════════ */}
      {isDesktopWeb && isCollapsed && activeTooltip && (
        <View
          style={[
            styles.floatingFixedTooltip,
            isDark ? styles.liquidTooltipDark : styles.liquidTooltipLight,
            {
              // @ts-ignore
              position: 'fixed',
              top: activeTooltip.top,
              left: 82,
            },
          ]}
          pointerEvents="none"
        >
          <View
            style={[
              styles.liquidTooltipArrow,
              isDark ? styles.liquidTooltipArrowDark : styles.liquidTooltipArrowLight,
            ]}
          />
          <Text
            style={[
              styles.liquidTooltipText,
              { color: isDark ? '#FFFFFF' : '#0F172A' },
            ]}
          >
            {activeTooltip.label}
          </Text>
        </View>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TIER 2: IPAD / TABLET (768 <= width < 1100) -> Top Header Tabs (No Sidebar)
         ════════════════════════════════════════════════════════════════════════ */}
      <View style={{ flex: 1, flexDirection: 'column', height: '100%', width: '100%' }}>
        {isTabletWeb && (
          <View style={[styles.tabletTopHeader, { borderBottomWidth: 0, backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
            {/* Left: Brand */}
            <Pressable
              onPress={() => router.push('/(tabs)/home')}
              style={styles.tabletBrandWrap}
            >
              <TenantBrandLogo tenant={isAuthenticated ? activeTenant : null} size={isAdidaya ? 22 : 26} isDark={isDark} />
              <View>
                {!isAuthenticated || !activeTenant ? (
                  <Text style={[styles.brandNameText, { color: isDark ? '#FFFFFF' : '#0F172A' }]} numberOfLines={1}>
                    Adidaya Studio
                  </Text>
                ) : isAdidaya ? (
                  <Text style={[styles.brandNameText, { color: isDark ? '#FFFFFF' : '#0F172A' }]} numberOfLines={1}>
                    Adidaya Studio
                  </Text>
                ) : (
                  <View style={{ justifyContent: 'center' }}>
                    <Text style={[styles.brandNameText, { color: isDark ? '#FFFFFF' : '#0F172A' }]} numberOfLines={1}>
                      Adidaya Studio
                    </Text>
                    <Text style={[styles.tenantSubtitle, { color: isDark ? '#94A3B8' : '#64748B', marginTop: 1 }]} numberOfLines={1}>
                      {(activeTenant.branding_name || activeTenant.name || 'Workspace').trim()}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>

            {/* Center: Top Segmented Tab Pills with Animated Sliding Bubble */}
            <View
              style={[
                styles.tabletPillGroup,
                {
                  backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                },
              ]}
            >
              <View style={styles.tabletSegmentsWrapper}>
                {/* Sliding Active Blue Bubble */}
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.tabletSlidingBubble,
                    {
                      backgroundColor: isDark ? 'rgba(77, 130, 255, 0.22)' : '#E6EEFF',
                    },
                    tabletBubbleStyle,
                  ]}
                />

                {DESKTOP_MENU_ITEMS.map((item) => {
                  const isSelected = activeTab === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.replace(item.path as any);
                      }}
                      onLayout={(e) => handleTabletTabLayout(item.id, e.nativeEvent.layout)}
                      style={styles.tabletPillItem}
                    >
                      <Text
                        style={[
                          styles.tabletPillLabel,
                          {
                            color: isSelected
                              ? (isDark ? '#4D82FF' : '#007AFF')
                              : (isDark ? '#9CA3AF' : '#6B7280'),
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <HeaderToolbar
              isDark={isDark}
              textColor={normalIconColor}
              maxDirectActions={3}
              actions={[
                ...(isAuthenticated ? [{ id: 'notifications', icon: 'notifications' as const, image: 'bell.fill', badge: unreadCount || undefined, title: 'Notifications', onPress: () => router.push('/notifications') }] : []),
                { id: 'theme', icon: isDark ? 'sunny' : 'moon', image: isDark ? 'sun.max.fill' : 'moon.fill', title: isDark ? 'Light Mode' : 'Dark Mode', onPress: toggleTheme },
                { id: 'profile', icon: 'person-circle', image: 'person.crop.circle.fill', title: isAuthenticated ? 'Profile' : 'Sign In', onPress: () => router.push(isAuthenticated ? '/(tabs)/home/organization-settings' as any : '/login') },
              ] as HeaderToolbarAction[]}
            />
          </View>
        )}

        {/* ─── MAIN CONTENT VIEWPORT ────────────────────────────────────────── */}
        <View style={[styles.contentViewport, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
          <Slot />
        </View>

        {/* ════════════════════════════════════════════════════════════════════════
            TIER 1: MOBILE WEB (width < 768) -> Floating Bottom Pill Tab Bar with Sliding Bubble
           ════════════════════════════════════════════════════════════════════════ */}
        {isMobileWeb && (
          <View style={styles.mobileBottomNavWrap} pointerEvents="box-none">
            <View
              style={[
                styles.mobileFloatingPill,
                {
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                  backgroundColor: isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                },
              ]}
            >
              {/* Sliding Active Bubble Indicator (Neutral Grey in Light, Soft Dark Grey in Dark) */}
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.mobileSlidingBubble,
                  {
                    backgroundColor: isDark ? '#2C2C2E' : '#EAEAEC',
                  },
                  mobileBubbleStyle,
                ]}
              />

              {BOTTOM_TAB_ITEMS.map((item) => {
                const isSelected = activeTab === item.id;
                const tabColor = isSelected
                  ? (isDark ? '#FFFFFF' : '#007AFF')
                  : (isDark ? '#FFFFFF' : '#1C1C1E');

                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.replace(item.path as any);
                    }}
                    onLayout={(e) => handleMobileTabLayout(item.id, e.nativeEvent.layout)}
                    style={styles.mobileTabItem}
                  >
                    <PlatformIcon
                      name={item.icon as any}
                      size={21}
                      tintColor={tabColor}
                    />
                    <Text
                      style={[
                        styles.mobileTabLabel,
                        {
                          color: tabColor,
                          fontWeight: isSelected ? '700' : '600',
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles: any = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  sidebarContainer: {
    padding: 12,
    height: '100%',
    zIndex: 50,
    overflow: 'visible',
  },
  floatingSidebarCard: {
    height: '100%',
    borderRadius: 20,
    borderWidth: 1,
    display: 'flex',
    flexDirection: 'column',
    userSelect: 'none',
    zIndex: 20,
    overflow: 'visible',
  },
  floatingFixedTooltip: {
    transform: [{ translateY: -13 }],
    paddingHorizontal: 12,
    paddingVertical: 4.5,
    borderRadius: 999,
    zIndex: 999999,
    flexDirection: 'row',
    alignItems: 'center',
    pointerEvents: 'none',
    borderWidth: 1,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.06)',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      },
      default: {},
    }),
  },
  liquidTooltipLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderColor: 'rgba(0, 0, 0, 0.07)',
  },
  liquidTooltipDark: {
    backgroundColor: 'rgba(28, 28, 30, 0.65)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  liquidTooltipArrow: {
    position: 'absolute',
    left: -4,
    top: '50%',
    marginTop: -4,
    width: 8,
    height: 8,
    transform: [{ rotate: '45deg' }],
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    zIndex: -1,
  },
  liquidTooltipArrowLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderLeftColor: 'rgba(0, 0, 0, 0.07)',
    borderBottomColor: 'rgba(0, 0, 0, 0.07)',
  },
  liquidTooltipArrowDark: {
    backgroundColor: 'rgba(28, 28, 30, 0.65)',
    borderLeftColor: 'rgba(255, 255, 255, 0.14)',
    borderBottomColor: 'rgba(255, 255, 255, 0.14)',
  },
  liquidTooltipText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  sidebarCardLight: {
    backgroundColor: '#F2F2F7',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
      },
      default: {},
    }),
  },
  sidebarCardDark: {
    backgroundColor: '#000000',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      },
      default: {},
    }),
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
  },
  collapsedHeaderBox: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsedLogoBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  brandInfo: {
    flex: 1,
  },
  brandNameText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  tenantSuperTitle: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tenantSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  toggleSidebarBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flex: 1,
    paddingHorizontal: 10,
    overflow: 'visible',
  },
  sectionGroup: {
    marginBottom: 14,
  },
  sectionHeader: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: 10,
    marginBottom: 6,
    marginTop: 6,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginVertical: 1,
    transitionProperty: 'background-color',
    transitionDuration: '120ms',
  },
  navRowCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  navIconBox: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: 13.5,
    flex: 1,
    letterSpacing: -0.2,
  },
  insetDivider: {
    height: 1,
    width: '75%',
    alignSelf: 'center',
    marginVertical: 8,
    opacity: 0.8,
  },
  footerWrap: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    gap: 2,
  },
  contentViewport: {
    flex: 1,
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },

  // ─── TIER 2: IPAD / TABLET TOP HEADER STYLES ───────────────────────────
  tabletTopHeader: {
    height: 60,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    zIndex: 30,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      },
      default: {},
    }),
  },
  tabletBrandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tabletPillGroup: {
    padding: 3,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
    alignSelf: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
      },
      default: {},
    }),
  },
  tabletSegmentsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    height: 32,
  },
  tabletSlidingBubble: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 32,
    borderRadius: 999,
    zIndex: 0,
  },
  tabletPillItem: {
    height: 32,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    cursor: 'pointer' as any,
    zIndex: 1,
  },
  tabletPillLabel: {
    fontSize: 13.5,
    letterSpacing: -0.2,
  },
  tabletRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tabletActionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer' as any,
  },
  tabletSignInBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  tabletSignInText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // ─── TIER 1: MOBILE WEB BOTTOM PILL STYLES ─────────────────────────────
  mobileBottomNavWrap: {
    position: 'absolute' as any,
    bottom: 18,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
  },
  mobileFloatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '92%',
    maxWidth: 440,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 4,
    position: 'relative',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
      },
      default: {},
    }),
  },
  mobileSlidingBubble: {
    position: 'absolute',
    left: 0,
    top: 4,
    bottom: 4,
    height: 54,
    borderRadius: 27,
    zIndex: 0,
  },
  mobileTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    height: 54,
    borderRadius: 27,
    paddingBottom: 2,
    zIndex: 1,
    cursor: 'pointer' as any,
  },
  mobileTabLabel: {
    fontSize: 10.5,
    letterSpacing: -0.1,
  },
});

import { useSearch } from '@/context/SearchContext';
import { useTheme } from '@/context/ThemeContext';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { router, usePathname, Tabs, Slot } from 'expo-router';
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View, Keyboard, TouchableOpacity } from 'react-native';
import { GoogleMaterial3TabBar } from '@/components/navigation/GoogleMaterial3TabBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';

// ──────────────────────────────────────────────────────────────────────────────
// Floating Tab Bar
// ──────────────────────────────────────────────────────────────────────────────

const SPRING_CONFIG = { damping: 20, stiffness: 200, mass: 0.8 };

// Set this to true to easily revert back to Option A (universal bottom search tab)
export const SHOW_SEARCH_TAB = false;
// Set this to true to revert Android back to the custom floating pill tab bar
export const USE_CUSTOM_FLOATING_TAB_ANDROID = false;

const TAB_ROUTES = [
  { name: 'home', path: '/(tabs)/home', icon: 'home-outline' as const, iconFocused: 'home' as const, label: 'Home' },
  { name: 'tasks', path: '/(tabs)/tasks', icon: 'checkmark-circle-outline' as const, iconFocused: 'checkmark-circle' as const, label: 'Tasks' },
  { name: 'actions', path: '/(tabs)/actions', icon: 'flash-outline' as const, iconFocused: 'flash' as const, label: 'Actions' },
  { name: 'projects', path: '/(tabs)/projects', icon: 'folder-outline' as const, iconFocused: 'folder' as const, label: 'Projects' },
  { name: 'chat', path: '/(tabs)/chat', icon: 'chatbubbles-outline' as const, iconFocused: 'chatbubbles' as const, label: 'Chat' },
];

function FloatingPillItem({
  tab,
  isFocused,
  onPress,
  isDark,
}: {
  tab: typeof TAB_ROUTES[0];
  isFocused: boolean;
  onPress: () => void;
  isDark: boolean;
}) {
  const progress = useSharedValue(isFocused ? 1 : 0);
  const activeTint = '#0036f8';
  const inactiveTint = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.38)';

  React.useEffect(() => {
    progress.value = withSpring(isFocused ? 1 : 0, SPRING_CONFIG);
  }, [isFocused]);

  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ['transparent', isDark ? 'rgba(0,54,248,0.22)' : 'rgba(0,54,248,0.12)']
    ),
    transform: [{ scale: 0.95 + progress.value * 0.05 }],
  }));

  return (
    <Pressable onPress={onPress} style={pill.touchable}>
      <Animated.View style={[pill.inner, pillStyle]}>
        <Ionicons
          name={(isFocused ? tab.iconFocused : tab.icon) as any}
          size={21}
          color={isFocused ? activeTint : inactiveTint}
        />
        <Text
          style={[
            pill.label,
            {
              color: isFocused ? activeTint : inactiveTint,
              fontWeight: isFocused ? '700' : '600',
            },
          ]}
          numberOfLines={1}
        >
          {tab.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function FloatingTabBarOverlay({
  activeTab,
  routes,
  onTabPress,
  isDark,
  insets,
  activeModule,
}: {
  activeTab: string;
  routes: typeof TAB_ROUTES;
  onTabPress: (tab: typeof TAB_ROUTES[0]) => void;
  isDark: boolean;
  insets: any;
  activeModule: string;
}) {
  const mainRoutes = routes.filter((r) => r.name !== 'search');
  const searchRoute = routes.find((r) => r.name === 'search');

  const isFinance = activeModule === 'finance';
  const isProjects = activeModule === 'projects';
  const isBlueModule = activeModule === 'tasks' || activeModule === 'actions';
  const isAndroid = Platform.OS === 'android';

  const barBg = isFinance
    ? (isDark ? (isAndroid ? 'rgba(38,18,20,0.92)' : 'rgba(38,18,20,0.48)') : (isAndroid ? 'rgba(255,247,247,0.94)' : 'rgba(255,247,247,0.58)'))
    : isProjects
    ? (isDark ? (isAndroid ? 'rgba(45,15,17,0.92)' : 'rgba(45,15,17,0.48)') : (isAndroid ? 'rgba(255,245,245,0.94)' : 'rgba(255,245,245,0.58)'))
    : (isDark ? (isAndroid ? 'rgba(28,28,30,0.92)' : 'rgba(28,28,30,0.48)') : (isAndroid ? 'rgba(255,255,255,0.94)' : 'rgba(255,255,255,0.58)'));

  const barBorder = isFinance
    ? (isDark ? 'rgba(255,255,255,0.14)' : 'rgba(199,58,64,0.18)')
    : isProjects
    ? (isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,59,48,0.18)')
    : (isDark ? 'rgba(255,255,255,0.14)' : (isAndroid ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.5)'));

  const fabBg = isFinance
    ? (isDark ? 'rgba(199,58,64,0.2)' : 'rgba(255,247,247,0.62)')
    : isProjects
    ? (isDark ? 'rgba(255,59,48,0.2)' : 'rgba(255,245,245,0.62)')
    : isBlueModule
    ? (isDark ? 'rgba(0,122,255,0.18)' : 'rgba(0,122,255,0.1)')
    : (isDark ? (isAndroid ? 'rgba(28,28,30,0.92)' : 'rgba(28,28,30,0.5)') : (isAndroid ? 'rgba(255,255,255,0.94)' : 'rgba(255,255,255,0.62)'));

  const fabBorder = isFinance
    ? (isDark ? 'rgba(255,255,255,0.14)' : 'rgba(199,58,64,0.22)')
    : isProjects
    ? (isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,59,48,0.22)')
    : isBlueModule
    ? (isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,122,255,0.22)')
    : (isDark ? 'rgba(255,255,255,0.14)' : (isAndroid ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.5)'));

  const fabIconColor = isFinance
    ? '#007AFF'
    : isProjects
    ? '#FF3B30'
    : (isBlueModule || activeTab === 'search')
    ? '#007AFF'
    : (isDark ? 'rgba(255,255,255,0.52)' : 'rgba(0,0,0,0.42)');

  return (
    <View style={[pill.outerWrap, { bottom: insets.bottom > 0 ? insets.bottom + 2 : 12 }]} pointerEvents="box-none">
      <View style={pill.container} pointerEvents="box-none">
        <View
          style={[
            pill.bar,
            {
              backgroundColor: barBg,
              borderColor: barBorder,
            },
          ]}
        >
          <BlurView
            intensity={isAndroid ? 0 : 46}
            tint={isDark ? 'dark' : 'light'}
            experimentalBlurMethod="none"
            blurReductionFactor={2}
            style={StyleSheet.absoluteFill}
          />
          {mainRoutes.map((tab) => (
            <FloatingPillItem
              key={tab.name}
              tab={tab}
              isFocused={activeTab === tab.name}
              onPress={() => onTabPress(tab)}
              isDark={isDark}
            />
          ))}
        </View>

        {searchRoute && (
          <TouchableOpacity
            onPress={() => onTabPress(searchRoute)}
            activeOpacity={0.76}
            style={[
              pill.fab,
              {
                backgroundColor: fabBg,
                borderColor: fabBorder,
              },
            ]}
          >
            <BlurView
              intensity={isAndroid ? 0 : 46}
              tint={isDark ? 'dark' : 'light'}
              experimentalBlurMethod="none"
              blurReductionFactor={2}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons
              name={(activeTab === 'search' ? searchRoute.iconFocused : searchRoute.icon) as any}
              size={22}
              color={fabIconColor}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const pill = StyleSheet.create({
  outerWrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    alignItems: 'center',
    zIndex: 999,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    maxWidth: 450,
  },
  bar: {
    flexDirection: 'row',
    flex: 1,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    paddingHorizontal: 8,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  touchable: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
  },
  inner: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 25,
    gap: 2,
    alignSelf: 'stretch',
    marginHorizontal: 2,
    paddingHorizontal: 2,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0,
  },
});

// ──────────────────────────────────────────────────────────────────────────────
// Main Layout
// ──────────────────────────────────────────────────────────────────────────────

export default function TabLayout() {
  const { setIsSearchVisible, setActiveModule, isSearchVisible, activeModule, setSearchQuery, contextAction, setContextAction, setLastActivePath } = useSearch();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setKeyboardVisible] = React.useState(false);

  React.useEffect(() => {
    if (!pathname.includes('/search')) {
      setLastActivePath(pathname);
    }
  }, [pathname, setLastActivePath]);

  React.useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  // Determine active tab from pathname
  const activeTab = React.useMemo(() => {
    if (pathname.includes('/tasks')) return 'tasks';
    if (pathname.includes('/actions')) return 'actions';
    if (pathname.includes('/projects')) return 'projects';
    if (pathname.includes('/chat')) return 'chat';
    if (pathname.includes('/search')) return 'search';
    return 'home';
  }, [pathname]);

  // Sync active module based on pathname for search context
  React.useEffect(() => {
    if (!isSearchVisible) {
      if (pathname.includes('/projects')) {
        setActiveModule('projects');
      } else if (pathname.includes('/tasks')) {
        setActiveModule('tasks');
      } else if (pathname.includes('/actions')) {
        setActiveModule('actions');
      } else if (pathname.includes('/home/finance')) {
        setActiveModule('finance');
      } else if (pathname.includes('/home/people')) {
        setActiveModule('people');
      } else if (pathname.includes('/home/resources')) {
        setActiveModule('resources');
      } else if (pathname.includes('/home/clock-module')) {
        setActiveModule('clock');
      } else if (pathname.includes('/home/crew-module')) {
        setActiveModule('crew');
      } else if (pathname === '/' || pathname === '/home' || pathname === '/index' || pathname === '/(tabs)/home') {
        setActiveModule('home');
      }
    }
  }, [pathname, isSearchVisible, setActiveModule]);

  // Reset search visibility and query on page/route changes
  React.useEffect(() => {
    setIsSearchVisible(false);
    setSearchQuery('');
    
    const isContextActionScreen = 
      pathname.includes('/search') ||
      pathname.includes('/tasks') ||
      pathname.includes('/actions') ||
      pathname.includes('/projects') ||
      pathname.includes('/home/finance') ||
      pathname.includes('/home/crew-module') ||
      pathname.includes('/home/people') ||
      pathname.includes('/home/resources');

    if (!isContextActionScreen) {
      setContextAction(null);
    }
  }, [pathname, setIsSearchVisible, setSearchQuery, setContextAction]);

  const dynamicTabRoutes = React.useMemo(() => {
    return TAB_ROUTES.map((tab) => {
      if (tab.name === 'search' && contextAction) {
        return {
          ...tab,
          label: contextAction.label,
          icon: contextAction.icon as any,
          iconFocused: (contextAction.iconFocused || contextAction.icon) as any,
        };
      }
      return tab;
    });
  }, [contextAction]);

  // Tab Press Interception no longer needed on iOS as we handle options natively in Search screen

  const handleFloatingTabPress = React.useCallback((tab: typeof TAB_ROUTES[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (tab.name === 'search') {
      if (contextAction) {
        contextAction.action();
      } else {
        if (activeModule === 'home') {
          router.push('/search-modal'); // Open the beautiful search modal bottom sheet!
        } else {
          setIsSearchVisible(true); // Open the local floating search bar overlay!
        }
      }
      return;
    }
    // If we are already on this tab but currently inside a nested screen, reset the tab stack to root
    if (activeTab === tab.name && pathname !== tab.path && pathname !== `/(tabs)/${tab.name}`) {
      router.replace(tab.path as any);
    } else {
      router.navigate(tab.path as any);
    }
  }, [activeTab, pathname, activeModule, setIsSearchVisible, contextAction]);

  if (Platform.OS === 'android') {
    return (
      <Tabs
        tabBar={(props) => (
          <GoogleMaterial3TabBar
            {...props}
            isDark={isDark}
            contextAction={contextAction}
          />
        )}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="home" />
        <Tabs.Screen name="tasks" />
        <Tabs.Screen name="actions" />
        <Tabs.Screen name="projects" />
        <Tabs.Screen name="chat" />
      </Tabs>
    );
  }

  // iOS: Standard original NativeTabs layout
  const iosActiveTintColor = isDark ? '#FFFFFF' : '#0036f8';
  const iosSelectedIconColor = isDark ? '#FFFFFF' : '#0036f8';

  return (
    <NativeTabs
      minimizeBehavior="onScrollDown"
      backgroundColor={isDark ? '#1C1C1E' : '#FFFFFF'}
      tintColor={iosActiveTintColor}
      iconColor={{ 
        default: isDark ? '#8E8E93' : '#999999', 
        selected: iosSelectedIconColor,
      }}
      indicatorColor={isDark ? '#2C2C2E' : '#E6EEFF'}
      labelVisibilityMode="labeled"
    >
      <NativeTabs.Trigger name="home">
        <Label>Home</Label>
        <Icon sf="house.fill" androidSrc={<VectorIcon family={Ionicons} name="home" />} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tasks">
        <Label>Tasks</Label>
        <Icon sf="checkmark.square.fill" androidSrc={<VectorIcon family={Ionicons} name="checkmark-circle" />} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="actions">
        <Label>Actions</Label>
        <Icon sf="bolt.fill" androidSrc={<VectorIcon family={Ionicons} name="flash" />} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="projects">
        <Label>Projects</Label>
        <Icon sf="folder.fill" androidSrc={<VectorIcon family={Ionicons} name="folder" />} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="chat">
        <Label>Chat</Label>
        <Icon sf="message.fill" androidSrc={<VectorIcon family={Ionicons} name="chatbubbles" />} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * TO REVERT to original tab bar:
 * 1. Remove the <View style={{ flex: 1 }}> wrapper
 * 2. Remove the <View style={{ flex: 1, marginBottom: ... }}> wrapper
 * 3. Remove the FloatingTabBarOverlay component
 * 4. Remove isAndroid conditionals from NativeTabs props
 * 5. Re-enable the tabPress listener for all platforms
 * ═══════════════════════════════════════════════════════════════════════════════
 */

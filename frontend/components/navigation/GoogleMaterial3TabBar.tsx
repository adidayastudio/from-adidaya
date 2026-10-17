import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const TAB_CONFIG: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; iconFocused: keyof typeof Ionicons.glyphMap }> = {
  home: { label: 'Home', icon: 'home-outline', iconFocused: 'home' },
  tasks: { label: 'Tasks', icon: 'checkbox-outline', iconFocused: 'checkbox' },
  actions: { label: 'Actions', icon: 'flash-outline', iconFocused: 'flash' },
  projects: { label: 'Projects', icon: 'folder-outline', iconFocused: 'folder' },
  chat: { label: 'Chat', icon: 'chatbubbles-outline', iconFocused: 'chatbubbles' },
};

function Material3TabItem({
  route,
  isFocused,
  onPress,
  onLongPress,
  isDark,
  contextAction,
}: {
  route: any;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  isDark: boolean;
  contextAction: any;
}) {
  const scale = useSharedValue(isFocused ? 1 : 0.85);

  React.useEffect(() => {
    scale.value = withSpring(isFocused ? 1 : 0.85, { damping: 18, stiffness: 220 });
  }, [isFocused]);

  const isSearch = route.name === 'search';

  // Config label & icon
  let label = TAB_CONFIG[route.name]?.label || route.name;
  let iconName = isFocused
    ? TAB_CONFIG[route.name]?.iconFocused || 'square'
    : TAB_CONFIG[route.name]?.icon || 'square-outline';

  if (isSearch && contextAction) {
    label = contextAction.label;
    iconName = (isFocused ? contextAction.iconFocused || contextAction.icon : contextAction.icon) as any;
  }

  // Brand Color (#007AFF)
  const brandBlue = isDark ? '#3D6BFF' : '#007AFF';

  const pillBgColor = isFocused
    ? (isDark ? 'rgba(0, 122, 255, 0.22)' : 'rgba(0, 122, 255, 0.12)')
    : 'transparent';

  const iconColor = isFocused
    ? brandBlue
    : (isDark ? '#8E8E93' : '#8E8E93');

  const labelColor = isFocused
    ? brandBlue
    : (isDark ? '#8E8E93' : '#8E8E93');

  const animatedPillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      onLongPress={onLongPress}
      android_ripple={{
        color: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
        borderless: true,
        radius: 36,
      }}
      style={styles.tabItem}
    >
      {/* Google Material 3 Active Indicator Pill */}
      <View style={styles.pillContainer}>
        <Animated.View
          style={[
            styles.pill,
            { backgroundColor: pillBgColor },
            isFocused && animatedPillStyle,
          ]}
        >
          <Ionicons name={iconName} size={22} color={iconColor} />
        </Animated.View>
      </View>

      {/* Label Text */}
      <Text
        style={[
          styles.label,
          {
            color: labelColor,
            fontWeight: isFocused ? '700' : '500',
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const ALLOWED_TABS = ['home', 'tasks', 'actions', 'projects', 'chat'];

export function GoogleMaterial3TabBar({
  state,
  descriptors,
  navigation,
  isDark,
  contextAction,
}: BottomTabBarProps & { isDark: boolean; contextAction?: any }) {
  const insets = useSafeAreaInsets();

  const barBg = isDark ? '#1E1F22' : '#F3F3F7';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: barBg,
          borderTopColor: borderColor,
          height: 70 + (insets.bottom > 0 ? insets.bottom : 6),
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        // Skip index route and non-main tab routes
        if (route.name === 'index' || !ALLOWED_TABS.includes(route.name)) return null;

        const { options } = descriptors[route.key];
        if ((options as any)?.href === null) return null;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <Material3TabItem
            key={route.key}
            route={route}
            isFocused={isFocused}
            onPress={onPress}
            onLongPress={onLongPress}
            isDark={isDark}
            contextAction={contextAction}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  pillContainer: {
    width: 64,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    width: 64,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    marginTop: 4,
    letterSpacing: 0.1,
  },
});

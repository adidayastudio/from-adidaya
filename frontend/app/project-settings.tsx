import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
    StatusBar as RNStatusBar,
    useWindowDimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import {
    ProjectSetupGroup,
    ProjectSetupModule,
    PROJECT_SETUP_MENU_ITEMS,
    PROJECT_GROUP_TITLES,
} from '@/lib/api/projectSetup';
import ProjectSetupDetailScreen from './project-settings/[id]';

export default function ProjectSettingsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 768;
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    if (isDesktopWeb) {
        return <ProjectSetupDetailScreen />;
    }

    const groups: ProjectSetupGroup[] = ['general', 'configuration', 'access', 'system'];

    const handlePressItem = (id: ProjectSetupModule) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/project-settings/${id}` as any);
    };

    return (
        <>
            <RNStatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'Projects Setup',
                    headerLargeTitle: false,
                    headerTransparent: Platform.OS === 'ios',
                    headerStyle: { backgroundColor: Platform.OS === 'ios' ? 'transparent' : (isDark ? '#000000' : '#F2F2F7') },
                    headerTintColor: textColor,
                    headerTitleStyle: { color: textColor, fontWeight: '600' },
                    headerShadowVisible: false,
                    headerBackButtonDisplayMode: 'minimal',
                    headerBackTitle: ' ',
                }}
            />

            <ScrollView
                style={[s.screen, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={[
                    s.container,
                    {
                        paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 16 : 8,
                        paddingBottom: insets.bottom + 40,
                    },
                ]}
                showsVerticalScrollIndicator={false}
            >
                {groups.map((grp) => {
                    const items = PROJECT_SETUP_MENU_ITEMS.filter((item) => item.group === grp);
                    if (items.length === 0) return null;

                    const title = PROJECT_GROUP_TITLES[grp];

                    return (
                        <View key={grp} style={s.menuListContainer}>
                            {!!title && (
                                <Text style={[s.menuListHeader, { color: subtextColor }]}>
                                    {title}
                                </Text>
                            )}
                            <GlassView
                                intensity={isDark ? 10 : 25}
                                style={[
                                    s.menuList,
                                    {
                                        backgroundColor: isDark
                                            ? 'rgba(255,255,255,0.02)'
                                            : 'rgba(255,255,255,0.7)',
                                    },
                                ]}
                            >
                                {items.map((item, index) => {
                                    const isLast = index === items.length - 1;
                                    return (
                                        <View key={item.id}>
                                            <TouchableOpacity
                                                style={s.menuRow}
                                                onPress={() => handlePressItem(item.id)}
                                                activeOpacity={0.7}
                                            >
                                                <LinearGradient
                                                    colors={isDark ? ['#1C1C1E', '#000000'] : item.gradientColors}
                                                    style={s.menuIconBox}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 1 }}
                                                >
                                                    <PlatformIcon
                                                        name={item.icon as any}
                                                        size={16}
                                                        tintColor={isDark ? item.color : '#FFF'}
                                                    />
                                                </LinearGradient>
                                                <View style={s.menuRowContent}>
                                                    <Text style={[s.menuRowTitle, { color: textColor }]}>
                                                        {item.title}
                                                    </Text>
                                                    <Text
                                                        style={[s.menuRowSubtitle, { color: subtextColor }]}
                                                        numberOfLines={1}
                                                    >
                                                        {item.subtitle}
                                                    </Text>
                                                </View>
                                                <PlatformIcon
                                                    name="chevron.right"
                                                    size={14}
                                                    tintColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'}
                                                />
                                            </TouchableOpacity>
                                            {!isLast && (
                                                <View
                                                    style={[
                                                        s.indentedDivider,
                                                        {
                                                            backgroundColor: isDark
                                                                ? 'rgba(255,255,255,0.06)'
                                                                : 'rgba(0,0,0,0.06)',
                                                        },
                                                    ]}
                                                />
                                            )}
                                        </View>
                                    );
                                })}
                            </GlassView>
                        </View>
                    );
                })}
            </ScrollView>
        </>
    );
}

const s = StyleSheet.create({
    screen: {
        flex: 1,
    },
    container: {
        gap: 20,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 24,
    },
    menuListContainer: {
        gap: 8,
    },
    menuListHeader: {
        fontSize: 13,
        fontWeight: '600',
        paddingHorizontal: 12,
        letterSpacing: -0.1,
    },
    menuList: {
        borderRadius: 24,
        overflow: 'hidden',
    },
    menuRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 13,
        paddingHorizontal: 16,
        gap: 12,
    },
    indentedDivider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 60,
        marginRight: 0,
    },
    menuIconBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuRowContent: {
        flex: 1,
        gap: 1,
    },
    menuRowTitle: {
        fontSize: 16,
        fontWeight: '500',
        letterSpacing: -0.3,
    },
    menuRowSubtitle: {
        fontSize: 13,
        fontWeight: '400',
    },
});

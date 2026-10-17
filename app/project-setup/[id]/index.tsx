import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Platform,
    ActivityIndicator,
    Image,
    Alert,
    StatusBar as RNStatusBar,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useTenantContext } from '@/context/TenantContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { BouncyGlassButton } from '@/components/ui/BouncyGlassButton';
import { HeaderBlurBackground } from '@/components/ui/HeaderBlurBackground';
import { Project, getProjectById, updateProjectApi, uploadProjectHeroImage } from '@/lib/api/projects';
import {
    getProjectNumberingSettings,
    ProjectNumberingSettings,
} from '@/lib/api/projectSetup';

interface MenuOption {
    id: string;
    route: string;
    title: string;
    subtitle: string;
    icon: string;
    gradient: [string, string];
    iconColor: string;
}

export default function ProjectSetupIndexScreen() {
    const { id } = useLocalSearchParams();
    const projectId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';

    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const { activeTenant } = useTenantContext();
    const isDark = resolvedTheme === 'dark';

    const bgColor = isDark ? '#000000' : '#F2F2F7';
    const cardBgColor = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const dividerColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    const [project, setProject] = useState<Project | null>(null);
    const [numberingSettings, setNumberingSettings] = useState<ProjectNumberingSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    const tenantLogoUrl = activeTenant?.branding_logo_url || activeTenant?.logo_url;
    const tenantInitial = (activeTenant?.branding_name || activeTenant?.name || 'T').charAt(0).toUpperCase();

    useEffect(() => {
        if (projectId) {
            loadData();
        }
    }, [projectId]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [projData, numData] = await Promise.all([
                getProjectById(projectId),
                getProjectNumberingSettings(),
            ]);
            setProject(projData);
            setNumberingSettings(numData);
        } catch (error) {
            console.error('Error fetching project details for setup index:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePickAvatar = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to change the project avatar.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
            base64: true,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
            const asset = result.assets[0];
            setIsUploadingAvatar(true);
            try {
                let uploadUrl = asset.uri;
                if (asset.base64) {
                    const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
                    const uploaded = await uploadProjectHeroImage(projectId, asset.base64, ext, activeTenant?.id);
                    if (uploaded) uploadUrl = uploaded;
                }

                const updatedMeta = {
                    ...(project?.meta || {}),
                    logoUrl: uploadUrl,
                    avatarUrl: uploadUrl,
                };

                const updated = await updateProjectApi(projectId, {
                    meta: updatedMeta,
                });

                if (updated) {
                    setProject(updated);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
            } catch (err) {
                console.error('Error updating project avatar:', err);
                Alert.alert('Error', 'Failed to update project avatar.');
            } finally {
                setIsUploadingAvatar(false);
            }
        }
    };

    const handlePressMenu = (route: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/project-setup/${projectId}/${route}` as any);
    };

    if (isLoading) {
        return (
            <View style={[s.container, { backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#0036F8" />
            </View>
        );
    }

    const mainOptions: MenuOption[] = [
        {
            id: 'general',
            route: 'general',
            title: 'General',
            subtitle: 'Project identity, type, timeline, status, and tracking.',
            icon: 'slider.horizontal.3',
            gradient: ['#475569', '#334155'],
            iconColor: '#FFFFFF',
        },
        {
            id: 'team',
            route: 'team',
            title: 'Team & Access',
            subtitle: 'Manage project members and project role assignments.',
            icon: 'person.2.fill',
            gradient: ['#F59E0B', '#D97706'],
            iconColor: '#FFFFFF',
        },
    ];

    const managementOption: MenuOption = {
        id: 'management',
        route: 'management',
        title: 'Project Management',
        subtitle: 'Manage this project lifecycle and availability.',
        icon: 'archivebox',
        gradient: ['#64748B', '#475569'],
        iconColor: '#FFFFFF',
    };

    const projectLogo = project?.meta?.logoUrl || project?.meta?.avatarUrl || tenantLogoUrl;

    return (
        <View style={[s.container, { backgroundColor: bgColor }]}>
            <RNStatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'Project Setup',
                    headerLargeTitle: false,
                    headerTransparent: Platform.OS === 'ios',
                    headerShadowVisible: false,
                    headerBackground: Platform.OS === 'ios' ? () => <HeaderBlurBackground isDark={isDark} /> : undefined,
                    headerStyle: { backgroundColor: Platform.OS === 'ios' ? 'transparent' : (isDark ? '#000000' : '#F2F2F7') },
                    headerTintColor: textColor,
                    headerTitleStyle: { color: textColor, fontWeight: '700' },
                    headerLeft: () => (
                        <BouncyGlassButton
                            onPress={() => router.back()}
                            isDark={isDark}
                            variant="back"
                            textColor={textColor}
                            style={{ marginLeft: 0 }}
                        />
                    ),
                }}
            />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[
                    s.scrollContent,
                    {
                        paddingTop: Platform.OS === 'ios' ? insets.top + 50 : 20,
                        paddingBottom: insets.bottom + 40,
                    },
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* Top Project Identity Hero Card */}
                {project && (
                    <GlassView
                        intensity={isDark ? 10 : 25}
                        style={[s.projectHeroCard, { backgroundColor: cardBgColor }]}
                    >
                        {/* Avatar / Tenant Logo with Camera Picker */}
                        <TouchableOpacity
                            onPress={handlePickAvatar}
                            activeOpacity={0.8}
                            style={s.avatarTouchableWrapper}
                        >
                            <View style={[s.projectAvatarContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF' }]}>
                                {isUploadingAvatar ? (
                                    <ActivityIndicator size="small" color="#0036F8" />
                                ) : projectLogo ? (
                                    <Image
                                        source={typeof projectLogo === 'string' ? { uri: projectLogo } : projectLogo}
                                        style={s.projectAvatarImage}
                                        resizeMode={project?.meta?.logoUrl || project?.meta?.avatarUrl ? "cover" : "contain"}
                                    />
                                ) : (
                                    <Text style={[s.projectAvatarInitial, { color: textColor }]}>
                                        {tenantInitial}
                                    </Text>
                                )}
                            </View>

                            {/* Camera Edit Badge */}
                            <View style={[s.cameraBadge, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF', borderColor: isDark ? '#3A3A3C' : '#E5E5EA' }]}>
                                <Ionicons name="camera" size={11} color={textColor} />
                            </View>
                        </TouchableOpacity>

                        {/* Project Details */}
                        <View style={s.projectHeroInfo}>
                            {/* Badges: Separated [Number] and [Code] */}
                            <View style={s.badgeRow}>
                                {project.number ? (
                                    <View style={[s.projectBadgePill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                                        <Text style={[s.projectBadgeText, { color: isDark ? '#E2E8F0' : '#475569' }]}>
                                            {project.number}
                                        </Text>
                                    </View>
                                ) : null}
                                {project.code ? (
                                    <View style={[s.projectBadgePill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                                        <Text style={[s.projectBadgeText, { color: isDark ? '#E2E8F0' : '#475569' }]}>
                                            {project.code}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>

                            <Text style={[s.projectHeroTitle, { color: textColor }]} numberOfLines={2}>
                                {project.title}
                            </Text>
                        </View>
                    </GlassView>
                )}

                {/* Main Settings Group (General & Team) */}
                <View style={s.menuSection}>
                    <GlassView
                        intensity={isDark ? 10 : 25}
                        style={[s.menuListCard, { backgroundColor: cardBgColor }]}
                    >
                        {mainOptions.map((item, idx) => {
                            const isLast = idx === mainOptions.length - 1;
                            return (
                                <React.Fragment key={item.id}>
                                    <TouchableOpacity
                                        style={s.menuRow}
                                        onPress={() => handlePressMenu(item.route)}
                                        activeOpacity={0.7}
                                    >
                                        <LinearGradient
                                            colors={item.gradient}
                                            style={s.menuIconBox}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                        >
                                            <PlatformIcon
                                                name={item.icon as any}
                                                size={16}
                                                tintColor={item.iconColor}
                                            />
                                        </LinearGradient>

                                        <View style={s.menuRowContent}>
                                            <Text style={[s.menuRowTitle, { color: textColor }]}>
                                                {item.title}
                                            </Text>
                                            <Text style={[s.menuRowSubtitle, { color: subtextColor }]} numberOfLines={1}>
                                                {item.subtitle}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                    {!isLast && <View style={[s.indentedDivider, { backgroundColor: dividerColor }]} />}
                                </React.Fragment>
                            );
                        })}
                    </GlassView>
                </View>

                {/* Management Section */}
                <View style={s.menuSection}>
                    <GlassView
                        intensity={isDark ? 10 : 25}
                        style={[s.menuListCard, { backgroundColor: cardBgColor }]}
                    >
                        <TouchableOpacity
                            style={s.menuRow}
                            onPress={() => handlePressMenu(managementOption.route)}
                            activeOpacity={0.7}
                        >
                            <LinearGradient
                                colors={managementOption.gradient}
                                style={s.menuIconBox}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <PlatformIcon
                                    name={managementOption.icon as any}
                                    size={16}
                                    tintColor={managementOption.iconColor}
                                />
                            </LinearGradient>

                            <View style={s.menuRowContent}>
                                <Text style={[s.menuRowTitle, { color: textColor }]}>
                                    {managementOption.title}
                                </Text>
                                <Text style={[s.menuRowSubtitle, { color: subtextColor }]} numberOfLines={1}>
                                    {managementOption.subtitle}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </GlassView>
                </View>
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        gap: 16,
    },
    projectHeroCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 24,
        gap: 14,
    },
    avatarTouchableWrapper: {
        position: 'relative',
    },
    cameraBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 3,
    },
    projectAvatarContainer: {
        width: 54,
        height: 54,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    projectAvatarImage: {
        width: '100%',
        height: '100%',
    },
    projectAvatarInitial: {
        fontSize: 22,
        fontWeight: '700',
    },
    projectHeroInfo: {
        flex: 1,
        gap: 4,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    projectBadgePill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
    },
    projectBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    projectHeroTitle: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    menuSection: {
        gap: 8,
    },
    menuListCard: {
        borderRadius: 24,
        overflow: 'hidden',
    },
    menuRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 14,
    },
    menuIconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuRowContent: {
        flex: 1,
        gap: 2,
    },
    menuRowTitle: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: -0.3,
    },
    menuRowSubtitle: {
        fontSize: 13,
        fontWeight: '400',
        lineHeight: 18,
    },
    indentedDivider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 70,
        marginRight: 0,
    },
});

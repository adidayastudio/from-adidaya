import { GlassView } from '@/components/ui/GlassView';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useUserContext } from '@/context/UserProvider';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { useState } from 'react';
import { Alert, Dimensions, Modal, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import Animated, {
    FadeIn,
    FadeOut,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export function HomeTopBar() {
    const { resolvedTheme, toggleTheme } = useTheme();
    const { isAuthenticated, signIn, signOut, profile } = useUserContext();
    const router = useRouter();
    const isDark = resolvedTheme === 'dark';

    // Custom Menu State
    const [menuVisible, setMenuVisible] = useState(false);

    // Login Modal State
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState('');

    // Animation scale value for pill
    const scale = useSharedValue(1);

    const handlePressIn = () => {
        scale.value = withSpring(0.98, { damping: 20, stiffness: 400 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 20, stiffness: 400 });
    };

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
        };
    });

    const handleMenuAction = (action: string) => {
        setMenuVisible(false);
        if (action === 'signin') {
            setLoginEmail('');
            setLoginPassword('');
            setLoginError('');
            setShowLoginModal(true);
        } else if (action === 'profile') {
            // Navigate to profile
        } else if (action === 'settings') {
            // Navigate to settings
        } else if (action === 'signout') {
            Alert.alert(
                'Sign Out',
                'Are you sure you want to sign out?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                        text: 'Sign Out', 
                        style: 'destructive', 
                        onPress: async () => {
                            await signOut();
                        }
                    }
                ]
            );
        }
    };

    const handleLogin = async () => {
        if (!loginEmail.trim() || !loginPassword.trim()) {
            setLoginError('Please enter email and password.');
            return;
        }
        setLoginLoading(true);
        setLoginError('');
        const result = await signIn(loginEmail.trim(), loginPassword.trim());
        setLoginLoading(false);
        if (result.error) {
            setLoginError(result.error);
        } else {
            setShowLoginModal(false);
        }
    };

    const renderMenuContent = () => {
        if (isAuthenticated) {
            // Logged in menu
            return (
                <>
                    {profile?.full_name && (
                        <>
                            <View style={styles.menuUserInfo}>
                                <Text style={[styles.menuUserName, { color: Colors[(resolvedTheme || 'light') as keyof typeof Colors].text }]}>
                                    {profile.full_name}
                                </Text>
                                <Text style={[styles.menuUserEmail, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>
                                    {profile.email}
                                </Text>
                            </View>
                            <Separator isDark={isDark} />
                        </>
                    )}
                    <MenuItem icon="person.crop.circle" label="My Profile" isDark={isDark} resolvedTheme={resolvedTheme} onPress={() => handleMenuAction('profile')} />
                    <Separator isDark={isDark} />
                    <MenuItem icon="gearshape" label="Settings" isDark={isDark} resolvedTheme={resolvedTheme} onPress={() => handleMenuAction('settings')} />
                    <Separator isDark={isDark} />
                    <MenuItem icon="rectangle.portrait.and.arrow.right" label="Sign Out" isDark={isDark} resolvedTheme={resolvedTheme} destructive onPress={() => handleMenuAction('signout')} />
                </>
            );
        } else {
            // Not logged in menu
            return (
                <MenuItem icon="person.badge.key" label="Sign In" isDark={isDark} resolvedTheme={resolvedTheme} onPress={() => handleMenuAction('signin')} />
            );
        }
    };

    return (
        <>
            {/* Full-screen overlay for menu — same view tree, NOT a Modal */}
            {menuVisible && (
                <>
                    {/* Dismiss backdrop */}
                    <Pressable
                        style={styles.fullScreenBackdrop}
                        onPress={() => setMenuVisible(false)}
                    />
                    {/* The floating glass menu */}
                    <Animated.View
                        entering={FadeIn.duration(200)}
                        exiting={FadeOut.duration(120)}
                        style={styles.menuContainer}
                    >
                        {/* Menu content */}
                        {Platform.OS === 'android' ? (
                            <View
                                style={[
                                    styles.menuGlass,
                                    {
                                        backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
                                        borderWidth: 1,
                                        borderColor: isDark
                                            ? 'rgba(255,255,255,0.1)'
                                            : 'rgba(0,0,0,0.08)',
                                    },
                                ]}
                            >
                                {renderMenuContent()}
                            </View>
                        ) : (
                            <BlurView
                                intensity={90}
                                tint={isDark ? 'systemThinMaterialDark' : 'systemThinMaterialLight'}
                                style={[
                                    styles.menuGlass,
                                    {
                                        borderWidth: StyleSheet.hairlineWidth,
                                        borderColor: isDark
                                            ? 'rgba(255,255,255,0.25)'
                                            : 'rgba(255,255,255,0.7)',
                                    },
                                ]}
                            >
                                {renderMenuContent()}
                            </BlurView>
                        )}
                    </Animated.View>
                </>
            )}

            {/* Login Modal */}
            <Modal
                visible={showLoginModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowLoginModal(false)}
                statusBarTranslucent
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.loginOverlay}
                >
                    <Pressable
                        style={StyleSheet.absoluteFillObject}
                        onPress={() => !loginLoading && setShowLoginModal(false)}
                    />
                    <View style={[
                        styles.loginCard,
                        {
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                        }
                    ]}>
                        {/* Header */}
                        <View style={styles.loginHeader}>
                            <View style={[styles.loginIconCircle, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                                <PlatformIcon name="lock.fill" size={24} tintColor="#C73A40" />
                            </View>
                            <Text style={[styles.loginTitle, { color: Colors[(resolvedTheme || 'light') as keyof typeof Colors].text }]}>
                                Sign In
                            </Text>
                            <Text style={[styles.loginSubtitle, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>
                                Enter your credentials to continue
                            </Text>
                        </View>

                        {/* Error */}
                        {loginError ? (
                            <View style={styles.loginErrorContainer}>
                                <PlatformIcon name="exclamationmark.triangle.fill" size={14} tintColor="#FF3B30" />
                                <Text style={styles.loginErrorText}>{loginError}</Text>
                            </View>
                        ) : null}

                        {/* Email Input */}
                        <View style={[
                            styles.loginInputContainer,
                            { 
                                backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                            }
                        ]}>
                            <PlatformIcon name="envelope.fill" size={16} tintColor={isDark ? '#8E8E93' : '#8E8E93'} />
                            <TextInput
                                placeholder="Email"
                                placeholderTextColor={isDark ? '#636366' : '#C7C7CC'}
                                style={[styles.loginInput, { color: Colors[(resolvedTheme || 'light') as keyof typeof Colors].text }]}
                                value={loginEmail}
                                onChangeText={setLoginEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!loginLoading}
                            />
                        </View>

                        {/* Password Input */}
                        <View style={[
                            styles.loginInputContainer,
                            { 
                                backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                            }
                        ]}>
                            <PlatformIcon name="lock.fill" size={16} tintColor={isDark ? '#8E8E93' : '#8E8E93'} />
                            <TextInput
                                placeholder="Password"
                                placeholderTextColor={isDark ? '#636366' : '#C7C7CC'}
                                style={[styles.loginInput, { color: Colors[(resolvedTheme || 'light') as keyof typeof Colors].text }]}
                                value={loginPassword}
                                onChangeText={setLoginPassword}
                                secureTextEntry
                                editable={!loginLoading}
                                onSubmitEditing={handleLogin}
                                returnKeyType="go"
                            />
                        </View>

                        {/* Buttons */}
                        <TouchableOpacity
                            style={[styles.loginButton, loginLoading && { opacity: 0.7 }]}
                            onPress={handleLogin}
                            disabled={loginLoading}
                            activeOpacity={0.8}
                        >
                            {loginLoading ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <Text style={styles.loginButtonText}>Sign In</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.loginCancelButton}
                            onPress={() => setShowLoginModal(false)}
                            disabled={loginLoading}
                        >
                            <Text style={[styles.loginCancelText, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* The Pill / Island */}
            <Animated.View style={animatedStyle}>
                <GlassView
                    intensity={40}
                    tint={isDark ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'}
                    style={[styles.island, isDark ? styles.darkModeBorder : styles.lightModeBorder, { backgroundColor: 'transparent' }]}
                >
                    {/* 1. Notifications */}
                    <Pressable
                        style={styles.iconButton}
                        onPress={() => router.push('/notifications')}
                        onPressIn={handlePressIn}
                        onPressOut={handlePressOut}
                    >
                        <PlatformIcon name="bell.fill" size={20} tintColor={Colors[resolvedTheme].text} />
                        <View style={styles.badge} />
                    </Pressable>

                    {/* 2. Theme Toggle (Moon/Sun) */}
                    <Pressable
                        style={styles.iconButton}
                        onPress={toggleTheme}
                        onPressIn={handlePressIn}
                        onPressOut={handlePressOut}
                    >
                        <PlatformIcon
                            name={isDark ? 'sun.max.fill' : 'moon.fill'}
                            size={20}
                            tintColor={Colors[resolvedTheme].text}
                        />
                    </Pressable>

                    {/* 3. Avatar / Me Menu */}
                    <Pressable
                        style={styles.iconButton}
                        onPress={() => setMenuVisible((v) => !v)}
                        onPressIn={handlePressIn}
                        onPressOut={handlePressOut}
                    >
                        <PlatformIcon
                            name="person.crop.circle.fill"
                            size={24}
                            tintColor={isAuthenticated ? Colors[resolvedTheme].text : (isDark ? '#8E8E93' : '#C7C7CC')}
                        />
                        {!isAuthenticated && (
                            <View style={styles.authBadge}>
                                <PlatformIcon name="exclamationmark.triangle.fill" size={8} tintColor="#FF9500" />
                            </View>
                        )}
                    </Pressable>
                </GlassView>
            </Animated.View>
        </>
    );
}

// --- Sub-components ---

function MenuItem({
    icon,
    label,
    isDark,
    resolvedTheme,
    destructive,
    onPress,
}: {
    icon: string;
    label: string;
    isDark: boolean;
    resolvedTheme: string;
    destructive?: boolean;
    onPress: () => void;
}) {
    const color = destructive ? '#FF3B30' : Colors[(resolvedTheme || 'light') as keyof typeof Colors].text;
    return (
        <Pressable
            style={({ pressed }) => [
                styles.menuItem,
                pressed && {
                    backgroundColor: isDark
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(0,0,0,0.04)',
                },
            ]}
            onPress={onPress}
        >
            <View style={styles.menuItemContent}>
                <PlatformIcon name={icon as any} size={20} tintColor={color} />
                <Text style={[styles.menuText, { color }]}>{label}</Text>
            </View>
        </Pressable>
    );
}

function Separator({ isDark }: { isDark: boolean }) {
    return (
        <View
            style={[
                styles.menuSeparator,
                {
                    backgroundColor: isDark
                        ? 'rgba(255,255,255,0.12)'
                        : 'rgba(0,0,0,0.06)',
                },
            ]}
        />
    );
}

// --- Styles ---

const styles = StyleSheet.create({
    island: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 5,
        borderRadius: 999,
        justifyContent: 'center',
        gap: 6,
        overflow: 'hidden',
    },
    darkModeBorder: {
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.15)',
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    lightModeBorder: {
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(0,0,0,0.05)',
        backgroundColor: 'rgba(255,255,255,0.4)',
    },
    iconButton: {
        width: 34,
        height: 34,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        position: 'absolute',
        top: 4,
        right: 6,
        backgroundColor: '#007AFF',
        borderRadius: 4,
        width: 8,
        height: 8,
    },
    authBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
    },
    // --- Overlay: absolute, same view tree ---
    fullScreenBackdrop: {
        position: 'absolute',
        top: -200,
        left: -SCREEN_WIDTH,
        width: SCREEN_WIDTH * 3,
        height: SCREEN_HEIGHT * 2,
        zIndex: 998,
    },
    menuContainer: {
        position: 'absolute',
        top: 50,
        right: 0,
        width: 240,
        zIndex: 999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
        elevation: 12,
    },
    menuGlass: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    menuItem: {
        paddingVertical: 13,
        paddingHorizontal: 16,
    },
    menuItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    menuText: {
        fontSize: 16,
        fontWeight: '400',
    },
    menuSeparator: {
        height: StyleSheet.hairlineWidth,
        width: '100%',
    },
    menuUserInfo: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    menuUserName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    menuUserEmail: {
        fontSize: 13,
        fontWeight: '400',
    },
    // --- Login Modal ---
    loginOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    loginCard: {
        width: SCREEN_WIDTH - 48,
        maxWidth: 380,
        borderRadius: 20,
        padding: 28,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 32,
        elevation: 20,
    },
    loginHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    loginIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    loginTitle: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 4,
    },
    loginSubtitle: {
        fontSize: 14,
        fontWeight: '400',
    },
    loginErrorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,59,48,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        marginBottom: 16,
        gap: 8,
    },
    loginErrorText: {
        color: '#FF3B30',
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
    },
    loginInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 48,
        marginBottom: 12,
        borderWidth: 1,
        gap: 10,
    },
    loginInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '400',
        height: '100%',
    },
    loginButton: {
        backgroundColor: '#C73A40',
        borderRadius: 12,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
    },
    loginCancelButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
    },
    loginCancelText: {
        fontSize: 15,
        fontWeight: '500',
    },
});

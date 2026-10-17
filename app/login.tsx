import React, { useState, useRef } from 'react';
import { 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    Pressable,
    StyleSheet, 
    KeyboardAvoidingView, 
    Platform, 
    TouchableWithoutFeedback, 
    Keyboard, 
    SafeAreaView, 
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { FormaLogo } from '@/components/ui/FormaLogo';
import { useTenantContext } from '@/context/TenantContext';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { BouncyGlassButton } from '@/components/ui/BouncyGlassButton';
import { PillButton } from '@/components/ui/PillButton';

export default function LoginScreen() {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#0F172A';
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const params = useLocalSearchParams<{ pendingTenantCode?: string; pendingTenantName?: string; pendingTenantPayload?: string }>();
    const { refreshTenants } = useTenantContext();
    
    const [step, setStep] = useState<'landing' | 'form'>('form');
    const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const emailInputRef = useRef<TextInput>(null);
    const passwordInputRef = useRef<TextInput>(null);

    const handleDismiss = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)/home');
        }
    };

    const handleAuth = async () => {
        if (!email.trim() || !password) {
            setError('Please enter both email and password');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
            if (authError) { setError(authError.message); return; }
            if (data.session) {
                await refreshTenants(data.session.user.id);
                router.replace('/(tabs)/home');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to connect to server.');
        } finally {
            setLoading(false);
        }
    };

    if (step === 'landing') {
        return (
            <SafeAreaView style={[styles.landingContainer, isDark && styles.landingContainerDark]}>
                <Stack.Screen
                    options={{
                        headerShown: Platform.OS === 'ios',
                        headerTitle: '',
                        headerTransparent: true,
                        headerShadowVisible: false,
                        headerTintColor: textColor,
                        headerLeft: () => (
                            <BouncyGlassButton
                                onPress={handleDismiss}
                                isDark={isDark}
                                variant="close"
                                textColor={textColor}
                            />
                        ),
                        headerRight: () => null,
                    }}
                />

                {/* Web & Android Direct Top Bar */}
                {Platform.OS !== 'ios' && (
                    <View style={[styles.androidTopBar, { paddingTop: Platform.OS === 'web' ? 16 : Math.max(insets.top, 16) }]}>
                        <BouncyGlassButton
                            onPress={handleDismiss}
                            isDark={isDark}
                            variant="close"
                            textColor={textColor}
                        />
                    </View>
                )}

                {/* Center Hero */}
                <View style={styles.landingContent}>
                    <FormaLogo 
                        size={88} 
                        showText={true} 
                        tagline="Architecture • Design • Development"
                        isDark={isDark} 
                    />
                </View>

                {/* Bottom Action Area with PillButtons */}
                <View style={[styles.landingBottom, { paddingBottom: Math.max(insets.bottom, 28) }]}>
                    {/* Primary Sign In Button */}
                    <PillButton
                        label="Sign In"
                        onPress={() => setStep('form')}
                        variant="solid"
                        color="blue"
                        icon={<PlatformIcon name="rectangle.portrait.and.arrow.right" size={16} tintColor="#FFFFFF" />}
                        style={{ width: '100%', backgroundColor: '#0036F8' }}
                    />

                    {/* Secondary Action Pills */}
                    

                    <Text style={[styles.copyright, isDark && styles.copyrightDark]}>
                        © 2026 Adidaya Studio. All rights reserved.
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    const formContent = (
        <SafeAreaView style={styles.inner}>
            <View style={styles.formMainContent}>
                {/* Header Branding */}
                <View style={styles.headerContainer}>
                    <FormaLogo size={52} isDark={isDark} />
                    <Text style={[styles.title, isDark && styles.titleDark]}>Welcome to Adidaya</Text>
                    <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>
                        Sign in to access your organization workspace
                    </Text>
                </View>

                {/* Error Alert */}
                {error && (
                    <View style={[styles.errorContainer, isDark && styles.errorContainerDark]}>
                        <PlatformIcon name="exclamationmark.triangle.fill" size={15} tintColor="#EF4444" />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                {/* Grouped Form Fields */}
                <View style={styles.formFieldsGroup}>
                    {/* Email Input */}
                    <View style={styles.inputField}>
                        <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>Email</Text>
                        <Pressable 
                            onPress={() => emailInputRef.current?.focus()}
                            style={[styles.inputPillContainer, isDark && styles.inputPillContainerDark]}
                        >
                            <TextInput
                                ref={emailInputRef}
                                style={[styles.textInput, isDark && styles.textInputDark]}
                                placeholder="name@company.com"
                                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                autoCorrect={false}
                                editable={!loading}
                                returnKeyType="next"
                                onSubmitEditing={() => passwordInputRef.current?.focus()}
                            />
                        </Pressable>
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputField}>
                        <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>Password</Text>
                        <Pressable 
                            onPress={() => passwordInputRef.current?.focus()}
                            style={[styles.inputPillContainer, isDark && styles.inputPillContainerDark]}
                        >
                            <TextInput
                                ref={passwordInputRef}
                                style={[styles.textInput, isDark && styles.textInputDark]}
                                placeholder="••••••••"
                                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!loading}
                                returnKeyType="go"
                                onSubmitEditing={handleAuth}
                            />
                            <TouchableOpacity 
                                onPress={() => setShowPassword(!showPassword)} 
                                style={styles.eyeToggle}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <PlatformIcon name={showPassword ? 'eye.slash.fill' : 'eye.fill'} size={18} tintColor={isDark ? '#94A3B8' : '#64748B'} />
                            </TouchableOpacity>
                        </Pressable>
                    </View>
                </View>

                {/* Sign In / Sign Up Primary Action via PillButton */}
                <PillButton
                    label={
                        loading
                            ? (authMode === 'signin' ? "Signing in..." : "Creating Account...")
                            : (authMode === 'signin' ? "Sign In" : "Create Account")
                    }
                    onPress={handleAuth}
                    variant="solid"
                    color="blue"
                    disabled={loading}
                    icon={<PlatformIcon name="rectangle.portrait.and.arrow.right" size={16} tintColor="#FFFFFF" />}
                    style={{ width: '100%', backgroundColor: '#0036F8' }}
                />

                {/* Toggle Auth Mode */}
                

                {/* Organization Options */}
                
            </View>

            {/* Tenant Selector Modal */}
            
        </SafeAreaView>
    );

    return (
        <KeyboardAvoidingView 
            style={[styles.formContainerWrapper, isDark && styles.formContainerWrapperDark]} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            enabled={Platform.OS !== 'web'}
        >
            <Stack.Screen
                options={{
                    headerShown: Platform.OS === 'ios',
                    headerTitle: '',
                    headerTransparent: true,
                    headerShadowVisible: false,
                    headerTintColor: textColor,
                    headerLeft: () => (
                        <BouncyGlassButton
                            onPress={() => {
                                if (authMode === 'signup') {
                                    setAuthMode('signin');
                                } else if (step === 'form' && !params.pendingTenantCode && !params.pendingTenantPayload) {
                                    setStep('landing');
                                } else {
                                    handleDismiss();
                                }
                            }}
                            isDark={isDark}
                            variant="back"
                            textColor={textColor}
                        />
                    ),
                    headerRight: () => null,
                }}
            />

            {/* Web & Android Direct Top Bar */}
            {Platform.OS !== 'ios' && (
                <View style={[styles.androidTopBar, { paddingTop: Platform.OS === 'web' ? 16 : Math.max(insets.top, 16) }]}>
                    <BouncyGlassButton
                        onPress={() => {
                            if (authMode === 'signup') {
                                setAuthMode('signin');
                            } else if (step === 'form' && !params.pendingTenantCode && !params.pendingTenantPayload) {
                                setStep('landing');
                            } else {
                                handleDismiss();
                            }
                        }}
                        isDark={isDark}
                        variant="back"
                        textColor={textColor}
                    />
                </View>
            )}

            {Platform.OS === 'web' ? (
                formContent
            ) : (
                <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                    {formContent}
                </TouchableWithoutFeedback>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    landingContainer: {
        flex: 1,
        backgroundColor: Platform.OS === 'web' ? 'transparent' : '#F8FAFC',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: 440,
        alignSelf: 'center',
    },
    landingContainerDark: {
        backgroundColor: Platform.OS === 'web' ? 'transparent' : '#090D16',
    },
    androidTopBar: {
        width: '100%',
        paddingHorizontal: 16,
        paddingBottom: 4,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        zIndex: 999,
        elevation: 10,
    },
    landingContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    landingBottom: {
        paddingHorizontal: 24,
        alignItems: 'center',
        gap: 12,
    },
    secondaryPillRow: {
        flexDirection: 'row',
        width: '100%',
        gap: 10,
    },
    copyright: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 6,
    },
    copyrightDark: {
        color: '#64748B',
    },

    // Form Layout
    formContainerWrapper: {
        flex: 1,
        backgroundColor: Platform.OS === 'web' ? 'transparent' : '#F8FAFC',
        width: '100%',
        maxWidth: 440,
        alignSelf: 'center',
    },
    formContainerWrapperDark: {
        backgroundColor: Platform.OS === 'web' ? 'transparent' : '#090D16',
    },
    inner: {
        flex: 1,
    },
    formMainContent: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingBottom: 24,
        gap: 16,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0F172A',
        marginTop: 12,
        letterSpacing: -0.5,
    },
    titleDark: {
        color: '#F8FAFC',
    },
    subtitle: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 4,
    },
    subtitleDark: {
        color: '#94A3B8',
    },
    formFieldsGroup: {
        gap: 12,
    },
    inputField: {
        gap: 5,
    },
    fieldLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#334155',
        marginLeft: 6,
    },
    fieldLabelDark: {
        color: '#CBD5E1',
        marginLeft: 6,
    },
    inputPillContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        ...(Platform.OS === 'web' ? {
            cursor: 'text' as any,
        } : {}),
    },
    inputPillContainerDark: {
        backgroundColor: '#1E293B',
        borderColor: '#334155',
    },
    textInput: {
        flex: 1,
        height: '100%',
        fontSize: 15,
        color: '#0F172A',
        letterSpacing: 0,
        fontWeight: '400',
        paddingVertical: 0,
        ...(Platform.OS === 'web' ? {
            outlineStyle: 'none' as any,
            userSelect: 'text' as any,
            cursor: 'text' as any,
        } : {}),
    },
    textInputDark: {
        color: '#F8FAFC',
    },
    eyeToggle: {
        padding: 4,
    },
    formFooterOptions: {
        alignItems: 'center',
        marginTop: 6,
        gap: 4,
    },
    footerPromptText: {
        fontSize: 12,
        color: '#94A3B8',
    },
    footerPromptTextDark: {
        color: '#64748B',
    },
    footerLinksRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    footerActionLink: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0036F8',
        textDecorationLine: 'underline',
    },
    footerActionLinkDark: {
        color: '#93C5FD',
        textDecorationLine: 'underline',
    },
    footerBullet: {
        fontSize: 12,
        color: '#CBD5E1',
    },
    footerBulletDark: {
        color: '#475569',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    errorContainerDark: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    errorText: {
        color: '#EF4444',
        marginLeft: 8,
        fontSize: 12,
        fontWeight: '500',
        flex: 1,
    },
});

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    ScrollView,
    StyleSheet,
    Platform,
    Alert,
    StatusBar as RNStatusBar,
    View,
    Keyboard,
    LayoutAnimation,
    Animated,
    useWindowDimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useTenantContext } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { SwiftUIUnsavedBanner } from '@/components/ui/SwiftUIUnsavedBanner';
import { SwiftUIToastHUD } from '@/components/ui/SwiftUIToastHUD';
import { OrganizationGeneralSection } from '@/components/organization-settings/OrganizationGeneralSection';
import { OrganizationSettingsMasterDetail } from '@/components/organization-settings/OrganizationSettingsMasterDetail';

export default function OrganizationGeneralScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 768;
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const insets = useSafeAreaInsets();
    const { activeTenant, updateTenant, tenantRole, isSuperAdmin } = useTenantContext();

    useEffect(() => {
        if (Platform.OS === 'web' && isDesktopWeb) {
            router.replace('/(tabs)/home/organization-settings/general');
        }
    }, [isDesktopWeb]);

    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

    // Toast HUD state
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const toastOpacity = useRef(new Animated.Value(0)).current;
    const toastTranslateY = useRef(new Animated.Value(-20)).current;
    const toastScale = useRef(new Animated.Value(0.92)).current;

    const showToast = useCallback((msg: string) => {
        setToastMessage(msg);
        Animated.parallel([
            Animated.timing(toastOpacity, {
                toValue: 1,
                duration: 180,
                useNativeDriver: true,
            }),
            Animated.spring(toastTranslateY, {
                toValue: 0,
                damping: 14,
                stiffness: 200,
                useNativeDriver: true,
            }),
            Animated.spring(toastScale, {
                toValue: 1,
                damping: 14,
                stiffness: 200,
                useNativeDriver: true,
            }),
        ]).start();

        setTimeout(() => {
            Animated.parallel([
                Animated.timing(toastOpacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(toastTranslateY, {
                    toValue: -14,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(toastScale, {
                    toValue: 0.95,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setToastMessage(null);
            });
        }, 2000);
    }, [toastOpacity, toastTranslateY, toastScale]);

    useEffect(() => {
        const showListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            () => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setIsKeyboardVisible(true);
            }
        );
        const hideListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setIsKeyboardVisible(false);
            }
        );
        return () => {
            showListener.remove();
            hideListener.remove();
        };
    }, []);

    const normalizedRole = (tenantRole || '').toLowerCase().trim();
    const canEditGeneral = isSuperAdmin || 
        normalizedRole.includes('owner') || 
        normalizedRole.includes('super');
    const isViewer = !canEditGeneral && normalizedRole.includes('view');
    const isReadOnly = !canEditGeneral;

    useEffect(() => {
        if (isViewer) {
            Alert.alert('Access Restricted', 'Viewers do not have access to Organization General Settings.');
            router.replace('/organization-settings');
        }
    }, [isViewer]);

    const [name, setName] = useState('');
    const [companyCode, setCompanyCode] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [primaryColor, setPrimaryColor] = useState('#0036F8');
    const [customHex, setCustomHex] = useState('0036F8');
    const [address, setAddress] = useState('');
    const [gmapsUrl, setGmapsUrl] = useState('');
    const [latitudeInput, setLatitudeInput] = useState('');
    const [longitudeInput, setLongitudeInput] = useState('');
    const [selectedRadius, setSelectedRadius] = useState<number>(50);
    const [contactPhone, setContactPhone] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [saving, setSaving] = useState(false);
    const [isLocating, setIsLocating] = useState(false);

    const bgColor = isDark ? '#000000' : '#F2F2F7';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#8E8E93' : '#64748B';

    useEffect(() => {
        if (activeTenant) {
            setName(activeTenant.branding_name || activeTenant.name || '');
            setCompanyCode(activeTenant.company_code || '');
            setJoinCode(activeTenant.join_code || '');
            setLogoUrl(activeTenant.branding_logo_url || activeTenant.logo_url || null);
            const color = activeTenant.primary_color || '#0036F8';
            setPrimaryColor(color);
            setCustomHex(color.replace('#', ''));
            setAddress(activeTenant.address || '');
            setGmapsUrl(activeTenant.gmaps_url || '');
            if ((activeTenant as any).latitude != null) setLatitudeInput(String((activeTenant as any).latitude));
            if ((activeTenant as any).longitude != null) setLongitudeInput(String((activeTenant as any).longitude));
            if ((activeTenant as any).attendance_radius != null) setSelectedRadius(Number((activeTenant as any).attendance_radius));
            setContactPhone(activeTenant.contact_phone || '');
            setContactEmail(activeTenant.contact_email || '');
        }
    }, [activeTenant]);

    const hasGeneralChanges = !isReadOnly && activeTenant && (
        name !== (activeTenant.branding_name || activeTenant.name || '') ||
        companyCode !== (activeTenant.company_code || '') ||
        logoUrl !== (activeTenant.branding_logo_url || activeTenant.logo_url || null) ||
        primaryColor.toUpperCase() !== (activeTenant.primary_color || '#0036F8').toUpperCase() ||
        address !== (activeTenant.address || '') ||
        gmapsUrl !== (activeTenant.gmaps_url || '') ||
        latitudeInput !== String((activeTenant as any).latitude || '') ||
        longitudeInput !== String((activeTenant as any).longitude || '') ||
        selectedRadius !== Number((activeTenant as any).attendance_radius || 50) ||
        contactPhone !== (activeTenant.contact_phone || '') ||
        contactEmail !== (activeTenant.contact_email || '')
    );

    const handleDiscardGeneralChanges = () => {
        if (activeTenant) {
            setName(activeTenant.branding_name || activeTenant.name || '');
            setCompanyCode(activeTenant.company_code || '');
            setLogoUrl(activeTenant.branding_logo_url || activeTenant.logo_url || null);
            const color = activeTenant.primary_color || '#0036F8';
            setPrimaryColor(color);
            setCustomHex(color.replace('#', ''));
            setAddress(activeTenant.address || '');
            setGmapsUrl(activeTenant.gmaps_url || '');
            setLatitudeInput((activeTenant as any).latitude != null ? String((activeTenant as any).latitude) : '');
            setLongitudeInput((activeTenant as any).longitude != null ? String((activeTenant as any).longitude) : '');
            setSelectedRadius((activeTenant as any).attendance_radius != null ? Number((activeTenant as any).attendance_radius) : 50);
            setContactPhone(activeTenant.contact_phone || '');
            setContactEmail(activeTenant.contact_email || '');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    const handlePickLogo = async () => {
        const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!res.canceled && res.assets && res.assets.length > 0) {
            setLogoUrl(res.assets[0].uri);
            Haptics.selectionAsync();
        }
    };

    const handleGetCurrentLocation = async () => {
        try {
            setIsLocating(true);
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required to detect GPS coordinates.');
                return;
            }

            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            setLatitudeInput(loc.coords.latitude.toFixed(6));
            setLongitudeInput(loc.coords.longitude.toFixed(6));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to get current location.');
        } finally {
            setIsLocating(false);
        }
    };

    const handleGmapsChange = (url: string) => {
        setGmapsUrl(url);
        const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (match) {
            setLatitudeInput(match[1]);
            setLongitudeInput(match[2]);
        }
    };

    const handleSaveChanges = async () => {
        if (!activeTenant?.id) return;
        setSaving(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const updates: any = {
                name: name.trim(),
                branding_name: name.trim(),
                company_code: companyCode.trim().toUpperCase(),
                primary_color: primaryColor,
                address: address.trim(),
                gmaps_url: gmapsUrl.trim(),
                latitude: latitudeInput ? parseFloat(latitudeInput) : null,
                longitude: longitudeInput ? parseFloat(longitudeInput) : null,
                attendance_radius: selectedRadius,
                contact_phone: contactPhone.trim(),
                contact_email: contactEmail.trim(),
                branding_logo_url: logoUrl,
                updated_at: new Date().toISOString(),
            };

            await updateTenant(activeTenant.id, updates);

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Success', 'Organization settings saved successfully.');
        } catch (err: any) {
            console.error('Save changes error:', err);
            Alert.alert('Error', err.message || 'Failed to save changes.');
        } finally {
            setSaving(false);
        }
    };

    const bannerTopPosition = Platform.OS === 'android'
        ? (RNStatusBar.currentHeight || 24) + 60
        : insets.top + 48;

    const bannerBottomPosition = (insets.bottom || 0) + 16;

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'General',
                    headerLargeTitle: false,
                    headerTransparent: Platform.OS === 'ios',
                    headerStyle: { backgroundColor: Platform.OS === 'ios' ? 'transparent' : (isDark ? '#000000' : '#F2F2F7') },
                    headerTintColor: textColor,
                    headerTitleStyle: { color: textColor },
                    headerShadowVisible: false,
                    headerBackButtonDisplayMode: 'minimal',
                    headerBackTitle: ' ',
                }}
            />

            <ScrollView
                style={[styles.container, { backgroundColor: bgColor }]}
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingBottom: hasGeneralChanges ? insets.bottom + 100 : insets.bottom + 40,
                    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 84 : 16,
                    gap: 16,
                }}
                showsVerticalScrollIndicator={false}
            >
                <OrganizationGeneralSection
                    name={name}
                    setName={setName}
                    companyCode={companyCode}
                    setCompanyCode={setCompanyCode}
                    joinCode={joinCode}
                    logoUrl={logoUrl}
                    handlePickLogo={handlePickLogo}
                    initials={(name || 'ORG').slice(0, 3).toUpperCase()}
                    primaryColor={primaryColor}
                    setPrimaryColor={setPrimaryColor}
                    customHex={customHex}
                    setCustomHex={setCustomHex}
                    address={address}
                    setAddress={setAddress}
                    gmapsUrl={gmapsUrl}
                    handleGmapsChange={handleGmapsChange}
                    latitudeInput={latitudeInput}
                    setLatitudeInput={setLatitudeInput}
                    longitudeInput={longitudeInput}
                    setLongitudeInput={setLongitudeInput}
                    selectedRadius={selectedRadius}
                    setSelectedRadius={setSelectedRadius}
                    isLocating={isLocating}
                    handleGetCurrentLocation={handleGetCurrentLocation}
                    contactPhone={contactPhone}
                    setContactPhone={setContactPhone}
                    contactEmail={contactEmail}
                    setContactEmail={setContactEmail}
                    isDark={isDark}
                    textColor={textColor}
                    subtextColor={subtextColor}
                    readOnly={isReadOnly}
                    onCopySuccess={showToast}
                />
            </ScrollView>

            {/* FLOATING TOP TOAST HUD */}
            {toastMessage && (
                <Animated.View
                    style={[
                        styles.toastWrapper,
                        {
                            top: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 16 : insets.top + 10,
                            opacity: toastOpacity,
                            transform: [
                                { translateY: toastTranslateY },
                                { scale: toastScale },
                            ],
                        },
                    ]}
                    pointerEvents="none"
                >
                    <SwiftUIToastHUD
                        message={toastMessage}
                        icon="checkmark.circle.fill"
                        iconColor="#34C759"
                        isDark={isDark}
                    />
                </Animated.View>
            )}

            {hasGeneralChanges && (
                <View
                    style={[
                        styles.unsavedBannerWrapper,
                        isKeyboardVisible
                            ? { top: bannerTopPosition }
                            : { bottom: bannerBottomPosition }
                    ]}
                >
                    <SwiftUIUnsavedBanner
                        onCancel={handleDiscardGeneralChanges}
                        onSave={handleSaveChanges}
                        saving={saving}
                        isDark={isDark}
                        title="Unsaved changes"
                    />
                </View>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    unsavedBannerWrapper: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 99,
    },
    toastWrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 99999,
    },
});

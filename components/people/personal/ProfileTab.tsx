import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Alert,
    StyleSheet,
    Image,
    ActivityIndicator,
    Platform,
    ActionSheetIOS,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { PillButton } from '@/components/ui/PillButton';
import { useUserContext } from '@/context/UserProvider';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../../lib/supabase';

interface ProfileTabProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    activeTab?: string;
    onSelectTab?: (tabId: string) => void;
}

export function ProfileTab({ isDark, textColor, subtextColor, activeTab, onSelectTab }: ProfileTabProps) {
    const router = useRouter();
    const { profile, user, signOut, refreshProfile } = useUserContext();
    const isSystemAccount = profile?.role === 'system' || (profile as any)?.account_type === 'system';
    const [updatingAvatar, setUpdatingAvatar] = useState(false);
    const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
    const [isCardExpanded, setIsCardExpanded] = useState(false);

    const activeAvatar = localAvatarUri || profile?.avatarUrl || (profile as any)?.avatar_url;

    const processUpload = async (pickerResult: ImagePicker.ImagePickerResult) => {
        if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
            return;
        }

        const asset = pickerResult.assets[0];
        const uri = asset.uri;
        const targetUserId = profile?.id || user?.id;

        if (!targetUserId) {
            Alert.alert('Error', 'User ID not found.');
            return;
        }

        setUpdatingAvatar(true);

        try {
            let uploadBody: any;
            if (Platform.OS === 'web') {
                if ((asset as any).file) {
                    uploadBody = (asset as any).file;
                } else {
                    const response = await fetch(uri);
                    uploadBody = await response.blob();
                }
            } else {
                const base64 = await FileSystem.readAsStringAsync(uri, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                uploadBody = decode(base64);
            }

            const cleanUri = uri.split('?')[0];
            const fileExt = asset.mimeType
                ? (asset.mimeType.includes('png') ? 'png' : (asset.mimeType.includes('webp') ? 'webp' : 'jpg'))
                : (cleanUri.split('.').pop()?.toLowerCase() || 'jpg');
            const fileName = `${targetUserId}_${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;
            const contentType = fileExt === 'png' ? 'image/png' : (fileExt === 'webp' ? 'image/webp' : 'image/jpeg');

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, uploadBody, {
                    contentType,
                    upsert: true,
                });

            if (uploadError) {
                console.error('Storage upload error:', uploadError);
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // 1. Update public.profiles table
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ 
                    avatar_url: publicUrl,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', targetUserId);

            if (updateError) {
                console.error('Profiles update error:', updateError);
                throw updateError;
            }

            // 2. Sync to auth user_metadata
            try {
                await supabase.auth.updateUser({
                    data: { avatar_url: publicUrl }
                });
            } catch (authErr) {
                console.warn('Auth user metadata sync warning:', authErr);
            }

            // 3. Sync to user_documents (Pas Foto)
            try {
                const { data: existingDoc } = await supabase
                    .from('user_documents')
                    .select('id')
                    .eq('user_id', targetUserId)
                    .in('document_type', ['Pas Foto', 'Pas Foto (Profile Photo)'])
                    .maybeSingle();

                if (existingDoc?.id) {
                    await supabase
                        .from('user_documents')
                        .update({
                            title: 'Pas Foto (Profile Photo)',
                            file_url: publicUrl,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', existingDoc.id);
                } else {
                    await supabase
                        .from('user_documents')
                        .insert({
                            user_id: targetUserId,
                            title: 'Pas Foto (Profile Photo)',
                            document_type: 'Pas Foto (Profile Photo)',
                            file_url: publicUrl,
                        });
                }
            } catch (docErr) {
                console.warn('User documents sync warning:', docErr);
            }

            setLocalAvatarUri(publicUrl);
            await refreshProfile();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Success', 'Profile photo updated successfully!');
        } catch (error: any) {
            console.error('Failed to update avatar:', error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', error.message || 'Failed to update profile photo.');
        } finally {
            setUpdatingAvatar(false);
        }
    };

    const handlePickGallery = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                Alert.alert('Permission Denied', 'Gallery permission is required to select a photo.');
                return;
            }

            const pickerResult = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.85,
            });

            await processUpload(pickerResult);
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not pick image.');
        }
    };

    const handleTakePhoto = async () => {
        try {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (!permissionResult.granted) {
                Alert.alert('Permission Denied', 'Camera permission is required to take a photo.');
                return;
            }

            const pickerResult = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.85,
            });

            await processUpload(pickerResult);
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not take photo.');
        }
    };

    const handleRemovePhoto = async () => {
        const targetUserId = profile?.id || user?.id;
        if (!targetUserId) return;

        setUpdatingAvatar(true);
        try {
            await supabase
                .from('profiles')
                .update({ 
                    avatar_url: null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', targetUserId);

            try {
                await supabase.auth.updateUser({
                    data: { avatar_url: null }
                });
            } catch {}

            setLocalAvatarUri(null);
            await refreshProfile();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Success', 'Profile photo removed.');
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to remove photo.');
        } finally {
            setUpdatingAvatar(false);
        }
    };

    const handleEditAvatar = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (Platform.OS === 'ios') {
            const hasAvatar = !!activeAvatar;
            const options = hasAvatar
                ? ['Cancel', 'Take Photo', 'Choose from Library', 'Remove Photo']
                : ['Cancel', 'Take Photo', 'Choose from Library'];

            ActionSheetIOS.showActionSheetWithOptions(
                {
                    title: 'Profile Photo',
                    options,
                    cancelButtonIndex: 0,
                    destructiveButtonIndex: hasAvatar ? 3 : undefined,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) handleTakePhoto();
                    else if (buttonIndex === 2) handlePickGallery();
                    else if (buttonIndex === 3 && hasAvatar) handleRemovePhoto();
                }
            );
        } else if (Platform.OS === 'web') {
            handlePickGallery();
        } else {
            const buttons: any[] = [
                { text: 'Take Photo', onPress: handleTakePhoto },
                { text: 'Choose from Library', onPress: handlePickGallery },
            ];
            if (activeAvatar) {
                buttons.push({ text: 'Remove Photo', style: 'destructive', onPress: handleRemovePhoto });
            }
            buttons.push({ text: 'Cancel', style: 'cancel' });
            Alert.alert('Profile Photo', undefined, buttons);
        }
    };

    const handleSignOut = () => {
        Alert.alert(
            "Sign Out",
            "Are you sure you want to sign out of your account?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Sign Out",
                    style: "destructive",
                    onPress: async () => {
                        await signOut();
                    }
                }
            ]
        );
    };

    const menuItems = [
        {
            id: 'account',
            title: 'Account',
            subtitle: 'Home/System, Configuration',
            icon: 'person.crop.circle.fill',
            color: '#007AFF',
            gradientColors: ['#007AFF', '#0051A8'],
        },
        {
            id: 'identity',
            title: 'Identity',
            subtitle: 'Basic info, Contact, Documents',
            icon: 'person.text.rectangle.fill',
            color: '#FF9500',
            gradientColors: ['#FF9500', '#B26800'],
        },
        {
            id: 'employment',
            title: 'Employment',
            subtitle: 'Role, Schedule, History',
            icon: 'briefcase.fill',
            color: '#34C759',
            gradientColors: ['#34C759', '#1E7E34'],
        },
        {
            id: 'access',
            title: 'Access',
            subtitle: 'System roles and permissions',
            icon: 'lock.fill',
            color: '#AF52DE',
            gradientColors: ['#AF52DE', '#7826A3'],
        },
    ];

    return (
        <View style={s.profileContainer}>
            {/* Top Profile Pulse-Style Card */}
            <TouchableOpacity 
                activeOpacity={0.92}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIsCardExpanded((prev) => !prev);
                }}
                style={s.profileCard}
            >
                {/* Oceanic Royal Blue Gradient matching Dashboard Grid */}
                <LinearGradient
                    colors={['#2E77C9', '#2467B2', '#1A4F8B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0.85, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                />

                {/* Profile Main Body - Vertical Layout (Photo on top, texts below) */}
                <View style={s.profileHeaderVertical}>
                    <TouchableOpacity
                        style={s.avatarContainer}
                        onPress={handleEditAvatar}
                        activeOpacity={0.8}
                        disabled={updatingAvatar}
                    >
                        {updatingAvatar ? (
                            <View style={[s.avatarPlaceholder, { justifyContent: 'center', alignItems: 'center' }]}>
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            </View>
                        ) : activeAvatar ? (
                            <Image 
                                source={{ uri: activeAvatar }} 
                                style={s.avatarPlaceholder} 
                            />
                        ) : (
                            <LinearGradient
                                colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.1)']}
                                style={s.avatarPlaceholder}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Text style={s.avatarInitials}>
                                    {(() => {
                                        if (!profile) return 'U';
                                        const name = profile.full_name || profile.nickname || '';
                                        const parts = name.trim().split(/\s+/);
                                        if (parts.length >= 2) {
                                            return (parts[0][0] + parts[1][0]).toUpperCase();
                                        }
                                        if (parts.length === 1 && parts[0].length > 0) {
                                            return parts[0].substring(0, 2).toUpperCase();
                                        }
                                        return 'U';
                                    })()}
                                </Text>
                            </LinearGradient>
                        )}
                        <View style={s.editAvatarButton}>
                            <PlatformIcon name="camera.fill" size={13} tintColor="#2467B2" />
                        </View>
                    </TouchableOpacity>
 
                    <View style={s.profileInfoVertical}>
                        {/* 1. Nama */}
                        <Text style={s.profileName} numberOfLines={isCardExpanded ? undefined : 1}>
                            {profile?.full_name || profile?.nickname || (isSystemAccount ? 'System Account' : 'User')}
                        </Text>

                        {/* 2. Email */}
                        {profile?.email ? (
                            <Text style={s.profileEmail} numberOfLines={isCardExpanded ? undefined : 1}>
                                {profile.email}
                            </Text>
                        ) : null}

                        {/* 3. Departemen */}
                        {profile?.department ? (
                            <Text style={s.profileMetaText} numberOfLines={isCardExpanded ? undefined : 1}>
                                {profile.department}
                            </Text>
                        ) : null}

                        {/* 4. Position */}
                        {(profile?.position || profile?.job_title) ? (
                            <Text style={s.profileMetaText} numberOfLines={isCardExpanded ? undefined : 1}>
                                {profile?.position || profile?.job_title}
                            </Text>
                        ) : null}

                        {/* 5. Employee ID */}
                        {(profile?.employee_id || profile?.id_code) ? (
                            <Text style={s.profileIdText} numberOfLines={isCardExpanded ? undefined : 1}>
                                {profile.employee_id || profile.id_code}
                            </Text>
                        ) : null}
                    </View>
                </View>
            </TouchableOpacity>

            {/* Settings Menu List */}
            <View style={s.menuListContainer}>
                <Text style={[s.menuListHeader, { color: subtextColor }]}>Profile Details</Text>
                <GlassView 
                    intensity={isDark ? 10 : 25} 
                    style={[
                        s.menuList, 
                        { 
                            backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)' 
                        }
                    ]}
                >
                    {menuItems.map((item, index) => {
                        const isLast = index === menuItems.length - 1;
                        const isSystem = (profile as any)?.account_type === 'system';
                        const isItemDisabled = isSystem && (item.id === 'identity' || item.id === 'employment');
                        const isSelected = activeTab === item.id && !!onSelectTab;

                        return (
                            <View key={item.id}>
                                <TouchableOpacity
                                    style={[
                                        s.menuRow, 
                                        isItemDisabled && { opacity: 0.4 },
                                        isSelected && {
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,122,255,0.08)',
                                        }
                                    ]}
                                    onPress={() => {
                                        if (isItemDisabled) {
                                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                            Alert.alert('Not Applicable', 'Identity and Employment details are disabled for System Accounts.');
                                            return;
                                        }
                                        if (onSelectTab) {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            onSelectTab(item.id);
                                        } else {
                                            router.push(`/profile-details/${item.id}` as any);
                                        }
                                    }}
                                    activeOpacity={isItemDisabled ? 1 : 0.7}
                                >
                                    <LinearGradient
                                        colors={isDark ? ['#1C1C1E', '#000000'] : (item.gradientColors as any)}
                                        style={s.menuIconBox}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <PlatformIcon name={item.icon as any} size={16} tintColor={isDark ? item.color : '#FFF'} />
                                    </LinearGradient>
                                    <View style={s.menuRowContent}>
                                        <Text style={[s.menuRowTitle, { color: isSelected ? (isDark ? '#FFFFFF' : '#007AFF') : textColor }]}>{item.title}</Text>
                                        <Text style={[s.menuRowSubtitle, { color: subtextColor }]} numberOfLines={1}>
                                            {isItemDisabled ? 'Disabled for System Account' : item.subtitle}
                                        </Text>
                                    </View>
                                    <PlatformIcon 
                                        name={isItemDisabled ? "lock.fill" : "chevron.right"} 
                                        size={14} 
                                        tintColor={isSelected ? (isDark ? '#FFFFFF' : '#007AFF') : (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)')} 
                                    />
                                </TouchableOpacity>
                                {!isLast && (
                                    <View
                                        style={[
                                            s.indentedDivider,
                                            { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }
                                        ]}
                                    />
                                )}
                            </View>
                        );
                    })}
                </GlassView>
            </View>

            {/* Sign Out Button - Real Liquid Crystal / SwiftUI PillButton */}
            <View style={s.signOutSection}>
                <PillButton
                    label="Sign Out"
                    onPress={handleSignOut}
                    variant="tinted"
                    color="red"
                    size="lg"
                    icon={<PlatformIcon name="rectangle.portrait.and.arrow.right" size={17} tintColor={isDark ? '#FF453A' : '#FF3B30'} />}
                    style={{ width: '100%' }}
                />
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    profileContainer: {
        gap: 20,
    },
    profileCard: {
        borderRadius: 28,
        paddingHorizontal: 20,
        paddingVertical: 20,
        height: 260,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#2467B2',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.32,
                shadowRadius: 18,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    ambientGlow: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: '85%',
        height: '100%',
    },
    profileHeaderVertical: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    avatarContainer: {
        position: 'relative',
        alignSelf: 'center',
    },
    avatarPlaceholder: {
        width: 90,
        height: 90,
        borderRadius: 45,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2.5,
        borderColor: 'rgba(255, 255, 255, 0.45)',
    },
    avatarInitials: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: -0.5,
    },
    editAvatarButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.85)',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 3,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    profileInfoVertical: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        gap: 2,
        width: '100%',
    },
    profileName: {
        fontSize: 19,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -0.3,
        textAlign: 'center',
    },
    profileEmail: {
        fontSize: 12.5,
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.82)',
        textAlign: 'center',
        marginBottom: 6,
    },
    profileMetaText: {
        fontSize: 12,
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.92)',
        textAlign: 'center',
        lineHeight: 16,
    },
    profileIdText: {
        fontSize: 11.5,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.75)',
        textAlign: 'center',
        marginTop: 1,
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
        paddingVertical: 12,
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
    signOutSection: {
        marginTop: 10,
        marginBottom: 8,
    },
});

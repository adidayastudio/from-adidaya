import React, { useCallback, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Platform,
    KeyboardAvoidingView,
    RefreshControl,
    TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SwiftUIUnsavedBanner } from '@/components/ui/SwiftUIUnsavedBanner';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { useTenantContext } from '@/context/TenantContext';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { TABS } from '@/components/people/member-profile/types';
import { useMemberProfileData } from '@/components/people/member-profile/hooks/useMemberProfileData';
import { ProfileHeroCard } from '@/components/people/member-profile/components/ProfileHeroCard';
import { MemberProfileRow } from '@/components/people/member-profile/components/MemberProfileRow';
import { MemberAccountTab } from '@/components/people/member-profile/tabs/MemberAccountTab';
import { MemberIdentityTab } from '@/components/people/member-profile/tabs/MemberIdentityTab';
import { MemberEmploymentTab } from '@/components/people/member-profile/tabs/MemberEmploymentTab';
import { MemberDocumentsTab } from '@/components/people/member-profile/tabs/MemberDocumentsTab';
import { MemberPerformanceTab } from '@/components/people/member-profile/tabs/MemberPerformanceTab';
import { MemberAccessTab } from '@/components/people/member-profile/tabs/MemberAccessTab';
import { PromptModal } from '@/components/people/member-profile/components/PromptModal';
import { OptionPickerModal } from '@/components/people/member-profile/components/OptionPickerModal';
import { CrewDocumentPreview } from '@/components/crew/CrewDocumentPreview';
import { generateMemberProfileHtml } from '@/components/people/member-profile/utils/memberProfilePdfTemplate';

interface MemberProfileViewProps {
    params: {
        id: string;
        name?: string;
        dept?: string;
        role?: string;
        status?: string;
        email?: string;
    };
    isEmbedded?: boolean;
    controlledTab?: string;
    onTabChange?: (tab: string) => void;
    onClose?: () => void;
}

export function MemberProfileView({ params, isEmbedded = false, controlledTab, onTabChange, onClose }: MemberProfileViewProps) {
    const insets = useSafeAreaInsets();
    const { activeTenant } = useTenantContext();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const primaryColor = activeTenant?.primary_color || '#10B981';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const sectionTitleColor = isDark ? '#8E8E93' : '#6E6E73';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
    const bgColor = isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF';
    const intensity = isDark ? 10 : 25;

    const {
        profile,
        editForm,
        setEditForm,
        activeTab,
        setActiveTab,
        activeSection,
        setActiveSection,
        loading,
        refreshing,
        saving,
        uploadingDoc,
        departmentsList,
        positionsList,
        levelsList,
        contractTypesList,
        workStatusesList,
        workSchedulesList,
        matchedPolicy,
        leavePolicyInfo,
        documents,
        computeEmployeeIdentifiers,
        handleRefresh,
        toggleEditSection,
        handleCancel,
        handleSave,
        handleLogPromotion,
        handleUploadDoc,
        handleDeleteDoc,
        handleSocialPress,
        copyToClipboard,
        showOptionPicker,
        selectGender,
        getBirthDateObj,
        getJoinDateObj,
        getEndDateObj,
        optionPickerState,
        setOptionPickerState,
        promptModalState,
        setPromptModalState,
    } = useMemberProfileData(params, activeTenant);

    const isSystemAccount = (activeSection === 'Account Configuration' ? editForm.account_type : profile.account_type) === 'system';

    useEffect(() => {
        if (controlledTab && controlledTab !== activeTab) {
            setActiveTab(controlledTab);
        }
    }, [controlledTab, activeTab, setActiveTab]);

    useEffect(() => {
        if (isSystemAccount && activeTab !== 'account') {
            setActiveTab('account');
        }
    }, [isSystemAccount, activeTab, setActiveTab]);

    const segments = useMemo(() => {
        return TABS.map((tab) => ({
            ...tab,
            disabled: isSystemAccount && tab.id !== 'account',
        }));
    }, [isSystemAccount]);

    const renderRow = useCallback((
        sectionKey: string,
        fieldKey: string,
        label: string,
        icon: string,
        isLast = false,
        canCopy = false,
        isEditable = true,
        keyboardType: any = 'default',
        maxLength?: number,
        placeholder?: string
    ) => (
        <MemberProfileRow
            key={fieldKey}
            sectionKey={sectionKey}
            fieldKey={fieldKey}
            label={label}
            icon={icon}
            isLast={isLast}
            canCopy={canCopy}
            isEditable={isEditable}
            keyboardType={keyboardType}
            maxLength={maxLength}
            placeholder={placeholder}
            activeSection={activeSection}
            profile={profile}
            editForm={editForm}
            setEditForm={setEditForm}
            computeEmployeeIdentifiers={computeEmployeeIdentifiers}
            copyToClipboard={copyToClipboard}
            textColor={textColor}
            subtextColor={subtextColor}
            borderColor={borderColor}
        />
    ), [activeSection, profile, editForm, setEditForm, computeEmployeeIdentifiers, copyToClipboard, textColor, subtextColor, borderColor]);

    const heroProfile = useMemo(() => {
        if (activeSection === 'Account Configuration' && editForm.account_type) {
            return { ...profile, account_type: editForm.account_type };
        }
        return profile;
    }, [profile, activeSection, editForm.account_type]);

    const [exportPreviewVisible, setExportPreviewVisible] = React.useState(false);
    const [exportHtml, setExportHtml] = React.useState<string | null>(null);
    const [activePreviewDoc, setActivePreviewDoc] = React.useState<any>(null);

    const handleExportProfile = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const html = generateMemberProfileHtml(profile, activeTenant, documents);
        setExportHtml(html);
        setExportPreviewVisible(true);
    }, [profile, activeTenant, documents]);

    const handlePrintFromPanel = useCallback(() => {
        if (!exportHtml) return;
        if (Platform.OS === 'web') {
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(exportHtml);
                printWindow.document.close();
                printWindow.focus();
                setTimeout(() => {
                    printWindow.print();
                }, 250);
            }
        }
    }, [exportHtml]);

    if (isEmbedded && exportPreviewVisible) {
        return (
            <View style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#F2F2F7' }}>
                <View style={[styles.embeddedHeader, { borderBottomColor: borderColor }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <TouchableOpacity
                            onPress={() => setExportPreviewVisible(false)}
                            style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            activeOpacity={0.7}
                        >
                            <PlatformIcon name="chevron.left" size={14} tintColor={textColor} />
                        </TouchableOpacity>
                        <Text style={[styles.embeddedHeaderTitle, { color: textColor }]}>
                            Preview
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity
                            onPress={handlePrintFromPanel}
                            style={[styles.closeButton, { backgroundColor: '#007AFF', width: 'auto', paddingHorizontal: 12, height: 30, borderRadius: 15, flexDirection: 'row', gap: 6 }]}
                            activeOpacity={0.8}
                        >
                            <PlatformIcon name="arrow.down.doc" size={13} tintColor="#FFFFFF" />
                            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>Export PDF</Text>
                        </TouchableOpacity>
                        {onClose && (
                            <TouchableOpacity
                                onPress={onClose}
                                style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                            >
                                <PlatformIcon name="xmark" size={14} tintColor={subtextColor} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
                <View style={{ flex: 1, backgroundColor: isDark ? '#1C1C1E' : '#E5E5EA' }}>
                    {Platform.OS === 'web' && exportHtml ? (
                        <iframe
                            srcDoc={exportHtml}
                            style={{
                                width: '100%',
                                height: '100%',
                                border: 'none',
                                backgroundColor: 'transparent',
                            }}
                        />
                    ) : null}
                </View>
            </View>
        );
    }

    if (isEmbedded && activePreviewDoc) {
        const isImage = activePreviewDoc.category === 'Pas Foto' || /\.(jpg|jpeg|png|webp|gif|heic)(\?.*)?$/i.test(activePreviewDoc.file_url);

        return (
            <View style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#F2F2F7' }}>
                <View style={[styles.embeddedHeader, { borderBottomColor: borderColor }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <TouchableOpacity
                            onPress={() => setActivePreviewDoc(null)}
                            style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            activeOpacity={0.7}
                        >
                            <PlatformIcon name="chevron.left" size={14} tintColor={textColor} />
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.embeddedHeaderTitle, { color: textColor }]} numberOfLines={1}>
                                {activePreviewDoc.category}
                            </Text>
                            <Text style={[styles.embeddedHeaderSubtitle, { color: subtextColor }]} numberOfLines={1}>
                                {activePreviewDoc.title || 'Official File'}
                            </Text>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                if (Platform.OS === 'web') {
                                    const a = document.createElement('a');
                                    a.href = activePreviewDoc.file_url;
                                    a.download = activePreviewDoc.title || activePreviewDoc.category;
                                    a.target = '_blank';
                                    a.click();
                                }
                            }}
                            style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', width: 'auto', paddingHorizontal: 10, height: 28, borderRadius: 14, flexDirection: 'row', gap: 4 }]}
                            activeOpacity={0.8}
                        >
                            <PlatformIcon name="arrow.down.circle" size={12} tintColor={textColor} />
                            <Text style={{ color: textColor, fontSize: 11, fontWeight: '500' }}>Download</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                const catId = activePreviewDoc.category;
                                setActivePreviewDoc(null);
                                handleUploadDoc(catId);
                            }}
                            style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', width: 'auto', paddingHorizontal: 10, height: 28, borderRadius: 14, flexDirection: 'row', gap: 4 }]}
                            activeOpacity={0.8}
                        >
                            <PlatformIcon name="arrow.triangle.2.circlepath" size={12} tintColor="#007AFF" />
                            <Text style={{ color: '#007AFF', fontSize: 11, fontWeight: '500' }}>Change</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                const docId = activePreviewDoc.id;
                                const cat = activePreviewDoc.category;
                                setActivePreviewDoc(null);
                                handleDeleteDoc(docId, cat);
                            }}
                            style={[styles.closeButton, { backgroundColor: 'rgba(255, 59, 48, 0.1)', width: 28, height: 28, borderRadius: 14 }]}
                            activeOpacity={0.8}
                        >
                            <PlatformIcon name="trash" size={12} tintColor="#FF3B30" />
                        </TouchableOpacity>
                        {onClose && (
                            <TouchableOpacity
                                onPress={onClose}
                                style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                            >
                                <PlatformIcon name="xmark" size={14} tintColor={subtextColor} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
                <View style={{ flex: 1, backgroundColor: isDark ? '#1C1C1E' : '#E5E5EA' }}>
                    {isImage ? (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                            <Image
                                source={{ uri: activePreviewDoc.file_url }}
                                style={{ width: '100%', height: '100%' }}
                                contentFit="contain"
                                transition={200}
                            />
                        </View>
                    ) : Platform.OS === 'web' && activePreviewDoc.file_url ? (
                        <iframe
                            src={activePreviewDoc.file_url}
                            style={{
                                width: '100%',
                                height: '100%',
                                border: 'none',
                                backgroundColor: 'transparent',
                            }}
                        />
                    ) : null}
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#F2F2F7' }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {!isEmbedded && (
                <Stack.Screen
                    options={{
                        headerShown: true,
                        title: profile.full_name || params.name || 'Member Profile',
                        headerLargeTitle: false,
                        headerTransparent: Platform.OS === 'ios',
                        headerShadowVisible: false,
                        headerStyle: { backgroundColor: Platform.OS === 'ios' ? 'transparent' : (isDark ? '#000000' : '#F2F2F7') },
                        headerTintColor: textColor,
                        headerTitleStyle: { color: textColor, fontWeight: '600' },
                        headerBackButtonDisplayMode: 'minimal',
                        headerBackTitle: ' ',
                        headerRight: () => (
                            <TouchableOpacity
                                onPress={handleExportProfile}
                                style={{ padding: 6, marginRight: Platform.OS === 'ios' ? 0 : 4 }}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                activeOpacity={0.7}
                            >
                                <PlatformIcon name="square.and.arrow.up" size={19} tintColor={textColor} />
                            </TouchableOpacity>
                        ),
                    }}
                />
            )}

            {isEmbedded && (
                <View style={[styles.embeddedHeader, { borderBottomColor: borderColor }]}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.embeddedHeaderTitle, { color: textColor }]} numberOfLines={1}>
                            {profile.full_name || params.name || 'Member Profile'}
                        </Text>
                        <Text style={[styles.embeddedHeaderSubtitle, { color: subtextColor }]} numberOfLines={1}>
                            {params.dept || profile.department || 'Team Member'}
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity
                            onPress={handleExportProfile}
                            style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            activeOpacity={0.7}
                        >
                            <PlatformIcon name="square.and.arrow.up" size={14} tintColor={subtextColor} />
                        </TouchableOpacity>
                        {onClose && (
                            <TouchableOpacity
                                onPress={onClose}
                                style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                            >
                                <PlatformIcon name="xmark" size={14} tintColor={subtextColor} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}

            <ScrollView
                style={styles.container}
                contentContainerStyle={[
                    styles.scrollContent,
                    {
                        paddingTop: isEmbedded ? 16 : (Platform.OS === 'ios' ? insets.top + 56 : 16),
                        paddingBottom: insets.bottom + (activeSection ? 90 : 40),
                    },
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#007AFF" />
                }
            >
                {/* 1. TOP PROFILE HERO CARD */}
                <ProfileHeroCard
                    profile={heroProfile}
                    primaryColor={primaryColor}
                    textColor={textColor}
                    subtextColor={subtextColor}
                    bgColor={bgColor}
                    borderColor={borderColor}
                    intensity={intensity}
                    isDark={isDark}
                    onEditAvatar={() => handleUploadDoc('Pas Foto')}
                    updatingAvatar={uploadingDoc === 'Pas Foto' || uploadingDoc === 'Pas Foto (Profile Photo)'}
                />

                {/* 2. SEGMENTED TAB BAR */}
                <View style={styles.tabBarContainer}>
                    <SegmentedControl
                        segments={segments}
                        activeSegment={activeTab}
                        onSegmentChange={(id) => {
                            Haptics.selectionAsync();
                            setActiveTab(id);
                            setActiveSection(null);
                            onTabChange?.(id);
                        }}
                    />
                </View>

                {/* 3. TAB CONTENT */}
                {loading ? (
                    <View style={styles.loaderBox}>
                        <ActivityIndicator size="small" color="#007AFF" />
                        <Text style={[styles.loaderText, { color: subtextColor }]}>Loading member details...</Text>
                    </View>
                ) : (
                    <View style={{ gap: 24 }}>
                        {activeTab === 'account' && (
                            <MemberAccountTab
                                profile={profile}
                                editForm={editForm}
                                setEditForm={setEditForm}
                                activeSection={activeSection}
                                toggleEditSection={toggleEditSection}
                                renderRow={renderRow}
                                showOptionPicker={showOptionPicker}
                                isDark={isDark}
                                textColor={textColor}
                                subtextColor={subtextColor}
                                borderColor={borderColor}
                                bgColor={bgColor}
                                intensity={intensity}
                                sectionTitleColor={sectionTitleColor}
                            />
                        )}

                        {activeTab === 'identity' && (
                            <MemberIdentityTab
                                profile={profile}
                                editForm={editForm}
                                setEditForm={setEditForm}
                                activeSection={activeSection}
                                toggleEditSection={toggleEditSection}
                                renderRow={renderRow}
                                selectGender={selectGender}
                                showOptionPicker={showOptionPicker}
                                handleSocialPress={handleSocialPress}
                                getBirthDateObj={getBirthDateObj}
                                isDark={isDark}
                                textColor={textColor}
                                subtextColor={subtextColor}
                                borderColor={borderColor}
                                bgColor={bgColor}
                                intensity={intensity}
                                sectionTitleColor={sectionTitleColor}
                            />
                        )}

                        {activeTab === 'employment' && (
                            <MemberEmploymentTab
                                profile={profile}
                                editForm={editForm}
                                setEditForm={setEditForm}
                                activeSection={activeSection}
                                toggleEditSection={toggleEditSection}
                                renderRow={renderRow}
                                departmentsList={departmentsList}
                                positionsList={positionsList}
                                levelsList={levelsList}
                                contractTypesList={contractTypesList}
                                workStatusesList={workStatusesList}
                                workSchedulesList={workSchedulesList}
                                matchedPolicy={matchedPolicy}
                                leavePolicyInfo={leavePolicyInfo}
                                computeEmployeeIdentifiers={computeEmployeeIdentifiers}
                                showOptionPicker={showOptionPicker}
                                handleLogPromotion={handleLogPromotion}
                                copyToClipboard={copyToClipboard}
                                getJoinDateObj={getJoinDateObj}
                                getEndDateObj={getEndDateObj}
                                isDark={isDark}
                                textColor={textColor}
                                subtextColor={subtextColor}
                                borderColor={borderColor}
                                bgColor={bgColor}
                                intensity={intensity}
                                sectionTitleColor={sectionTitleColor}
                            />
                        )}

                        {activeTab === 'access' && (
                            <MemberAccessTab
                                profile={profile}
                                textColor={textColor}
                                subtextColor={subtextColor}
                                borderColor={borderColor}
                                bgColor={bgColor}
                                intensity={intensity}
                                sectionTitleColor={sectionTitleColor}
                            />
                        )}

                        {activeTab === 'documents' && (
                            <MemberDocumentsTab
                                userId={params.id}
                                documents={documents}
                                uploadingDoc={uploadingDoc}
                                onUploadDoc={handleUploadDoc}
                                onDeleteDoc={handleDeleteDoc}
                                onPreviewDoc={(doc) => setActivePreviewDoc(doc)}
                                textColor={textColor}
                                subtextColor={subtextColor}
                                borderColor={borderColor}
                                bgColor={bgColor}
                                intensity={intensity}
                                sectionTitleColor={sectionTitleColor}
                                isDark={isDark}
                            />
                        )}

                        {activeTab === 'performance' && (
                            <MemberPerformanceTab
                                profile={profile}
                                textColor={textColor}
                                subtextColor={subtextColor}
                                borderColor={borderColor}
                                bgColor={bgColor}
                                intensity={intensity}
                                sectionTitleColor={sectionTitleColor}
                            />
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Bottom Floating Save Banner */}
            {activeSection && (
                <View style={[styles.unsavedBannerWrapper, { bottom: Math.max(insets.bottom, 16) }]}>
                    <SwiftUIUnsavedBanner
                        onCancel={handleCancel}
                        onSave={handleSave}
                        saving={saving}
                        isDark={isDark}
                        title={`Save ${activeSection}`}
                    />
                </View>
            )}

            {/* Custom Prompt Modal (Web & Cross-platform) */}
            <PromptModal
                visible={promptModalState.visible}
                title={promptModalState.title}
                description={promptModalState.description}
                placeholder={promptModalState.placeholder}
                defaultValue={promptModalState.defaultValue}
                confirmText={promptModalState.confirmText}
                onConfirm={promptModalState.onConfirm}
                onCancel={() => setPromptModalState((prev) => ({ ...prev, visible: false }))}
            />

            {/* Option Picker Modal */}
            <OptionPickerModal
                visible={optionPickerState.visible}
                title={optionPickerState.title}
                options={optionPickerState.options}
                selectedValue={optionPickerState.selectedValue}
                onSelect={(item) => {
                    optionPickerState.onSelect(item);
                    setOptionPickerState((prev) => ({ ...prev, visible: false }));
                }}
                onClose={() => setOptionPickerState((prev) => ({ ...prev, visible: false }))}
            />

            {/* Document PDF Preview Modal (Mobile) */}
            {!isEmbedded && (
                <CrewDocumentPreview
                    visible={exportPreviewVisible}
                    onClose={() => setExportPreviewVisible(false)}
                    html={exportHtml}
                    title={`Profile - ${profile.full_name || 'Member'}`}
                />
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        gap: 16,
    },
    embeddedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    embeddedHeaderTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    embeddedHeaderSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    closeButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabBarContainer: {
        marginVertical: 2,
    },
    loaderBox: {
        padding: 40,
        alignItems: 'center',
        gap: 10,
    },
    loaderText: {
        fontSize: 13,
        fontWeight: '500',
    },
    unsavedBannerWrapper: {
        position: 'absolute',
        left: 16,
        right: 16,
    },
});

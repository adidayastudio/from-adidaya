import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
} from 'react-native';
import { IOSSwitch } from '@/components/ui/IOSSwitch';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { MemberProfileSectionHeader } from '../components/MemberProfileSectionHeader';
import { ProfileDropdownPicker } from '../components/ProfileDropdownPicker';

interface MemberAccountTabProps {
    profile: MemberProfileData | any;
    editForm: Record<string, any>;
    setEditForm: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    activeSection: string | null;
    toggleEditSection: (section: string) => void;
    renderRow: (
        sectionKey: string,
        fieldKey: string,
        label: string,
        icon: string,
        isLast?: boolean,
        canCopy?: boolean,
        isEditable?: boolean,
        keyboardType?: any,
        maxLength?: number,
        placeholder?: string
    ) => React.ReactNode;
    showOptionPicker?: (
        title: string,
        options: { id: string; name: string }[],
        onSelect: (item: { id: string; name: string }) => void
    ) => void;
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    borderColor: string;
    bgColor: string;
    intensity: number;
    sectionTitleColor: string;
}

export const MemberAccountTab: React.FC<MemberAccountTabProps> = ({
    profile,
    editForm,
    setEditForm,
    activeSection,
    toggleEditSection,
    renderRow,
    showOptionPicker,
    isDark,
    textColor,
    subtextColor,
    borderColor,
    bgColor,
    intensity,
    sectionTitleColor,
}) => {
    return (
        <>
            {/* Account Configuration */}
            <View style={s.section}>
                <MemberProfileSectionHeader
                    title="Account Configuration"
                    showEdit={true}
                    isEditing={activeSection === 'Account Configuration'}
                    onToggleEdit={toggleEditSection}
                    sectionTitleColor={sectionTitleColor}
                    isDark={isDark}
                />
                <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor, borderColor }]}>
                    <View style={s.formRow}>
                        <View style={s.rowLeft}>
                            <PlatformIcon name="person.crop.circle" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                            <Text style={[s.rowLabel, { color: textColor }]}>Account Type</Text>
                        </View>
                        <View style={s.rowRight}>
                            {activeSection === 'Account Configuration' ? (
                                <ProfileDropdownPicker
                                    title="Account Type"
                                    options={[
                                        { id: 'human', name: 'Human Account' },
                                        { id: 'system', name: 'System Account' },
                                    ]}
                                    value={editForm.account_type || 'human'}
                                    onSelect={(selected) => {
                                        const newType = selected.id;
                                        setEditForm((prev) => ({
                                            ...prev,
                                            account_type: newType,
                                            include_in_performance: newType === 'system' ? false : prev.include_in_performance,
                                            gender: newType === 'human' ? (prev.gender === 'Not Specified' ? 'Male' : prev.gender) : 'Not Specified',
                                        }));
                                    }}
                                    isDark={isDark}
                                    textColor={textColor}
                                    subtextColor={subtextColor}
                                />
                            ) : (
                                <Text style={[s.rowValue, { color: subtextColor }]}>
                                    {profile.account_type === 'system' ? 'System Account' : 'Human Account'}
                                </Text>
                            )}
                        </View>
                    </View>
                    <View style={[s.separator, { backgroundColor: borderColor }]} />
                    <View style={s.formRow}>
                        <View style={s.rowLeft}>
                            <PlatformIcon name="checkmark.shield" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                            <Text style={[s.rowLabel, { color: textColor }]}>Performance Include</Text>
                        </View>
                        <View style={s.rowRight}>
                            {activeSection === 'Account Configuration' ? (
                                <IOSSwitch
                                    value={editForm.account_type === 'system' ? false : (editForm.include_in_performance !== false)}
                                    disabled={editForm.account_type === 'system'}
                                    onValueChange={(val) => {
                                        setEditForm((prev) => ({ ...prev, include_in_performance: val }));
                                    }}
                                />
                            ) : (
                                <Text style={[s.rowValue, { color: (profile.account_type === 'system' || profile.include_in_performance === false) ? subtextColor : '#34C759' }]}>
                                    {(profile.account_type === 'system' || profile.include_in_performance === false) ? 'Excluded' : 'Enabled'}
                                </Text>
                            )}
                        </View>
                    </View>
                </GlassView>
            </View>

            {/* Account Information */}
            <View style={s.section}>
                <MemberProfileSectionHeader
                    title="Account Information"
                    showEdit={true}
                    isEditing={activeSection === 'Account Information'}
                    onToggleEdit={toggleEditSection}
                    sectionTitleColor={sectionTitleColor}
                    isDark={isDark}
                />
                <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor, borderColor }]}>
                    {renderRow('Account Information', 'full_name', 'Full Name', 'person')}
                    {renderRow('Account Information', 'nickname', 'Nickname', 'at')}
                    {renderRow('Account Information', 'email', 'Email', 'envelope', true, true, false)}
                </GlassView>
            </View>
        </>
    );
};

const s = StyleSheet.create({
    section: {
        gap: 8,
    },
    card: {
        borderRadius: 20,
        paddingHorizontal: 16,
        overflow: 'hidden',
        borderWidth: 1,
    },
    formRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 46,
        paddingVertical: 10,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 0,
    },
    rowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flex: 1,
        marginLeft: 12,
    },
    rowLabel: {
        fontSize: 15,
        fontWeight: '400',
    },
    rowValue: {
        fontSize: 15,
        fontWeight: '400',
        textAlign: 'right',
        flexShrink: 1,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 26,
    },
    pickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
});

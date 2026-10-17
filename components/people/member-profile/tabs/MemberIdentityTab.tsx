import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    Platform,
} from 'react-native';
import { PlatformDatePicker } from '../components/PlatformDatePicker';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { MemberProfileSectionHeader } from '../components/MemberProfileSectionHeader';
import { MemberProfileData, RELATIONSHIP_OPTIONS, BANK_OPTIONS, formatAddressValue } from '../types';
import { ProfileDropdownPicker } from '../components/ProfileDropdownPicker';

interface MemberIdentityTabProps {
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
    selectGender: () => void;
    showOptionPicker?: (
        title: string,
        options: { id: string; name: string }[],
        onSelect: (item: { id: string; name: string }) => void,
        selectedValue?: string
    ) => void;
    handleSocialPress: (platform: string, value?: string) => void;
    getBirthDateObj: () => Date;
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    borderColor: string;
    bgColor: string;
    intensity: number;
    sectionTitleColor: string;
}

export const MemberIdentityTab: React.FC<MemberIdentityTabProps> = ({
    profile,
    editForm,
    setEditForm,
    activeSection,
    toggleEditSection,
    renderRow,
    selectGender,
    showOptionPicker,
    handleSocialPress,
    getBirthDateObj,
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
            {/* Identity Details */}
            <View style={s.section}>
                <MemberProfileSectionHeader
                    title="Identity Details"
                    showEdit={true}
                    isEditing={activeSection === 'Identity Details'}
                    onToggleEdit={toggleEditSection}
                    sectionTitleColor={sectionTitleColor}
                    isDark={isDark}
                />
                <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor, borderColor }]}>
                    {/* Birth Date with Native DatePicker */}
                    <View style={s.formRow}>
                        <View style={s.rowLeft}>
                            <PlatformIcon name="calendar" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                            <Text style={[s.rowLabel, { color: textColor }]}>Birth Date</Text>
                        </View>
                        {activeSection === 'Identity Details' ? (
                            <PlatformDatePicker
                                value={getBirthDateObj()}
                                isDark={isDark}
                                textColor={textColor}
                                maximumDate={new Date()}
                                onChange={(selectedDate) => {
                                    if (selectedDate) {
                                        const yyyy = selectedDate.getFullYear();
                                        const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
                                        const dd = String(selectedDate.getDate()).padStart(2, '0');
                                        setEditForm((prev) => ({ ...prev, birth_date: `${yyyy}-${mm}-${dd}` }));
                                    }
                                }}
                            />
                        ) : (
                            <Text style={[s.rowValue, { color: subtextColor, textAlign: 'right' }]}>
                                {profile.birth_date || '—'}
                            </Text>
                        )}
                    </View>
                    <View style={[s.separator, { backgroundColor: borderColor }]} />

                    {/* Gender Row with Native Picker Menu */}
                    <View style={s.formRow}>
                        <View style={s.rowLeft}>
                            <PlatformIcon name="person.2" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                            <Text style={[s.rowLabel, { color: textColor }]}>Gender</Text>
                        </View>
                        {activeSection === 'Identity Details' ? (
                            editForm.account_type === 'system' ? (
                                <Text style={[s.rowValue, { color: subtextColor }]}>Not Specified (System)</Text>
                            ) : (
                                <ProfileDropdownPicker
                                    title="Gender"
                                    options={[
                                        { id: 'Male', name: 'Male' },
                                        { id: 'Female', name: 'Female' },
                                    ]}
                                    value={editForm.gender || 'Male'}
                                    onSelect={(selected) => setEditForm((prev) => ({ ...prev, gender: selected.id }))}
                                    isDark={isDark}
                                    textColor={textColor}
                                    subtextColor={subtextColor}
                                />
                            )
                        ) : (
                            <View style={s.rowRight}>
                                <Text style={[s.rowValue, { color: subtextColor }]}>
                                    {profile.account_type === 'system' ? 'Not Specified' : (profile.gender || '—')}
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={[s.separator, { backgroundColor: borderColor }]} />

                    {/* NIK with 16 numeric digits limit */}
                    {renderRow(
                        'Identity Details',
                        'nik',
                        'NIK (National ID)',
                        'person.text.rectangle',
                        true,
                        true,
                        true,
                        'number-pad',
                        16,
                        '16-digit NIK'
                    )}
                </GlassView>
            </View>

            {/* Contact */}
            <View style={s.section}>
                <MemberProfileSectionHeader
                    title="Contact"
                    showEdit={true}
                    isEditing={activeSection === 'Contact'}
                    onToggleEdit={toggleEditSection}
                    sectionTitleColor={sectionTitleColor}
                    isDark={isDark}
                />
                <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor, borderColor }]}>
                    {renderRow('Contact', 'personal_email', 'Personal Email', 'envelope', false, true, true, 'email-address', undefined, 'Personal email')}
                    {renderRow('Contact', 'whatsapp', 'WhatsApp', 'whatsapp', false, true, true, 'phone-pad', undefined, 'WhatsApp number')}
                    {renderRow('Contact', 'phone', 'Phone Number', 'phone', true, true, true, 'phone-pad', undefined, 'Phone number')}
                </GlassView>
            </View>

            {/* Address (Multiline Block Format) */}
            <View style={s.section}>
                <MemberProfileSectionHeader
                    title="Address"
                    showEdit={true}
                    isEditing={activeSection === 'Address'}
                    onToggleEdit={toggleEditSection}
                    sectionTitleColor={sectionTitleColor}
                    isDark={isDark}
                />
                <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor, borderColor }]}>
                    <View style={s.addressBlock}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                            <PlatformIcon name="house" size={15} tintColor={subtextColor} style={{ marginRight: 8 }} />
                            <Text style={[s.detailLabel, { color: subtextColor }]}>Current Address</Text>
                        </View>
                        {activeSection === 'Address' ? (
                            <TextInput
                                style={[
                                    s.textarea,
                                    {
                                        color: textColor,
                                        borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                                    },
                                ]}
                                value={editForm.current_address}
                                onChangeText={(text) => setEditForm((prev) => ({ ...prev, current_address: text }))}
                                placeholder="Enter current residential address"
                                placeholderTextColor={subtextColor}
                                multiline
                                numberOfLines={3}
                            />
                        ) : (
                            <Text style={[s.addressValue, { color: textColor }]}>
                                {formatAddressValue(profile.current_address) || '—'}
                            </Text>
                        )}
                    </View>
                    <View style={[s.separator, { backgroundColor: borderColor, marginLeft: 16 }]} />

                    <View style={s.addressBlock}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                            <PlatformIcon name="mappin.and.ellipse" size={15} tintColor={subtextColor} style={{ marginRight: 8 }} />
                            <Text style={[s.detailLabel, { color: subtextColor }]}>ID Card Address</Text>
                        </View>
                        {activeSection === 'Address' ? (
                            <TextInput
                                style={[
                                    s.textarea,
                                    {
                                        color: textColor,
                                        borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                                    },
                                ]}
                                value={editForm.ktp_address}
                                onChangeText={(text) => setEditForm((prev) => ({ ...prev, ktp_address: text }))}
                                placeholder="Enter registered address as on ID card"
                                placeholderTextColor={subtextColor}
                                multiline
                                numberOfLines={3}
                            />
                        ) : (
                            <Text style={[s.addressValue, { color: textColor }]}>
                                {formatAddressValue(profile.ktp_address) || '—'}
                            </Text>
                        )}
                    </View>
                </GlassView>
            </View>

            {/* Emergency Contact */}
            <View style={s.section}>
                <MemberProfileSectionHeader
                    title="Emergency Contact"
                    showEdit={true}
                    isEditing={activeSection === 'Emergency Contact'}
                    onToggleEdit={toggleEditSection}
                    sectionTitleColor={sectionTitleColor}
                    isDark={isDark}
                />
                <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor, borderColor }]}>
                    {renderRow('Emergency Contact', 'emergency_name', 'Name', 'person')}

                    {/* Relationship Dropdown Row */}
                    <View style={s.formRow}>
                        <View style={s.rowLeft}>
                            <PlatformIcon name="person.2" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                            <Text style={[s.rowLabel, { color: textColor }]}>Relationship</Text>
                        </View>
                        {activeSection === 'Emergency Contact' ? (
                            <ProfileDropdownPicker
                                title="Relationship"
                                options={RELATIONSHIP_OPTIONS.map((opt) => ({ id: opt, name: opt }))}
                                value={editForm.emergency_relationship || ''}
                                placeholder="Select"
                                onSelect={(chosen) => setEditForm((prev) => ({ ...prev, emergency_relationship: chosen.id }))}
                                isDark={isDark}
                                textColor={textColor}
                                subtextColor={subtextColor}
                            />
                        ) : (
                            <View style={s.rowRight}>
                                <Text style={[s.rowValue, { color: subtextColor }]}>
                                    {profile.emergency_relationship || '—'}
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={[s.separator, { backgroundColor: borderColor }]} />

                    {renderRow('Emergency Contact', 'emergency_phone', 'Phone', 'phone', true, true, true, 'phone-pad', undefined, 'Phone number')}
                </GlassView>
            </View>

            {/* Social */}
            <View style={s.section}>
                <MemberProfileSectionHeader
                    title="Social"
                    showEdit={true}
                    isEditing={activeSection === 'Social'}
                    onToggleEdit={toggleEditSection}
                    sectionTitleColor={sectionTitleColor}
                    isDark={isDark}
                />
                <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor, borderColor }]}>
                    {/* LinkedIn */}
                    <View style={s.formRow}>
                        <View style={s.rowLeft}>
                            <PlatformIcon name="link" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                            <Text style={[s.rowLabel, { color: textColor }]}>LinkedIn</Text>
                        </View>
                        {activeSection === 'Social' ? (
                            <TextInput
                                style={[s.seamlessInput, { color: textColor }]}
                                value={editForm.linkedin}
                                onChangeText={(text) => setEditForm((prev) => ({ ...prev, linkedin: text }))}
                                placeholder="in/username or URL"
                                placeholderTextColor={subtextColor}
                                autoCapitalize="none"
                                autoCorrect={false}
                                selectionColor="#007AFF"
                            />
                        ) : (
                            <View style={s.rowRight}>
                                <TouchableOpacity
                                    disabled={!profile.linkedin}
                                    onPress={() => handleSocialPress('linkedin', profile.linkedin)}
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}
                                >
                                    <Text style={[s.rowValue, { color: profile.linkedin ? '#007AFF' : subtextColor, textAlign: 'right' }]}>
                                        {profile.linkedin ? (profile.linkedin.startsWith('http') ? profile.linkedin : `in/${profile.linkedin.replace(/^in\//, '')}`) : '—'}
                                    </Text>
                                    {profile.linkedin ? <PlatformIcon name="arrow.up.right" size={11} tintColor="#007AFF" /> : null}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                    <View style={[s.separator, { backgroundColor: borderColor }]} />

                    {/* Instagram */}
                    <View style={s.formRow}>
                        <View style={s.rowLeft}>
                            <PlatformIcon name="link" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                            <Text style={[s.rowLabel, { color: textColor }]}>Instagram</Text>
                        </View>
                        {activeSection === 'Social' ? (
                            <TextInput
                                style={[s.seamlessInput, { color: textColor }]}
                                value={editForm.instagram}
                                onChangeText={(text) => setEditForm((prev) => ({ ...prev, instagram: text.toLowerCase() }))}
                                placeholder="@username"
                                placeholderTextColor={subtextColor}
                                autoCapitalize="none"
                                autoCorrect={false}
                                selectionColor="#007AFF"
                            />
                        ) : (
                            <View style={s.rowRight}>
                                <TouchableOpacity
                                    disabled={!profile.instagram}
                                    onPress={() => handleSocialPress('instagram', profile.instagram)}
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}
                                >
                                    <Text style={[s.rowValue, { color: profile.instagram ? '#007AFF' : subtextColor, textAlign: 'right' }]}>
                                        {profile.instagram ? (profile.instagram.startsWith('@') ? profile.instagram : `@${profile.instagram.toLowerCase()}`) : '—'}
                                    </Text>
                                    {profile.instagram ? <PlatformIcon name="arrow.up.right" size={11} tintColor="#007AFF" /> : null}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {profile.other_socials?.map((socItem: any, sIdx: number) => (
                        <View key={socItem.platform || sIdx}>
                            <View style={[s.separator, { backgroundColor: borderColor }]} />
                            <View style={s.formRow}>
                                <View style={s.rowLeft}>
                                    <PlatformIcon name="globe" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                    <Text style={[s.rowLabel, { color: textColor }]}>{socItem.label || socItem.platform}</Text>
                                </View>
                                <View style={s.rowRight}>
                                    <TouchableOpacity
                                        disabled={!socItem.value}
                                        onPress={() => handleSocialPress(socItem.platform, socItem.value)}
                                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}
                                    >
                                        <Text style={[s.rowValue, { color: socItem.value ? '#007AFF' : subtextColor, textAlign: 'right' }]}>
                                            {socItem.value || '—'}
                                        </Text>
                                        {socItem.value ? <PlatformIcon name="arrow.up.right" size={11} tintColor="#007AFF" /> : null}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    ))}
                </GlassView>
            </View>

            {/* Finance (Bank Picker Menu) */}
            <View style={s.section}>
                <MemberProfileSectionHeader
                    title="Finance"
                    showEdit={true}
                    isEditing={activeSection === 'Finance'}
                    onToggleEdit={toggleEditSection}
                    sectionTitleColor={sectionTitleColor}
                    isDark={isDark}
                />
                <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor, borderColor }]}>
                    {/* Bank Name Picker Menu */}
                    <View style={s.formRow}>
                        <View style={s.rowLeft}>
                            <PlatformIcon name="building.columns" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                            <Text style={[s.rowLabel, { color: textColor }]}>Bank Name</Text>
                        </View>
                        {activeSection === 'Finance' ? (
                            <ProfileDropdownPicker
                                title="Bank Name"
                                options={BANK_OPTIONS.map((b) => ({ id: b.id, name: b.label }))}
                                value={
                                    BANK_OPTIONS.some((b) => b.id === editForm.bank_name)
                                        ? editForm.bank_name
                                        : editForm.bank_name
                                        ? 'Other'
                                        : ''
                                }
                                placeholder="Select Bank"
                                onSelect={(chosen) => {
                                    setEditForm((prev) => ({
                                        ...prev,
                                        bank_name: chosen.id,
                                        custom_bank_name: chosen.id === 'Other' ? (prev.custom_bank_name || (prev.bank_name !== 'Other' && !BANK_OPTIONS.some((b) => b.id === prev.bank_name) ? prev.bank_name : '')) : '',
                                    }));
                                }}
                                isDark={isDark}
                                textColor={textColor}
                                subtextColor={subtextColor}
                            />
                        ) : (
                            <View style={s.rowRight}>
                                <Text style={[s.rowValue, { color: subtextColor }]}>
                                    {profile.bank_name === 'Other' || (!BANK_OPTIONS.some((b) => b.id === profile.bank_name) && profile.bank_name)
                                        ? (profile.custom_bank_name || profile.bank_name || 'Other')
                                        : (profile.bank_name || '—')}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Custom Bank Name Input when Bank is 'Other' */}
                    {activeSection === 'Finance' && (editForm.bank_name === 'Other' || (!BANK_OPTIONS.some((b) => b.id === editForm.bank_name) && editForm.bank_name)) ? (
                        <>
                            <View style={[s.separator, { backgroundColor: borderColor }]} />
                            <View style={s.formRow}>
                                <View style={s.rowLeft}>
                                    <PlatformIcon name="pencil" size={15} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                    <Text style={[s.rowLabel, { color: textColor }]}>Custom Bank Name</Text>
                                </View>
                                <View style={s.rowRight}>
                                    <TextInput
                                        style={[s.seamlessInput, { color: textColor }]}
                                        value={editForm.custom_bank_name !== undefined ? editForm.custom_bank_name : (editForm.bank_name !== 'Other' && !BANK_OPTIONS.some((b) => b.id === editForm.bank_name) ? editForm.bank_name : '')}
                                        onChangeText={(text) => setEditForm((prev) => ({ ...prev, custom_bank_name: text }))}
                                        placeholder="Enter bank name"
                                        placeholderTextColor={subtextColor}
                                        selectionColor="#007AFF"
                                    />
                                </View>
                            </View>
                        </>
                    ) : null}
                    <View style={[s.separator, { backgroundColor: borderColor }]} />

                    {renderRow('Finance', 'bank_account_number', 'Account Number', 'creditcard', false, true, true, 'number-pad', undefined, 'Account number')}
                    {renderRow('Finance', 'bank_account_holder', 'Account Holder', 'person', true, false, true, 'default', undefined, 'Account holder name')}
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
    genderSelectPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    seamlessInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '400',
        textAlign: 'right',
        marginLeft: 12,
        paddingVertical: 0,
    },
    addressBlock: {
        padding: 16,
    },
    detailLabel: {
        fontSize: 13,
        fontWeight: '500',
    },
    addressValue: {
        fontSize: 15,
        lineHeight: 20,
    },
    textarea: {
        fontSize: 15,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        textAlignVertical: 'top',
        minHeight: 70,
        marginTop: 4,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 26,
    },
});

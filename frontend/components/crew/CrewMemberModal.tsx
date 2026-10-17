import React, { useState, useEffect } from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ScrollView,
    TextInput,
    Platform,
    KeyboardAvoidingView,
    Switch,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { CrewMember, CrewRole, CrewStatus, CREW_ROLE_OPTIONS } from './mockData';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const DEFAULT_RATES_BY_ROLE: Record<CrewRole, { base: number; overtime: number; ot1: number; ot2: number; ot3: number }> = {
    FOREMAN: { base: 240000, overtime: 295000, ot1: 41000, ot2: 41000, ot3: 48500 },
    LEADER: { base: 220000, overtime: 270000, ot1: 37500, ot2: 37500, ot3: 44500 },
    SKILLED: { base: 200000, overtime: 248000, ot1: 34000, ot2: 34000, ot3: 41000 },
    OPERATOR: { base: 200000, overtime: 248000, ot1: 34000, ot2: 34000, ot3: 41000 },
    HELPER: { base: 150000, overtime: 185000, ot1: 25000, ot2: 25000, ot3: 30000 },
    GENERAL: { base: 150000, overtime: 185000, ot1: 25000, ot2: 25000, ot3: 30000 }
};

const hasCustomRates = (member: CrewMember) => {
    const defaults = DEFAULT_RATES_BY_ROLE[member.role];
    if (!defaults) return false;
    return (
        member.baseDailyRate !== defaults.base ||
        member.overtimeDailyRate !== defaults.overtime ||
        member.otRate1 !== defaults.ot1 ||
        member.otRate2 !== defaults.ot2 ||
        member.otRate3 !== defaults.ot3
    );
};

interface CrewMemberModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (member: CrewMember) => void;
    member: CrewMember | null;
}

export function CrewMemberModal({ visible, onClose, onSave, member }: CrewMemberModalProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    // Form fields
    const [name, setName] = useState('');
    const [initials, setInitials] = useState('');
    const [role, setRole] = useState<CrewRole>('SKILLED');
    const [status, setStatus] = useState<CrewStatus>('ACTIVE');
    const [skillTags, setSkillTags] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

    const [baseRate, setBaseRate] = useState('200000');
    const [overtimeRate, setOvertimeRate] = useState('248000');
    const [otRate1, setOtRate1] = useState('34000');
    const [otRate2, setOtRate2] = useState('34000');
    const [otRate3, setOtRate3] = useState('41000');

    const [isManualOverride, setIsManualOverride] = useState(false);

    const handleRoleChange = (newRole: CrewRole) => {
        setRole(newRole);
        if (!isManualOverride) {
            if (DEFAULT_RATES_BY_ROLE[newRole]) {
                const defaults = DEFAULT_RATES_BY_ROLE[newRole];
                setBaseRate(String(defaults.base));
                setOvertimeRate(String(defaults.overtime));
                setOtRate1(String(defaults.ot1));
                setOtRate2(String(defaults.ot2));
                setOtRate3(String(defaults.ot3));
            }
        }
    };

    const handleToggleOverride = (val: boolean) => {
        setIsManualOverride(val);
        if (!val) {
            const defaults = DEFAULT_RATES_BY_ROLE[role];
            if (defaults) {
                setBaseRate(String(defaults.base));
                setOvertimeRate(String(defaults.overtime));
                setOtRate1(String(defaults.ot1));
                setOtRate2(String(defaults.ot2));
                setOtRate3(String(defaults.ot3));
            }
        }
    };

    useEffect(() => {
        if (member) {
            setName(member.name);
            setInitials(member.initials);
            setRole(member.role);
            setStatus(member.status);
            setSkillTags(member.skillTags.join(', '));
            setPhone(member.phone || '');
            setEmail(member.email || '');
            setBaseRate(String(member.baseDailyRate));
            setOvertimeRate(String(member.overtimeDailyRate));
            setOtRate1(String(member.otRate1));
            setOtRate2(String(member.otRate2));
            setOtRate3(String(member.otRate3));

            const isCustom = hasCustomRates(member);
            setIsManualOverride(isCustom);
        } else {
            setName('');
            setInitials('');
            setRole('SKILLED');
            setStatus('ACTIVE');
            setSkillTags('');
            setPhone('');
            setEmail('');
            setBaseRate('200000');
            setOvertimeRate('248000');
            setOtRate1('34000');
            setOtRate2('34000');
            setOtRate3('41000');
            setIsManualOverride(false);
        }
        setIsRoleDropdownOpen(false);
    }, [member, visible]);

    const handleSave = () => {
        if (!name.trim()) {
            alert('Please enter member name.');
            return;
        }

        // Generate initials if empty
        let memberInitials = initials.trim();
        if (!memberInitials) {
            const parts = name.trim().split(/\s+/);
            memberInitials = parts.length >= 2
                ? (parts[0][0] + parts[1][0]).toUpperCase()
                : name.trim().slice(0, 2).toUpperCase();
        }

        const updatedMember: CrewMember = {
            id: member ? member.id : `c_${Date.now()}`,
            name: name.trim(),
            initials: memberInitials,
            role,
            status,
            skillTags: skillTags.split(',').map(s => s.trim()).filter(Boolean),
            baseDailyRate: Number(baseRate) || 0,
            overtimeDailyRate: Number(overtimeRate) || 0,
            otRate1: Number(otRate1) || 0,
            otRate2: Number(otRate2) || 0,
            otRate3: Number(otRate3) || 0,
            phone: phone.trim() || undefined,
            email: email.trim() || undefined,
            projectCode: member ? member.projectCode : undefined,
        };

        onSave(updatedMember);
    };

    const containerStyle = [s.sheet, { backgroundColor: isDark ? '#121212' : '#F2F2F7' }];
    const inputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
    const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
    const inputColor = textColor;

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose} statusBarTranslucent={true}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <View style={s.overlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={onClose}
                    />
                    <View style={containerStyle}>
                        {/* Header */}
                        <View style={s.header}>
                            <Text style={[s.headerTitle, { color: textColor }]}>
                                {member ? 'Edit Crew Member' : 'New Crew Member'}
                            </Text>
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close" size={24} color={isDark ? '#FFF' : '#000'} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                            {/* General Information */}
                            <Text style={[s.sectionTitle, { color: subtextColor }]}>GENERAL INFORMATION</Text>
                            <View style={[s.sectionCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                                
                                <View style={s.inputGroup}>
                                    <Text style={[s.label, { color: subtextColor }]}>Full Name *</Text>
                                    <TextInput
                                        style={[s.input, { color: inputColor, backgroundColor: inputBg }]}
                                        value={name}
                                        onChangeText={setName}
                                        placeholder="Full Name"
                                        placeholderTextColor={subtextColor}
                                    />
                                </View>

                                <View style={s.inputRow}>
                                    <View style={[s.inputGroup, { flex: 0.4, marginBottom: 0 }]}>
                                        <Text style={[s.label, { color: subtextColor }]}>Initials</Text>
                                        <TextInput
                                            style={[s.input, { color: inputColor, backgroundColor: inputBg }]}
                                            value={initials}
                                            onChangeText={setInitials}
                                            maxLength={3}
                                            placeholder="Initials"
                                            placeholderTextColor={subtextColor}
                                        />
                                    </View>
                                    <View style={[s.inputGroup, { flex: 0.6, marginBottom: 0 }]}>
                                        <Text style={[s.label, { color: subtextColor }]}>Status</Text>
                                        <View style={s.segmentedContainer}>
                                            {(['ACTIVE', 'INACTIVE'] as const).map((st) => {
                                                const isSelected = status === st;
                                                const activeColor = st === 'ACTIVE' ? '#34C759' : '#FF3B30';
                                                return (
                                                    <TouchableOpacity
                                                        key={st}
                                                        style={[
                                                            s.segmentButton,
                                                            isSelected && { backgroundColor: activeColor }
                                                        ]}
                                                        onPress={() => setStatus(st)}
                                                    >
                                                        <Text style={[s.segmentText, { color: isSelected ? '#FFF' : textColor, fontWeight: isSelected ? '700' : '400' }]}>
                                                            {st}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>
                                </View>

                                <View style={[s.inputGroup, { marginTop: 12 }]}>
                                    <Text style={[s.label, { color: subtextColor }]}>Role</Text>
                                    <View style={s.dropdownContainer}>
                                        <TouchableOpacity
                                            style={[s.dropdownTrigger, { backgroundColor: inputBg, borderColor: inputBorder }]}
                                            onPress={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={s.dropdownTriggerLeft}>
                                                <Text style={[s.dropdownTriggerText, { color: textColor }]}>
                                                    {CREW_ROLE_OPTIONS.find(opt => opt.value === role)?.label || role}
                                                </Text>
                                            </View>
                                            <Ionicons
                                                name={isRoleDropdownOpen ? 'chevron-up' : 'chevron-down'}
                                                size={18}
                                                color={subtextColor}
                                            />
                                        </TouchableOpacity>

                                        {isRoleDropdownOpen && (
                                            <View style={[s.dropdownList, { backgroundColor: isDark ? '#121212' : '#F2F2F7', borderColor: inputBorder }]}>
                                                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                                                    {CREW_ROLE_OPTIONS.map((opt) => {
                                                        const isSelected = role === opt.value;
                                                        return (
                                                            <TouchableOpacity
                                                                key={opt.value}
                                                                style={[
                                                                    s.dropdownItem,
                                                                    isSelected && { backgroundColor: isDark ? 'rgba(0,122,255,0.15)' : 'rgba(0,122,255,0.08)' }
                                                                ]}
                                                                onPress={() => {
                                                                    handleRoleChange(opt.value);
                                                                    setIsRoleDropdownOpen(false);
                                                                }}
                                                            >
                                                                <View style={s.dropdownItemLeft}>
                                                                    <Text style={[s.dropdownItemText, { color: textColor }, isSelected && { fontWeight: '700' }]}>
                                                                        {opt.label}
                                                                    </Text>
                                                                </View>
                                                                {isSelected && (
                                                                    <Ionicons name="checkmark" size={18} color="#8B5CF6" />
                                                                )}
                                                            </TouchableOpacity>
                                                        );
                                                    })}
                                                </ScrollView>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                <View style={[s.inputGroup, { marginBottom: 0 }]}>
                                    <Text style={[s.label, { color: subtextColor }]}>Skills / Tags (comma-separated)</Text>
                                    <TextInput
                                        style={[s.input, { color: inputColor, backgroundColor: inputBg }]}
                                        value={skillTags}
                                        onChangeText={setSkillTags}
                                        placeholder="Welding, Excavator, Rigging"
                                        placeholderTextColor={subtextColor}
                                    />
                                </View>
                            </View>

                            {/* Daily Payroll Rates */}
                            <Text style={[s.sectionTitle, { color: subtextColor, marginTop: 16 }]}>DAILY PAYROLL RATES (Rp)</Text>
                            <View style={[s.sectionCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                                
                                <View style={s.overrideRow}>
                                    <Text style={[s.label, { color: textColor, marginBottom: 0 }]}>Manually Override Rates</Text>
                                    <Switch
                                        value={isManualOverride}
                                        onValueChange={handleToggleOverride}
                                        trackColor={{ false: '#767577', true: '#8B5CF6' }}
                                        thumbColor={Platform.OS === 'ios' ? undefined : (isManualOverride ? '#8B5CF6' : '#f4f3f4')}
                                    />
                                </View>

                                <View style={s.inputRow}>
                                    <View style={[s.inputGroup, { flex: 1, marginBottom: 0 }]}>
                                        <Text style={[s.label, { color: subtextColor }]}>Regular Base Daily</Text>
                                        <TextInput
                                            style={[s.input, { color: inputColor, backgroundColor: inputBg }, !isManualOverride && { opacity: 0.5 }]}
                                            value={baseRate}
                                            onChangeText={setBaseRate}
                                            keyboardType="numeric"
                                            placeholder="200000"
                                            placeholderTextColor={subtextColor}
                                            editable={isManualOverride}
                                        />
                                    </View>
                                    <View style={[s.inputGroup, { flex: 1, marginBottom: 0 }]}>
                                        <Text style={[s.label, { color: subtextColor }]}>Holiday Daily</Text>
                                        <TextInput
                                            style={[s.input, { color: inputColor, backgroundColor: inputBg }, !isManualOverride && { opacity: 0.5 }]}
                                            value={overtimeRate}
                                            onChangeText={setOvertimeRate}
                                            keyboardType="numeric"
                                            placeholder="248000"
                                            placeholderTextColor={subtextColor}
                                            editable={isManualOverride}
                                        />
                                    </View>
                                </View>

                                <Text style={[s.label, { color: subtextColor, marginTop: 16, marginBottom: 8 }]}>Hourly Overtime Increments</Text>
                                <View style={[s.inputRow, { marginBottom: 0 }]}>
                                    <View style={[s.inputGroup, { flex: 1, marginBottom: 0 }]}>
                                        <Text style={[s.labelSmall, { color: subtextColor }]}>Overtime 1</Text>
                                        <TextInput
                                            style={[s.inputSmall, { color: inputColor, backgroundColor: inputBg }, !isManualOverride && { opacity: 0.5 }]}
                                            value={otRate1}
                                            onChangeText={setOtRate1}
                                            keyboardType="numeric"
                                            placeholder="34000"
                                            placeholderTextColor={subtextColor}
                                            editable={isManualOverride}
                                        />
                                    </View>
                                    <View style={[s.inputGroup, { flex: 1, marginBottom: 0 }]}>
                                        <Text style={[s.labelSmall, { color: subtextColor }]}>Overtime 2</Text>
                                        <TextInput
                                            style={[s.inputSmall, { color: inputColor, backgroundColor: inputBg }, !isManualOverride && { opacity: 0.5 }]}
                                            value={otRate2}
                                            onChangeText={setOtRate2}
                                            keyboardType="numeric"
                                            placeholder="34000"
                                            placeholderTextColor={subtextColor}
                                            editable={isManualOverride}
                                        />
                                    </View>
                                    <View style={[s.inputGroup, { flex: 1, marginBottom: 0 }]}>
                                        <Text style={[s.labelSmall, { color: subtextColor }]}>Overtime 3</Text>
                                        <TextInput
                                            style={[s.inputSmall, { color: inputColor, backgroundColor: inputBg }, !isManualOverride && { opacity: 0.5 }]}
                                            value={otRate3}
                                            onChangeText={setOtRate3}
                                            keyboardType="numeric"
                                            placeholder="41000"
                                            placeholderTextColor={subtextColor}
                                            editable={isManualOverride}
                                        />
                                    </View>
                                </View>
                            </View>
                        </ScrollView>

                        {/* Footer Actions */}
                        <View style={s.footer}>
                            <TouchableOpacity
                                style={[s.footerButton, s.cancelButton, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}
                                onPress={onClose}
                            >
                                <Text style={[s.footerBtnText, { color: isDark ? '#FFF' : '#333' }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[s.footerButton, s.confirmButton]}
                                onPress={handleSave}
                            >
                                <Text style={[s.footerBtnText, { color: '#FFF' }]}>{member ? 'Save Changes' : 'Add Crew'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: SCREEN_HEIGHT * 0.85,
        width: '100%',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerTitle: {
        fontSize: 19,
        fontWeight: '700',
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.8,
        marginBottom: 8,
    },
    sectionCard: {
        borderRadius: 24,
        padding: 16,
        marginBottom: 8,
        borderWidth: StyleSheet.hairlineWidth,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 12,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
    },
    labelSmall: {
        fontSize: 10,
        fontWeight: '600',
        marginBottom: 4,
    },
    input: {
        height: 48,
        borderRadius: 24,
        paddingHorizontal: 18,
        fontSize: 15,
        fontWeight: '500',
    },
    inputSmall: {
        height: 48,
        borderRadius: 24,
        paddingHorizontal: 14,
        fontSize: 14,
        fontWeight: '600',
    },
    segmentedContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(120, 120, 128, 0.12)',
        borderRadius: 24,
        padding: 2,
    },
    segmentButton: {
        flex: 1,
        paddingVertical: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 22,
    },
    segmentText: {
        fontSize: 13,
    },
    pillsScroll: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    pill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 9999,
        marginRight: 8,
    },
    pillText: {
        fontSize: 14,
        fontWeight: '600',
    },
    dropdownContainer: {
        marginBottom: 8,
    },
    dropdownTrigger: {
        height: 48,
        borderRadius: 24,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    dropdownTriggerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    dropdownTriggerText: {
        fontSize: 15,
        fontWeight: '600',
    },
    dropdownList: {
        borderRadius: 24,
        borderWidth: 1,
        marginTop: 8,
        overflow: 'hidden',
    },
    dropdownItem: {
        height: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    dropdownItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    dropdownItemText: {
        fontSize: 15,
        fontWeight: '500',
    },
    overrideRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    footer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 34 : 24,
        gap: 12,
    },
    footerButton: {
        flex: 1,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: {},
    confirmButton: {
        backgroundColor: '#8B5CF6',
    },
    footerBtnText: {
        fontSize: 16,
        fontWeight: '700',
    },
});

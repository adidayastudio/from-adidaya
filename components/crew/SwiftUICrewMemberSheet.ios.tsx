import React, { useState, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { 
    Host,
    Form, 
    Section, 
    TextField, 
    Button, 
    BottomSheet, 
    HStack, 
    VStack, 
    Spacer, 
    Picker, 
    LabeledContent,
    Switch,
    Text as SwiftUIText
} from '@expo/ui/swift-ui';
import { padding, background, ignoreSafeArea, tint, frame, cornerRadius, disabled } from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '@/context/ThemeContext';
import { CrewMember, CrewRole, CrewStatus, CREW_ROLE_OPTIONS } from './mockData';

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

interface SwiftUICrewMemberSheetProps {
    isOpened: boolean;
    onClose: () => void;
    onSave: (member: CrewMember) => void;
    member: CrewMember | null;
}

export const SwiftUICrewMemberSheet: React.FC<SwiftUICrewMemberSheetProps> = ({
    isOpened,
    onClose,
    onSave,
    member,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#C7C7CC' : 'gray';
    const sheetBg = 'clear';
    const nativeControlTextColor = isDark ? '#FFFFFF' : '#000000';
    const menuControlModifiers = [tint(isDark ? '#007AFF' : '#1C1C1E')];
    const textFieldModifiers = [tint('#007AFF')];

    // Form fields
    const [name, setName] = useState('');
    const [initials, setInitials] = useState('');
    const [roleIndex, setRoleIndex] = useState(2); // SKILLED worker default (index 2 in CREW_ROLE_OPTIONS)
    const [statusIndex, setStatusIndex] = useState(0); // ACTIVE default
    const [skillTags, setSkillTags] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');

    const [baseRate, setBaseRate] = useState('200000');
    const [overtimeRate, setOvertimeRate] = useState('248000');
    const [otRate1, setOtRate1] = useState('34000');
    const [otRate2, setOtRate2] = useState('34000');
    const [otRate3, setOtRate3] = useState('41000');

    const [isManualOverride, setIsManualOverride] = useState(false);

    const handleRoleChange = (index: number) => {
        setRoleIndex(index);
        if (!isManualOverride) {
            const selectedRole = CREW_ROLE_OPTIONS[index]?.value;
            if (selectedRole && DEFAULT_RATES_BY_ROLE[selectedRole]) {
                const defaults = DEFAULT_RATES_BY_ROLE[selectedRole];
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
            const selectedRole = CREW_ROLE_OPTIONS[roleIndex]?.value || 'SKILLED';
            const defaults = DEFAULT_RATES_BY_ROLE[selectedRole];
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
        if (isOpened) {
            if (member) {
                setName(member.name);
                setInitials(member.initials);
                
                // Find matching role index
                const rIdx = CREW_ROLE_OPTIONS.findIndex(opt => opt.value === member.role);
                setRoleIndex(rIdx >= 0 ? rIdx : 2);
                
                setStatusIndex(member.status === 'ACTIVE' ? 0 : 1);
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
                setRoleIndex(2); // SKILLED
                setStatusIndex(0); // ACTIVE
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
        }
    }, [member, isOpened]);

    const handleSave = () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter member name.');
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

        const role = CREW_ROLE_OPTIONS[roleIndex]?.value || 'SKILLED';
        const status = statusIndex === 0 ? 'ACTIVE' : 'INACTIVE';

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

    const sheetTitle = member ? 'Edit Crew Member' : 'New Crew Member';
    const roleOptions = CREW_ROLE_OPTIONS.map(opt => opt.label);

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet 
                isOpened={isOpened}
                presentationDetents={[0.85]}
                onIsOpenedChange={(opened) => {
                    if (!opened) {
                        onClose();
                    }
                }}
            >
                <VStack spacing={0} modifiers={[
                    ignoreSafeArea({ edges: 'bottom' }),
                    background(sheetBg)
                ]}>
                    {/* Header */}
                    <HStack alignment="center" modifiers={[padding({ top: 20, leading: 20, trailing: 20, bottom: 10 })]}>
                        <SwiftUIText size={22} weight="bold" color={textColor}>
                            {sheetTitle}
                        </SwiftUIText>
                        <Spacer />
                        <Button
                            systemImage="xmark"
                            role="cancel"
                            color="gray"
                            onPress={onClose}
                        />
                    </HStack>

                    {/* Scrollable Form */}
                    <Form modifiers={[background(sheetBg)]}>
                        <Section title="General Information">
                            <LabeledContent label="Full Name">
                                <TextField
                                    placeholder="Full Name"
                                    defaultValue={name}
                                    onChangeText={setName}
                                    modifiers={textFieldModifiers}
                                />
                            </LabeledContent>
                            <LabeledContent label="Initials">
                                <TextField
                                    placeholder="Initials"
                                    defaultValue={initials}
                                    onChangeText={setInitials}
                                    keyboardType="default"
                                    modifiers={textFieldModifiers}
                                />
                            </LabeledContent>
                            <Picker
                                label="Role"
                                options={roleOptions}
                                selectedIndex={roleIndex}
                                onOptionSelected={(e) => handleRoleChange(e.nativeEvent.index)}
                                variant="menu"
                                color={nativeControlTextColor}
                                modifiers={menuControlModifiers}
                            />
                            <VStack alignment="leading" spacing={4} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={13} color={subtextColor}>Status</SwiftUIText>
                                <Picker
                                    options={['ACTIVE', 'INACTIVE']}
                                    selectedIndex={statusIndex}
                                    onOptionSelected={(e) => setStatusIndex(e.nativeEvent.index)}
                                    variant="segmented"
                                    modifiers={[
                                        tint(statusIndex === 0 ? '#34C759' : '#FF3B30')
                                    ]}
                                />
                            </VStack>
                            <LabeledContent label="Skills & Tags">
                                <TextField
                                    placeholder="Skills / Tags (comma-separated)"
                                    defaultValue={skillTags}
                                    onChangeText={setSkillTags}
                                    modifiers={textFieldModifiers}
                                />
                            </LabeledContent>
                        </Section>



                        <Section title="Daily Payroll Rates (Rp)">
                            <VStack spacing={8} alignment="leading" modifiers={[padding({ vertical: 4 })]}>
                                <Switch
                                    label="Manually Override Rates"
                                    value={isManualOverride}
                                    onValueChange={handleToggleOverride}
                                    color="#007AFF"
                                />
                            </VStack>
                            <LabeledContent label="Regular Base Daily">
                                <TextField
                                    key={`base-${roleIndex}-${isManualOverride}`}
                                    placeholder="Regular Base Daily Rate"
                                    defaultValue={baseRate}
                                    onChangeText={(v) => {
                                        const clean = v.replace(/[^0-9]/g, '');
                                        setBaseRate(clean);
                                    }}
                                    keyboardType="numeric"
                                    modifiers={[
                                        disabled(!isManualOverride),
                                        tint('#007AFF')
                                    ]}
                                />
                            </LabeledContent>
                            <LabeledContent label="Holiday Daily">
                                <TextField
                                    key={`overtime-${roleIndex}-${isManualOverride}`}
                                    placeholder="Holiday Daily Rate"
                                    defaultValue={overtimeRate}
                                    onChangeText={(v) => {
                                        const clean = v.replace(/[^0-9]/g, '');
                                        setOvertimeRate(clean);
                                    }}
                                    keyboardType="numeric"
                                    modifiers={[
                                        disabled(!isManualOverride),
                                        tint('#007AFF')
                                    ]}
                                />
                            </LabeledContent>
                            <LabeledContent label="Overtime 1">
                                <TextField
                                    key={`ot1-${roleIndex}-${isManualOverride}`}
                                    placeholder="Overtime 1"
                                    defaultValue={otRate1}
                                    onChangeText={(v) => {
                                        const clean = v.replace(/[^0-9]/g, '');
                                        setOtRate1(clean);
                                    }}
                                    keyboardType="numeric"
                                    modifiers={[
                                        disabled(!isManualOverride),
                                        tint('#007AFF')
                                    ]}
                                />
                            </LabeledContent>
                            <LabeledContent label="Overtime 2">
                                <TextField
                                    key={`ot2-${roleIndex}-${isManualOverride}`}
                                    placeholder="Overtime 2"
                                    defaultValue={otRate2}
                                    onChangeText={(v) => {
                                        const clean = v.replace(/[^0-9]/g, '');
                                        setOtRate2(clean);
                                    }}
                                    keyboardType="numeric"
                                    modifiers={[
                                        disabled(!isManualOverride),
                                        tint('#007AFF')
                                    ]}
                                />
                            </LabeledContent>
                            <LabeledContent label="Overtime 3">
                                <TextField
                                    key={`ot3-${roleIndex}-${isManualOverride}`}
                                    placeholder="Overtime 3"
                                    defaultValue={otRate3}
                                    onChangeText={(v) => {
                                        const clean = v.replace(/[^0-9]/g, '');
                                        setOtRate3(clean);
                                    }}
                                    keyboardType="numeric"
                                    modifiers={[
                                        disabled(!isManualOverride),
                                        tint('#007AFF')
                                    ]}
                                />
                            </LabeledContent>
                        </Section>
                    </Form>

                    {/* Footer buttons */}
                    <VStack spacing={12} modifiers={[
                        background(sheetBg),
                        padding({ top: 12, leading: 20, trailing: 20, bottom: Platform.OS === 'ios' ? 36 : 24 }),
                        frame({ maxWidth: Infinity })
                    ]}>
                        <HStack spacing={12}>
                            <Button
                                variant="glass"
                                color="gray"
                                onPress={onClose}
                                modifiers={[
                                    frame({ width: 100 }),
                                    cornerRadius(999)
                                ]}
                            >
                                <HStack modifiers={[
                                    frame({ maxWidth: Infinity }),
                                    frame({ height: 44 })
                                ]}>
                                    <Spacer />
                                    <SwiftUIText weight="semibold" size={17}>Cancel</SwiftUIText>
                                    <Spacer />
                                </HStack>
                            </Button>
                            <Button
                                variant="borderedProminent"
                                color="#007AFF"
                                onPress={handleSave}
                                modifiers={[
                                    frame({ maxWidth: Infinity }),
                                    cornerRadius(999)
                                ]}
                            >
                                <HStack modifiers={[
                                    frame({ maxWidth: Infinity }),
                                    frame({ height: 44 })
                                ]}>
                                    <Spacer />
                                    <SwiftUIText weight="semibold" size={17} color="#FFFFFF">
                                        {member ? 'Save Changes' : 'Add Crew'}
                                    </SwiftUIText>
                                    <Spacer />
                                </HStack>
                            </Button>
                        </HStack>
                    </VStack>
                </VStack>
            </BottomSheet>
        </Host>
    );
};

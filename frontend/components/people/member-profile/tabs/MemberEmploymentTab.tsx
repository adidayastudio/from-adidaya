import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { MemberProfileSectionHeader } from '../components/MemberProfileSectionHeader';
import { MemberProfileData, MemberHistoryItem, formatScheduleDetail } from '../types';
import { PlatformDatePicker } from '../components/PlatformDatePicker';
import { ProfileDropdownPicker } from '../components/ProfileDropdownPicker';
import { Host, Button as SwiftUIButton, SwiftUIText } from '@/lib/swiftui';

interface MemberEmploymentTabProps {
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
    departmentsList: Array<{ id: string; name: string }>;
    positionsList: Array<any>;
    levelsList: Array<{ id: string; name: string }>;
    contractTypesList: Array<{ id: string; name: string }>;
    workStatusesList: Array<{ id: string; name: string }>;
    workSchedulesList: Array<any>;
    matchedPolicy: any;
    leavePolicyInfo?: { summary: string; detail: string };
    computeEmployeeIdentifiers: (
        deptName?: string,
        posName?: string,
        lvlName?: string,
        orderNum?: string,
        jDate?: string
    ) => { employee_id: string; id_code: string };
    showOptionPicker: (title: string, options: any[], onSelect: (item: any) => void) => void;
    handleLogPromotion: () => void;
    copyToClipboard: (text: string, label: string) => void;
    getJoinDateObj: () => Date;
    getEndDateObj: () => Date;
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    borderColor: string;
    bgColor: string;
    intensity: number;
    sectionTitleColor: string;
}

export const MemberEmploymentTab: React.FC<MemberEmploymentTabProps> = ({
    profile,
    editForm,
    setEditForm,
    activeSection,
    toggleEditSection,
    renderRow,
    departmentsList,
    positionsList,
    levelsList,
    contractTypesList,
    workStatusesList,
    workSchedulesList,
    matchedPolicy,
    leavePolicyInfo,
    computeEmployeeIdentifiers,
    showOptionPicker,
    handleLogPromotion,
    copyToClipboard,
    getJoinDateObj,
    getEndDateObj,
    isDark,
    textColor,
    subtextColor,
    borderColor,
    bgColor,
    intensity,
    sectionTitleColor,
}) => {
    const [copiedField, setCopiedField] = React.useState<string | null>(null);

    const handleCopyField = (text: string, label: string) => {
        copyToClipboard(text, label);
        setCopiedField(label);
        setTimeout(() => {
            setCopiedField(null);
        }, 2000);
    };

    // Matched positions filtered strictly by chosen department
    const availablePositions = useMemo(() => {
        const deptName = editForm.department || profile.department;
        if (!deptName) return positionsList;
        const normalize = (str: string) => (str || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
        const cleanDept = normalize(deptName);
        const selectedDept = departmentsList.find((d) => {
            const nameNorm = normalize(d.name || '');
            const codeNorm = (d.code || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            return nameNorm === cleanDept || (nameNorm && cleanDept && (nameNorm.includes(cleanDept) || cleanDept.includes(nameNorm))) || (codeNorm && cleanDept.includes(codeNorm));
        });
        if (!selectedDept) return positionsList;
        const filtered = positionsList.filter((p: any) => {
            if (p.department_id && selectedDept.id) {
                return p.department_id === selectedDept.id;
            }
            if (p.organization_departments?.name) {
                const orgNorm = normalize(p.organization_departments.name || '');
                return orgNorm === cleanDept || orgNorm === normalize(selectedDept.name || '');
            }
            return true;
        });
        return filtered.length > 0 ? filtered : positionsList;
    }, [editForm.department, profile.department, departmentsList, positionsList]);

    // Stable, robust Date object for Join Date picker to prevent 1970 fallback
    const joinDateValue = useMemo(() => {
        const raw = editForm.join_date || profile.join_date;
        if (raw) {
            if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
                const [y, m, d] = raw.split('-').map(Number);
                if (y >= 2000) {
                    return new Date(y, m - 1, d, 12, 0, 0);
                }
            }
            const d = new Date(raw);
            if (!isNaN(d.getTime()) && d.getFullYear() >= 2000) {
                return d;
            }
        }
        return new Date(2026, 7, 22, 12, 0, 0);
    }, [editForm.join_date, profile.join_date]);

    // Stable Date object for End Date picker
    const endDateValue = useMemo(() => {
        const raw = editForm.end_date || profile.end_date;
        if (raw && raw !== 'Present') {
            if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
                const [y, m, d] = raw.split('-').map(Number);
                if (y >= 2000) {
                    return new Date(y, m - 1, d, 12, 0, 0);
                }
            }
            const d = new Date(raw);
            if (!isNaN(d.getTime()) && d.getFullYear() >= 2000) {
                return d;
            }
        }
        return new Date(2026, 7, 22, 12, 0, 0);
    }, [editForm.end_date, profile.end_date]);

    return (
        <>
            {/* Current Role */}
            <View style={s.section}>
                <MemberProfileSectionHeader
                    title="Current Role"
                    showEdit={true}
                    isEditing={activeSection === 'Current Role'}
                    onToggleEdit={toggleEditSection}
                    sectionTitleColor={sectionTitleColor}
                    isDark={isDark}
                />
                <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor, borderColor }]}>
                    {/* Department Picker Menu */}
                    <View style={s.formRow}>
                        <View style={s.rowLeft}>
                            <PlatformIcon name="building.2" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                            <Text style={[s.rowLabel, { color: textColor }]}>Department</Text>
                        </View>
                        {activeSection === 'Current Role' ? (
                            <ProfileDropdownPicker
                                title="Department"
                                options={departmentsList}
                                value={editForm.department || ''}
                                placeholder="Select Department"
                                onSelect={(item) => {
                                    const computed = computeEmployeeIdentifiers(
                                        item.name,
                                        '',
                                        editForm.level || profile.level,
                                        editForm.order_number || profile.order_number,
                                        editForm.join_date || profile.join_date
                                    );
                                    setEditForm((prev) => ({
                                        ...prev,
                                        department: item.name,
                                        position: '',
                                        employee_id: computed.employee_id,
                                        id_code: computed.id_code,
                                    }));
                                }}
                                isDark={isDark}
                                textColor={textColor}
                                subtextColor={subtextColor}
                            />
                        ) : (
                            <View style={s.rowRight}>
                                <Text style={[s.rowValue, { color: subtextColor }]}>{profile.department || '—'}</Text>
                            </View>
                        )}
                    </View>
                    <View style={[s.separator, { backgroundColor: borderColor }]} />

                    {/* Position Picker Menu (Restricted by Department) */}
                    <View style={s.formRow}>
                        <View style={s.rowLeft}>
                            <PlatformIcon name="briefcase" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                            <Text style={[s.rowLabel, { color: textColor }]}>Position</Text>
                        </View>
                        {activeSection === 'Current Role' ? (
                            !editForm.department ? (
                                <Text style={[s.rowValue, { color: subtextColor, fontStyle: 'italic' }]}>Select Department First</Text>
                            ) : (
                                <ProfileDropdownPicker
                                    title="Position"
                                    options={availablePositions}
                                    value={editForm.position || ''}
                                    placeholder="Select Position"
                                    onSelect={(item) => {
                                        const computed = computeEmployeeIdentifiers(
                                            editForm.department || profile.department,
                                            item.name,
                                            editForm.level || profile.level,
                                            editForm.order_number || profile.order_number,
                                            editForm.join_date || profile.join_date
                                        );
                                        setEditForm((prev) => ({
                                            ...prev,
                                            position: item.name,
                                            employee_id: computed.employee_id,
                                            id_code: computed.id_code,
                                        }));
                                    }}
                                    isDark={isDark}
                                    textColor={textColor}
                                    subtextColor={subtextColor}
                                />
                            )
                        ) : (
                            <View style={s.rowRight}>
                                <Text style={[s.rowValue, { color: subtextColor }]}>{profile.position || '—'}</Text>
                            </View>
                        )}
                    </View>
                    <View style={[s.separator, { backgroundColor: borderColor }]} />

                    {/* Levels Picker Menu */}
                    <View style={s.formRow}>
                        <View style={s.rowLeft}>
                            <PlatformIcon name="square.stack.3d.up.fill" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                            <Text style={[s.rowLabel, { color: textColor }]}>Levels</Text>
                        </View>
                        {activeSection === 'Current Role' ? (
                            <ProfileDropdownPicker
                                title="Level"
                                options={levelsList}
                                value={editForm.level || ''}
                                placeholder="Select Level"
                                onSelect={(item) => {
                                    const computed = computeEmployeeIdentifiers(
                                        editForm.department || profile.department,
                                        editForm.position || profile.position,
                                        item.name,
                                        editForm.order_number || profile.order_number,
                                        editForm.join_date || profile.join_date
                                    );
                                    setEditForm((prev) => ({
                                        ...prev,
                                        level: item.name,
                                        employee_id: computed.employee_id,
                                        id_code: computed.id_code,
                                    }));
                                }}
                                isDark={isDark}
                                textColor={textColor}
                                subtextColor={subtextColor}
                            />
                        ) : (
                            <View style={s.rowRight}>
                                <Text style={[s.rowValue, { color: subtextColor }]}>{profile.level || '—'}</Text>
                            </View>
                        )}
                    </View>
                </GlassView>
            </View>

            {/* Employee Identification */}
            <View style={s.section}>
                <MemberProfileSectionHeader
                    title="Employee Identification"
                    showEdit={true}
                    isEditing={activeSection === 'Employee Identification'}
                    onToggleEdit={toggleEditSection}
                    sectionTitleColor={sectionTitleColor}
                    isDark={isDark}
                />
                <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor, borderColor }]}>
                    {renderRow('Employee Identification', 'order_number', 'Order Number', 'list.number', false, true, true, 'number-pad', 4, 'e.g. 002')}

                    {/* Employee ID (Read-only / Auto Computed) */}
                    <View style={s.formRow}>
                        <View style={s.rowLeft}>
                            <PlatformIcon name="number" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                            <Text style={[s.rowLabel, { color: textColor }]}>Employee ID</Text>
                        </View>
                        <View style={s.rowRight}>
                            <Text style={[s.rowValue, { color: subtextColor }]}>
                                {(activeSection === 'Employee Identification' ? editForm.employee_id : profile.employee_id) || '—'}
                            </Text>
                            {(activeSection === 'Employee Identification' ? editForm.employee_id : profile.employee_id) ? (
                                <TouchableOpacity
                                    onPress={() => handleCopyField((activeSection === 'Employee Identification' ? editForm.employee_id : profile.employee_id), 'Employee ID')}
                                    style={{ marginLeft: 6, padding: 2 }}
                                    activeOpacity={0.7}
                                >
                                    <PlatformIcon
                                        name={copiedField === 'Employee ID' ? "checkmark" : "doc.on.doc"}
                                        size={13}
                                        tintColor={copiedField === 'Employee ID' ? "#34C759" : subtextColor}
                                    />
                                </TouchableOpacity>
                            ) : null}
                        </View>
                    </View>
                    <View style={[s.separator, { backgroundColor: borderColor }]} />

                    {/* ID Code (Read-only / Auto Computed) */}
                    <View style={s.formRow}>
                        <View style={s.rowLeft}>
                            <PlatformIcon name="qrcode" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                            <Text style={[s.rowLabel, { color: textColor }]}>ID Code</Text>
                        </View>
                        <View style={s.rowRight}>
                            <Text
                                style={[s.rowValue, { color: subtextColor }]}
                            >
                                {(activeSection === 'Employee Identification' ? editForm.id_code : profile.id_code) || '—'}
                            </Text>
                            {(activeSection === 'Employee Identification' ? editForm.id_code : profile.id_code) ? (
                                <TouchableOpacity
                                    onPress={() => handleCopyField((activeSection === 'Employee Identification' ? editForm.id_code : profile.id_code), 'ID Code')}
                                    style={{ marginLeft: 6, padding: 2 }}
                                    activeOpacity={0.7}
                                >
                                    <PlatformIcon
                                        name={copiedField === 'ID Code' ? "checkmark" : "doc.on.doc"}
                                        size={13}
                                        tintColor={copiedField === 'ID Code' ? "#34C759" : subtextColor}
                                    />
                                </TouchableOpacity>
                            ) : null}
                        </View>
                    </View>
                </GlassView>
            </View>

            {/* Employee Status */}
            <View style={s.section}>
                <MemberProfileSectionHeader
                    title="Employee Status"
                    showEdit={true}
                    isEditing={activeSection === 'Employee Status'}
                    onToggleEdit={toggleEditSection}
                    sectionTitleColor={sectionTitleColor}
                    isDark={isDark}
                />
                <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor, borderColor }]}>
                    {/* Contract Type Picker Menu */}
                    <View style={s.formRow}>
                        <View style={s.rowLeft}>
                            <PlatformIcon name="doc.plaintext" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                            <Text style={[s.rowLabel, { color: textColor }]}>Contract Type</Text>
                        </View>
                        {activeSection === 'Employee Status' ? (
                            <ProfileDropdownPicker
                                title="Contract Type"
                                options={contractTypesList}
                                value={editForm.contract_type || ''}
                                placeholder="Select Contract Type"
                                onSelect={(item) => setEditForm((prev) => ({ ...prev, contract_type: item.name }))}
                                isDark={isDark}
                                textColor={textColor}
                                subtextColor={subtextColor}
                            />
                        ) : (
                            <View style={s.rowRight}>
                                <Text style={[s.rowValue, { color: subtextColor }]}>{profile.contract_type || '—'}</Text>
                            </View>
                        )}
                    </View>
                    <View style={[s.separator, { backgroundColor: borderColor }]} />

                    {/* Work Status Picker Menu */}
                    <View style={s.formRow}>
                        <View style={s.rowLeft}>
                            <PlatformIcon name="waveform.path.ecg" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                            <Text style={[s.rowLabel, { color: textColor }]}>Work Status</Text>
                        </View>
                        {activeSection === 'Employee Status' ? (
                            <ProfileDropdownPicker
                                title="Work Status"
                                options={workStatusesList}
                                value={editForm.work_status || ''}
                                placeholder="Select Work Status"
                                onSelect={(item) => setEditForm((prev) => ({ ...prev, work_status: item.name }))}
                                isDark={isDark}
                                textColor={textColor}
                                subtextColor={subtextColor}
                            />
                        ) : (
                            <View style={s.rowRight}>
                                <Text style={[s.rowValue, { color: subtextColor }]}>{profile.work_status || '—'}</Text>
                            </View>
                        )}
                    </View>
                    <View style={[s.separator, { backgroundColor: borderColor }]} />

                    {/* Join Date Row with Native DatePicker */}
                    <View style={s.formRow}>
                        <View style={s.rowLeft}>
                            <PlatformIcon name="calendar" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                            <Text style={[s.rowLabel, { color: textColor }]}>Join Date</Text>
                        </View>
                        {activeSection === 'Employee Status' ? (
                            <PlatformDatePicker
                                value={joinDateValue}
                                isDark={isDark}
                                textColor={textColor}
                                onChange={(selectedDate) => {
                                    if (selectedDate) {
                                        const yyyy = selectedDate.getFullYear();
                                        const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
                                        const dd = String(selectedDate.getDate()).padStart(2, '0');
                                        const newDate = `${yyyy}-${mm}-${dd}`;
                                        setEditForm((prev) => {
                                            let employee_id = prev.employee_id;
                                            let id_code = prev.id_code;
                                            try {
                                                const computed = computeEmployeeIdentifiers(
                                                    prev.department || profile.department,
                                                    prev.position || profile.position,
                                                    prev.level || profile.level,
                                                    prev.order_number || profile.order_number,
                                                    newDate
                                                );
                                                if (computed) {
                                                    employee_id = computed.employee_id;
                                                    id_code = computed.id_code;
                                                }
                                            } catch (e) {
                                                // safe
                                            }
                                            return {
                                                ...prev,
                                                join_date: newDate,
                                                employee_id,
                                                id_code,
                                            };
                                        });
                                    }
                                }}
                            />
                        ) : (
                            <View style={s.rowRight}>
                                <Text style={[s.rowValue, { color: subtextColor }]}>
                                    {profile.join_date && !profile.join_date.includes('1970') ? profile.join_date : '—'}
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={[s.separator, { backgroundColor: borderColor }]} />

                    {/* End Date Row with Present Toggle & DatePicker */}
                    <View style={s.formRow}>
                        <View style={s.rowLeft}>
                            <PlatformIcon name="calendar" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                            <Text style={[s.rowLabel, { color: textColor }]}>End Date</Text>
                        </View>
                        {activeSection === 'Employee Status' ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                {Platform.OS === 'ios' && process.env.EXPO_OS === 'ios' ? (
                                    <View style={{ height: 28, width: 72 }}>
                                        <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                            <SwiftUIButton
                                                onPress={() => {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    if (editForm.end_date === 'Present') {
                                                        const now = new Date();
                                                        const yyyy = now.getFullYear();
                                                        const mm = String(now.getMonth() + 1).padStart(2, '0');
                                                        const dd = String(now.getDate()).padStart(2, '0');
                                                        setEditForm((prev) => ({ ...prev, end_date: `${yyyy}-${mm}-${dd}` }));
                                                    } else {
                                                        setEditForm((prev) => ({ ...prev, end_date: 'Present' }));
                                                    }
                                                }}
                                                controlSize="small"
                                                variant={editForm.end_date === 'Present' ? 'glass' : 'borderless'}
                                            >
                                                <SwiftUIText size={13} weight="medium" color={editForm.end_date === 'Present' ? textColor : subtextColor}>
                                                    Present
                                                </SwiftUIText>
                                            </SwiftUIButton>
                                        </Host>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            if (editForm.end_date === 'Present') {
                                                const now = new Date();
                                                const yyyy = now.getFullYear();
                                                const mm = String(now.getMonth() + 1).padStart(2, '0');
                                                const dd = String(now.getDate()).padStart(2, '0');
                                                setEditForm((prev) => ({ ...prev, end_date: `${yyyy}-${mm}-${dd}` }));
                                            } else {
                                                setEditForm((prev) => ({ ...prev, end_date: 'Present' }));
                                            }
                                        }}
                                        style={{
                                            paddingHorizontal: 12,
                                            paddingVertical: 5,
                                            borderRadius: 14,
                                            backgroundColor: editForm.end_date === 'Present' ? (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)') : 'transparent',
                                        }}
                                    >
                                        <Text style={{ fontSize: 13, fontWeight: '500', color: editForm.end_date === 'Present' ? textColor : subtextColor }}>
                                            Present
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                {editForm.end_date !== 'Present' && (
                                    <PlatformDatePicker
                                        value={endDateValue}
                                        isDark={isDark}
                                        textColor={textColor}
                                        onChange={(selectedDate) => {
                                            if (selectedDate) {
                                                const yyyy = selectedDate.getFullYear();
                                                const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
                                                const dd = String(selectedDate.getDate()).padStart(2, '0');
                                                setEditForm((prev) => ({ ...prev, end_date: `${yyyy}-${mm}-${dd}` }));
                                            }
                                        }}
                                    />
                                )}
                            </View>
                        ) : (
                            <View style={s.rowRight}>
                                <Text style={[s.rowValue, { color: subtextColor }]}>{profile.end_date || 'Present'}</Text>
                            </View>
                        )}
                    </View>
                    <View style={[s.separator, { backgroundColor: borderColor }]} />

                    {/* Work Schedule Picker Menu */}
                    <View style={[s.formRow, { alignItems: 'flex-start', paddingVertical: 10 }]}>
                        <View style={[s.rowLeft, { marginTop: 4 }]}>
                            <PlatformIcon name="clock" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                            <Text style={[s.rowLabel, { color: textColor }]}>Work Schedule</Text>
                        </View>
                        {activeSection === 'Employee Status' ? (
                            <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                <ProfileDropdownPicker
                                    title="Work Schedule"
                                    options={workSchedulesList.map((s) => ({ id: s.id, name: s.name }))}
                                    value={editForm.work_schedule_id || editForm.schedule_name || ''}
                                    placeholder="Select Schedule"
                                    onSelect={(item) => {
                                        const chosen = workSchedulesList.find((ws) => ws.id === item.id || ws.name === item.name);
                                        setEditForm((prev) => ({
                                            ...prev,
                                            schedule_name: chosen?.name || item.name,
                                            schedule_detail: chosen ? formatScheduleDetail(chosen) : '',
                                            work_schedule_id: chosen?.id || item.id,
                                        }));
                                    }}
                                    isDark={isDark}
                                    textColor={textColor}
                                    subtextColor={subtextColor}
                                />
                                {editForm.schedule_detail ? (
                                    <Text style={{ fontSize: 11, color: subtextColor, marginTop: 4, textAlign: 'right' }}>
                                        {editForm.schedule_detail}
                                    </Text>
                                ) : null}
                            </View>
                        ) : (
                            <View style={{ alignItems: 'flex-end', flex: 1, justifyContent: 'center' }}>
                                <Text style={[s.rowValue, { color: subtextColor }]}>{profile.schedule_name || '—'}</Text>
                                {profile.schedule_detail ? (
                                    <Text style={{ fontSize: 11, color: subtextColor, marginTop: 3, textAlign: 'right' }}>{profile.schedule_detail}</Text>
                                ) : null}
                            </View>
                        )}
                    </View>
                </GlassView>
            </View>

            {/* Employment Policies */}
            <View style={s.section}>
                <View style={s.sectionHeader}>
                    <Text style={[s.sectionTitle, { color: sectionTitleColor }]}>Employment Policies</Text>
                </View>
                <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor, borderColor }]}>
                    {(() => {
                        const hasContract = Boolean(editForm.contract_type || profile.contract_type);
                        return (
                            <>
                                <View style={s.formRow}>
                                    <View style={s.rowLeft}>
                                        <PlatformIcon name="clock" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                        <Text style={[s.rowLabel, { color: textColor }]}>Standard Work Hours</Text>
                                    </View>
                                    <View style={s.rowRight}>
                                        <Text style={[s.rowValue, { color: subtextColor }]}>
                                            {hasContract
                                                ? (matchedPolicy?.work_hours_per_week ? `${matchedPolicy.work_hours_per_week} Hours / Week` : '40 Hours / Week')
                                                : '—'}
                                        </Text>
                                    </View>
                                </View>
                                <View style={[s.separator, { backgroundColor: borderColor }]} />

                                <View style={s.formRow}>
                                    <View style={s.rowLeft}>
                                        <PlatformIcon name="bolt.fill" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                        <Text style={[s.rowLabel, { color: textColor }]}>Overtime</Text>
                                    </View>
                                    <View style={s.rowRight}>
                                        <Text style={[s.rowValue, { color: hasContract ? (matchedPolicy?.overtime_eligible !== false ? '#34C759' : subtextColor) : subtextColor }]}>
                                            {hasContract
                                                ? (matchedPolicy?.overtime_eligible !== false ? 'Eligible' : 'Not Eligible')
                                                : '—'}
                                        </Text>
                                    </View>
                                </View>
                                <View style={[s.separator, { backgroundColor: borderColor }]} />

                                <View style={s.formRow}>
                                    <View style={s.rowLeft}>
                                        <PlatformIcon name="gift.fill" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                        <Text style={[s.rowLabel, { color: textColor }]}>Benefit and Allowance</Text>
                                    </View>
                                    <View style={s.rowRight}>
                                        <Text style={[s.rowValue, { color: hasContract ? (matchedPolicy?.benefits_eligible !== false ? '#34C759' : subtextColor) : subtextColor }]}>
                                            {hasContract
                                                ? (matchedPolicy?.benefits_eligible !== false ? 'Eligible' : 'Not Eligible')
                                                : '—'}
                                        </Text>
                                    </View>
                                </View>
                                <View style={[s.separator, { backgroundColor: borderColor }]} />

                                <View style={[s.formRow, { alignItems: 'flex-start', paddingVertical: 10 }]}>
                                    <View style={[s.rowLeft, { marginTop: 2 }]}>
                                        <PlatformIcon name="calendar.badge.clock" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                        <Text style={[s.rowLabel, { color: textColor }]}>Leave</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end', flex: 1, justifyContent: 'center' }}>
                                        <Text style={[s.rowValue, { color: hasContract && matchedPolicy?.leave_eligible !== false ? textColor : subtextColor }]}>
                                            {hasContract
                                                ? (leavePolicyInfo?.summary || '12 Days / Year Standard')
                                                : '—'}
                                        </Text>
                                        {hasContract && leavePolicyInfo?.detail ? (
                                            <Text style={{ fontSize: 11, color: subtextColor, marginTop: 3, textAlign: 'right' }}>
                                                {leavePolicyInfo.detail}
                                            </Text>
                                        ) : null}
                                    </View>
                                </View>
                            </>
                        );
                    })()}
                </GlassView>
            </View>

            {/* History */}
            <View style={s.section}>
                <View style={s.sectionHeader}>
                    <Text style={[s.sectionTitle, { color: sectionTitleColor }]}>History</Text>
                    <TouchableOpacity
                        onPress={handleLogPromotion}
                        style={s.logPromotionBtn}
                        activeOpacity={0.7}
                    >
                        <PlatformIcon name="plus" size={12} tintColor="#007AFF" />
                        <Text style={s.logPromotionText}>Update Employment</Text>
                    </TouchableOpacity>
                </View>

                {(profile.employment_history || []).length === 0 ? (
                    <GlassView intensity={intensity} style={[s.card, s.emptyHistoryBox, { backgroundColor: bgColor, borderColor }]}>
                        <Text style={[s.emptyHistoryText, { color: subtextColor }]}>
                            No promotion or role progression records logged yet.
                        </Text>
                    </GlassView>
                ) : (
                    <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor, borderColor }]}>
                        {profile.employment_history.map((hist: MemberHistoryItem, hIdx: number) => (
                            <React.Fragment key={hist.id || hIdx}>
                                <View style={s.historyRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[s.histPosition, { color: textColor }]}>{hist.position}</Text>
                                        <Text style={[s.histMeta, { color: subtextColor }]}>
                                            {hist.department} • {hist.level} • {hist.date}
                                        </Text>
                                        {hist.note ? (
                                            <Text style={[s.histNote, { color: subtextColor }]}>{hist.note}</Text>
                                        ) : null}
                                    </View>
                                </View>
                                {hIdx < profile.employment_history.length - 1 && (
                                    <View style={[s.separator, { backgroundColor: borderColor }]} />
                                )}
                            </React.Fragment>
                        ))}
                    </GlassView>
                )}
            </View>
        </>
    );
};

const s = StyleSheet.create({
    section: {
        gap: 8,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '400',
        textTransform: 'none',
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
    rowLabel: {
        fontSize: 15,
        fontWeight: '400',
    },
    rowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flex: 1,
        marginLeft: 12,
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
    separator: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 26,
    },
    logPromotionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        backgroundColor: 'rgba(0, 122, 255, 0.08)',
    },
    logPromotionText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#007AFF',
    },
    emptyHistoryBox: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyHistoryText: {
        fontSize: 13,
        fontWeight: '400',
        textAlign: 'center',
    },
    historyRow: {
        paddingVertical: 12,
    },
    histPosition: {
        fontSize: 15,
        fontWeight: '600',
    },
    histMeta: {
        fontSize: 12,
        fontWeight: '400',
        marginTop: 2,
    },
    histNote: {
        fontSize: 12,
        fontWeight: '400',
        fontStyle: 'italic',
        marginTop: 4,
    },
});

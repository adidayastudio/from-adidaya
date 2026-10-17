import React, { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import {
    Host,
    BottomSheet,
    HStack,
    VStack,
    Spacer,
    Text as SwiftUIText,
    Button,
    Form,
    Section,
    TextField,
    Picker,
    Switch,
    DateTimePicker,
} from '@expo/ui/swift-ui';
import {
    padding,
    frame,
    background,
    ignoreSafeArea,
} from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import {
    CalendarEventItem,
    CalendarEventType,
} from '@/lib/data/calendarEvents';

interface CreateCalendarEventModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (event: CalendarEventItem) => void;
    initialType?: CalendarEventType;
    initialDate?: string;
    editingEvent?: CalendarEventItem | null;
    isDark?: boolean;
    textColor?: string;
    subtextColor?: string;
    tenantBrandColor?: string | null;
}

const EVENT_TYPE_OPTIONS: Array<{ type: CalendarEventType; label: string }> = [
    { type: 'company_special', label: 'Company Event' },
    { type: 'birthday', label: 'Birthday' },
    { type: 'work_exception', label: 'Work Schedule Exception' },
];

export function CreateCalendarEventModal({
    visible,
    onClose,
    onSave,
    initialType = 'company_special',
    initialDate,
    editingEvent,
}: CreateCalendarEventModalProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const nativeControlTextColor = isDark ? '#FFFFFF' : '#000000';

    const isEditMode = !!editingEvent;

    const [typeIndex, setTypeIndex] = useState(() => {
        const targetType = editingEvent?.type || initialType;
        const found = EVENT_TYPE_OPTIONS.findIndex((o) => o.type === targetType);
        return found >= 0 ? found : 0;
    });

    const [title, setTitle] = useState('');
    const titleRef = useRef('');

    const [eventDate, setEventDate] = useState<Date>(() => {
        if (editingEvent?.date) {
            const d = new Date(editingEvent.date);
            if (!isNaN(d.getTime())) return d;
        } else if (initialDate) {
            const d = new Date(initialDate);
            if (!isNaN(d.getTime())) return d;
        }
        return new Date();
    });

    const [description, setDescription] = useState('');
    const descriptionRef = useRef('');

    const [isRecurring, setIsRecurring] = useState(false);

    // For Work Exception
    const [startTimeDate, setStartTimeDate] = useState<Date>(() => {
        const d = new Date();
        d.setHours(8, 0, 0, 0);
        return d;
    });
    const [endTimeDate, setEndTimeDate] = useState<Date>(() => {
        const d = new Date();
        d.setHours(16, 0, 0, 0);
        return d;
    });
    const [breakMinutes, setBreakMinutes] = useState('60');
    const breakMinutesRef = useRef('60');

    // For Birthday
    const [personRole, setPersonRole] = useState('');
    const personRoleRef = useRef('');

    const wasVisibleRef = useRef(false);

    useEffect(() => {
        if (visible && !wasVisibleRef.current) {
            if (editingEvent) {
                const found = EVENT_TYPE_OPTIONS.findIndex((o) => o.type === editingEvent.type);
                setTypeIndex(found >= 0 ? found : 0);

                let rawTitle = editingEvent.personName || editingEvent.title || '';
                if (editingEvent.type === 'birthday') {
                    rawTitle = rawTitle.replace(/'s Birthday$/i, '');
                }
                setTitle(rawTitle);
                titleRef.current = rawTitle;

                const rawDateStr = editingEvent.originalDate || editingEvent.date;
                if (rawDateStr) {
                    const d = new Date(rawDateStr);
                    if (!isNaN(d.getTime())) setEventDate(d);
                }

                const desc = editingEvent.description || '';
                setDescription(desc);
                descriptionRef.current = desc;

                setIsRecurring(editingEvent.isRecurring !== false);

                const role = editingEvent.personRole || '';
                setPersonRole(role);
                personRoleRef.current = role;

                if (editingEvent.timeOverride) {
                    const [sh, sm] = (editingEvent.timeOverride.startTime || '08:00').split(':');
                    const [eh, em] = (editingEvent.timeOverride.endTime || '16:00').split(':');
                    const sd = new Date();
                    sd.setHours(parseInt(sh, 10) || 8, parseInt(sm, 10) || 0, 0, 0);
                    setStartTimeDate(sd);

                    const ed = new Date();
                    ed.setHours(parseInt(eh, 10) || 16, parseInt(em, 10) || 0, 0, 0);
                    setEndTimeDate(ed);

                    const bStr = String(editingEvent.timeOverride.breakMinutes || 60);
                    setBreakMinutes(bStr);
                    breakMinutesRef.current = bStr;
                }
            } else {
                const found = EVENT_TYPE_OPTIONS.findIndex((o) => o.type === initialType);
                setTypeIndex(found >= 0 ? found : 0);

                if (initialDate) {
                    const d = new Date(initialDate);
                    if (!isNaN(d.getTime())) setEventDate(d);
                } else {
                    setEventDate(new Date());
                }

                setTitle('');
                titleRef.current = '';
                setDescription('');
                descriptionRef.current = '';
                setIsRecurring(initialType === 'birthday');
                setBreakMinutes('60');
                breakMinutesRef.current = '60';
                setPersonRole('');
                personRoleRef.current = '';
            }
        }
        wasVisibleRef.current = visible;
    }, [visible, editingEvent, initialType, initialDate]);

    const activeTypeConfig = EVENT_TYPE_OPTIONS[typeIndex] || EVENT_TYPE_OPTIONS[0];

    const handleSave = () => {
        const finalTitle = (titleRef.current || title).trim();
        if (!finalTitle) {
            Alert.alert('Required', 'Please enter a title or name.');
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const yyyy = eventDate.getFullYear();
        const mm = String(eventDate.getMonth() + 1).padStart(2, '0');
        const dd = String(eventDate.getDate()).padStart(2, '0');
        const formattedDate = `${yyyy}-${mm}-${dd}`;

        const formatTime = (d: Date) => {
            const h = String(d.getHours()).padStart(2, '0');
            const m = String(d.getMinutes()).padStart(2, '0');
            return `${h}:${m}`;
        };

        const finalDesc = (descriptionRef.current || description).trim();
        const finalRole = (personRoleRef.current || personRole).trim();
        const finalBreak = parseInt(breakMinutesRef.current || breakMinutes, 10) || 60;

        const cleanTitle =
            activeTypeConfig.type === 'birthday'
                ? finalTitle.toLowerCase().endsWith('birthday')
                    ? finalTitle
                    : `${finalTitle}'s Birthday`
                : finalTitle;

        const newEvent: CalendarEventItem = {
            id: editingEvent?.id || `event-${Date.now()}`,
            title: cleanTitle,
            date: formattedDate,
            originalDate: formattedDate,
            type: activeTypeConfig.type,
            source: 'company',
            isRecurring: activeTypeConfig.type === 'birthday' ? true : isRecurring,
            description: finalDesc || undefined,
            timeOverride:
                activeTypeConfig.type === 'work_exception'
                    ? {
                          startTime: formatTime(startTimeDate),
                          endTime: formatTime(endTimeDate),
                          breakMinutes: finalBreak,
                      }
                    : undefined,
            personName: activeTypeConfig.type === 'birthday' ? finalTitle : undefined,
            personRole: activeTypeConfig.type === 'birthday' ? finalRole || undefined : undefined,
            createdAt: editingEvent?.createdAt || new Date().toISOString(),
        };

        onSave(newEvent);
        onClose();
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.85]}
                presentationDragIndicator="hidden"
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack
                    spacing={0}
                    modifiers={[
                        ignoreSafeArea({ edges: 'bottom' }),
                        background('clear'),
                    ]}
                >
                    {/* Native Header Bar (No Grabber, Clean Alignment) */}
                    <HStack
                        alignment="center"
                        modifiers={[padding({ top: 20, leading: 20, trailing: 20, bottom: 8 })]}
                    >
                        <SwiftUIText size={22} weight="bold" color={textColor}>
                            {isEditMode ? 'Edit Calendar Event' : 'Add Calendar Event'}
                        </SwiftUIText>
                        <Spacer />
                        <Button
                            systemImage="xmark"
                            role="cancel"
                            color="gray"
                            onPress={onClose}
                        />
                    </HStack>

                    {/* Form Scroll Content */}
                    <Form modifiers={[background('clear')]}>
                        {/* 1. Top Event Type Selector */}
                        <Section title="Event Category">
                            <Picker
                                label="Category"
                                options={EVENT_TYPE_OPTIONS.map((o) => o.label)}
                                selectedIndex={typeIndex}
                                onOptionSelected={(e) => {
                                    Haptics.selectionAsync();
                                    setTypeIndex(e.nativeEvent.index);
                                    if (EVENT_TYPE_OPTIONS[e.nativeEvent.index]?.type === 'birthday') {
                                        setIsRecurring(true);
                                    }
                                }}
                                variant="menu"
                                color={nativeControlTextColor}
                            />
                        </Section>

                        {/* 2. Dynamic Sections based on selected type */}
                        {activeTypeConfig.type === 'company_special' && (
                            <>
                                <Section title="Company Event Details">
                                    <TextField
                                        key={`event-name-${editingEvent?.id || 'new'}`}
                                        placeholder="Event Name"
                                        defaultValue={titleRef.current || title}
                                        onChangeText={(val) => {
                                            setTitle(val);
                                            titleRef.current = val;
                                        }}
                                    />
                                    <DateTimePicker
                                        title="Event Date"
                                        displayedComponents="date"
                                        variant="compact"
                                        color={nativeControlTextColor}
                                        initialDate={eventDate.toISOString()}
                                        onDateSelected={(date) => setEventDate(date)}
                                    />
                                    <Switch
                                        label="Recurring Every Year"
                                        value={isRecurring}
                                        onValueChange={setIsRecurring}
                                    />
                                </Section>

                                <Section title="Additional Notes (Optional)">
                                    <TextField
                                        key={`event-desc-${editingEvent?.id || 'new'}`}
                                        placeholder="Notes, agenda, or details..."
                                        defaultValue={descriptionRef.current || description}
                                        onChangeText={(val) => {
                                            setDescription(val);
                                            descriptionRef.current = val;
                                        }}
                                    />
                                </Section>
                            </>
                        )}

                        {activeTypeConfig.type === 'birthday' && (
                            <Section title="Birthday Details">
                                <TextField
                                    key={`bday-name-${editingEvent?.id || 'new'}`}
                                    placeholder="Full Name"
                                    defaultValue={titleRef.current || title}
                                    onChangeText={(val) => {
                                        setTitle(val);
                                        titleRef.current = val;
                                    }}
                                />
                                <TextField
                                    key={`bday-role-${editingEvent?.id || 'new'}`}
                                    placeholder="Position / Role (Optional)"
                                    defaultValue={personRoleRef.current || personRole}
                                    onChangeText={(val) => {
                                        setPersonRole(val);
                                        personRoleRef.current = val;
                                    }}
                                />
                                <DateTimePicker
                                    title="Date of Birth"
                                    displayedComponents="date"
                                    variant="compact"
                                    color={nativeControlTextColor}
                                    initialDate={eventDate.toISOString()}
                                    onDateSelected={(date) => setEventDate(date)}
                                />
                            </Section>
                        )}

                        {activeTypeConfig.type === 'work_exception' && (
                            <>
                                <Section title="Schedule Exception Details">
                                    <TextField
                                        key={`ex-name-${editingEvent?.id || 'new'}`}
                                        placeholder="Reason / Exception Name"
                                        defaultValue={titleRef.current || title}
                                        onChangeText={(val) => {
                                            setTitle(val);
                                            titleRef.current = val;
                                        }}
                                    />
                                    <HStack modifiers={[padding({ top: 2, bottom: 4 })]}>
                                        <SwiftUIText size={12} color={subtextColor}>
                                            e.g. Ramadan working hours, special facility maintenance
                                        </SwiftUIText>
                                    </HStack>
                                    <DateTimePicker
                                        title="Date"
                                        displayedComponents="date"
                                        variant="compact"
                                        color={nativeControlTextColor}
                                        initialDate={eventDate.toISOString()}
                                        onDateSelected={(date) => setEventDate(date)}
                                    />
                                    <DateTimePicker
                                        title="Custom Start Time"
                                        displayedComponents="hourAndMinute"
                                        variant="compact"
                                        color={nativeControlTextColor}
                                        initialDate={startTimeDate.toISOString()}
                                        onDateSelected={(date) => setStartTimeDate(date)}
                                    />
                                    <DateTimePicker
                                        title="Custom End Time"
                                        displayedComponents="hourAndMinute"
                                        variant="compact"
                                        color={nativeControlTextColor}
                                        initialDate={endTimeDate.toISOString()}
                                        onDateSelected={(date) => setEndTimeDate(date)}
                                    />
                                    <TextField
                                        key={`ex-break-${editingEvent?.id || 'new'}`}
                                        placeholder="Break Duration in Minutes (e.g. 60)"
                                        defaultValue={breakMinutesRef.current || breakMinutes}
                                        onChangeText={(val) => {
                                            setBreakMinutes(val);
                                            breakMinutesRef.current = val;
                                        }}
                                    />
                                </Section>

                                <Section title="Additional Notes (Optional)">
                                    <TextField
                                        key={`ex-desc-${editingEvent?.id || 'new'}`}
                                        placeholder="Notes or instructions..."
                                        defaultValue={descriptionRef.current || description}
                                        onChangeText={(val) => {
                                            setDescription(val);
                                            descriptionRef.current = val;
                                        }}
                                    />
                                </Section>
                            </>
                        )}
                    </Form>

                    {/* Footer Action Buttons (Bottom Bar Layout) */}
                    <HStack
                        spacing={12}
                        modifiers={[
                            background('clear'),
                            padding({ top: 12, leading: 20, trailing: 20, bottom: 20 }),
                            frame({ maxWidth: Infinity }),
                        ]}
                    >
                        <Button
                            variant="glass"
                            color="gray"
                            onPress={onClose}
                        >
                            <HStack
                                modifiers={[
                                    frame({ maxWidth: Infinity }),
                                    frame({ height: 42 }),
                                ]}
                            >
                                <Spacer />
                                <SwiftUIText weight="semibold" size={17}>
                                    Cancel
                                </SwiftUIText>
                                <Spacer />
                            </HStack>
                        </Button>
                        <Button
                            variant="glassProminent"
                            color="#007AFF"
                            onPress={handleSave}
                        >
                            <HStack
                                modifiers={[
                                    frame({ maxWidth: Infinity }),
                                    frame({ height: 42 }),
                                ]}
                            >
                                <Spacer />
                                <SwiftUIText weight="semibold" size={17} color="#FFFFFF">
                                    {isEditMode ? 'Save Changes' : 'Create Event'}
                                </SwiftUIText>
                                <Spacer />
                            </HStack>
                        </Button>
                    </HStack>
                </VStack>
            </BottomSheet>
        </Host>
    );
}

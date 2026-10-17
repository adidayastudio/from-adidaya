import { APP_MODE } from './supabase';
// Arrival and attendance reminder notifications remain explicitly disabled.
const ATTENDANCE_REMINDERS_ENABLED = Boolean(false);
import type * as ExpoNotifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, differenceInMinutes, startOfWeek, endOfWeek } from 'date-fns';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { fetchTodaySessions, fetchAttendanceRecords, AttendanceRecord } from './api/attendance';
import { HOLIDAYS_2026 } from './constants/holidays';

type NotificationsModule = typeof ExpoNotifications;

let notificationsModule: NotificationsModule | null | undefined;
let notificationHandlerConfigured = false;

function getNotificationsModule(): NotificationsModule | null {
    if (notificationsModule !== undefined) {
        return notificationsModule;
    }

    if (Platform.OS === 'android' && Constants.appOwnership === 'expo') {
        notificationsModule = null;
        return notificationsModule;
    }

    try {
        // Lazy-load to avoid Expo Go Android crashing on SDK 53+.
        // Remote push support was removed from Expo Go, but dev builds still support this module.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        notificationsModule = require('expo-notifications') as NotificationsModule;
    } catch (e) {
        console.warn('expo-notifications is not available in this runtime:', e);
        notificationsModule = null;
        return notificationsModule;
    }

    if (!notificationHandlerConfigured) {
        notificationsModule.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
                shouldShowBanner: true,
                shouldShowList: true,
            }),
        });

        if (Platform.OS === 'android') {
            notificationsModule.setNotificationChannelAsync('default', {
                name: 'Default',
                importance: notificationsModule.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#007AFF',
            }).catch(() => {});
        }

        notificationHandlerConfigured = true;
    }

    return notificationsModule;
}

/**
 * Request notification permissions from the system
 */
export async function requestNotificationPermissions(): Promise<boolean> {
    try {
        const Notifications = getNotificationsModule();
        if (!Notifications) return false;

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        return finalStatus === 'granted';
    } catch (e) {
        console.error('Failed to request notification permissions:', e);
        return false;
    }
}

/**
 * Helper to trigger a local system notification immediately
 */
export async function sendLocalNotification(title: string, body: string, data: Record<string, any> = {}) {
    if (APP_MODE === 'adidaya') return; // Delivery follows Adidaya server triggers, not Forma local rules.
    try {
        const Notifications = getNotificationsModule();
        if (!Notifications) return;

        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) {
            console.log('Skipping notification: Permission not granted.');
            return;
        }

        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data,
                sound: true,
                priority: Notifications.AndroidNotificationPriority.MAX,
            },
            trigger: null, // trigger immediately
        });
    } catch (e) {
        console.error('Failed to send local notification:', e);
    }
}

/**
 * Set up global listener for OS notification taps (lockscreen / status bar)
 */
export function setupNotificationResponseListener(router: any) {
    const Notifications = getNotificationsModule();
    if (!Notifications) return () => {};

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response?.notification?.request?.content?.data;
        if (data?.type === 'announcement' && data?.id) {
            router.push({
                pathname: '/announcement-detail',
                params: { id: data.id },
            });
        } else if (data?.type === 'clock_in_reminder' || data?.type === 'clock_out_reminder' || data?.type === 'late_night_alert' || data?.type === 'geofence_reminder') {
            router.push('/(tabs)/home/clock-module');
        } else if (data?.type === 'finance' && data?.requestId) {
            router.push({
                pathname: '/(tabs)/home/finance',
                params: { requestId: data.requestId, requestType: data.requestType || 'purchasing' },
            });
        }
    });

    return () => {
        subscription.remove();
    };
}

/**
 * Check and trigger all local attendance notifications based on business rules
 */
export async function checkLocalAttendanceNotifications(userId: string) {
    if (!ATTENDANCE_REMINDERS_ENABLED) return;
    try {
        const now = new Date();
        const currentHour = now.getHours();
        const todayStr = format(now, 'yyyy-MM-dd');
        
        // Fetch sessions for today
        const todaySessions = await fetchTodaySessions(userId).catch(() => []);
        const hasClockIn = todaySessions.length > 0 && todaySessions.some(s => !!s.clockIn);
        const hasClockOut = todaySessions.length > 0 && todaySessions.every(s => !!s.clockOut);
        const isClockedInNow = todaySessions.length > 0 && todaySessions.some(s => s.clockIn && !s.clockOut);

        // -------------------------------------------------------------
        // 1. Clock-In Reminder after 8:00 AM
        // -------------------------------------------------------------
        const isWeekend = now.getDay() === 0 || now.getDay() === 6;
        const isHolidayToday = HOLIDAYS_2026.some(h => h.date === todayStr);

        // Only remind on working days (Mon-Fri) if not holiday
        if (!isWeekend && !isHolidayToday) {
            if (currentHour >= 8 && !hasClockIn) {
                const key = `@adidaya:local_notif:clock_in:${todayStr}`;
                const alreadySent = await AsyncStorage.getItem(key);
                if (!alreadySent) {
                    await sendLocalNotification(
                        'Belum Clock In',
                        'Sudah lewat jam 08.00 pagi, silakan lakukan Clock In untuk hari ini!',
                        { type: 'clock_in_reminder' }
                    );
                    await AsyncStorage.setItem(key, 'true');
                }
            }
        }

        // -------------------------------------------------------------
        // 2. Clock-Out Reminder (Respects EndTimeBehavior)
        // -------------------------------------------------------------
        if (isClockedInNow) {
            const firstSession = todaySessions.find(s => !!s.clockIn);
            if (firstSession) {
                const clockInTime = new Date(firstSession.clockIn);
                
                // Fetch attendance rules configuration
                let shouldRemind = false;
                try {
                    const { getClockSetting, DEFAULT_ATTENDANCE_RULES, calculateExpectedClockOut } = await import('./api/clockSetup');
                    const rules = await getClockSetting('ATTENDANCE_RULES', DEFAULT_ATTENDANCE_RULES);
                    const expectedOut = calculateExpectedClockOut({
                        clockInTime,
                        scheduleStartTime: '08:00',
                        scheduleEndTime: '17:00',
                        requiredWorkHours: rules.fullDayMinHours || 8,
                        breakDurationMinutes: rules.breakDurationMinutes ?? 60,
                        behavior: rules.endTimeBehavior || 'fixed_schedule',
                    });
                    shouldRemind = now.getTime() >= expectedOut.getTime();
                } catch {
                    const elapsedMinutes = differenceInMinutes(now, clockInTime);
                    shouldRemind = (elapsedMinutes / 60) >= 9 || currentHour >= 17;
                }

                if (shouldRemind) {
                    const key = `@adidaya:local_notif:clock_out:${todayStr}`;
                    const alreadySent = await AsyncStorage.getItem(key);
                    if (!alreadySent) {
                        await sendLocalNotification(
                            'Waktunya Clock Out',
                            'Jam kerja Anda sudah selesai. Jangan lupa lakukan Clock Out!',
                            { type: 'clock_out_reminder' }
                        );
                        await AsyncStorage.setItem(key, 'true');
                    }
                }
            }
        }

        // -------------------------------------------------------------
        // 3. Late Night Clock-Out Alert (> 9 PM)
        // -------------------------------------------------------------
        if (isClockedInNow && currentHour >= 21) {
            const key = `@adidaya:local_notif:late_night:${todayStr}`;
            const alreadySent = await AsyncStorage.getItem(key);
            if (!alreadySent) {
                await sendLocalNotification(
                    'Masih Bekerja?',
                    'Sudah larut malam dan Anda belum melakukan Clock Out. Apakah Anda masih bekerja?',
                    { type: 'late_night_alert' }
                );
                await AsyncStorage.setItem(key, 'true');
            }
        }

        // -------------------------------------------------------------
        // 4. Holiday Tomorrow Alert (at 6 PM today)
        // -------------------------------------------------------------
        if (currentHour >= 18) {
            const tomorrow = new Date();
            tomorrow.setDate(now.getDate() + 1);
            const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
            const tomorrowDay = tomorrow.getDay();
            const tomorrowIsWeekend = tomorrowDay === 0 || tomorrowDay === 6;

            const holidayTomorrow = HOLIDAYS_2026.find(h => h.date === tomorrowStr);
            if (holidayTomorrow) {
                const key = `@adidaya:local_notif:holiday_tomorrow:${tomorrowStr}`;
                const alreadySent = await AsyncStorage.getItem(key);
                if (!alreadySent) {
                    await sendLocalNotification(
                        'Hari Libur Besok',
                        `Besok adalah Hari Libur: ${holidayTomorrow.nameId || holidayTomorrow.nameEn}. Selamat menikmati liburan!`,
                        { type: 'holiday_alert' }
                    );
                    await AsyncStorage.setItem(key, 'true');
                }
            }
        }

        // -------------------------------------------------------------
        // 5. Lateness Streak Warning (> 3 times this week)
        // -------------------------------------------------------------
        const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
        const weekStartStr = format(weekStart, 'yyyy-MM-dd');
        const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

        const weeklyRecords = await fetchAttendanceRecords(userId, weekStartStr, weekEndStr).catch(() => []);
        const lateCount = weeklyRecords.filter(r => r.status === 'late').length;

        if (lateCount >= 3) {
            const currentWeekStr = `${weekStartStr}_to_${weekEndStr}`;
            const key = `@adidaya:local_notif:lateness_streak:${currentWeekStr}`;
            const alreadySent = await AsyncStorage.getItem(key);
            if (!alreadySent) {
                await sendLocalNotification(
                    'Peringatan Keterlambatan',
                    `Anda sudah terlambat sebanyak ${lateCount} kali minggu ini. Harap tingkatkan kedisiplinan Anda!`,
                    { type: 'lateness_warning' }
                );
                await AsyncStorage.setItem(key, 'true');
            }
        }

    } catch (e) {
        console.error('Failed in checkLocalAttendanceNotifications:', e);
    }
}

/**
 * Geofence check triggered when location coordinates change
 */
export async function checkGeofenceNotification(latitude: number, longitude: number, userId: string) {
    if (!ATTENDANCE_REMINDERS_ENABLED) return;
    try {
        const now = new Date();
        const todayStr = format(now, 'yyyy-MM-dd');

        // Check if today is weekend or holiday
        const isWeekend = now.getDay() === 0 || now.getDay() === 6;
        const isHolidayToday = HOLIDAYS_2026.some(h => h.date === todayStr);
        if (isWeekend || isHolidayToday) return;

        // Fetch sessions for today
        const todaySessions = await fetchTodaySessions(userId).catch(() => []);
        const hasClockIn = todaySessions.length > 0 && todaySessions.some(s => !!s.clockIn);
        if (hasClockIn) return;

        // Calculate distance from office/project (MOCK coordinates: -6.2088, 106.8456)
        const OFFICE_LAT = -6.2088;
        const OFFICE_LNG = 106.8456;

        const R = 6371e3; // Earth radius in meters
        const φ1 = (latitude * Math.PI) / 180;
        const φ2 = (OFFICE_LAT * Math.PI) / 180;
        const Δφ = ((OFFICE_LAT - latitude) * Math.PI) / 180;
        const Δλ = ((OFFICE_LNG - longitude) * Math.PI) / 180;

        const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // in meters

        // If user is within 150 meters of the office/project
        if (distance <= 150) {
            const key = `@adidaya:local_notif:geofence:${todayStr}`;
            const alreadySent = await AsyncStorage.getItem(key);
            if (!alreadySent) {
                await sendLocalNotification(
                    'Sudah Sampai di Kantor/Proyek',
                    'Anda terdeteksi di area kantor/proyek. Silakan lakukan Clock In sekarang!',
                    { type: 'geofence_reminder' }
                );
                await AsyncStorage.setItem(key, 'true');
            }
        }
    } catch (e) {
        console.error('Failed in checkGeofenceNotification:', e);
    }
}

import * as Location from 'expo-location';
import { Platform } from 'react-native';

type AttendancePosition = { coords: { latitude: number; longitude: number; accuracy?: number | null }; timestamp: number };
let cached: AttendancePosition | null = null;
let pending: Promise<AttendancePosition> | null = null;

// Shared by app-entry warming and the Clock sheet. No notification is triggered.
export function getAttendancePosition(forceFresh = false): Promise<AttendancePosition> {
    if (!forceFresh && cached && Date.now() - cached.timestamp >= 0 && Date.now() - cached.timestamp < 60_000) return Promise.resolve(cached);
    if (pending) return pending;
    const request = async (): Promise<AttendancePosition> => {
        if (Platform.OS === 'web') {
            if (!navigator.geolocation) throw new Error('Location is unavailable in this browser.');
            return new Promise((resolve, reject) => {
                const query = (highAccuracy: boolean) => navigator.geolocation.getCurrentPosition(resolve, error => {
                    if (error.code !== 1 && !highAccuracy) query(true);
                    else reject(new Error(error.code === 1 ? 'Please enable location access in your browser.' : 'Location could not be detected. Please try again.'));
                }, { enableHighAccuracy: highAccuracy, maximumAge: forceFresh ? 0 : 60_000, timeout: highAccuracy ? 5000 : 4000 });
                query(false);
            });
        }
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') throw new Error('Location permission is required for attendance.');
        return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Browser geolocation timeouts exclude the time spent deciding permission.
    // The app deadline applies only to the native position request.
    const operation = Platform.OS === 'web' ? request() : Promise.race([
        request(),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Location timed out. Please try again.')), 10_000); }),
    ]);
    pending = operation.then(position => { cached = position;
        if (Platform.OS === 'web') {
            try { localStorage.setItem('last_known_coords', JSON.stringify({ ...position.coords, timestamp: position.timestamp })); } catch {}
        }
        return position; }).finally(() => { if (timer) clearTimeout(timer); pending = null; });
    return pending;
}

// App-entry permission is attempted only once per app load, including failed requests.
let entryLocationRequested = false;
export function prepareAttendancePositionOnce(): void {
    if (entryLocationRequested) return;
    entryLocationRequested = true;
    void getAttendancePosition().catch(() => {});
}

// Ported from from-adidaya: shared GPS/cache/registered-area detection.
import { Platform } from 'react-native';
import { useCallback, useEffect, useRef, useState } from "react";
import { detectLocation, DetectionResult, UserLocation } from "./location-utils";

const MAX_LOCATION_AGE = 60_000;
const REQUEST_DEADLINE = 10_000;

export function useClockLocation({ preload = false }: { preload?: boolean } = {}) {
    const [userCoords, setUserCoords] = useState<UserLocation | null>(null);
    const [detection, setDetection] = useState<DetectionResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const requestId = useRef(0);
    const inFlight = useRef(false);
    const readyCoords = useRef<UserLocation | null>(null);
    const deadline = useRef<ReturnType<typeof setTimeout> | null>(null);

    const locate = useCallback((forceFresh: boolean, background = false) => {
        const previous = readyCoords.current;
        const keepReady = background && previous && Date.now() - previous.timestamp >= 0 && Date.now() - previous.timestamp <= MAX_LOCATION_AGE;
        inFlight.current = true;
        const id = ++requestId.current;
        if (deadline.current) clearTimeout(deadline.current);
        if (!keepReady) {
            readyCoords.current = null;
            setLoading(true);
            setDetection(null);
            setUserCoords(null);
        }
        setError(null);

        const isCurrent = () => requestId.current === id;
        const finish = () => {
            if (deadline.current) clearTimeout(deadline.current);
            deadline.current = null;
            inFlight.current = false;
            setLoading(false);
        };
        const fail = (message: string) => {
            if (!isCurrent()) return;
            finish();
            const fresh = readyCoords.current;
            if (!keepReady || !fresh || Date.now() - fresh.timestamp > MAX_LOCATION_AGE) {
                readyCoords.current = null;
                setError(message);
                setDetection({ status: "unknown" });
                setUserCoords(null);
            }
            // Ignore late browser callbacks after an error or timeout.
            requestId.current++;
        };
        const accept = async (coords: UserLocation) => {
            if (!isCurrent()) return;
            try {
                const result = await detectLocation(coords);
                if (!isCurrent()) return;
                readyCoords.current = coords;
                setUserCoords(coords);
                setDetection(result);
                finish();
                requestId.current++;
                // Storage is optional; a full/blocked cache must not fail GPS detection.
                try {
                    localStorage.setItem("last_known_coords", JSON.stringify(coords));
                    localStorage.setItem("last_known_detection", JSON.stringify(result));
                } catch { /* Location still works without browser storage. */ }
            } catch {
                fail("Unable to verify your location. Please refresh and try again.");
            }
        };

        // Let the browser apply its GPS timeout after permission is decided.


        // Reuse only recent coordinates, and recompute the registered area match.
        // Refresh always requests a new position instead of reusing this cache.
        if (!forceFresh) {
            try {
                const cached = JSON.parse(localStorage.getItem("last_known_coords") || "null");
                const age = Date.now() - cached?.timestamp;
                if (cached && Number.isFinite(cached.latitude) && Math.abs(cached.latitude) <= 90 && Number.isFinite(cached.longitude) && Math.abs(cached.longitude) <= 180 && age >= 0 && age <= MAX_LOCATION_AGE) {
                    void accept(cached);
                    return;
                }
            } catch { /* Ignore expired, unavailable, or invalid cache entries. */ }
        }

        if (!navigator.geolocation) {
            fail("Geolocation is not supported by your browser.");
            return;
        }

        const request = (highAccuracy: boolean) => {
            navigator.geolocation.getCurrentPosition(
                position => {
                    void accept({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, timestamp: position.timestamp });
                },
                cause => {
                    if (!isCurrent()) return;
                    // Permission denial is final; retrying cannot fix it.
                    if (cause.code === 1) {
                        fail("Location permission denied. Please enable location access in your browser settings.");
                    } else if (!highAccuracy) {
                        request(true);
                    } else {
                        fail(cause.code === 3 ? "Location request timed out. Please tap Refresh Location to retry." : `Location unavailable from your device${cause.message ? ": " + cause.message : ". Check macOS/iPad Location Services and retry."}`);
                    }
                },
                {
                    // A network/cached position is often much faster on desktop than GPS.
                    enableHighAccuracy: highAccuracy,
                    timeout: highAccuracy ? 5000 : 4000,
                    maximumAge: forceFresh ? 0 : MAX_LOCATION_AGE,
                }
            );
        };
        request(false);
    }, []);

    useEffect(() => {
        if (Platform.OS !== 'web') return;
        let disposed = false;
        const activeRequest = requestId;
        const activeDeadline = deadline;
        const activeFlight = inFlight;
        const warmLocation = async (forceFresh = false) => {
            if (disposed || document.visibilityState === "hidden" || activeFlight.current) return;
            if (!preload) { locate(false); return; }
            try {
                // Ask once on app entry; background refresh never opens a new permission prompt.
                const permission = await navigator.permissions?.query({ name: "geolocation" });
                if (disposed) return;
                if (permission?.state === "granted") {
                    if (!activeFlight.current) locate(forceFresh, true);
                } else if (permission?.state !== "denied" && !forceFresh && !activeFlight.current) {
                    locate(true, true);
                } else if (!activeFlight.current) {
                    if (permission?.state === "denied") {
                        readyCoords.current = null;
                        setUserCoords(null);
                        setDetection({ status: "unknown" });
                        setError("Location permission denied. Please enable location access in your browser settings.");
                    }
                    setLoading(false);
                }
            } catch {
                if (!disposed && !activeFlight.current) {
                    if (!forceFresh) locate(true, true);
                    else setLoading(false);
                }
            }
        };
        queueMicrotask(() => { void warmLocation(); });
        const interval = preload ? setInterval(() => { void warmLocation(true); }, 30_000) : null;
        const onVisible = () => { if (preload) void warmLocation(true); };
        if (preload) document.addEventListener("visibilitychange", onVisible);
        return () => {
            disposed = true;
            activeRequest.current++;
            activeFlight.current = false;
            if (activeDeadline.current) clearTimeout(activeDeadline.current);
            if (interval) clearInterval(interval);
            if (preload) document.removeEventListener("visibilitychange", onVisible);
        };
    }, [locate, preload]);

    const prepare = useCallback(() => {
        const coords = readyCoords.current;
        const age = coords ? Date.now() - coords.timestamp : Infinity;
        if ((age >= 0 && age <= MAX_LOCATION_AGE) || inFlight.current) return;
        locate(false);
    }, [locate]);
    const refresh = useCallback(() => locate(true), [locate]);
    return { userCoords, detection, loading, error, refresh, prepare };
}

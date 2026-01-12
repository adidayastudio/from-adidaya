import { useState, useEffect } from "react";
import { detectLocation, DetectionResult, UserLocation } from "./location-utils";

export function useClockLocation() {
    const [userCoords, setUserCoords] = useState<UserLocation | null>(null);
    const [detection, setDetection] = useState<DetectionResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refreshLocation = () => {
        setLoading(true);
        setError(null);

        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser");
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const coords: UserLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                };
                setUserCoords(coords);

                try {
                    const result = await detectLocation(coords);
                    setDetection(result);
                } catch (err) {
                    console.error("Location detection failed:", err);
                    setDetection({ status: "unknown" });
                } finally {
                    setLoading(false);
                }
            },
            (err: GeolocationPositionError) => {
                // GeolocationPositionError doesn't serialize well, extract message manually
                const errorMessages: Record<number, string> = {
                    1: "Location permission denied. Please enable location access.",
                    2: "Location unavailable. Please check your device settings.",
                    3: "Location request timed out. Please try again."
                };
                const message = errorMessages[err.code] || `Location error (code: ${err.code})`;
                console.warn("⚠️ Geolocation error:", message);
                setError(message);
                setLoading(false);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    useEffect(() => {
        refreshLocation();
    }, []);

    return {
        userCoords,
        detection,
        loading,
        error,
        refresh: refreshLocation
    };
}

import { useState, useEffect } from "react";
import { detectLocation, DetectionResult, UserLocation } from "./location-utils";

export function useClockLocation() {
    const [userCoords, setUserCoords] = useState<UserLocation | null>(null);
    const [detection, setDetection] = useState<DetectionResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load initial state from cache for instant availability when moving or unstable
    useEffect(() => {
        if (typeof window !== "undefined") {
            const cachedCoords = localStorage.getItem("last_known_coords");
            const cachedDetection = localStorage.getItem("last_known_detection");
            if (cachedCoords && cachedDetection) {
                try {
                    setUserCoords(JSON.parse(cachedCoords));
                    setDetection(JSON.parse(cachedDetection));
                } catch (e) {
                    console.error("Failed to parse cached location:", e);
                }
            }
        }
    }, []);

    const refreshLocation = () => {
        setLoading(true);
        setError(null);

        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser");
            setLoading(false);
            return;
        }

        const getGeo = (highAccuracy: boolean) => {
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
                        
                        // Cache successful coords and detection results
                        if (typeof window !== "undefined") {
                            localStorage.setItem("last_known_coords", JSON.stringify(coords));
                            localStorage.setItem("last_known_detection", JSON.stringify(result));
                        }
                    } catch (err) {
                        console.error("Location detection failed:", err);
                        setDetection({ status: "unknown" });
                    } finally {
                        setLoading(false);
                    }
                },
                (err: GeolocationPositionError) => {
                    if (highAccuracy) {
                        console.warn("⚠️ High accuracy location failed, retrying with normal accuracy...");
                        getGeo(false);
                    } else {
                        const errorMessages: Record<number, string> = {
                            1: "Location permission denied. Please enable location access.",
                            2: "Location unavailable. Please check your device settings.",
                            3: "Location request timed out. Please try again."
                        };
                        const message = errorMessages[err.code] || `Location error (code: ${err.code})`;
                        console.warn("⚠️ Geolocation error:", message);

                        // Try to recover from localStorage if error persists
                        if (typeof window !== "undefined") {
                            const cachedCoords = localStorage.getItem("last_known_coords");
                            const cachedDetection = localStorage.getItem("last_known_detection");
                            if (cachedCoords && cachedDetection) {
                                try {
                                    const coords = JSON.parse(cachedCoords);
                                    const detect = JSON.parse(cachedDetection);
                                    setUserCoords(coords);
                                    setDetection(detect);
                                    setError(`${message} (Using last known location)`);
                                    setLoading(false);
                                    return;
                                } catch (e) {
                                    console.error("Failed to parse cached location:", e);
                                }
                            }
                        }

                        setError(message);
                        setDetection({ status: "unknown" });
                        setLoading(false);
                    }
                },
                { 
                    enableHighAccuracy: highAccuracy, 
                    timeout: highAccuracy ? 8000 : 12000, 
                    maximumAge: 60000 // Allow up to 1 minute old cached browser positions
                }
            );
        };

        // Start with high accuracy
        getGeo(true);
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

export type LocationType = "office" | "project";

export interface ClockLocation {
    id: string;
    code: string;
    type: LocationType;
    latitude: number;
    longitude: number;
    radius_meters: number;
    is_active: boolean;
}

export interface UserLocation {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp: number;
}

export interface DetectionResult {
    status: "inside" | "outside" | "unknown";
    location?: ClockLocation;
    distance?: number;
}

// Abstraction for future swappability
export interface LocationProvider {
    getActiveLocations(): Promise<ClockLocation[]>;
}

// Haversine formula to calculate distance in meters
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}

export const HARDCODED_LOCATIONS: ClockLocation[] = [
    { id: "1", code: "ADY", type: "office", latitude: -6.2362817, longitude: 106.7979101, radius_meters: 50, is_active: true },
    { id: "2", code: "SDV", type: "office", latitude: -7.4252715, longitude: 109.2371945, radius_meters: 50, is_active: true },
    { id: "3", code: "PRG", type: "project", latitude: -6.2362817, longitude: 106.7979101, radius_meters: 50, is_active: true },
    { id: "4", code: "JPF", type: "project", latitude: -6.269871, longitude: 106.796965, radius_meters: 50, is_active: true },
    { id: "5", code: "TPC", type: "project", latitude: -6.296829, longitude: 106.815109, radius_meters: 50, is_active: true },
    { id: "6", code: "LAX", type: "project", latitude: -6.6300371, longitude: 106.903698, radius_meters: 50, is_active: true },
    { id: "7", code: "RWM", type: "project", latitude: -6.195692, longitude: 106.890671, radius_meters: 50, is_active: true },
    { id: "8", code: "MBM", type: "project", latitude: -7.6424214, longitude: 111.5290243, radius_meters: 50, is_active: true },
    { id: "9", code: "KPA", type: "project", latitude: -6.1920658, longitude: 106.8943532, radius_meters: 50, is_active: true },
    { id: "10", code: "RBH", type: "project", latitude: -6.125400, longitude: 106.153325, radius_meters: 50, is_active: true },
];

export class HardcodedLocationProvider implements LocationProvider {
    async getActiveLocations(): Promise<ClockLocation[]> {
        return HARDCODED_LOCATIONS.filter(l => l.is_active);
    }
}

export async function detectLocation(
    userCoords: { latitude: number, longitude: number },
    provider: LocationProvider = new HardcodedLocationProvider()
): Promise<DetectionResult> {
    const locations = await provider.getActiveLocations();
    let bestMatch: { location: ClockLocation, distance: number } | null = null;

    locations.forEach(loc => {
        const dist = calculateDistance(userCoords.latitude, userCoords.longitude, loc.latitude, loc.longitude);
        if (dist <= loc.radius_meters) {
            if (!bestMatch) {
                bestMatch = { location: loc, distance: dist };
            } else {
                // Priority: Project > Office if distances are similar
                const isProjectBetter = loc.type === "project" && bestMatch.location.type === "office";
                if (dist < bestMatch.distance || isProjectBetter) {
                    bestMatch = { location: loc, distance: dist };
                }
            }
        }
    });

    if (bestMatch) {
        const match = bestMatch as { location: ClockLocation, distance: number };
        return {
            status: "inside",
            location: match.location,
            distance: match.distance
        };
    }

    return { status: "outside" };
}

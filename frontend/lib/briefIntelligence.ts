export type BriefHorizon = 'today' | 'yesterday' | 'tomorrow';
export type BriefModule = 'finance' | 'clock' | 'people' | 'resources' | 'projects' | 'reports' | 'crew';

export interface AmbientInsight {
    id: string;
    horizon: BriefHorizon;
    module: BriefModule;
    moduleName: string;
    icon: string;
    color: string;
    gradient: [string, string];
    primaryText: string;
    secondaryText?: string;
    score: number; // Higher = more relevant/urgent context
}

export const MODULE_META: Record<BriefModule, { name: string; icon: string; color: string; gradient: [string, string]; route: string }> = {
    finance: { name: 'Finance', icon: 'creditcard.fill', color: '#159957', gradient: ['#17A35E', '#0F7F47'], route: '/(tabs)/home/finance' },
    clock: { name: 'Clock', icon: 'clock.fill', color: '#0EA5C6', gradient: ['#12B3D6', '#0885A1'], route: '/(tabs)/home/clock-module' },
    people: { name: 'People', icon: 'person.2.fill', color: '#2467B2', gradient: ['#2F7AE0', '#1B5291'], route: '/(tabs)/home/people' },
    resources: { name: 'Resources', icon: 'archivebox.fill', color: '#D97A32', gradient: ['#E6853C', '#C56824'], route: '/(tabs)/home/resources' },
    projects: { name: 'Projects', icon: 'folder.fill', color: '#007AFF', gradient: ['#1A56FF', '#007AFF'], route: '/(tabs)/projects' },
    reports: { name: 'Reports', icon: 'doc.text.fill', color: '#168C7A', gradient: ['#1CA38F', '#107263'], route: '/(tabs)/home/reports' },
    crew: { name: 'Crew', icon: 'hardhat.fill', color: '#C0448F', gradient: ['#D64FA1', '#9F3375'], route: '/(tabs)/home/crew-module' },
};

export interface GenerateInsightsParams {
    hour: number;
    attendanceStatus: string;
    workedDurationMs?: number;
    isManager: boolean;
    projectName?: string;
}

/**
 * Generates ambient, pattern-driven daily work intelligence.
 * Strictly avoids granular tasks, approval alerts, or individual ticket records.
 */
export function generateAmbientInsights(params: GenerateInsightsParams): AmbientInsight[] {
    const { hour, attendanceStatus, workedDurationMs = 0, isManager } = params;

    const allInsights: AmbientInsight[] = [];

    // Format work duration if user is actively clocked in
    if (attendanceStatus === 'checked-in' && workedDurationMs > 0) {
        const hoursWorked = Math.floor(workedDurationMs / (1000 * 60 * 60));
        const minsWorked = Math.floor((workedDurationMs % (1000 * 60 * 60)) / (1000 * 60));
        const formattedDuration = hoursWorked > 0 
            ? `${hoursWorked}h ${minsWorked}m`
            : `${minsWorked}m`;

        allInsights.push({
            id: 'clock-today-pulse',
            horizon: 'today',
            module: 'clock',
            moduleName: MODULE_META.clock.name,
            icon: MODULE_META.clock.icon,
            color: MODULE_META.clock.color,
            gradient: MODULE_META.clock.gradient,
            primaryText: `${formattedDuration} worked today.`,
            secondaryText: 'Clock session is currently active.',
            score: 95,
        });
    }

    return allInsights;
}

/**
 * Selects top 3 distinct-module insights for the Home screen card.
 */
export function getHomeTopInsights(insights: AmbientInsight[]): AmbientInsight[] {
    // Sort strictly by contextual score
    const sorted = [...insights].sort((a, b) => b.score - a.score);

    const selected: AmbientInsight[] = [];
    const usedModules = new Set<BriefModule>();

    for (const item of sorted) {
        if (!usedModules.has(item.module)) {
            usedModules.add(item.module);
            selected.push(item);
        }
        if (selected.length >= 3) break;
    }

    return selected;
}

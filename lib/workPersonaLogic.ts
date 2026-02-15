export type PersonaTone = "positive" | "neutral" | "negative";

export interface WorkMetrics {
    tasksCompleted: number;
    tasksOpened: number;
    tasksOverdue: number;
    tasksRescheduled: number;
    activeTasks: number;
    criticalTasksOpen: number;
    timeLoggedHours: number;
    projectSwitchCount: number;
    daysEvaluated: number;
    previousPeriodTasksCompleted: number;
}

export type PersonaType =
    | "momentum"
    | "fighter"
    | "stabilizer"
    | "rebuilder"
    | "navigator"
    | "drifter"
    | "stalled"
    | "avoider";

export interface Persona {
    type: PersonaType;
    title: string;
    description: string;
    tone: PersonaTone;
    ctaTitle: string;
    icon: string; // SF equivalent or Lucide icon name
}

export const PERSONAS: Record<PersonaType, Persona> = {
    avoider: {
        type: "avoider",
        title: "Avoider",
        description: "Critical items are piling up. Break the cycle with one small action.",
        tone: "negative",
        ctaTitle: "Face it now",
        icon: "AlertTriangle",
    },
    stalled: {
        type: "stalled",
        title: "Stalled",
        description: "Progress is halted. Let's find what's blocking you today.",
        tone: "negative",
        ctaTitle: "Unblock now",
        icon: "PauseCircle",
    },
    drifter: {
        type: "drifter",
        title: "Drifter",
        description: "Focus is fragmented. Low output today. Re-center your goals.",
        tone: "negative",
        ctaTitle: "Get focused",
        icon: "Wind",
    },
    navigator: {
        type: "navigator",
        title: "Navigator",
        description: "Handling multiple fronts. High coordination required today.",
        tone: "neutral",
        ctaTitle: "Prioritize",
        icon: "Compass",
    },
    fighter: {
        type: "fighter",
        title: "Fighter",
        description: "Pushing through challenges. High effort despite the delays.",
        tone: "neutral",
        ctaTitle: "Stay focused",
        icon: "ShieldAlert",
    },
    momentum: {
        type: "momentum",
        title: "Momentum",
        description: "You're in the zone. Great flow and zero blockers today.",
        tone: "positive",
        ctaTitle: "Keep it up",
        icon: "Zap",
    },
    rebuilder: {
        type: "rebuilder",
        title: "Rebuilder",
        description: "Getting back on track after a break. Solid progress starts here.",
        tone: "positive",
        ctaTitle: "Keep building",
        icon: "Hammer",
    },
    stabilizer: {
        type: "stabilizer",
        title: "Stabilizer",
        description: "Consistent and reliable. Maintaining a steady, productive pace.",
        tone: "neutral",
        ctaTitle: "Maintain flow",
        icon: "Activity",
    },
};

export function resolveWorkPersona(metrics: WorkMetrics, holidayOrLeave: boolean = false): Persona {
    if (holidayOrLeave) return PERSONAS.rebuilder;

    const expectedHours = 8 * metrics.daysEvaluated;
    const timeRatio = metrics.timeLoggedHours / Math.max(expectedHours, 1);

    // 1. Avoider
    if (metrics.criticalTasksOpen >= 1 && metrics.tasksRescheduled >= 2 && metrics.tasksCompleted <= 1) {
        return PERSONAS.avoider;
    }

    // 2. Stalled
    if (metrics.tasksCompleted === 0 && metrics.timeLoggedHours < 3) {
        return PERSONAS.stalled;
    }

    // 3. Drifter
    if (metrics.tasksCompleted === 0 && metrics.timeLoggedHours < 2 && metrics.activeTasks <= 2) {
        return PERSONAS.drifter;
    }

    // 4. Navigator
    if (metrics.activeTasks >= 5 && metrics.tasksCompleted <= 1 && metrics.projectSwitchCount >= 3) {
        return PERSONAS.navigator;
    }

    // 5. Fighter
    if (metrics.tasksCompleted >= 2 && metrics.tasksOverdue >= 1 && timeRatio > 1.2) {
        return PERSONAS.fighter;
    }

    // 6. Momentum
    if (metrics.tasksCompleted >= 3 && metrics.tasksOverdue === 0 && timeRatio >= 0.7 && timeRatio <= 1.2) {
        return PERSONAS.momentum;
    }

    // 7. Rebuilder
    if (metrics.tasksCompleted >= 1 && metrics.previousPeriodTasksCompleted === 0) {
        return PERSONAS.rebuilder;
    }

    // 8. Stabilizer (Fallback)
    return PERSONAS.stabilizer;
}

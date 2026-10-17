export type PersonaTone = "positive" | "neutral" | "negative";

export interface WorkMetrics {
    tasksCompleted: number;
    tasksTotal: number;
    tasksOverdue: number;
    attendanceRate: number; // 0-100
    pulseScore: number; // 0-100
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
    longDescription?: string;
    tone: PersonaTone;
    ctaTitle: string;
    icon: string;
    gradient: string[]; // [from, to] or [from, via, to]
}

export const PERSONAS: Record<PersonaType, Persona> = {
    avoider: {
        type: "avoider",
        title: "The Avoider",
        description: "You’re disengaging. Pause. Reset. Start with one small action.",
        longDescription: "You’ve been avoiding tasks and missing project interactions. This state requires immediate intervention to prevent total shutdown. A tiny reset is all you need right now.",
        tone: "negative",
        ctaTitle: "Reset now",
        icon: "AlertTriangle",
        gradient: ["#0F0F10", "#B00020"], // Black to Crimson
    },
    stalled: {
        type: "stalled",
        title: "The Stalled",
        description: "You’re facing resistance. Identify the bottleneck and reclaim control.",
        longDescription: "Energy is low and progress is slow, likely due to external blocks or internal burnout. The system is stuck but recoverable—find the bottleneck.",
        tone: "negative",
        ctaTitle: "Unblock now",
        icon: "PauseCircle",
        gradient: ["#3A3A3C", "#FF3B30"], // Red-Gray Alert
    },
    drifter: {
        type: "drifter",
        title: "The Drifter",
        description: "Your focus is slipping slightly. A small reset can bring you back on track.",
        longDescription: "Task delays are increasing and distraction is high. You haven't reached a crisis yet, but your direction is fragmenting. It's time to re-center.",
        tone: "negative",
        ctaTitle: "Re-center",
        icon: "Wind",
        gradient: ["#5E5E5E", "#FF9F0A"], // Warning Orange-Gray
    },
    navigator: {
        type: "navigator",
        title: "The Navigator",
        description: "You’re in balance. This is your stable baseline — ready to rise.",
        longDescription: "Everything is moving at a normal operational pace. You are neither at a peak nor a drop. This is your healthy, balanced default zone.",
        tone: "neutral",
        ctaTitle: "Keep steady",
        icon: "Compass",
        gradient: ["#FF9500", "#FFCC00"], // Orange (Neutral Zone)
    },
    rebuilder: {
        type: "rebuilder",
        title: "The Rebuilder",
        description: "You’re rebuilding momentum. Small steps now are shaping stronger outcomes.",
        longDescription: "You're emerging from a high-pressure zone and finding your rhythm again. Progress is careful but solid. A healthy recovery phase.",
        tone: "positive",
        ctaTitle: "Keep building",
        icon: "Hammer",
        gradient: ["#30D158", "#34C759"], // Growth Green
    },
    fighter: {
        type: "fighter",
        title: "The Fighter",
        description: "You push through pressure. Deadlines don’t stop you — they sharpen you.",
        longDescription: "High pressure, many deadlines, and heavy coordination. You're moving fast because you have to. This is productive survival mode.",
        tone: "neutral",
        ctaTitle: "Stay sharp",
        icon: "ShieldAlert",
        gradient: ["#64D2FF", "#0A84FF"], // Energetic Bright Blue
    },
    stabilizer: {
        type: "stabilizer",
        title: "The Stabilizer",
        description: "You excel at consistency. Your steady rhythm keeps everything aligned.",
        longDescription: "Consistent, reliable, and consistent over the long term. You've become the backbone of the system right now. Trust through structure.",
        tone: "neutral",
        ctaTitle: "Maintain flow",
        icon: "Activity",
        gradient: ["#0A84FF", "#5AC8FA"], // Solid System Blue
    },
    momentum: {
        type: "momentum",
        title: "The Momentum",
        description: "You’re operating at peak clarity and execution. Everything moves when you move.",
        longDescription: "Flow state. Elite calm mastery. Your execution is lightning fast, your decisions are sharp, and you're finishing tasks before they even land.",
        tone: "positive",
        ctaTitle: "Keep it up",
        icon: "Zap",
        gradient: ["#AF52DE", "#5856D6"], // Purple (Peak Performance)
    },
};

export function resolveWorkPersona(metrics: WorkMetrics, holidayOrLeave: boolean = false): Persona {
    if (holidayOrLeave) return PERSONAS.rebuilder;

    // Default to Navigator if data is incomplete or empty
    if (metrics.daysEvaluated < 2 || metrics.tasksTotal === 0) {
        return PERSONAS.navigator;
    }

    const completionRate = metrics.tasksTotal > 0 ? (metrics.tasksCompleted / metrics.tasksTotal) * 100 : 0;
    const timeRatio = metrics.timeLoggedHours / Math.max(8 * metrics.daysEvaluated, 1);

    // 1. Momentum: Peak state (+4)
    if (completionRate >= 90 && metrics.tasksOverdue === 0 && metrics.pulseScore >= 90) {
        return PERSONAS.momentum;
    }

    // 2. Stabilizer: Consistent (+3)
    if (completionRate >= 70 && metrics.tasksOverdue <= 1 && metrics.attendanceRate >= 90) {
        return PERSONAS.stabilizer;
    }

    // 3. Fighter: High pressure (+2)
    if (timeRatio > 1.1 && metrics.tasksCompleted >= 2 && metrics.tasksOverdue > 0) {
        return PERSONAS.fighter;
    }

    // 4. Rebuilder: Recovery (+1)
    if (metrics.previousPeriodTasksCompleted === 0 && metrics.tasksCompleted >= 1) {
        return PERSONAS.rebuilder;
    }

    // 5. Drifter: Losing focus (-1)
    if (metrics.tasksCompleted <= 1 && metrics.projectSwitchCount >= 4) {
        return PERSONAS.drifter;
    }

    // 6. Stalled: Blocked (-2)
    if (metrics.tasksCompleted === 0 && metrics.timeLoggedHours < 3 && metrics.activeTasks > 0) {
        return PERSONAS.stalled;
    }

    // 7. Avoider: Shutdown (-3)
    if (metrics.criticalTasksOpen >= 2 && metrics.tasksCompleted === 0 && metrics.daysEvaluated >= 3) {
        return PERSONAS.avoider;
    }

    // Default: Navigator (0)
    return PERSONAS.navigator;
}

import { splitWBSNames } from './projectWBSNames';
import { legacyProjectInfo, legacyRABView } from './legacy-rab/project-view';
import { buildWBSTree, WBSNode } from './legacy-rab/wbs-mapper';

export interface ScheduleTask {
    id: string;
    code: string;
    title: string;
    titleEn: string;
    titleId: string;
    level: number;
    isSection: boolean;
    parentId?: string | null;
    weight: number; // percentage, e.g. 12.50
    cost: number;   // Rp
    startDate: string; // YYYY-MM-DD
    finishDate: string; // YYYY-MM-DD
    durationDays: number;
    durationWeeks: number;
    calendar: string;
    hasChildren: boolean;
}

export interface TimelineWeek {
    index: number;
    label: string; // e.g. 'W1'
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    startDisplay: string; // DD/MM
    endDisplay: string; // DD/MM
    monthLabel: string; // e.g. 'OKT'
    monthKey: string; // e.g. '2026-10'
    year: number;
}

export interface TimelineMonth {
    index: number;
    label: string; // e.g. 'OKT 2026'
    shortLabel: string; // e.g. 'OKT'
    monthKey: string;
    startDate: string;
    endDate: string;
    weekCount: number;
}

export interface TimelineData {
    timeScale: 'weekly' | 'monthly';
    weeks: TimelineWeek[];
    months: TimelineMonth[];
    taskProgress: Record<string, number[]>; // taskCode -> progress array per period
    weeklyProgress: number[]; // sum of active leaf weights per period
    cumulativeProgress: number[]; // running sum up to 100%
    totalCost: number;
    totalDurationDays: number;
    totalDurationWeeks: number;
    projectStartDate: string;
    projectFinishDate: string;
}

// -------------------------------------------------------------
// Date Utilities
// -------------------------------------------------------------

const MONTH_NAMES_ID = ['JAN', 'PEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGT', 'SEP', 'OKT', 'NOP', 'DES'];

export function formatISODate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function parseISODate(s: string): Date | null {
    if (!s || typeof s !== 'string') return null;
    const parts = s.split('-');
    if (parts.length !== 3) return null;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    return new Date(y, m, d);
}

export function addDaysToDate(d: Date, days: number): Date {
    const next = new Date(d.getTime());
    next.setDate(next.getDate() + days);
    return next;
}

export function diffDays(start: string, finish: string): number {
    const d1 = parseISODate(start);
    const d2 = parseISODate(finish);
    if (!d1 || !d2) return 0;
    const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff + 1 : 0;
}

export function calculateFinishDate(start: string, durationDays: number): string {
    const d = parseISODate(start);
    if (!d || durationDays <= 0) return start;
    const finish = addDaysToDate(d, durationDays - 1);
    return formatISODate(finish);
}

export function formatDisplayDate(iso: string): string {
    if (!iso) return '—';
    const d = parseISODate(iso);
    if (!d) return iso;
    const day = String(d.getDate()).padStart(2, '0');
    const month = MONTH_NAMES_ID[d.getMonth()] || '';
    return `${day} ${month}`;
}

export function formatShortDate(iso: string): string {
    if (!iso) return '—';
    const d = parseISODate(iso);
    if (!d) return iso;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
}

// -------------------------------------------------------------
// Building Schedule Tasks from WBS & RAB
// -------------------------------------------------------------

export function buildScheduleTasks(
    project: any,
    wbsRows: any[],
    scheduleValues: Record<string, any> = {}
): { tasks: ScheduleTask[]; totalCost: number } {
    // 1. Get RAB breakdown and subtotal
    const rabInfo = legacyProjectInfo(project, wbsRows, 'DETAIL');
    const rabResult = legacyRABView(rabInfo, 'all');
    const totalCost = rabResult.subtotal || 0;

    // Map rab prices by code
    const rabPriceMap = new Map<string, { cost: number; weight: number }>();
    rabResult.rows.forEach(r => {
        const cost = (Number(r.volume) || 0) * (Number(r.unitPrice) || 0);
        rabPriceMap.set(r.code || r.wbs_code, {
            cost,
            weight: totalCost > 0 ? (cost / totalCost) * 100 : 0
        });
    });

    // 2. Build WBS tree
    const tree = buildWBSTree(wbsRows.length ? wbsRows : rabResult.rows);

    // 3. Flatten tree with hierarchy and roll up costs & weights
    const flatList: ScheduleTask[] = [];

    function processNode(node: WBSNode, level = 0): { cost: number; weight: number; minStart?: string; maxFinish?: string } {
        const code = node.code || node.wbs_code;
        const id = node.id || code;
        const names = splitWBSNames({ title: node.title || node.nameEn, title_en: node.title_en || node.nameId });
        const hasChildren = Array.isArray(node.children) && node.children.length > 0;
        const isSection = hasChildren || node.is_leaf === false || !code.includes('.');

        let childCost = 0;
        let childWeight = 0;
        let childMinStart: string | undefined;
        let childMaxFinish: string | undefined;

        const childSummaries: { cost: number; weight: number; minStart?: string; maxFinish?: string }[] = [];
        if (hasChildren) {
            for (const child of node.children) {
                const summary = processNode(child, level + 1);
                childSummaries.push(summary);
                childCost += summary.cost;
                childWeight += summary.weight;
                if (summary.minStart && (!childMinStart || summary.minStart < childMinStart)) {
                    childMinStart = summary.minStart;
                }
                if (summary.maxFinish && (!childMaxFinish || summary.maxFinish > childMaxFinish)) {
                    childMaxFinish = summary.maxFinish;
                }
            }
        }

        // Direct rab entry
        const rabEntry = rabPriceMap.get(code);
        const directCost = rabEntry?.cost || 0;
        const nodeCost = isSection ? (childCost > 0 ? childCost : directCost) : directCost;
        const nodeWeight = totalCost > 0 ? (nodeCost / totalCost) * 100 : (isSection ? childWeight : (rabEntry?.weight || 0));

        // Schedule user values or child roll-up
        const saved = scheduleValues[code] || {};
        let startDate = saved.start || saved.startDate || '';
        let finishDate = saved.finish || saved.finishDate || '';
        let durationDays = Number(saved.duration || saved.durationDays) || 0;
        const calendar = saved.calendar || 'Standard (7d)';

        if (isSection && hasChildren) {
            if (childMinStart) startDate = childMinStart;
            if (childMaxFinish) finishDate = childMaxFinish;
            if (startDate && finishDate) durationDays = diffDays(startDate, finishDate);
        } else if (startDate && durationDays > 0 && !finishDate) {
            finishDate = calculateFinishDate(startDate, durationDays);
        } else if (startDate && finishDate && durationDays <= 0) {
            durationDays = diffDays(startDate, finishDate);
        }

        const durationWeeks = durationDays > 0 ? Number((durationDays / 7).toFixed(1)) : 0;

        const task: ScheduleTask = {
            id,
            code,
            title: node.title || names.title || code,
            titleEn: names.title || node.title || code,
            titleId: names.title_en || node.title_en || '',
            level,
            isSection,
            parentId: node.parent_id,
            weight: Number(nodeWeight.toFixed(2)),
            cost: nodeCost,
            startDate,
            finishDate,
            durationDays,
            durationWeeks,
            calendar,
            hasChildren
        };

        flatList.push(task);

        return {
            cost: nodeCost,
            weight: nodeWeight,
            minStart: startDate || childMinStart,
            maxFinish: finishDate || childMaxFinish
        };
    }

    tree.forEach(root => processNode(root, 0));

    // Sort order should match tree appearance (DFS order preserved)
    return { tasks: flatList, totalCost };
}

// -------------------------------------------------------------
// Auto-Schedule Generator (Cascading reasonable dates)
// -------------------------------------------------------------

export function generateCascadingSchedule(
    tasks: ScheduleTask[],
    kickoffDate: string = formatISODate(new Date())
): Record<string, { start: string; finish: string; duration: number; calendar: string }> {
    const result: Record<string, { start: string; finish: string; duration: number; calendar: string }> = {};
    let cursor = parseISODate(kickoffDate) || new Date();

    // Loop through leaf tasks and cascade durations
    const leafTasks = tasks.filter(t => !t.isSection);
    leafTasks.forEach((task, index) => {
        // Base duration on weight or default (minimum 7 days, scale up for larger items)
        const days = Math.max(7, Math.min(28, Math.round((task.weight / 100) * 90) || 14));
        const startStr = formatISODate(cursor);
        const finishStr = calculateFinishDate(startStr, days);
        result[task.code] = {
            start: startStr,
            finish: finishStr,
            duration: days,
            calendar: 'Standard (7d)'
        };

        // Advance cursor with partial overlap (e.g. 50% overlap for natural construction flow)
        const advanceDays = Math.max(3, Math.round(days * 0.5));
        cursor = addDaysToDate(cursor, advanceDays);
    });

    return result;
}

// -------------------------------------------------------------
// Timeline & S-Curve Calculation
// -------------------------------------------------------------

export function calculateTimeline(
    tasks: ScheduleTask[],
    timeScale: 'weekly' | 'monthly' = 'weekly',
    totalCost: number = 0
): TimelineData {
    // 1. Find overall project boundaries
    const scheduled = tasks.filter(t => t.startDate && t.finishDate && t.durationDays > 0);
    let minStart = scheduled.length > 0
        ? scheduled.reduce((min, t) => (!min || t.startDate < min ? t.startDate : min), '')
        : formatISODate(new Date());
    let maxFinish = scheduled.length > 0
        ? scheduled.reduce((max, t) => (!max || t.finishDate > max ? t.finishDate : max), '')
        : calculateFinishDate(minStart, 56);

    const startDateObj = parseISODate(minStart) || new Date();
    let finishDateObj = parseISODate(maxFinish) || addDaysToDate(startDateObj, 56);

    // Ensure minimum span of 8 weeks (56 days) for timeline display
    if (diffDays(minStart, maxFinish) < 56) {
        finishDateObj = addDaysToDate(startDateObj, 56);
        maxFinish = formatISODate(finishDateObj);
    }

    const totalDays = diffDays(minStart, maxFinish);
    const totalWeeks = Math.ceil(totalDays / 7);

    // 2. Generate weekly slots
    // Align start to the Monday of that week
    const alignedStart = new Date(startDateObj);
    const dayOfWeek = alignedStart.getDay(); // 0 is Sunday, 1 is Monday
    const mondayOffset = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    alignedStart.setDate(alignedStart.getDate() + mondayOffset);

    const weeks: TimelineWeek[] = [];
    let weekCursor = new Date(alignedStart);
    let weekIndex = 1;

    while (weekCursor <= finishDateObj || weeks.length < 8) {
        const wStart = new Date(weekCursor);
        const wEnd = addDaysToDate(wStart, 6);
        const startStr = formatISODate(wStart);
        const endStr = formatISODate(wEnd);
        const monthIndex = wStart.getMonth();
        const monthLabel = MONTH_NAMES_ID[monthIndex];
        const monthKey = `${wStart.getFullYear()}-${String(monthIndex + 1).padStart(2, '0')}`;

        weeks.push({
            index: weekIndex,
            label: `W${weekIndex}`,
            startDate: startStr,
            endDate: endStr,
            startDisplay: formatShortDate(startStr),
            endDisplay: formatShortDate(endStr),
            monthLabel,
            monthKey,
            year: wStart.getFullYear()
        });

        weekCursor = addDaysToDate(weekCursor, 7);
        weekIndex++;
    }

    // 3. Generate monthly groupings
    const monthMap = new Map<string, TimelineMonth>();
    weeks.forEach(w => {
        if (!monthMap.has(w.monthKey)) {
            monthMap.set(w.monthKey, {
                index: monthMap.size + 1,
                label: `${w.monthLabel} ${w.year}`,
                shortLabel: w.monthLabel,
                monthKey: w.monthKey,
                startDate: w.startDate,
                endDate: w.endDate,
                weekCount: 0
            });
        }
        const m = monthMap.get(w.monthKey)!;
        m.weekCount += 1;
        m.endDate = w.endDate;
    });
    const months = Array.from(monthMap.values());

    // 4. Distribute planned progress for each task across periods
    const periods = timeScale === 'weekly' ? weeks : months;
    const taskProgress: Record<string, number[]> = {};
    const periodicProgress: number[] = new Array(periods.length).fill(0);

    const leafTasks = tasks.filter(t => !t.isSection);
    const totalLeafWeight = leafTasks.reduce((sum, t) => sum + (t.weight || 0), 0) || 100;

    // Normalize weights to 100% if sum is close to 100 or non-zero
    const weightFactor = totalLeafWeight > 0 ? 100 / totalLeafWeight : 1;

    leafTasks.forEach(task => {
        const arr = new Array(periods.length).fill(0);
        if (task.startDate && task.finishDate && task.durationDays > 0 && task.weight > 0) {
            const taskStart = task.startDate;
            const taskFinish = task.finishDate;
            const taskDays = task.durationDays;
            const normalizedWeight = task.weight * weightFactor;

            periods.forEach((p, pIdx) => {
                const pStart = p.startDate;
                const pEnd = p.endDate;
                // Calculate overlap between [taskStart, taskFinish] and [pStart, pEnd]
                const oStart = taskStart > pStart ? taskStart : pStart;
                const oEnd = taskFinish < pEnd ? taskFinish : pEnd;
                const overlap = diffDays(oStart, oEnd);

                if (overlap > 0 && oStart <= oEnd) {
                    const fraction = Math.min(1, overlap / taskDays);
                    const weightPortion = Number((normalizedWeight * fraction).toFixed(2));
                    arr[pIdx] = weightPortion;
                    periodicProgress[pIdx] += weightPortion;
                }
            });
        }
        taskProgress[task.code] = arr;
    });

    // Roll up task progress for section tasks
    tasks.filter(t => t.isSection).forEach(section => {
        const arr = new Array(periods.length).fill(0);
        leafTasks
            .filter(leaf => leaf.code === section.code || leaf.code.startsWith(`${section.code}.`))
            .forEach(leaf => {
                const leafArr = taskProgress[leaf.code] || [];
                leafArr.forEach((val, idx) => {
                    arr[idx] = Number((arr[idx] + val).toFixed(2));
                });
            });
        taskProgress[section.code] = arr;
    });

    // 5. Calculate cumulative progress
    let running = 0;
    const cumulativeProgress = periodicProgress.map((val, idx) => {
        running += val;
        // Cap final at 100.0% if reached or near completion
        const valRounded = Number(running.toFixed(1));
        return Math.min(100, valRounded);
    });

    return {
        timeScale,
        weeks,
        months,
        taskProgress,
        weeklyProgress: periodicProgress.map(v => Number(v.toFixed(1))),
        cumulativeProgress,
        totalCost,
        totalDurationDays: totalDays,
        totalDurationWeeks: totalWeeks,
        projectStartDate: minStart,
        projectFinishDate: maxFinish
    };
}

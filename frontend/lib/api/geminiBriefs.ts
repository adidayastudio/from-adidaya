import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AIBriefs {
    clockBrief: string[];
    financeBrief: string[];
    crewBrief: string[];
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL

export async function getCachedAIBriefs(userId: string): Promise<AIBriefs | null> {
    try {
        const cacheKey = `adidaya:ai_briefs_cache:${userId}`;
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
            const parsed = JSON.parse(cached);
            const age = Date.now() - parsed.timestamp;
            if (age < CACHE_TTL_MS) {
                console.log('[Gemini Briefs] Retrieved briefs from cache (age:', Math.round(age / 1000), 's)');
                return {
                    clockBrief: parsed.clockBrief,
                    financeBrief: parsed.financeBrief,
                    crewBrief: parsed.crewBrief
                };
            }
        }
    } catch (e) {
        console.error('Failed to read AI briefs cache:', e);
    }
    return null;
}

export async function saveAIBriefsToCache(userId: string, briefs: AIBriefs): Promise<void> {
    try {
        const cacheKey = `adidaya:ai_briefs_cache:${userId}`;
        const data = {
            timestamp: Date.now(),
            ...briefs
        };
        await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
        console.log('[Gemini Briefs] Saved briefs to cache.');
    } catch (e) {
        console.error('Failed to save AI briefs cache:', e);
    }
}

export async function fetchGeminiAIBriefs(params: {
    userId: string;
    currentTime: string;
    timeOfDayContext: string;
    name: string;
    role: string;
    attendanceStatus: string;
    clockInTimeStr: string;
    briefStats: any;
    financeStats: {
        isApprover: boolean;
        pendingCount: number;
        oldestCategory: string;
        oldestPendingDays: number;
        totalAmount: number;
        outlierText: string;
        myActiveCount: number;
        myApprovedCount: number;
        myRevisedCount: number;
        myOldestDays: number;
        myOldestHours: number;
    };
    crewStats: {
        isApprover: boolean;
        crewPresentToday: number;
        activeProjectsCount: number;
        maxProjectName: string;
        maxProjectCount: number;
        leavesTodayCount: number;
        sickTodayCount: number;
        pendingRequestsCount: number;
        crewTotalActive: number;
        myPendingCount: number;
    };
}): Promise<AIBriefs | null> {
    const geminiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
    if (!geminiKey) {
        return null;
    }

    const { userId, currentTime, timeOfDayContext, name, role, attendanceStatus, clockInTimeStr, briefStats, financeStats, crewStats } = params;

    const prompt = `
You are an intelligent operational assistant for Adidaya OS. Your task is to generate three daily briefs (Clock, Finance, Crew) based on the user's role and today's raw data.

User Profile:
- Name: ${name}
- Role: ${role}

Time Context:
- Current Local Time: ${currentTime}
- Time of Day Context: ${timeOfDayContext} (e.g. Morning, Afternoon, Evening, Night)

Clock Status & Stats:
- Clocked-in status: ${attendanceStatus}
- Today's session starts at: ${clockInTimeStr || 'N/A'}
- Today's logged work: ${briefStats.todayHours} hours, ${briefStats.todayMins} minutes
- Weekly stats: ${briefStats.weeklyHours} hours worked, ${briefStats.weeklyOvertime} hours overtime, ${briefStats.weeklyLates} lates. Streak of ${briefStats.streakOnTime} consecutive days on time. Team weekly attendance: ${briefStats.teamWeeklyPct}%
- Monthly completion: ${briefStats.monthlyCompletionPct}%. Remaining hours: ${briefStats.monthlyRemainingHours}h. Attendance rate: ${briefStats.monthlyAttendancePct}% across ${briefStats.monthlyDaysPresent} workdays.
- Leaves: ${briefStats.annualLeaveLeft} days left. Days to next leave: ${briefStats.daysToNextLeave !== null ? briefStats.daysToNextLeave : 'N/A'}

Finance Stats:
- Is approver: ${financeStats.isApprover ? 'Yes' : 'No'}
- Total pending requests (for review): ${financeStats.pendingCount}
- Oldest pending category/days: ${financeStats.oldestCategory || 'N/A'}, ${financeStats.oldestPendingDays || 'N/A'} days
- Total pending amount: IDR ${financeStats.totalAmount}
- High value outlier: ${financeStats.outlierText || 'None'}
- My requests status: ${financeStats.myActiveCount} active requests. Recently approved: ${financeStats.myApprovedCount}. Recently revised: ${financeStats.myRevisedCount}. Oldest waiting: ${financeStats.myOldestDays > 0 ? `${financeStats.myOldestDays} days` : `${financeStats.myOldestHours} hours`}.

Crew Stats:
- Is crew approver: ${crewStats.isApprover ? 'Yes' : 'No'}
- Present today: ${crewStats.crewPresentToday} crew members across ${crewStats.activeProjectsCount} sites
- Max presence project: ${crewStats.maxProjectName} with ${crewStats.maxProjectCount} crew members
- Leaves/Sicks today: ${crewStats.leavesTodayCount} leaves, ${crewStats.sickTodayCount} out sick
- Pending crew requests: ${crewStats.pendingRequestsCount}
- Total active crew: ${crewStats.crewTotalActive}
- My pending requests: ${crewStats.myPendingCount}

Instructions:
1. Generate three briefs: clockBrief, financeBrief, and crewBrief.
2. Return ONLY a valid JSON object matching the following structure (no markdown formatting, no code block backticks, no wrap inside comments):
{
  "clockBrief": [
    "First sentence about clock status or streak.",
    "Second sentence offering encouragement or monthly progress.",
    "Third optional sentence."
  ],
  "financeBrief": [
    "First sentence about pending reviews or personal claim status.",
    "Second sentence summarizing value or outlier alert.",
    "Third optional sentence."
  ],
  "crewBrief": [
    "First sentence about current deployment or personal request count.",
    "Second sentence about project activity or leaves.",
    "Third optional sentence."
  ]
}
3. IMPORTANT: Do NOT include any user names, personal names, or greetings (such as "Hi", "Hello", "Good morning", "Good afternoon", "Adi", "Admin", etc.). Start each brief sentence directly with operational facts or stats (e.g. "You are checked in today starting at 08:00 WIB.", "There are 4 pending requests for your decision.").
4. The sentences must be short, friendly, punchy, conversational, and highly personal.
5. IMPORTANT: Do NOT use technical jargon such as "system status", "metrics indicate", "active deployment", "synchronization", "aging alert", or "query". Use natural, human-friendly terms.
6. All texts must be in English.
7. COLOR HIGHLIGHTING SYNTAX: Wrap important metrics, numbers, or key statuses in these special highlight tags so the app's text parser can colorize them:
   - Use "*g*" on both sides for positive metrics (e.g. "*g*on time*g*", "*g*3-day streak*g*", "*g*approved*g*") to color them green.
   - Use "*r*" on both sides for critical or negative metrics (e.g. "*r*2 lates*r*", "*r*5 pending reviews*r*", "*r*out sick*r*", "*r*revised*r*") to color them red.
   - Use "**" on both sides for neutral bold highlights (e.g. "**42 workers**", "**Precision Gym**", "**IDR 150K**") to color them blue.
   Ensure these tags are applied precisely to important keywords/metrics so they pop!
`;

    try {
        console.log('[Gemini Briefs] Querying Gemini model: gemini-2.5-flash...');
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                { text: prompt }
                            ]
                        }
                    ],
                    generationConfig: {
                        responseMimeType: 'application/json'
                    }
                })
            }
        );

        if (!response.ok) {
            throw new Error(`Gemini status code ${response.status}`);
        }

        const resData = await response.json();
        const outputText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!outputText) {
            throw new Error('Empty Gemini response content');
        }

        const cleanText = outputText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanText);
        
        if (parsed.clockBrief && parsed.financeBrief && parsed.crewBrief) {
            const briefs: AIBriefs = {
                clockBrief: parsed.clockBrief,
                financeBrief: parsed.financeBrief,
                crewBrief: parsed.crewBrief
            };
            await saveAIBriefsToCache(userId, briefs);
            return briefs;
        }
    } catch (e) {
        // Suppress fetch fail logging to reduce console noise
    }
    return null;
}

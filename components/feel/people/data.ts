import { Person } from "./types";

export const PEOPLE_DATA: Person[] = [
    {
        id: "usr_001",
        name: "Manu Stravo",
        email: "manu@adidaya.com",
        role: "admin",
        title: "Principal Architect",
        department: "Management",
        status: "Active",
        joinedAt: "Jan 2020",
        type: "Full Time",
        initials: "MS",
        attendance: {
            attendanceRate: 98,
            totalDays: 240,
            lateDays: 2,
            absentDays: 0,
            overtimeHours: 45
        },
        performance: {
            tasksCompleted: 124,
            avgTaskCompletionTime: "1.2 days",
            performanceScore: 96,
            productivityTrend: "rising",
            activeProjects: 4
        },
        kpi: {
            projectInvolvement: 98,
            presenceScore: 98,
            engagementScore: 95,
            overallScore: 97
        }
    },
    {
        id: "usr_002",
        name: "Sarah Chen",
        email: "sarah@adidaya.com",
        role: "supervisor",
        title: "Project Manager",
        department: "Construction",
        status: "Active",
        joinedAt: "Mar 2021",
        type: "Full Time",
        initials: "SC",
        attendance: {
            attendanceRate: 95,
            totalDays: 220,
            lateDays: 5,
            absentDays: 2,
            overtimeHours: 12
        },
        performance: {
            tasksCompleted: 89,
            avgTaskCompletionTime: "3.5 days",
            performanceScore: 92,
            productivityTrend: "stable",
            activeProjects: 6
        },
        kpi: {
            projectInvolvement: 95,
            presenceScore: 94,
            engagementScore: 88,
            overallScore: 92
        }
    },
    {
        id: "usr_003",
        name: "Budi Santoso",
        email: "budi@adidaya.com",
        role: "staff",
        title: "Senior Drafter",
        department: "Design",
        status: "Active",
        joinedAt: "Jun 2021",
        type: "Contract",
        initials: "BS",
        attendance: {
            attendanceRate: 88,
            totalDays: 200,
            lateDays: 15,
            absentDays: 5,
            overtimeHours: 8
        },
        performance: {
            tasksCompleted: 156,
            avgTaskCompletionTime: "0.8 days",
            performanceScore: 85,
            productivityTrend: "falling",
            activeProjects: 2
        },
        kpi: {
            projectInvolvement: 92,
            presenceScore: 85,
            engagementScore: 75,
            overallScore: 84
        }
    },
    {
        id: "usr_004",
        name: "Anya Geraldine",
        email: "anya@adidaya.com",
        role: "staff",
        title: "Interior Intern",
        department: "Design",
        status: "Probation",
        joinedAt: "Jan 2024",
        type: "Intern",
        initials: "AG",
        attendance: {
            attendanceRate: 92,
            totalDays: 45,
            lateDays: 3,
            absentDays: 0,
            overtimeHours: 20
        },
        performance: {
            tasksCompleted: 34,
            avgTaskCompletionTime: "1.5 days",
            performanceScore: 88,
            productivityTrend: "rising",
            activeProjects: 1
        },
        kpi: {
            projectInvolvement: 65,
            presenceScore: 95,
            engagementScore: 90,
            overallScore: 83
        }
    },
    {
        id: "usr_005",
        name: "Michael Wong",
        email: "mike@adidaya.com",
        role: "staff",
        title: "Site Supervisor",
        department: "Construction",
        status: "On Leave",
        joinedAt: "Sep 2022",
        type: "Full Time",
        initials: "MW",
        attendance: {
            attendanceRate: 75,
            totalDays: 180,
            lateDays: 0,
            absentDays: 25, // On leave
            overtimeHours: 0
        },
        performance: {
            tasksCompleted: 110,
            avgTaskCompletionTime: "2.1 days",
            performanceScore: 90,
            productivityTrend: "stable",
            activeProjects: 3
        },
        kpi: {
            projectInvolvement: 88,
            presenceScore: 70,
            engagementScore: 85,
            overallScore: 81
        }
    }
];

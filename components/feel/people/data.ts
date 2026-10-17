import { Person } from "./types";

export const PEOPLE_DATA: Person[] = [
    {
        id: "usr_001",
        name: "Manu Stravo",
        nickname: "Manu",
        account_type: "human_account",
        id_number: "51122001",
        display_id: "ADY-V-AID-AR-22001",
        email: "manu@adidaya.com",
        role: "admin",
        title: "Principal Architect",
        department: "Management",
        level: "Principal",
        status: "Active",
        joinedAt: "Jan 2020",
        type: "Full Time",
        initials: "MS",

        // Personal Data
        birthday: "1990-05-15",
        nik: "3171000000000001",
        phone: "+62 812 3456 7890",
        address: {
            current: "Jl. Sudirman No. 1, Jakarta Pusat",
            home: "Jl. Damai No. 10, Jakarta Selatan"
        },
        emergency_contact: {
            name: "Jane Doe",
            relationship: "Spouse",
            phone: "+62 812 9876 5432"
        },
        social_links: {
            linkedin: "manustravo",
            instagram: "manustravo.arch",
            twitter: "manustravo"
        },
        bank_info: {
            bank_name: "BCA",
            account_number: "1234567890",
            account_holder: "MANU STRAVO"
        },

        include_in_timesheet: false, // Owner usually excluded
        include_in_performance: false,
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
        account_type: "human_account",
        id_number: "51122002",
        display_id: "ADY-IV-PCC-PM-21045",
        email: "sarah@adidaya.com",
        role: "supervisor",
        title: "Project Manager",
        department: "Construction",
        level: "Lead",
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
        account_type: "human_account",
        id_number: "51122003",
        display_id: "ADY-III-AID-GD-21088",
        email: "budi@adidaya.com",
        role: "staff",
        title: "Senior Drafter",
        department: "Design",
        level: "Senior",
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
        account_type: "human_account",
        id_number: "51122004",
        display_id: "ADY-I-AID-ID-24005",
        email: "anya@adidaya.com",
        role: "staff",
        title: "Interior Intern",
        department: "Design",
        level: "Junior",
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
        account_type: "human_account",
        id_number: "51122005",
        display_id: "ADY-II-PCC-SM-22077",
        email: "mike@adidaya.com",
        role: "staff",
        title: "Site Supervisor",
        department: "Construction",
        level: "Mid",
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
    },
    {
        id: "sys_001",
        name: "Adidaya Admin",
        account_type: "system_account",
        id_number: "00000000",
        display_id: "SYSTEM-ROOT",
        email: "admin@adidaya.com",
        role: "admin",
        title: "System Administrator",
        department: "System",
        status: "Active",
        joinedAt: "Jan 2020",
        type: "Full Time",
        initials: "AA",
        include_in_timesheet: false,
        include_in_attendance: false,
        include_in_performance: false,
        include_in_people_analytics: false,
        attendance: {
            attendanceRate: 0,
            totalDays: 0,
            lateDays: 0,
            absentDays: 0,
            overtimeHours: 0
        },
        performance: {
            tasksCompleted: 0,
            avgTaskCompletionTime: "0 days",
            performanceScore: 0,
            productivityTrend: "stable",
            activeProjects: 0
        },
        kpi: {
            projectInvolvement: 0,
            presenceScore: 0,
            engagementScore: 0,
            overallScore: 0
        }
    }
];

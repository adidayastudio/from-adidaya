import { 
    ReportType, 
    ScheduledActivity, 
    ReportEntry, 
    ReportDocument, 
    ReportPreset,
    ActivityTemplate
} from './types';

export const JCLUB_REPORT_TYPES: ReportType[] = [
    {
        id: 'rep_maintenance',
        name: 'Maintenance',
        shortDescription: 'Periodic maintenance, facility engineering & gym equipment inspections',
        icon: 'wrench.and.screwdriver.fill',
        color: '#10B981',
        colorEnd: '#059669',
        category: 'Facility & Operations',
        codePrefix: 'MNT',
        activeActivitiesCount: 5,
        completionRate: 86,
        periodSummaryText: '12 / 14 activities completed this week',
        latestDocument: {
            title: 'Maintenance Weekly Summary',
            period: '01–07 Sep 2026',
            date: '08 Sep 2026',
        },
        isActive: true,
        activities: [
            {
                id: 'act_meter',
                reportTypeId: 'rep_maintenance',
                name: 'Checklist Meter Listrik & Air',
                description: 'Catatan harian konsumsi utilitas listrik, air utama, dan tangki genset',
                frequency: 'Daily',
                frequencyDetail: 'Every day at 08:00 WIB',
                defaultAssignee: 'Citra Kirana (Building Tech)',
                estimatedDurationMinutes: 15,
                isActive: true,
                fields: [
                    { id: 'f_elec', label: 'Electricity Meter', type: 'unit_value', unit: 'kWh', required: true, defaultValue: '1284.6' },
                    { id: 'f_water', label: 'Water Meter', type: 'unit_value', unit: 'm³', required: true, defaultValue: '382.1' },
                    { id: 'f_gas', label: 'Backup Genset Fuel', type: 'unit_value', unit: 'Liter', required: false, defaultValue: '450' },
                    { id: 'f_cond', label: 'Utility Condition', type: 'condition', required: true, defaultValue: 'Normal', options: ['Normal', 'Needs Attention', 'Critical'] },
                    { id: 'f_photo', label: 'Meter Reading Photo Proof', type: 'photo', required: true },
                    { id: 'f_notes', label: 'Technician Notes & Observations', type: 'notes', required: false },
                ]
            },
            {
                id: 'act_cctv_wifi',
                reportTypeId: 'rep_maintenance',
                name: 'CCTV & WiFi Inspection',
                description: 'Pemeriksaan rutin konektivitas jaringan, kamera pemantau, dan POS link',
                frequency: 'Weekly',
                frequencyDetail: 'Every Monday at 09:00 WIB',
                defaultAssignee: 'Budi Prakoso (IT / Security)',
                estimatedDurationMinutes: 30,
                isActive: true,
                fields: [
                    { id: 'f_cctv_op', label: 'CCTV Cameras Operational (16 Ch)', type: 'checkbox', required: true, defaultValue: true },
                    { id: 'f_rec_op', label: 'NVR Recording Active', type: 'checkbox', required: true, defaultValue: true },
                    { id: 'f_wifi_mem', label: 'Member Free WiFi Speed', type: 'unit_value', unit: 'Mbps', required: true, defaultValue: '95' },
                    { id: 'f_wifi_pos', label: 'POS & Staff Network Online', type: 'checkbox', required: true, defaultValue: true },
                    { id: 'f_cctv_cond', label: 'Network & Security Condition', type: 'condition', required: true, defaultValue: 'Normal', options: ['Normal', 'Needs Attention', 'Critical'] },
                    { id: 'f_cctv_photo', label: 'Rack / Camera Inspection Photo', type: 'photo' },
                    { id: 'f_cctv_notes', label: 'Outage / Incident Notes', type: 'notes' }
                ]
            },
            {
                id: 'act_panel',
                reportTypeId: 'rep_maintenance',
                name: 'Electric Panel Inspection',
                description: 'Cek suhu MCB, kestabilan voltase 3-phase R-S-T, dan kerapian panel',
                frequency: 'Weekly',
                frequencyDetail: 'Every Wednesday at 10:00 WIB',
                defaultAssignee: 'Citra Kirana (Building Tech)',
                estimatedDurationMinutes: 25,
                isActive: true,
                fields: [
                    { id: 'f_volt_r', label: 'Voltage Phase R', type: 'unit_value', unit: 'V', required: true, defaultValue: '224' },
                    { id: 'f_volt_s', label: 'Voltage Phase S', type: 'unit_value', unit: 'V', required: true, defaultValue: '222' },
                    { id: 'f_volt_t', label: 'Voltage Phase T', type: 'unit_value', unit: 'V', required: true, defaultValue: '223' },
                    { id: 'f_temp_mcb', label: 'Main Breaker Temp', type: 'unit_value', unit: '°C', required: true, defaultValue: '36.5' },
                    { id: 'f_ground', label: 'Grounding Resistance Check', type: 'checkbox', required: true, defaultValue: true },
                    { id: 'f_panel_cond', label: 'Distribution Panel Status', type: 'condition', defaultValue: 'Normal', options: ['Normal', 'Needs Attention', 'Critical'] },
                    { id: 'f_panel_photo', label: 'Thermal / Panel Photo', type: 'photo' }
                ]
            },
            {
                id: 'act_water_heater',
                reportTypeId: 'rep_maintenance',
                name: 'Water Heater Inspection',
                description: 'Pemeriksaan suhu dan tekanan tangki air panas kamar mandi locker room',
                frequency: 'Monthly',
                frequencyDetail: '1st of every month at 07:30 WIB',
                defaultAssignee: 'Deni Setiawan (Maintenance Lead)',
                estimatedDurationMinutes: 45,
                isActive: true,
                fields: [
                    { id: 'f_temp', label: 'Hot Water Tank Temp', type: 'unit_value', unit: '°C', required: true, defaultValue: '58.0' },
                    { id: 'f_pressure', label: 'Main Tank Pressure', type: 'unit_value', unit: 'Bar', required: true, defaultValue: '3.2' },
                    { id: 'f_anode', label: 'Magnesium Anode Rod Status', type: 'condition', defaultValue: 'Normal', options: ['Normal', 'Needs Attention', 'Critical'] },
                    { id: 'f_leak', label: 'Pipes & Valves Free from Leakage', type: 'checkbox', defaultValue: true },
                    { id: 'f_heater_photo', label: 'Pressure Gauge Photo', type: 'photo' }
                ]
            },
            {
                id: 'act_fitness_eq',
                reportTypeId: 'rep_maintenance',
                name: 'Fitness Equipment Maintenance',
                description: 'Pelumasan belt treadmill, kabel pulley smith machine, dan mur bangku',
                frequency: 'Biweekly',
                frequencyDetail: 'Every 2 weeks on Friday',
                defaultAssignee: 'Agung Wicaksono (Gym Ops)',
                estimatedDurationMinutes: 90,
                isActive: true,
                fields: [
                    { id: 'f_treadmill', label: 'Treadmills (6 units) Belt Lubricated', type: 'checkbox', defaultValue: true },
                    { id: 'f_pulley', label: 'Cable Pulleys Inspected', type: 'checkbox', defaultValue: true },
                    { id: 'f_benches', label: 'Weight Benches Fasteners Tightened', type: 'checkbox', defaultValue: true },
                    { id: 'f_pin_weight', label: 'Selectorized Weight Pins & Rods', type: 'checkbox', defaultValue: true },
                    { id: 'f_status', label: 'Overall Gym Floor Condition', type: 'condition', defaultValue: 'Normal', options: ['Normal', 'Needs Attention', 'Critical'] },
                    { id: 'f_eq_photo', label: 'Equipment Maintenance Photo', type: 'photo' },
                    { id: 'f_notes', label: 'Part Replacement Log', type: 'notes' }
                ]
            }
        ]
    },
    {
        id: 'rep_cleaning',
        name: 'Cleaning Service',
        shortDescription: 'Recurring sanitation, hygiene checklists, floor care & locker hygiene',
        icon: 'sparkles',
        color: '#0284C7',
        colorEnd: '#0369A1',
        category: 'Housekeeping',
        codePrefix: 'CLN',
        activeActivitiesCount: 6,
        completionRate: 93,
        periodSummaryText: '28 / 30 activities completed today',
        latestDocument: {
            title: 'Cleaning Hygiene Audit',
            period: 'September 2026',
            date: '12 Sep 2026',
        },
        isActive: true,
        activities: [
            {
                id: 'act_open_clean',
                reportTypeId: 'rep_cleaning',
                name: 'Opening Cleaning',
                description: 'Pembersihan resepsionis, pintu masuk kaca, dan penyiapan handuk member',
                frequency: 'Daily',
                frequencyDetail: 'Every day at 05:30 WIB (Before Opening)',
                defaultAssignee: 'Siti Rahma (Housekeeping)',
                estimatedDurationMinutes: 45,
                isActive: true,
                fields: [
                    { id: 'f_glass', label: 'Entrance Glass Doors Cleaned', type: 'checkbox', defaultValue: true },
                    { id: 'f_reception', label: 'Reception Lobby Sanitized', type: 'checkbox', defaultValue: true },
                    { id: 'f_towels', label: 'Clean Towels Stacked', type: 'unit_value', unit: 'pcs', defaultValue: '120' },
                    { id: 'f_trash_open', label: 'Lobby Bins Emptied', type: 'checkbox', defaultValue: true },
                    { id: 'f_open_cond', label: 'Opening Readiness Rating', type: 'condition', defaultValue: 'Normal', options: ['Normal', 'Needs Attention', 'Critical'] },
                    { id: 'f_open_photo', label: 'Lobby Readiness Photo', type: 'photo' }
                ]
            },
            {
                id: 'act_toilet_insp',
                reportTypeId: 'rep_cleaning',
                name: 'Toilet & Shower Inspection',
                description: 'Pemeriksaan kebersihan toilet pria & wanita berkala per 3 jam',
                frequency: 'Daily',
                frequencyDetail: '4 times daily (09:00, 13:00, 17:00, 21:00)',
                defaultAssignee: 'Siti Rahma / Rian',
                estimatedDurationMinutes: 20,
                isActive: true,
                fields: [
                    { id: 'f_soap', label: 'Liquid Soap Refilled', type: 'checkbox', defaultValue: true },
                    { id: 'f_paper', label: 'Tissue & Towel Stock OK', type: 'checkbox', defaultValue: true },
                    { id: 'f_floor', label: 'Floor Dry & Mopped', type: 'checkbox', defaultValue: true },
                    { id: 'f_aroma', label: 'Fragrance Diffuser Active', type: 'checkbox', defaultValue: true },
                    { id: 'f_drain', label: 'Shower Drains Free Flowing', type: 'checkbox', defaultValue: true },
                    { id: 'f_clean_cond', label: 'Cleanliness Rating', type: 'condition', defaultValue: 'Normal', options: ['Normal', 'Needs Attention', 'Critical'] },
                    { id: 'f_photo', label: 'Restroom Audit Photo', type: 'photo' },
                    { id: 'f_notes', label: 'Plumbing / Odor Issue Notes', type: 'notes' }
                ]
            },
            {
                id: 'act_gym_floor',
                reportTypeId: 'rep_cleaning',
                name: 'Gym Floor Cleaning',
                description: 'Pembersihan debu & disinfeksi rubber mat lantai angkat beban',
                frequency: 'Daily',
                frequencyDetail: 'Every day at 14:00 & 22:00 WIB',
                defaultAssignee: 'Rian Pratama',
                estimatedDurationMinutes: 40,
                isActive: true,
                fields: [
                    { id: 'f_mat_mop', label: 'Rubber Flooring Disinfected', type: 'checkbox', defaultValue: true },
                    { id: 'f_chalk', label: 'Chalk & Sweat Residue Scrubbed', type: 'checkbox', defaultValue: true },
                    { id: 'f_trash', label: 'Gym Dustbins Emptied', type: 'checkbox', defaultValue: true },
                    { id: 'f_sanitizer', label: 'Sanitizer Stations Refilled', type: 'unit_value', unit: 'stations', defaultValue: '6' },
                    { id: 'f_floor_cond', label: 'Floor Condition Rating', type: 'condition', defaultValue: 'Normal' }
                ]
            },
            {
                id: 'act_locker_clean',
                reportTypeId: 'rep_cleaning',
                name: 'Locker Room Cleaning',
                description: 'Disinfeksi gagang loker, vanity mirror, dan pengering rambut',
                frequency: 'Daily',
                frequencyDetail: 'Every day at 12:00 & 20:00 WIB',
                defaultAssignee: 'Siti Rahma',
                estimatedDurationMinutes: 30,
                isActive: true,
                fields: [
                    { id: 'f_lockers', label: 'Lockers Wipe Down', type: 'checkbox', defaultValue: true },
                    { id: 'f_mirrors', label: 'Mirrors Streak-Free', type: 'checkbox', defaultValue: true },
                    { id: 'f_dryers', label: 'Hair Dryers Functional', type: 'checkbox', defaultValue: true },
                    { id: 'f_bench_san', label: 'Locker Benches Sanitized', type: 'checkbox', defaultValue: true },
                    { id: 'f_locker_cond', label: 'Locker Cleanliness Rating', type: 'condition', defaultValue: 'Normal' },
                    { id: 'f_locker_photo', label: 'Locker Area Photo', type: 'photo' }
                ]
            },
            {
                id: 'act_equip_wipe',
                reportTypeId: 'rep_cleaning',
                name: 'Equipment Wipe Down',
                description: 'Pembersihan sanitizer pada pegangan dumbbell, kettlebell & mesin cardio',
                frequency: 'Daily',
                frequencyDetail: 'Every day at 11:00 & 16:00 WIB',
                defaultAssignee: 'Rian Pratama',
                estimatedDurationMinutes: 35,
                isActive: true,
                fields: [
                    { id: 'f_dumbbells', label: 'Free Weights Sanitized', type: 'checkbox', defaultValue: true },
                    { id: 'f_cardio_scr', label: 'Cardio Touchscreens Cleaned', type: 'checkbox', defaultValue: true },
                    { id: 'f_bench_vinyl', label: 'Vinyl Pads Sweat Wiped', type: 'checkbox', defaultValue: true },
                    { id: 'f_spray_stock', label: 'Disinfectant Spray Stock', type: 'unit_value', unit: 'bottles', defaultValue: '8' }
                ]
            },
            {
                id: 'act_deep_carpet',
                reportTypeId: 'rep_cleaning',
                name: 'Deep Carpet & AC Filter Cleaning',
                description: 'Pembersihan mendalam karpet studio aerobik dan filter split AC',
                frequency: 'Monthly',
                frequencyDetail: 'Last Sunday of each month',
                defaultAssignee: 'Specialized Cleaning Vendor',
                estimatedDurationMinutes: 180,
                isActive: true,
                fields: [
                    { id: 'f_carpet_shamp', label: 'Carpet Shampoo Completed', type: 'checkbox', defaultValue: true },
                    { id: 'f_ac_wash', label: 'AC Filters Washed', type: 'checkbox', defaultValue: true },
                    { id: 'f_odor_san', label: 'Odor Neutralizer Applied', type: 'checkbox', defaultValue: true },
                    { id: 'f_deep_photo', label: 'Inspection Photo Proof', type: 'photo' },
                    { id: 'f_vendor_sign', label: 'Vendor Supervisor Signoff', type: 'notes' }
                ]
            }
        ]
    },
    {
        id: 'rep_energy',
        name: 'Energy & Utilities',
        shortDescription: 'Substation, backup genset runtime, chiller pressure & water pumps',
        icon: 'bolt.fill',
        color: '#14B8A6',
        colorEnd: '#0D9488',
        category: 'Facility & Operations',
        codePrefix: 'NRG',
        activeActivitiesCount: 2,
        completionRate: 100,
        periodSummaryText: 'All utility meters recorded',
        latestDocument: {
            title: 'Monthly Energy Audit',
            period: 'August 2026',
            date: '01 Sep 2026',
        },
        isActive: true,
        activities: [
            {
                id: 'act_genset_test',
                reportTypeId: 'rep_energy',
                name: 'Genset Load Testing',
                description: 'Simulasi pemutusan arus PLN dan uji beban genset 250 kVA',
                frequency: 'Monthly',
                frequencyDetail: 'Every 1st Saturday at 06:00 WIB',
                defaultAssignee: 'Citra Kirana',
                estimatedDurationMinutes: 45,
                isActive: true,
                fields: [
                    { id: 'f_gen_volt', label: 'Output Voltage (L-L)', type: 'unit_value', unit: 'V', required: true, defaultValue: '380' },
                    { id: 'f_gen_hz', label: 'Frequency', type: 'unit_value', unit: 'Hz', required: true, defaultValue: '50.1' },
                    { id: 'f_gen_fuel', label: 'Diesel Fuel Level', type: 'unit_value', unit: '%', required: true, defaultValue: '88' },
                    { id: 'f_gen_cond', label: 'Genset Status', type: 'condition', defaultValue: 'Normal' },
                ]
            }
        ]
    },
    {
        id: 'rep_sanitation',
        name: 'Deep Sanitation',
        shortDescription: 'Locker sanitation, sauna hygiene, water dispenser chemical test',
        icon: 'bubbles.and.sparkles.fill',
        color: '#06B6D4',
        colorEnd: '#0891B2',
        category: 'Housekeeping',
        codePrefix: 'SAN',
        activeActivitiesCount: 2,
        completionRate: 90,
        periodSummaryText: 'Weekly sterilization logged',
        latestDocument: {
            title: 'Hygiene & Water Test Report',
            period: 'Week 36, 2026',
            date: '09 Sep 2026',
        },
        isActive: true,
        activities: [
            {
                id: 'act_dispenser_san',
                reportTypeId: 'rep_sanitation',
                name: 'Water Dispenser Sterilization',
                description: 'Pembersihan nozzle dan penggantian filter RO air minum member',
                frequency: 'Biweekly',
                frequencyDetail: 'Every 2 weeks on Tuesday',
                defaultAssignee: 'Siti Rahma',
                estimatedDurationMinutes: 30,
                isActive: true,
                fields: [
                    { id: 'f_nozzle_clean', label: 'Nozzles Sterilized with Food Grade Alcohol', type: 'checkbox', defaultValue: true },
                    { id: 'f_tds_val', label: 'TDS Water Quality Reading', type: 'unit_value', unit: 'ppm', defaultValue: '12' },
                    { id: 'f_san_cond', label: 'Sanitation Status', type: 'condition', defaultValue: 'Normal' },
                ]
            }
        ]
    },
    {
        id: 'rep_hse_audit',
        name: 'Safety & Fire Drill',
        shortDescription: 'Fire extinguisher pressure, emergency exit path, first aid kit stock',
        icon: 'shield.checkerboard',
        color: '#F59E0B',
        colorEnd: '#D97706',
        category: 'HSE & Safety',
        codePrefix: 'HSE',
        activeActivitiesCount: 2,
        completionRate: 95,
        periodSummaryText: 'Safety checklist up to date',
        latestDocument: {
            title: 'Q3 Fire Safety Audit',
            period: 'Q3 2026',
            date: '15 Sep 2026',
        },
        isActive: true,
        activities: [
            {
                id: 'act_apar_check',
                reportTypeId: 'rep_hse_audit',
                name: 'APAR & Fire Hose Inspection',
                description: 'Cek jarum tekanan APAR powder/CO2 di seluruh lantai dan hydrant',
                frequency: 'Monthly',
                frequencyDetail: 'Every 15th of the month',
                defaultAssignee: 'HSE Officer',
                estimatedDurationMinutes: 40,
                isActive: true,
                fields: [
                    { id: 'f_apar_count', label: 'APAR Units Checked (12 units)', type: 'checkbox', defaultValue: true },
                    { id: 'f_pressure_ok', label: 'All Pressure Gauges in Green Zone', type: 'checkbox', defaultValue: true },
                    { id: 'f_exit_clear', label: 'Emergency Exit Doors Unblocked', type: 'checkbox', defaultValue: true },
                    { id: 'f_hse_photo', label: 'APAR Tag & Seal Photo', type: 'photo' },
                ]
            }
        ]
    },
    {
        id: 'rep_manager_log',
        name: 'Daily Manager Log',
        shortDescription: 'Operational headcount, incident escalation, VIP visits and handover',
        icon: 'doc.text.fill',
        color: '#6366F1',
        colorEnd: '#4F46E5',
        category: 'General',
        codePrefix: 'LOG',
        activeActivitiesCount: 2,
        completionRate: 88,
        periodSummaryText: 'Shift handovers completed',
        latestDocument: {
            title: 'Daily Operational Log',
            period: '18 Sep 2026',
            date: '18 Sep 2026',
        },
        isActive: true,
        activities: [
            {
                id: 'act_manager_walk',
                reportTypeId: 'rep_manager_log',
                name: 'Duty Manager Floor Walk',
                description: 'Inspeksi menyeluruh fasilitas saat pergantian shift sore/malam',
                frequency: 'Daily',
                frequencyDetail: 'Every day at 17:00 WIB',
                defaultAssignee: 'Duty Manager',
                estimatedDurationMinutes: 30,
                isActive: true,
                fields: [
                    { id: 'f_staff_count', label: 'Duty Staff Complete', type: 'checkbox', defaultValue: true },
                    { id: 'f_ac_temp', label: 'Gym Floor AC Temp (°C)', type: 'unit_value', unit: '°C', defaultValue: '22' },
                    { id: 'f_incidents', label: 'Any Customer Complaints / Incidents', type: 'condition', defaultValue: 'Normal' },
                ]
            },
            {
                id: 'act_shift_log',
                reportTypeId: 'rep_manager_log',
                name: 'Shift Handover & Incident Log',
                description: 'Ringkasan shift pagi/malam, komplain member, dan catatan penting',
                frequency: 'Daily',
                frequencyDetail: 'Every day at 22:30 WIB',
                defaultAssignee: 'Duty Manager',
                estimatedDurationMinutes: 20,
                isActive: true,
                fields: [
                    { id: 'f_guest_count', label: 'Total Check-ins Today', type: 'unit_value', unit: 'members', defaultValue: '342' },
                    { id: 'f_incident_flag', label: 'Any Accidents / Incidents', type: 'checkbox', defaultValue: false },
                    { id: 'f_mgr_notes', label: 'Manager Handover Notes', type: 'notes' },
                ]
            }
        ]
    }
];

export const MOCK_SCHEDULED_ACTIVITIES: ScheduledActivity[] = [
    {
        id: 'sch_1',
        reportTypeId: 'rep_maintenance',
        reportTypeName: 'Maintenance',
        reportTypeColor: '#14B8A6',
        activityId: 'act_meter',
        activityName: 'Checklist Meter Listrik & Air',
        frequency: 'Daily',
        frequencyDetail: 'Today • 08:00 WIB',
        dueTime: '08:00 AM',
        dueDate: '2026-09-13',
        assigneeName: 'Citra Kirana',
        assigneeRole: 'Building Tech',
        status: 'completed',
        relatedTaskId: 'task_001'
    },
    {
        id: 'sch_2',
        reportTypeId: 'rep_cleaning',
        reportTypeName: 'Cleaning Service',
        reportTypeColor: '#0284C7',
        activityId: 'act_open_clean',
        activityName: 'Opening Cleaning',
        frequency: 'Daily',
        frequencyDetail: 'Today • 05:30 WIB',
        dueTime: '05:30 AM',
        dueDate: '2026-09-13',
        assigneeName: 'Siti Rahma',
        assigneeRole: 'Housekeeping',
        status: 'completed',
        relatedTaskId: 'task_002'
    },
    {
        id: 'sch_3',
        reportTypeId: 'rep_cleaning',
        reportTypeName: 'Cleaning Service',
        reportTypeColor: '#0284C7',
        activityId: 'act_toilet_insp',
        activityName: 'Toilet & Shower Inspection (Afternoon)',
        frequency: 'Daily',
        frequencyDetail: 'Today • 13:00 WIB',
        dueTime: '01:00 PM',
        dueDate: '2026-09-13',
        assigneeName: 'Rian Pratama',
        assigneeRole: 'Housekeeping',
        status: 'due_today',
        relatedTaskId: 'task_003'
    },
    {
        id: 'sch_4',
        reportTypeId: 'rep_maintenance',
        reportTypeName: 'Maintenance',
        reportTypeColor: '#14B8A6',
        activityId: 'act_cctv_wifi',
        activityName: 'CCTV & WiFi Inspection',
        frequency: 'Weekly',
        frequencyDetail: 'Tomorrow • 09:00 WIB',
        dueTime: 'Tomorrow 09:00 AM',
        dueDate: '2026-09-14',
        assigneeName: 'Budi Prakoso',
        assigneeRole: 'IT / Security',
        status: 'pending',
        relatedTaskId: 'task_004'
    },
    {
        id: 'sch_5',
        reportTypeId: 'rep_maintenance',
        reportTypeName: 'Maintenance',
        reportTypeColor: '#14B8A6',
        activityId: 'act_panel',
        activityName: 'Electric Panel Inspection',
        frequency: 'Weekly',
        frequencyDetail: 'Wednesday • 10:00 WIB',
        dueTime: 'Wed 10:00 AM',
        dueDate: '2026-09-16',
        assigneeName: 'Citra Kirana',
        assigneeRole: 'Building Tech',
        status: 'pending',
        relatedTaskId: 'task_005'
    },
    {
        id: 'sch_6',
        reportTypeId: 'rep_maintenance',
        reportTypeName: 'Maintenance',
        reportTypeColor: '#14B8A6',
        activityId: 'act_fitness_eq',
        activityName: 'Fitness Equipment Maintenance',
        frequency: 'Biweekly',
        frequencyDetail: 'Friday • 14:00 WIB',
        dueTime: 'Fri 02:00 PM',
        dueDate: '2026-09-18',
        assigneeName: 'Agung Wicaksono',
        assigneeRole: 'Gym Ops',
        status: 'pending',
        relatedTaskId: 'task_006'
    }
];

export const MOCK_REPORT_ENTRIES: ReportEntry[] = [
    {
        id: 'ent_001',
        reportTypeId: 'rep_maintenance',
        reportTypeName: 'Maintenance',
        activityId: 'act_meter',
        activityName: 'Checklist Meter Listrik & Air',
        submittedAt: '13 Sep 2026 • 10:42 WIB',
        submittedDate: '13 Sep 2026',
        submittedTime: '10:42',
        submittedBy: {
            name: 'Citra Kirana',
            role: 'Building Tech'
        },
        condition: 'Normal',
        values: {
            'Electricity Meter': '1,284.6 kWh',
            'Water Meter': '382.1 m³',
            'Voltage Avg': '220.4 V',
            'Condition': 'Normal'
        },
        photos: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300&q=80'],
        notes: 'Pencatatan meteran stabil, tidak ada lonjakan beban berlebih di area sauna & shower.',
        relatedTaskId: 'task_001'
    },
    {
        id: 'ent_002',
        reportTypeId: 'rep_cleaning',
        reportTypeName: 'Cleaning Service',
        activityId: 'act_open_clean',
        activityName: 'Opening Cleaning',
        submittedAt: '13 Sep 2026 • 06:15 WIB',
        submittedDate: '13 Sep 2026',
        submittedTime: '06:15',
        submittedBy: {
            name: 'Siti Rahma',
            role: 'Housekeeping'
        },
        condition: 'Normal',
        values: {
            'Entrance Glass': 'Cleaned & Polished',
            'Lobby Sanitized': 'Done',
            'Towels Stacked': '120 pcs available'
        },
        notes: 'Persiapan opening jam 06:00 selesai tepat waktu. Handuk bersih siap di rak lobi.',
        relatedTaskId: 'task_002'
    },
    {
        id: 'ent_003',
        reportTypeId: 'rep_maintenance',
        reportTypeName: 'Maintenance',
        activityId: 'act_cctv_wifi',
        activityName: 'CCTV & WiFi Inspection',
        submittedAt: '07 Sep 2026 • 09:30 WIB',
        submittedDate: '07 Sep 2026',
        submittedTime: '09:30',
        submittedBy: {
            name: 'Budi Prakoso',
            role: 'IT / Security'
        },
        condition: 'Needs Attention',
        values: {
            'CCTV Cam #04': 'View slightly tilted (Studio 2)',
            'WiFi Access Point #2': 'Rebooted, ping normal',
            'NVR Storage': '68% Capacity (Healthy)'
        },
        notes: 'Kamera sudut Studio 2 perlu dikencangkan baut dudukannya setelah sesi Pound Fit.',
        relatedTaskId: 'task_004_prev'
    },
    {
        id: 'ent_004',
        reportTypeId: 'rep_maintenance',
        reportTypeName: 'Maintenance',
        activityId: 'act_panel',
        activityName: 'Electric Panel Inspection',
        submittedAt: '03 Sep 2026 • 11:15 WIB',
        submittedDate: '03 Sep 2026',
        submittedTime: '11:15',
        submittedBy: {
            name: 'Citra Kirana',
            role: 'Building Tech'
        },
        condition: 'Normal',
        values: {
            'Phase R': '221 V',
            'Phase S': '219 V',
            'Phase T': '220 V',
            'Max Temp': '34.2 °C'
        },
        notes: 'Suhu MCB utama dalam batas aman, fan panel bekerja normal.'
    }
];

export const MOCK_REPORT_DOCUMENTS: ReportDocument[] = [
    {
        id: 'doc_001',
        reportTypeId: 'rep_maintenance',
        reportTypeName: 'Maintenance',
        title: 'Maintenance Weekly Operational Summary',
        period: '01–07 Sep 2026',
        periodType: 'Weekly',
        status: 'Generated',
        generatedAt: '08 Sep 2026, 08:30 WIB',
        format: 'PDF',
        fileSize: '2.4 MB',
        entriesCount: 14
    },
    {
        id: 'doc_002',
        reportTypeId: 'rep_maintenance',
        reportTypeName: 'Maintenance',
        title: 'Monthly Facility & Equipment Comprehensive Report',
        period: 'August 2026',
        periodType: 'Monthly',
        status: 'Approved',
        generatedAt: '01 Sep 2026, 14:00 WIB',
        approvedBy: 'Alexando (Club General Manager)',
        approvedAt: '02 Sep 2026, 09:15 WIB',
        format: 'PDF',
        fileSize: '5.8 MB',
        entriesCount: 62
    },
    {
        id: 'doc_003',
        reportTypeId: 'rep_cleaning',
        reportTypeName: 'Cleaning Service',
        title: 'Cleaning Service & Hygiene Monthly Audit',
        period: 'August 2026',
        periodType: 'Monthly',
        status: 'Approved',
        generatedAt: '01 Sep 2026, 10:00 WIB',
        approvedBy: 'Alexando (Club General Manager)',
        approvedAt: '01 Sep 2026, 17:30 WIB',
        format: 'PDF',
        fileSize: '4.1 MB',
        entriesCount: 180
    },
    {
        id: 'doc_004',
        reportTypeId: 'rep_maintenance',
        reportTypeName: 'Maintenance',
        title: 'Utility & Power Consumption Analysis Matrix',
        period: 'August 2026',
        periodType: 'Monthly',
        status: 'Generated',
        generatedAt: '01 Sep 2026, 15:45 WIB',
        format: 'Excel',
        fileSize: '840 KB',
        entriesCount: 31
    }
];

export const REPORT_PRESETS_LIBRARY: ReportPreset[] = [
    {
        id: 'preset_maint',
        name: 'Maintenance Plan',
        category: 'Facility & Operations',
        description: 'Comprehensive mechanical, electrical, plumbing & equipment check routines',
        icon: 'wrench.and.screwdriver.fill',
        activitiesCount: 5,
        recommendedFrequency: 'Daily / Weekly / Monthly',
        color: '#14B8A6',
        colorEnd: '#0F766E',
        sampleActivities: ['Utility Meter Readings', 'Electrical Panel Inspection', 'Equipment Lubrication & Tune-up', 'HVAC & Filter Service']
    },
    {
        id: 'preset_cleaning',
        name: 'Cleaning & Hygiene Service',
        category: 'Facility & Operations',
        description: 'Sanitation routines, toilet logs, floor care & periodic deep cleaning protocols',
        icon: 'sparkles',
        activitiesCount: 6,
        recommendedFrequency: 'Multiple Daily / Monthly',
        color: '#0284C7',
        colorEnd: '#0369A1',
        sampleActivities: ['Opening Sanitation', 'Restroom Hygiene Check', 'Floor Disinfection', 'Locker Room Turnaround']
    },
    {
        id: 'preset_security',
        name: 'Security & Facility Patrol',
        category: 'Facility & Operations',
        description: 'Guard patrol checklists, access control audit, fire exit clear verification',
        icon: 'shield.checkerboard',
        activitiesCount: 4,
        recommendedFrequency: 'Hourly / Daily',
        color: '#8B5CF6',
        colorEnd: '#6D28D9',
        sampleActivities: ['Perimeter Patrol', 'Emergency Exit Clearance', 'CCTV & Alarm Validation', 'Visitor Log Reconcile']
    },
    {
        id: 'preset_equipment',
        name: 'Equipment & Asset Inspection',
        category: 'Facility & Operations',
        description: 'High-wear machines calibration, safety stops, and parts lifecycle monitoring',
        icon: 'gearshape.2.fill',
        activitiesCount: 4,
        recommendedFrequency: 'Biweekly / Monthly',
        color: '#F59E0B',
        colorEnd: '#D97706',
        sampleActivities: ['Belt Tension Check', 'Motor Temperature Reading', 'Emergency Brake Test', 'Lubrication Level']
    },
    {
        id: 'preset_gen_ops',
        name: 'Recurring Operations Report',
        category: 'General',
        description: 'Standard periodic operational checklist and team handover notes',
        icon: 'list.clipboard.fill',
        activitiesCount: 3,
        recommendedFrequency: 'Daily Shift Handover',
        color: '#10B981',
        colorEnd: '#059669',
        sampleActivities: ['Shift Handover Checklist', 'Incident & Remark Log', 'Daily Stock Level Check']
    },
    {
        id: 'preset_gen_qc',
        name: 'Quality Control & Safety Inspection',
        category: 'General',
        description: 'Standards verification, health hazard identification and corrective action tracking',
        icon: 'checkmark.seal.fill',
        activitiesCount: 4,
        recommendedFrequency: 'Weekly Audit',
        color: '#EC4899',
        colorEnd: '#BE185D',
        sampleActivities: ['Safety Hazard Audit', 'First Aid Kit Restock', 'PPE Compliance Check', 'Signage Visibility']
    },
    {
        id: 'preset_const_daily',
        name: 'Daily Construction Report',
        category: 'Construction',
        description: 'Daily weather conditions, manpower count, equipment on site, and work progress log',
        icon: 'hammer.fill',
        activitiesCount: 4,
        recommendedFrequency: 'Daily Evening',
        color: '#F97316',
        colorEnd: '#EA580C',
        sampleActivities: ['Weather & Work Condition', 'Manpower Attendance Summary', 'Heavy Equipment Utilization', 'Daily Progress Percentage']
    },
    {
        id: 'preset_const_weekly',
        name: 'Weekly Progress & Variance Report',
        category: 'Construction',
        description: 'S-Curve progress tracking, planned vs actual variance, materials delivery log',
        icon: 'chart.line.uptrend.xyaxis',
        activitiesCount: 3,
        recommendedFrequency: 'Weekly on Friday',
        color: '#3B82F6',
        colorEnd: '#1D4ED8',
        sampleActivities: ['Weekly Progress S-Curve', 'Delay & Risk Assessment', 'Material Receiving Reconcile']
    }
];

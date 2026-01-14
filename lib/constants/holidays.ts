export type HolidayType = "holiday" | "collective_leave";

export interface Holiday {
    date: string; // YYYY-MM-DD
    type: HolidayType;
    nameEn: string;
    nameId: string;
}

export const HOLIDAYS_2026: Holiday[] = [
    { date: "2026-01-01", type: "holiday", nameEn: "New Year’s Day", nameId: "Libur Nasional: Tahun Baru Masehi" },
    { date: "2026-01-16", type: "holiday", nameEn: "Isra and Mi’raj of Prophet Muhammad", nameId: "Libur Nasional: Isra Mi’raj Nabi Muhammad SAW" },
    { date: "2026-02-17", type: "holiday", nameEn: "Chinese New Year 2577", nameId: "Libur Nasional: Tahun Baru Imlek 2577 Kongzili" },
    { date: "2026-02-16", type: "collective_leave", nameEn: "Chinese New Year Collective Leave", nameId: "Cuti Bersama: Tahun Baru Imlek" },
    { date: "2026-03-18", type: "collective_leave", nameEn: "Nyepi Collective Leave", nameId: "Cuti Bersama: Hari Suci Nyepi" },
    { date: "2026-03-19", type: "holiday", nameEn: "Nyepi (Balinese Day of Silence)", nameId: "Libur Nasional: Hari Suci Nyepi" },
    { date: "2026-03-20", type: "collective_leave", nameEn: "Eid al-Fitr Collective Leave", nameId: "Cuti Bersama: Idul Fitri 1447 H" },
    { date: "2026-03-21", type: "holiday", nameEn: "Eid al-Fitr (Day 1)", nameId: "Libur Nasional: Idul Fitri 1447 H" },
    { date: "2026-03-22", type: "holiday", nameEn: "Eid al-Fitr (Day 2)", nameId: "Libur Nasional: Idul Fitri 1447 H" },
    { date: "2026-03-23", type: "collective_leave", nameEn: "Eid al-Fitr Collective Leave", nameId: "Cuti Bersama: Idul Fitri 1447 H" },
    { date: "2026-03-24", type: "collective_leave", nameEn: "Eid al-Fitr Collective Leave", nameId: "Cuti Bersama: Idul Fitri 1447 H" },
    { date: "2026-04-03", type: "holiday", nameEn: "Good Friday", nameId: "Libur Nasional: Wafat Yesus Kristus" },
    { date: "2026-04-05", type: "holiday", nameEn: "Easter Sunday", nameId: "Libur Nasional: Hari Kebangkitan Yesus Kristus (Paskah)" },
    { date: "2026-05-01", type: "holiday", nameEn: "International Labour Day", nameId: "Libur Nasional: Hari Buruh Internasional" },
    { date: "2026-05-14", type: "holiday", nameEn: "Ascension of Jesus Christ", nameId: "Libur Nasional: Kenaikan Yesus Kristus" },
    { date: "2026-05-15", type: "collective_leave", nameEn: "Ascension Day Collective Leave", nameId: "Cuti Bersama: Kenaikan Yesus Kristus" },
    { date: "2026-05-27", type: "holiday", nameEn: "Eid al-Adha 1447 H", nameId: "Libur Nasional: Hari Raya Idul Adha" },
    { date: "2026-05-28", type: "collective_leave", nameEn: "Eid al-Adha Collective Leave", nameId: "Cuti Bersama: Idul Adha 1447 H" },
    { date: "2026-05-31", type: "holiday", nameEn: "Vesak Day 2570 BE", nameId: "Libur Nasional: Hari Raya Waisak" },
    { date: "2026-06-01", type: "holiday", nameEn: "Pancasila Day", nameId: "Libur Nasional: Hari Lahir Pancasila" },
    { date: "2026-06-16", type: "holiday", nameEn: "Islamic New Year 1448 H", nameId: "Libur Nasional: Tahun Baru Islam" },
    { date: "2026-08-17", type: "holiday", nameEn: "Independence Day of Indonesia", nameId: "Libur Nasional: Hari Kemerdekaan RI" },
    { date: "2026-08-25", type: "holiday", nameEn: "Prophet Muhammad’s Birthday", nameId: "Libur Nasional: Maulid Nabi Muhammad SAW" },
    { date: "2026-12-24", type: "collective_leave", nameEn: "Christmas Eve Collective Leave", nameId: "Cuti Bersama: Menjelang Natal" },
    { date: "2026-12-25", type: "holiday", nameEn: "Christmas Day", nameId: "Libur Nasional: Hari Raya Natal" },
];

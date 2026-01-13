export const HOLIDAYS = [
    // 2024 (For historical data if needed)
    "2024-01-01", // New Year
    "2024-02-08", // Isra Miraj
    "2024-02-10", // Chinese New Year
    "2024-03-11", // Nyepi
    "2024-03-29", // Good Friday
    "2024-04-10", // Eid al-Fitr
    "2024-04-11", // Eid al-Fitr
    "2024-05-01", // Labor Day
    "2024-05-09", // Ascension Day
    "2024-05-23", // Waisak
    "2024-06-01", // Pancasila Day
    "2024-06-17", // Eid al-Adha
    "2024-07-07", // Islamic New Year
    "2024-08-17", // Independence Day
    "2024-09-16", // Prophet's Birthday
    "2024-12-25", // Christmas

    // 2025 (Projected)
    "2025-01-01", // New Year
    "2025-01-27", // Isra Miraj
    "2025-01-29", // Chinese New Year
    "2025-03-29", // Nyepi
    "2025-03-31", // Eid al-Fitr (Approx)
    "2025-04-01", // Eid al-Fitr (Approx)
    "2025-04-18", // Good Friday
    "2025-05-01", // Labor Day
    "2025-05-12", // Waisak
    "2025-05-29", // Ascension Day
    "2025-06-01", // Pancasila Day
    "2025-06-07", // Eid al-Adha (Approx)
    "2025-06-27", // Islamic New Year (Approx)
    "2025-08-17", // Independence Day
    "2025-09-05", // Prophet's Birthday (Approx)
    "2025-12-25", // Christmas
];

export function isHoliday(date: string | Date): boolean {
    const d = new Date(date);
    const dateStr = d.toISOString().split("T")[0];
    return HOLIDAYS.includes(dateStr);
}

export function isSunday(date: string | Date): boolean {
    const d = new Date(date);
    return d.getDay() === 0;
}

export function isHolidayOrSunday(date: string | Date): boolean {
    return isSunday(date) || isHoliday(date);
}


export type PurchaseStage = "PLANNED" | "INVOICED" | "RECEIVED";
export type Category = "MATERIAL" | "TOOL" | "SERVICE" | "SUPPORT";

export const CATEGORY_OPTIONS = [
    { value: "MATERIAL", label: "Material" },
    { value: "TOOL", label: "Tool (Alat)" },
    { value: "SERVICE", label: "Service (Jasa)" },
    { value: "SUPPORT", label: "Support (Operasional)" }
];

export const SUBCATEGORY_OPTIONS: Record<Category, { value: string; label: string }[]> = {
    MATERIAL: [
        { value: "STRUCTURAL", label: "Material Struktur" },
        { value: "ARCHITECTURAL", label: "Material Arsitektur" },
        { value: "MEP", label: "Material MEP" }
    ],
    TOOL: [
        { value: "PURCHASE", label: "Alat Beli" },
        { value: "RENTAL", label: "Alat Sewa" }
    ],
    SERVICE: [
        { value: "SURVEY", label: "Jasa Ukur" },
        { value: "INSTALLATION", label: "Jasa Pasang" },
        { value: "LOGISTICS", label: "Pengiriman" }
    ],
    SUPPORT: [
        { value: "PERMIT", label: "Biaya Perizinan" },
        { value: "CONSUMABLES", label: "Konsumsi / ATK" }
    ]
};

export const UNIT_OPTIONS = [
    { value: "pcs", label: "pcs" },
    { value: "unit", label: "unit" },
    { value: "set", label: "set" },
    { value: "ls", label: "ls" },
    { value: "m", label: "m" },
    { value: "m2", label: "m2" },
    { value: "m3", label: "m3" },
    { value: "btg", label: "btg" },
    { value: "zak", label: "zak" },
    { value: "hari", label: "hari" },
    { value: "bulan", label: "bulan" }
];

// -- REIMBURSE MASTER DATA --

export type ReimburseCategory =
    | "TRANSPORTATION"
    | "CONSUMPTION"
    | "ACCOMMODATION"
    | "PURCHASE_PROJECT"
    | "OPERATIONS_PROJECT"
    | "SUPPORT_OFFICE"
    | "COMMUNICATION"
    | "HEALTH_SAFETY"
    | "TRAVEL_DUTY"
    | "EMERGENCY"
    | "OTHER";

export const TRANSPORT_TYPES = [
    { value: "MOTOR", label: "Motor Pribadi" },
    { value: "MOBIL", label: "Mobil Pribadi" },
    { value: "PUBLIC", label: "Public Transport (Bus/Train)" },
    { value: "ONLINE", label: "Online Ride (Gojek/Grab)" }
];

export const TRANSPORT_ROUTES = [
    { value: "OFFICE_PROJECT", label: "Kantor → Proyek" },
    { value: "PROJECT_OFFICE", label: "Proyek → Kantor" },
    { value: "PROJECT_PROJECT", label: "Proyek → Proyek" },
    { value: "OTHER", label: "Lainnya" }
];

export const REIMBURSE_CATEGORY_OPTIONS = [
    { value: "TRANSPORTATION", label: "Transportation (Transportasi)" },
    { value: "CONSUMPTION", label: "Meals & Consumption (Konsumsi)" },
    { value: "ACCOMMODATION", label: "Accommodation (Akomodasi)" },
    { value: "PURCHASE_PROJECT", label: "Project Purchase (Belanja Proyek - Reimbursable)" },
    { value: "OPERATIONS_PROJECT", label: "Project Operations (Operasional Proyek)" },
    { value: "SUPPORT_OFFICE", label: "Office & Work Support (Pendukung Kerja)" },
    { value: "COMMUNICATION", label: "Communication (Komunikasi)" },
    { value: "HEALTH_SAFETY", label: "Health, Safety & Wellbeing (Kesehatan & Keselamatan)" },
    { value: "TRAVEL_DUTY", label: "Travel & Duty Expense (Perjalanan Dinas)" },
    { value: "EMERGENCY", label: "Emergency & Incidental (Darurat & Insidental)" },
    { value: "OTHER", label: "Other / Non-Standard (Lainnya / Non-Standar)" }
];

export const REIMBURSE_SUBCATEGORY_OPTIONS: Record<string, { value: string; label: string }[]> = {
    TRANSPORTATION: [
        { value: "MOTOR_PERSONAL", label: "Motorcycle – Personal (Motor Pribadi)" },
        { value: "CAR_PERSONAL", label: "Car – Personal (Mobil Pribadi)" },
        { value: "FUEL", label: "Fuel (BBM)" },
        { value: "PARKING", label: "Parking (Parkir)" },
        { value: "TOLL", label: "Toll (Tol)" },
        { value: "MOTOR_ONLINE", label: "Motorcycle Ride-Hailing (Ojol Motor)" },
        { value: "CAR_ONLINE", label: "Car Ride-Hailing (Ojol Mobil)" },
        { value: "PUBLIC_TRANSPORT", label: "Public Transportation (Transportasi Umum)" },
        { value: "TAXI", label: "Taxi (Taksi)" },
        { value: "RENTAL", label: "Vehicle Rental (Sewa Kendaraan)" },
        { value: "COURIER", label: "Courier & Delivery (Kurir & Pengiriman)" },
        { value: "LOGISTICS", label: "Project Logistics (Logistik Proyek)" }
    ],
    CONSUMPTION: [
        { value: "MEALS_DAILY", label: "Daily Meals (Makan Harian)" },
        { value: "MEALS_SITE", label: "Site Consumption (Konsumsi Lapangan)" },
        { value: "MEALS_CLIENT", label: "Client Meals (Jamuan Klien)" },
        { value: "SNACKS", label: "Snacks & Beverages (Snack & Minuman)" }
    ],
    ACCOMMODATION: [
        { value: "HOTEL", label: "Hotel (Hotel)" },
        { value: "GUESTHOUSE", label: "Guesthouse / Homestay (Penginapan / Homestay)" },
        { value: "LODGING_TEMP", label: "Temporary Lodging (Akomodasi Sementara)" }
    ],
    PURCHASE_PROJECT: [
        { value: "MATERIAL", label: "Project Materials (Material Proyek)" },
        { value: "TOOLS", label: "Project Tools & Equipment (Alat & Peralatan Proyek)" },
        { value: "SUPPLIES_SMALL", label: "Small Project Supplies (Perlengkapan Proyek Kecil)" }
    ],
    OPERATIONS_PROJECT: [
        { value: "SITE_OPS", label: "Site Operations (Operasional Lapangan)" },
        { value: "UTILITIES", label: "Utilities (Utilitas Proyek)" },
        { value: "ADMIN_PROJECT", label: "Project Administration (Administrasi Proyek)" }
    ],
    SUPPORT_OFFICE: [
        { value: "STATIONERY", label: "Stationery & Supplies (ATK & Perlengkapan Kerja)" },
        { value: "PRINTING", label: "Printing & Copying (Print & Fotokopi)" },
        { value: "ACCESSORIES", label: "Work Accessories (Aksesori Kerja)" }
    ],
    COMMUNICATION: [
        { value: "DATA_PACKAGE", label: "Mobile Data (Paket Data)" },
        { value: "PHONE_CREDIT", label: "Phone Credit (Pulsa)" },
        { value: "COMM_COST", label: "Work Communication Cost (Biaya Komunikasi Kerja)" }
    ],
    HEALTH_SAFETY: [
        { value: "MEDICAL", label: "Medical Expense (Biaya Kesehatan)" },
        { value: "SAFETY_GEAR", label: "Safety Equipment (Perlengkapan Keselamatan)" }
    ],
    TRAVEL_DUTY: [
        { value: "PER_DIEM", label: "Per Diem / Daily Allowance (Uang Harian)" },
        { value: "TRAVEL_PREP", label: "Travel Preparation (Persiapan Perjalanan)" }
    ],
    EMERGENCY: [
        { value: "EMERGENCY_COST", label: "Emergency Expense (Biaya Darurat)" },
        { value: "UNPLANNED_COST", label: "Unplanned Work Expense (Biaya Kerja Tak Terduga)" }
    ],
    OTHER: [
        { value: "MISC", label: "Miscellaneous (Lain-lain)" },
        { value: "NON_PROJECT", label: "Non-Project Related (Non-Proyek)" }
    ]
};

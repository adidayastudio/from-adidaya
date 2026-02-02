
export type PurchaseStage = "PLANNED" | "INVOICED" | "RECEIVED";
export type Category =
    | "MATERIAL"
    | "TOOLS_EQUIPMENT"
    | "SERVICES"
    | "PROJECT_OPERATIONS"
    | "OFFICE_OPERATIONS"
    | "ASSETS_INVENTORY"
    | "FINANCIAL_LEGAL"
    | "SPECIAL";

export const CATEGORY_OPTIONS = [
    { value: "MATERIAL", label: "Material" },
    { value: "TOOLS_EQUIPMENT", label: "Tools & Equipment" },
    { value: "SERVICES", label: "Services" },
    { value: "PROJECT_OPERATIONS", label: "Project Operations" },
    { value: "OFFICE_OPERATIONS", label: "Office / Studio Operations" },
    { value: "ASSETS_INVENTORY", label: "Assets & Inventory" },
    { value: "FINANCIAL_LEGAL", label: "Financial & Legal" },
    { value: "SPECIAL", label: "Special / Non-Standard" }
];

export const SUBCATEGORY_OPTIONS: Record<Category, { value: string; label: string }[]> = {
    MATERIAL: [
        { value: "STRUCTURAL", label: "Structural Material (Material Struktur)" },
        { value: "ARCHITECTURAL", label: "Architectural Material (Material Arsitektur)" },
        { value: "FINISHING", label: "Finishing Material (Material Finishing)" },
        { value: "ROOFING_CLADDING", label: "Roofing & Cladding Material (Material Atap & Penutup)" },
        { value: "MEP", label: "MEP Material (Material MEP)" },
        { value: "INTERIOR", label: "Interior Material (Material Interior)" },
        { value: "LANDSCAPE", label: "Landscape Material (Material Lanskap)" },
        { value: "INFRASTRUCTURE", label: "Infrastructure / Civil Material (Material Infrastruktur / Sipil)" },
        { value: "SPECIAL_CUSTOM", label: "Special / Custom Material (Material Khusus / Custom)" }
    ],
    TOOLS_EQUIPMENT: [
        { value: "HAND_TOOLS", label: "Hand Tools (Alat Kerja Manual)" },
        { value: "POWER_TOOLS", label: "Power Tools (Alat Kerja Listrik)" },
        { value: "HEAVY_EQUIPMENT", label: "Heavy Equipment (Alat Berat)" },
        { value: "PROJECT_EQUIPMENT", label: "Project Equipment (Peralatan Proyek)" },
        { value: "SAFETY_EQUIPMENT", label: "Safety Equipment (Peralatan Keselamatan)" },
        { value: "OFFICE_EQUIPMENT", label: "Office Equipment (Peralatan Kantor)" },
        { value: "IT_EQUIPMENT", label: "IT & Electronic Equipment (Peralatan IT & Elektronik)" }
    ],
    SERVICES: [
        { value: "CONSTRUCTION", label: "Construction Services (Jasa Konstruksi)" },
        { value: "SUBCONTRACTOR", label: "Subcontractor Services (Jasa Subkontraktor)" },
        { value: "PROFESSIONAL", label: "Professional / Consultancy Services (Jasa Profesional / Konsultan)" },
        { value: "FABRICATION", label: "Fabrication Services (Jasa Fabrikasi)" },
        { value: "TRANSPORT_LOGISTICS", label: "Transportation & Logistics Services (Jasa Transportasi & Logistik)" },
        { value: "MAINTENANCE", label: "Maintenance & Repair Services (Jasa Perawatan & Perbaikan)" },
        { value: "CLEANING_SECURITY", label: "Cleaning & Security Services (Jasa Cleaning & Security)" },
        { value: "OTHER_SERVICES", label: "Other Services (Jasa Lainnya)" }
    ],
    PROJECT_OPERATIONS: [
        { value: "SITE_OPS", label: "Site Operations (Operasional Lapangan)" },
        { value: "PROJECT_UTILITIES", label: "Project Utilities (Utilitas Proyek)" },
        { value: "CONSUMPTION_ACCOMMODATION", label: "Consumption & Accommodation (Konsumsi & Akomodasi)" },
        { value: "PROJECT_TRANSPORT", label: "Project Transportation (Transportasi Proyek)" },
        { value: "HSE", label: "Health & Safety / HSE (Kesehatan & Keselamatan Kerja)" },
        { value: "PROJECT_ADMIN", label: "Project Administration (Administrasi Proyek)" },
        { value: "RENTAL_FACILITIES", label: "Rental & Site Facilities (Sewa & Fasilitas Proyek)" }
    ],
    OFFICE_OPERATIONS: [
        { value: "OFFICE_OPS", label: "Office Operations (Operasional Kantor)" },
        { value: "OFFICE_UTILITIES", label: "Office Utilities (Utilitas Kantor)" },
        { value: "HR", label: "Human Resources (Sumber Daya Manusia)" },
        { value: "IT_SOFTWARE", label: "IT & Software (IT & Perangkat Lunak)" },
        { value: "MARKETING", label: "Marketing & Branding (Pemasaran & Branding)" },
        { value: "GENERAL_ADMIN", label: "General Administration (Administrasi Umum)" }
    ],
    ASSETS_INVENTORY: [
        { value: "PROJECT_ASSETS", label: "Project Assets (Aset Proyek)" },
        { value: "OFFICE_ASSETS", label: "Office Assets (Aset Kantor)" },
        { value: "PROJECT_INVENTORY", label: "Project Inventory (Inventaris Proyek)" },
        { value: "OFFICE_INVENTORY", label: "Office Inventory (Inventaris Kantor)" }
    ],
    FINANCIAL_LEGAL: [
        { value: "TAXES", label: "Taxes (Pajak)" },
        { value: "LICENSING_LEGAL", label: "Licensing & Legal (Perizinan & Legal)" },
        { value: "BANKING_FEES", label: "Banking & Transaction Fees (Perbankan & Biaya Transaksi)" },
        { value: "INSURANCE", label: "Insurance (Asuransi)" },
        { value: "PENALTIES", label: "Penalties & Fines (Denda & Penalti)" }
    ],
    SPECIAL: [
        { value: "TRIAL_SAMPLES", label: "Trial & Samples (Trial & Sampel)" },
        { value: "EMERGENCY", label: "Emergency Purchase (Pembelian Darurat)" },
        { value: "CONTINGENCY", label: "Contingency (Kontinjensi / Cadangan)" },
        { value: "NON_PROJECT", label: "Non-Project / General (Non-Proyek / Umum)" }
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
    { value: "TRANSPORTATION", label: "Transportation" },
    { value: "CONSUMPTION", label: "Meals & Consumption" },
    { value: "ACCOMMODATION", label: "Accommodation" },
    { value: "PURCHASE_PROJECT", label: "Project Purchase" },
    { value: "OPERATIONS_PROJECT", label: "Project Operations" },
    { value: "SUPPORT_OFFICE", label: "Office & Work Support" },
    { value: "COMMUNICATION", label: "Communication" },
    { value: "HEALTH_SAFETY", label: "Health, Safety & Wellbeing" },
    { value: "TRAVEL_DUTY", label: "Travel & Duty Expense" },
    { value: "EMERGENCY", label: "Emergency & Incidental" },
    { value: "OTHER", label: "Other / Non-Standard" }
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

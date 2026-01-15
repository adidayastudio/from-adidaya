
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

export type ReimburseCategory = "TRANSPORTATION" | "MATERIAL" | "TOOLS" | "CONSUMPTION" | "ACCOMMODATION" | "OTHER";

export const REIMBURSE_CATEGORY_OPTIONS = [
    { value: "TRANSPORTATION", label: "Transportation" },
    { value: "MATERIAL", label: "Material" },
    { value: "TOOLS", label: "Tools (Alat Kerja)" },
    { value: "CONSUMPTION", label: "Consumption (Makan/Minum)" },
    { value: "ACCOMMODATION", label: "Accommodation" },
    { value: "OTHER", label: "Other" }
];

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

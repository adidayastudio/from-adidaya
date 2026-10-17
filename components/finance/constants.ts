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
    { value: "OFFICE_OPERATIONS", label: "Office / Studio Ops" },
    { value: "ASSETS_INVENTORY", label: "Assets & Inventory" },
    { value: "FINANCIAL_LEGAL", label: "Financial & Legal" },
    { value: "SPECIAL", label: "Special / Non-Standard" }
];

export const SUBCATEGORY_OPTIONS: Record<Category, { value: string; label: string }[]> = {
    MATERIAL: [
        { value: "STRUCTURAL", label: "Structural Material" },
        { value: "ARCHITECTURAL", label: "Architectural Material" },
        { value: "FINISHING", label: "Finishing Material" },
        { value: "ROOFING_CLADDING", label: "Roofing & Cladding" },
        { value: "MEP", label: "MEP Material" },
        { value: "INTERIOR", label: "Interior Material" },
        { value: "LANDSCAPE", label: "Landscape Material" },
        { value: "INFRASTRUCTURE", label: "Infrastructure / Civil" },
        { value: "SPECIAL_CUSTOM", label: "Special / Custom" }
    ],
    TOOLS_EQUIPMENT: [
        { value: "HAND_TOOLS", label: "Hand Tools" },
        { value: "POWER_TOOLS", label: "Power Tools" },
        { value: "HEAVY_EQUIPMENT", label: "Heavy Equipment" },
        { value: "PROJECT_EQUIPMENT", label: "Project Equipment" },
        { value: "SAFETY_EQUIPMENT", label: "Safety Equipment" },
        { value: "OFFICE_EQUIPMENT", label: "Office Equipment" },
        { value: "IT_EQUIPMENT", label: "IT & Electronic Equipment" }
    ],
    SERVICES: [
        { value: "CONSTRUCTION", label: "Construction Services" },
        { value: "SUBCONTRACTOR", label: "Subcontractor Services" },
        { value: "PROFESSIONAL", label: "Professional / Consultancy" },
        { value: "FABRICATION", label: "Fabrication Services" },
        { value: "TRANSPORT_LOGISTICS", label: "Transportation & Logistics" },
        { value: "MAINTENANCE", label: "Maintenance & Repair" },
        { value: "CLEANING_SECURITY", label: "Cleaning & Security" },
        { value: "OTHER_SERVICES", label: "Other Services" }
    ],
    PROJECT_OPERATIONS: [
        { value: "SITE_OPS", label: "Site Operations" },
        { value: "PROJECT_UTILITIES", label: "Project Utilities" },
        { value: "CONSUMPTION_ACCOMMODATION", label: "Consumption & Accommodation" },
        { value: "PROJECT_TRANSPORT", label: "Project Transportation" },
        { value: "HSE", label: "Health & Safety / HSE" },
        { value: "PROJECT_ADMIN", label: "Project Administration" },
        { value: "RENTAL_FACILITIES", label: "Rental & Site Facilities" }
    ],
    OFFICE_OPERATIONS: [
        { value: "OFFICE_OPS", label: "Office Operations" },
        { value: "OFFICE_UTILITIES", label: "Office Utilities" },
        { value: "HR", label: "Human Resources" },
        { value: "IT_SOFTWARE", label: "IT & Software" },
        { value: "MARKETING", label: "Marketing & Branding" },
        { value: "GENERAL_ADMIN", label: "General Administration" }
    ],
    ASSETS_INVENTORY: [
        { value: "PROJECT_ASSETS", label: "Project Assets" },
        { value: "OFFICE_ASSETS", label: "Office Assets" },
        { value: "PROJECT_INVENTORY", label: "Project Inventory" },
        { value: "OFFICE_INVENTORY", label: "Office Inventory" }
    ],
    FINANCIAL_LEGAL: [
        { value: "TAXES", label: "Taxes" },
        { value: "LICENSING_LEGAL", label: "Licensing & Legal" },
        { value: "BANKING_FEES", label: "Banking & Transaction Fees" },
        { value: "INSURANCE", label: "Insurance" },
        { value: "PENALTIES", label: "Penalties & Fines" }
    ],
    SPECIAL: [
        { value: "TRIAL_SAMPLES", label: "Trial & Samples" },
        { value: "EMERGENCY", label: "Emergency Purchase" },
        { value: "CONTINGENCY", label: "Contingency" },
        { value: "NON_PROJECT", label: "Non-Project / General" }
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
    { value: "kg", label: "kg" },
    { value: "hari", label: "hari" },
    { value: "bulan", label: "bulan" }
];

// -- REIMBURSE MASTER DATA --

export const REIMBURSE_CATEGORY_OPTIONS = [
    { value: "TRANSPORTATION", label: "Transportation" },
    { value: "CONSUMPTION", label: "Meals & Consumption" },
    { value: "ACCOMMODATION", label: "Accommodation" },
    { value: "PURCHASE_PROJECT", label: "Purchase Project" },
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
        { value: "MOTOR_PERSONAL", label: "Motorcycle – Personal" },
        { value: "CAR_PERSONAL", label: "Car – Personal" },
        { value: "FUEL", label: "Fuel" },
        { value: "PARKING", label: "Parking" },
        { value: "TOLL", label: "Toll" },
        { value: "MOTOR_ONLINE", label: "Motorcycle Ride-Hailing" },
        { value: "CAR_ONLINE", label: "Car Ride-Hailing" },
        { value: "PUBLIC_TRANSPORT", label: "Public Transportation" },
        { value: "TAXI", label: "Taxi" },
        { value: "RENTAL", label: "Vehicle Rental" },
        { value: "COURIER", label: "Courier & Delivery" },
        { value: "LOGISTICS", label: "Project Logistics" }
    ],
    CONSUMPTION: [
        { value: "MEALS_DAILY", label: "Daily Meals" },
        { value: "MEALS_SITE", label: "Site Consumption" },
        { value: "MEALS_CLIENT", label: "Client Meals" },
        { value: "SNACKS", label: "Snacks & Beverages" }
    ],
    ACCOMMODATION: [
        { value: "HOTEL", label: "Hotel" },
        { value: "GUESTHOUSE", label: "Guesthouse / Homestay" },
        { value: "LODGING_TEMP", label: "Temporary Lodging" }
    ],
    PURCHASE_PROJECT: [
        { value: "MATERIAL", label: "Project Materials" },
        { value: "TOOLS", label: "Project Tools & Equipment" },
        { value: "SUPPLIES_SMALL", label: "Small Project Supplies" }
    ],
    OPERATIONS_PROJECT: [
        { value: "SITE_OPS", label: "Site Operations" },
        { value: "UTILITIES", label: "Utilities" },
        { value: "ADMIN_PROJECT", label: "Project Administration" }
    ],
    SUPPORT_OFFICE: [
        { value: "STATIONERY", label: "Stationery & Supplies" },
        { value: "PRINTING", label: "Printing & Copying" },
        { value: "ACCESSORIES", label: "Work Accessories" }
    ],
    COMMUNICATION: [
        { value: "DATA_PACKAGE", label: "Mobile Data" },
        { value: "PHONE_CREDIT", label: "Phone Credit" },
        { value: "COMM_COST", label: "Work Communication Cost" }
    ],
    HEALTH_SAFETY: [
        { value: "MEDICAL", label: "Medical Expense" },
        { value: "SAFETY_GEAR", label: "Safety Equipment" }
    ],
    TRAVEL_DUTY: [
        { value: "PER_DIEM", label: "Per Diem / Daily Allowance" },
        { value: "TRAVEL_PREP", label: "Travel Preparation" }
    ],
    EMERGENCY: [
        { value: "EMERGENCY_COST", label: "Emergency Expense" },
        { value: "UNPLANNED_COST", label: "Unplanned Work Expense" }
    ],
    OTHER: [
        { value: "MISC", label: "Miscellaneous" },
        { value: "NON_PROJECT", label: "Non-Project Related" }
    ]
};

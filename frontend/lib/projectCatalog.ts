export interface ProjectCatalogEntry { code: string; name: string; parentCode: string | null; }

// Canonical 00–99 catalog; codes do not replace existing database IDs.
export const PROJECT_CATALOG: readonly ProjectCatalogEntry[] = [
  {
    "code": "00",
    "name": "Kickoff & Administration",
    "parentCode": null
  },
  {
    "code": "01",
    "name": "Client & Brief",
    "parentCode": "00"
  },
  {
    "code": "02",
    "name": "Site Survey",
    "parentCode": "00"
  },
  {
    "code": "03",
    "name": "Feasibility & Scope",
    "parentCode": "00"
  },
  {
    "code": "04",
    "name": "Proposal & Fee",
    "parentCode": "00"
  },
  {
    "code": "05",
    "name": "Contract",
    "parentCode": "00"
  },
  {
    "code": "06",
    "name": "Project Setup",
    "parentCode": "00"
  },
  {
    "code": "07",
    "name": "Team Mobilization",
    "parentCode": "00"
  },
  {
    "code": "08",
    "name": "Kickoff",
    "parentCode": "00"
  },
  {
    "code": "09",
    "name": "Others",
    "parentCode": "00"
  },
  {
    "code": "10",
    "name": "Planning & Design",
    "parentCode": null
  },
  {
    "code": "11",
    "name": "Design Criteria",
    "parentCode": "10"
  },
  {
    "code": "12",
    "name": "Space Planning",
    "parentCode": "10"
  },
  {
    "code": "13",
    "name": "Concept Design",
    "parentCode": "10"
  },
  {
    "code": "14",
    "name": "Moodboard & Materials",
    "parentCode": "10"
  },
  {
    "code": "15",
    "name": "3D Model",
    "parentCode": "10"
  },
  {
    "code": "16",
    "name": "Visualization",
    "parentCode": "10"
  },
  {
    "code": "17",
    "name": "Design Development",
    "parentCode": "10"
  },
  {
    "code": "18",
    "name": "Design Review",
    "parentCode": "10"
  },
  {
    "code": "19",
    "name": "Design Approval",
    "parentCode": "10"
  },
  {
    "code": "20",
    "name": "Engineering",
    "parentCode": null
  },
  {
    "code": "21",
    "name": "Structural Design",
    "parentCode": "20"
  },
  {
    "code": "22",
    "name": "Structural Calculation",
    "parentCode": "20"
  },
  {
    "code": "23",
    "name": "Electrical",
    "parentCode": "20"
  },
  {
    "code": "24",
    "name": "Plumbing",
    "parentCode": "20"
  },
  {
    "code": "25",
    "name": "HVAC",
    "parentCode": "20"
  },
  {
    "code": "26",
    "name": "Fire Protection",
    "parentCode": "20"
  },
  {
    "code": "27",
    "name": "ELV & ICT",
    "parentCode": "20"
  },
  {
    "code": "28",
    "name": "Special Systems",
    "parentCode": "20"
  },
  {
    "code": "29",
    "name": "Engineering Coordination",
    "parentCode": "20"
  },
  {
    "code": "30",
    "name": "Permits",
    "parentCode": null
  },
  {
    "code": "31",
    "name": "Legal & Land",
    "parentCode": "30"
  },
  {
    "code": "32",
    "name": "Zoning",
    "parentCode": "30"
  },
  {
    "code": "33",
    "name": "PBG",
    "parentCode": "30"
  },
  {
    "code": "34",
    "name": "SLF",
    "parentCode": "30"
  },
  {
    "code": "35",
    "name": "Environmental",
    "parentCode": "30"
  },
  {
    "code": "36",
    "name": "Utility Permits",
    "parentCode": "30"
  },
  {
    "code": "37",
    "name": "Authority Correspondence",
    "parentCode": "30"
  },
  {
    "code": "38",
    "name": "Permit Tracking",
    "parentCode": "30"
  },
  {
    "code": "39",
    "name": "Approved Permits",
    "parentCode": "30"
  },
  {
    "code": "40",
    "name": "Technical Documentation",
    "parentCode": null
  },
  {
    "code": "41",
    "name": "Drawing Register",
    "parentCode": "40"
  },
  {
    "code": "42",
    "name": "Architectural Drawings",
    "parentCode": "40"
  },
  {
    "code": "43",
    "name": "Interior Drawings",
    "parentCode": "40"
  },
  {
    "code": "44",
    "name": "Structural Drawings",
    "parentCode": "40"
  },
  {
    "code": "45",
    "name": "MEP Drawings",
    "parentCode": "40"
  },
  {
    "code": "46",
    "name": "Detail Drawings",
    "parentCode": "40"
  },
  {
    "code": "47",
    "name": "Specifications",
    "parentCode": "40"
  },
  {
    "code": "48",
    "name": "Drawing Coordination",
    "parentCode": "40"
  },
  {
    "code": "49",
    "name": "Issued Drawings",
    "parentCode": "40"
  },
  {
    "code": "50",
    "name": "Procurement",
    "parentCode": null
  },
  {
    "code": "51",
    "name": "BOQ & Quantity",
    "parentCode": "50"
  },
  {
    "code": "52",
    "name": "RAB & Budget",
    "parentCode": "50"
  },
  {
    "code": "53",
    "name": "Vendor & Supplier",
    "parentCode": "50"
  },
  {
    "code": "54",
    "name": "RFQ & Quotation",
    "parentCode": "50"
  },
  {
    "code": "55",
    "name": "Bid Comparison",
    "parentCode": "50"
  },
  {
    "code": "56",
    "name": "Purchase Order",
    "parentCode": "50"
  },
  {
    "code": "57",
    "name": "Subcontract Agreement",
    "parentCode": "50"
  },
  {
    "code": "58",
    "name": "Material Submittal",
    "parentCode": "50"
  },
  {
    "code": "59",
    "name": "Delivery & Inventory",
    "parentCode": "50"
  },
  {
    "code": "60",
    "name": "Construction",
    "parentCode": null
  },
  {
    "code": "61",
    "name": "Site Preparation",
    "parentCode": "60"
  },
  {
    "code": "62",
    "name": "Method Statement",
    "parentCode": "60"
  },
  {
    "code": "63",
    "name": "Shop Drawing",
    "parentCode": "60"
  },
  {
    "code": "64",
    "name": "Site Instruction",
    "parentCode": "60"
  },
  {
    "code": "65",
    "name": "RFI & Clarification",
    "parentCode": "60"
  },
  {
    "code": "66",
    "name": "Daily Site Report",
    "parentCode": "60"
  },
  {
    "code": "67",
    "name": "Site Documentation",
    "parentCode": "60"
  },
  {
    "code": "68",
    "name": "Construction Coordination",
    "parentCode": "60"
  },
  {
    "code": "69",
    "name": "Field Changes",
    "parentCode": "60"
  },
  {
    "code": "70",
    "name": "Quality Inspection",
    "parentCode": null
  },
  {
    "code": "71",
    "name": "Quality Plan",
    "parentCode": "70"
  },
  {
    "code": "72",
    "name": "Material Inspection",
    "parentCode": "70"
  },
  {
    "code": "73",
    "name": "Work Inspection",
    "parentCode": "70"
  },
  {
    "code": "74",
    "name": "Testing",
    "parentCode": "70"
  },
  {
    "code": "75",
    "name": "NCR",
    "parentCode": "70"
  },
  {
    "code": "76",
    "name": "Defect List",
    "parentCode": "70"
  },
  {
    "code": "77",
    "name": "Punch List",
    "parentCode": "70"
  },
  {
    "code": "78",
    "name": "Rectification",
    "parentCode": "70"
  },
  {
    "code": "79",
    "name": "Final Inspection",
    "parentCode": "70"
  },
  {
    "code": "80",
    "name": "Tracking & Control",
    "parentCode": null
  },
  {
    "code": "81",
    "name": "Master Schedule",
    "parentCode": "80"
  },
  {
    "code": "82",
    "name": "Progress Tracking",
    "parentCode": "80"
  },
  {
    "code": "83",
    "name": "Financial Tracking",
    "parentCode": "80"
  },
  {
    "code": "84",
    "name": "Manpower & Payroll",
    "parentCode": "80"
  },
  {
    "code": "85",
    "name": "Material Tracking",
    "parentCode": "80"
  },
  {
    "code": "86",
    "name": "Change Order",
    "parentCode": "80"
  },
  {
    "code": "87",
    "name": "Risk & Issue",
    "parentCode": "80"
  },
  {
    "code": "88",
    "name": "Meeting & Decisions",
    "parentCode": "80"
  },
  {
    "code": "89",
    "name": "Reports",
    "parentCode": "80"
  },
  {
    "code": "90",
    "name": "Handover",
    "parentCode": null
  },
  {
    "code": "91",
    "name": "As-Built Drawings",
    "parentCode": "90"
  },
  {
    "code": "92",
    "name": "Testing & Commissioning",
    "parentCode": "90"
  },
  {
    "code": "93",
    "name": "O&M Manuals",
    "parentCode": "90"
  },
  {
    "code": "94",
    "name": "Warranty & Certificates",
    "parentCode": "90"
  },
  {
    "code": "95",
    "name": "Asset Register",
    "parentCode": "90"
  },
  {
    "code": "96",
    "name": "Final Account",
    "parentCode": "90"
  },
  {
    "code": "97",
    "name": "BAST",
    "parentCode": "90"
  },
  {
    "code": "98",
    "name": "Final Documentation",
    "parentCode": "90"
  },
  {
    "code": "99",
    "name": "Project Closeout",
    "parentCode": "90"
  }
];

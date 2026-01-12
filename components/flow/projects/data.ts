/**
 * PROJECTS DATA (SSOT)
 * Re-exports from unified types and provides mock data for development
 */

// Re-export unified types
export type { Project, ProjectType, ProjectStatus, RABClass, Discipline, BuildType } from "@/types/project";
export { getProjectSlug, STAGE_TEMPLATES, getStagesForProjectType } from "@/types/project";

// Stage options for dropdowns (using SSOT)
import { STAGE_TEMPLATES } from "@/types/project";

export const PROJECT_STAGES = STAGE_TEMPLATES["design-build"].map((s) => ({
    label: `${s.displayCode} (${s.name})`,
    value: s.displayCode,
}));

// ============================================
// MOCK DATA (TODO: Replace with DB fetch)
// ============================================

import type { Project } from "@/types/project";

export const INITIAL_PROJECTS: any[] = [
    {
        id: "1",
        projectNumber: "001",
        projectCode: "PRG",
        name: "Precision Gym Jakarta",
        type: "design-build",
        status: "on-track",
        progress: 65,
        address: "Jl. Senopati No. 45, Kebayoran Baru",
        city: "Jakarta Selatan",
        province: "DKI Jakarta",
        mapsLink: "https://maps.google.com/...",
        clientName: "PT Fitness Indo",
        clientContact: "+62 812-3456-7890",
        buildType: "renovation",
        disciplines: ["interior", "mep"],
        landArea: 1500,
        buildingArea: 1200,
        floors: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "2",
        projectNumber: "002",
        projectCode: "JPF",
        name: "Padel Court BSD",
        type: "build-only",
        status: "overloaded",
        progress: 42,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "3",
        projectNumber: "003",
        projectCode: "LAX",
        name: "Villa Lebak Banten",
        type: "design-only",
        status: "at-risk",
        progress: 25,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "4",
        projectNumber: "004",
        projectCode: "CWP",
        name: "Cafe & Co-working Purwokerto",
        type: "design-build",
        status: "completed",
        progress: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "5",
        projectNumber: "005",
        projectCode: "HQ",
        name: "Adidaya Studio HQ",
        type: "design-only",
        status: "delayed",
        progress: 55,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "6",
        projectNumber: "006",
        projectCode: "MBG",
        name: "MBG Kitchen Madiun",
        type: "build-only",
        status: "overloaded",
        progress: 48,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "7",
        projectNumber: "007",
        projectCode: "VLB",
        name: "Villa Lebak Phase 2",
        type: "design-only",
        status: "delayed",
        progress: 35,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "8",
        projectNumber: "008",
        projectCode: "PDS",
        name: "Padel Serpong",
        type: "build-only",
        status: "at-risk",
        progress: 18,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "9",
        projectNumber: "009",
        projectCode: "GNR",
        name: "Gym Nusantara Rooftop",
        type: "design-build",
        status: "on-track",
        progress: 72,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "10",
        projectNumber: "010",
        projectCode: "CFS",
        name: "Coffee Space Salatiga",
        type: "design-only",
        status: "on-track",
        progress: 60,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
];

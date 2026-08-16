"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Search,
  ExternalLink,
  Plus,
  ArrowUpRight,
  Download,
  Trash2,
  BookmarkPlus,
  Lock,
  X,
  Save,
  Check,
  Wrench,
  FolderOpen
} from "lucide-react";
import clsx from "clsx";

// Document Preview Imports
import KickoffDocumentPreview from "@/components/flow/projects/project-detail/tasks/KickoffDocumentPreview";
import DCRDailyConstructionReportPreview from "@/components/flow/projects/project-detail/tasks/DCRDailyConstructionReportPreview";
import CrewDailyLogReportPreview from "@/components/flow/projects/project-detail/tasks/CrewDailyLogReportPreview";
import { CrewAttendanceReportPreview } from "@/components/flow/projects/project-detail/tasks/CrewAttendanceReportPreview";
import { CrewWorkingHoursReportPreview } from "@/components/flow/projects/project-detail/tasks/CrewWorkingHoursReportPreview";
import { defaultKickoffData } from "@/components/flow/projects/project-detail/tasks/defaultKickoffData";
import { KO_SECTIONS } from "@/components/flow/projects/project-detail/setup/stages/data/ko";
import { SD_SECTIONS } from "@/components/flow/projects/project-detail/setup/stages/data/sd";
import { DD_SECTIONS } from "@/components/flow/projects/project-detail/setup/stages/data/dd";
import { ED_SECTIONS } from "@/components/flow/projects/project-detail/setup/stages/data/ed";
import { HO_SECTIONS } from "@/components/flow/projects/project-detail/setup/stages/data/ho";

interface TreeNode {
  id: string;
  code?: string;
  title: string;
  children?: TreeNode[];
  isDocument?: boolean;
  docCodeFull?: string;
}

interface CustomReserveItem {
  id: string;
  code: string;
  title: string;
  parentReserveId: string;
}

interface CustomSubItem {
  id: string;
  code: string;
  title: string;
  parentId: string;
}

const RESERVE_IDS = ["17-19", "26-29", "33-39", "45-49", "53-59", "62-69", "75-79", "87-89"];

const DESIGN_STAGE_MAP: Record<string, { stageKey: "KO" | "SD" | "DD" | "ED" | "HO"; code: string; title: string; sections: { code: string; title: string }[] }> = {
  "10": { stageKey: "KO", code: "10 00 00", title: "Design General", sections: KO_SECTIONS },
  "11": { stageKey: "KO", code: "11 00 00", title: "Kickoff", sections: KO_SECTIONS },
  "12": { stageKey: "SD", code: "12 00 00", title: "Schematic Design", sections: SD_SECTIONS },
  "13": { stageKey: "DD", code: "13 00 00", title: "Design Development", sections: DD_SECTIONS },
  "14": { stageKey: "ED", code: "14 00 00", title: "Engineering Development", sections: ED_SECTIONS },
  "15": { stageKey: "DD", code: "15 00 00", title: "Design Review & Approval", sections: DD_SECTIONS },
  "16": { stageKey: "HO", code: "16 00 00", title: "Design Handover", sections: HO_SECTIONS },
  "17": { stageKey: "KO", code: "17 00 00", title: "Custom Design Document", sections: KO_SECTIONS },
};

const TREE_DATA: TreeNode[] = [
  // 10–19 — Design Documents
  {
    id: "10-19",
    code: "10–19",
    title: "Design Documents",
    children: [
      { id: "10-00-00", code: "10 00 00", title: "Design General", isDocument: true },
      {
        id: "11-00-00",
        code: "11 00 00",
        title: "Kickoff",
        isDocument: true,
        children: [
          {
            id: "11-folder-aug",
            title: "📁 Agustus 2026",
            children: [
              { id: "11-rev-02", code: "Rev 02", title: "17/08/2026 — Final Approved", isDocument: true },
              { id: "11-rev-01", code: "Rev 01", title: "10/08/2026 — Reviewed", isDocument: true },
              { id: "11-rev-00", code: "Rev 00", title: "01/08/2026 — Initial Draft", isDocument: true },
            ],
          },
          {
            id: "11-folder-jul",
            title: "📁 Juli 2026",
            children: [
              { id: "11-rev-jul", code: "Draft", title: "28/07/2026 — Pre-Kickoff Brief", isDocument: true },
            ],
          },
        ],
      },
      {
        id: "12-00-00",
        code: "12 00 00",
        title: "Schematic Design",
        isDocument: true,
        children: [
          {
            id: "12-folder-aug",
            title: "📁 Agustus 2026",
            children: [
              { id: "12-rev-01", code: "Rev 01", title: "15/08/2026 — Preliminary Drawings", isDocument: true },
            ],
          },
        ],
      },
      { id: "13-00-00", code: "13 00 00", title: "Design Development", isDocument: true },
      { id: "14-00-00", code: "14 00 00", title: "Engineering Development", isDocument: true },
      { id: "15-00-00", code: "15 00 00", title: "Design Review & Approval", isDocument: true },
      { id: "16-00-00", code: "16 00 00", title: "Design Handover", isDocument: true },
      { id: "17-19", code: "17–19", title: "Reserve" },
    ],
  },

  // 20–29 — Construction Documents
  {
    id: "20-29",
    code: "20–29",
    title: "Construction Documents",
    children: [
      { id: "20-00-00", code: "20 00 00", title: "Construction General" },
      {
        id: "20-01-00",
        code: "20 01 00",
        title: "Procurement Plan",
        children: [
          { id: "20-01-01", code: "20 01 01", title: "Procurement Schedule" },
          { id: "20-01-02", code: "20 01 02", title: "Material Plan" },
          { id: "20-01-03", code: "20 01 03", title: "Equipment Plan" },
          { id: "20-01-04", code: "20 01 04", title: "Vendor Plan" },
        ],
      },
      {
        id: "21-00-00",
        code: "21 00 00",
        title: "Construction Plan",
        children: [
          { id: "21-01-00", code: "21 01 00", title: "Construction Plan Document" },
          { id: "21-02-00", code: "21 02 00", title: "Method Statement" },
          { id: "21-03-00", code: "21 03 00", title: "Site Logistics Plan" },
          { id: "21-04-00", code: "21 04 00", title: "Manpower Plan" },
          { id: "21-05-00", code: "21 05 00", title: "Equipment Plan" },
          { id: "21-06-00", code: "21 06 00", title: "Material Plan" },
        ],
      },
      {
        id: "22-00-00",
        code: "22 00 00",
        title: "Shop / Working Documents",
        children: [
          { id: "22-01-00", code: "22 01 00", title: "Shop Drawing" },
          { id: "22-02-00", code: "22 02 00", title: "Material Submittal" },
          { id: "22-03-00", code: "22 03 00", title: "Sample / Mockup" },
          { id: "22-04-00", code: "22 04 00", title: "Technical Submission" },
        ],
      },
      {
        id: "23-00-00",
        code: "23 00 00",
        title: "Construction Approval",
        children: [
          { id: "23-01-00", code: "23 01 00", title: "Drawing Approval" },
          { id: "23-02-00", code: "23 02 00", title: "Material Approval" },
          { id: "23-03-00", code: "23 03 00", title: "Method Approval" },
        ],
      },
      {
        id: "24-00-00",
        code: "24 00 00",
        title: "As-Built",
        children: [
          { id: "24-01-00", code: "24 01 00", title: "As-Built Drawing" },
          { id: "24-02-00", code: "24 02 00", title: "As-Built Document" },
        ],
      },
      {
        id: "25-00-00",
        code: "25 00 00",
        title: "Construction Handover",
        children: [
          { id: "25-01-00", code: "25 01 00", title: "Handover Document" },
          { id: "25-02-00", code: "25 02 00", title: "BAST" },
          { id: "25-03-00", code: "25 03 00", title: "Warranty" },
          { id: "25-04-00", code: "25 04 00", title: "O&M Manual" },
        ],
      },
      { id: "26-29", code: "26–29", title: "Reserve" },
    ],
  },

  // 30–39 — Personal Work & Performance
  {
    id: "30-39",
    code: "30–39",
    title: "Personal Work & Performance",
    children: [
      { id: "30-00-00", code: "30 00 00", title: "Personal Work" },
      {
        id: "30-01-00",
        code: "30 01 00",
        title: "Daily Personal",
        children: [
          { id: "30-01-01", code: "30 01 01", title: "Task Activity" },
          { id: "30-01-02", code: "30 01 02", title: "Coordination" },
          { id: "30-01-03", code: "30 01 03", title: "Site Visit" },
          { id: "30-01-04", code: "30 01 04", title: "Purchase / Errand" },
          { id: "30-01-05", code: "30 01 05", title: "Output / File" },
          { id: "30-01-06", code: "30 01 06", title: "Backlog" },
          { id: "30-01-07", code: "30 01 07", title: "Next Plan" },
        ],
      },
      {
        id: "31-00-00",
        code: "31 00 00",
        title: "Weekly Personal",
        children: [
          { id: "31-01-00", code: "31 01 00", title: "Weekly Activity" },
          { id: "31-02-00", code: "31 02 00", title: "Task Completion" },
          { id: "31-03-00", code: "31 03 00", title: "Deliverables" },
          { id: "31-04-00", code: "31 04 00", title: "Issues" },
          { id: "31-05-00", code: "31 05 00", title: "Next Week Plan" },
        ],
      },
      {
        id: "32-00-00",
        code: "32 00 00",
        title: "Personal Performance Summary",
        children: [
          { id: "32-01-00", code: "32 01 00", title: "Monthly Activity" },
          { id: "32-02-00", code: "32 02 00", title: "Productivity" },
          { id: "32-03-00", code: "32 03 00", title: "Project Contribution" },
          { id: "32-04-00", code: "32 04 00", title: "Performance Index" },
        ],
      },
      { id: "33-39", code: "33–39", title: "Reserve" },
    ],
  },

  // 40–49 — WBS & Work Activity
  {
    id: "40-49",
    code: "40–49",
    title: "WBS & Work Activity",
    children: [
      {
        id: "40-00-00",
        code: "40 00 00",
        title: "WBS General",
        children: [
          { id: "40-01-00", code: "40 01 00", title: "WBS Structure" },
          { id: "40-02-00", code: "40 02 00", title: "WBS Item" },
          { id: "40-03-00", code: "40 03 00", title: "Work Package" },
        ],
      },
      {
        id: "41-00-00",
        code: "41 00 00",
        title: "Work Activity",
        children: [
          { id: "41-01-00", code: "41 01 00", title: "Planned Activity" },
          { id: "41-02-00", code: "41 02 00", title: "Daily Activity" },
          { id: "41-03-00", code: "41 03 00", title: "Completed Activity" },
        ],
      },
      {
        id: "42-00-00",
        code: "42 00 00",
        title: "Work Progress",
        children: [
          { id: "42-01-00", code: "42 01 00", title: "Daily Volume" },
          { id: "42-02-00", code: "42 02 00", title: "Cumulative Volume" },
          { id: "42-03-00", code: "42 03 00", title: "Physical Progress" },
          { id: "42-04-00", code: "42 04 00", title: "Progress Weight" },
          { id: "42-05-00", code: "42 05 00", title: "Remaining Work" },
        ],
      },
      {
        id: "43-00-00",
        code: "43 00 00",
        title: "Work Location",
        children: [
          { id: "43-01-00", code: "43 01 00", title: "Building" },
          { id: "43-02-00", code: "43 02 00", title: "Floor" },
          { id: "43-03-00", code: "43 03 00", title: "Zone / Area" },
          { id: "43-04-00", code: "43 04 00", title: "Room" },
        ],
      },
      {
        id: "44-00-00",
        code: "44 00 00",
        title: "Work Dependency",
        children: [
          { id: "44-01-00", code: "44 01 00", title: "Predecessor" },
          { id: "44-02-00", code: "44 02 00", title: "Successor" },
          { id: "44-03-00", code: "44 03 00", title: "Constraint" },
        ],
      },
      { id: "45-49", code: "45–49", title: "Reserve" },
    ],
  },

  // 50–59 — Budget / RAB / Cost
  {
    id: "50-59",
    code: "50–59",
    title: "Budget / RAB / Cost",
    children: [
      {
        id: "50-00-00",
        code: "50 00 00",
        title: "RAB / Budget",
        children: [
          { id: "50-01-00", code: "50 01 00", title: "Budget Summary" },
          { id: "50-02-00", code: "50 02 00", title: "RAB Item" },
          { id: "50-03-00", code: "50 03 00", title: "Cost Code" },
          { id: "50-04-00", code: "50 04 00", title: "Volume" },
          { id: "50-05-00", code: "50 05 00", title: "Unit Rate" },
          { id: "50-06-00", code: "50 06 00", title: "Budget Revision" },
        ],
      },
      {
        id: "51-00-00",
        code: "51 00 00",
        title: "Cost Report — CST",
        children: [
          { id: "51-01-00", code: "51 01 00", title: "Budget" },
          { id: "51-02-00", code: "51 02 00", title: "Commitment" },
          { id: "51-03-00", code: "51 03 00", title: "Actual Cost" },
          { id: "51-04-00", code: "51 04 00", title: "Paid" },
          { id: "51-05-00", code: "51 05 00", title: "Outstanding" },
          { id: "51-06-00", code: "51 06 00", title: "Variance" },
          { id: "51-07-00", code: "51 07 00", title: "Forecast" },
          { id: "51-08-00", code: "51 08 00", title: "Change Impact" },
        ],
      },
      {
        id: "52-00-00",
        code: "52 00 00",
        title: "Cost Analysis",
        children: [
          { id: "52-01-00", code: "52 01 00", title: "Cost by WBS" },
          { id: "52-02-00", code: "52 02 00", title: "Cost by Category" },
          { id: "52-03-00", code: "52 03 00", title: "Cost by Vendor" },
          { id: "52-04-00", code: "52 04 00", title: "Cost Trend" },
        ],
      },
      { id: "53-59", code: "53–59", title: "Reserve" },
    ],
  },

  // 60–69 — Timeline & Schedule
  {
    id: "60-69",
    code: "60–69",
    title: "Timeline & Schedule",
    children: [
      {
        id: "60-00-00",
        code: "60 00 00",
        title: "Project Schedule",
        children: [
          { id: "60-01-00", code: "60 01 00", title: "Baseline Schedule" },
          { id: "60-02-00", code: "60 02 00", title: "Activity Schedule" },
          { id: "60-03-00", code: "60 03 00", title: "Milestone" },
          { id: "60-04-00", code: "60 04 00", title: "Dependency" },
          { id: "60-05-00", code: "60 05 00", title: "Revision / Recovery Schedule" },
        ],
      },
      {
        id: "61-00-00",
        code: "61 00 00",
        title: "Schedule Report — SCH",
        children: [
          { id: "61-01-00", code: "61 01 00", title: "Planned Progress" },
          { id: "61-02-00", code: "61 02 00", title: "Actual Progress" },
          { id: "61-03-00", code: "61 03 00", title: "S-Curve" },
          { id: "61-04-00", code: "61 04 00", title: "Schedule Variance" },
          { id: "61-05-00", code: "61 05 00", title: "Critical Activity" },
          { id: "61-06-00", code: "61 06 00", title: "Delay" },
          { id: "61-07-00", code: "61 07 00", title: "Forecast Completion" },
        ],
      },
      { id: "62-69", code: "62–69", title: "Reserve" },
    ],
  },

  // 70–79 — Project Reports
  {
    id: "70-79",
    code: "70–79",
    title: "Project Reports",
    children: [
      { id: "70-00-00", code: "70 00 00", title: "Project Reports General" },
      {
        id: "71-00-00",
        code: "71 00 00",
        title: "Daily Reports",
        children: [
          { id: "71-01-00", code: "71 01 00", title: "DCR — Daily Construction Report", isDocument: true },
          { id: "71-02-04", code: "71 02–71 04", title: "Reserved for DCR", isDocument: false },
          { id: "71-05-00", code: "71 05 00", title: "DPR — Daily Personal Report", isDocument: true },
        ],
      },
      {
        id: "72-00-00",
        code: "72 00 00",
        title: "Weekly Reports",
        children: [
          { id: "72-01-00", code: "72 01 00", title: "WDR — Weekly Design Report", isDocument: true },
          { id: "72-02-00", code: "72 02 00", title: "WPR — Weekly Personal Report", isDocument: true },
          { id: "72-05-00", code: "72 05 00", title: "WCR — Weekly Construction Report", isDocument: true },
        ],
      },
      {
        id: "73-00-00",
        code: "73 00 00",
        title: "Monthly Reports",
        children: [
          { id: "73-01-00", code: "73 01 00", title: "MDR — Monthly Design Report", isDocument: true },
          { id: "73-02-00", code: "73 02 00", title: "MCR — Monthly Construction Report", isDocument: true },
        ],
      },
      {
        id: "74-00-00",
        code: "74 00 00",
        title: "Project Executive",
        children: [
          { id: "74-01-00", code: "74 01 00", title: "Project Executive Summary" },
          { id: "74-02-00", code: "74 02 00", title: "Project Health" },
          { id: "74-03-00", code: "74 03 00", title: "Monthly Highlights" },
        ],
      },
      { id: "75-79", code: "75–79", title: "Reserve" },
    ],
  },

  // 80–89 — Project Records
  {
    id: "80-89",
    code: "80–89",
    title: "Project Records",
    children: [
      { id: "80-00-00", code: "80 00 00", title: "Project Records General" },
      {
        id: "81-00-00",
        code: "81 00 00",
        title: "SUR — Survey",
        children: [
          { id: "81-01-00", code: "81 01 00", title: "Initial Site Survey" },
          { id: "81-02-00", code: "81 02 00", title: "Existing Condition Survey" },
          { id: "81-03-00", code: "81 03 00", title: "Site Verification" },
          { id: "81-04-00", code: "81 04 00", title: "Measurement Survey" },
        ],
      },
      {
        id: "82-00-00",
        code: "82 00 00",
        title: "MOM — Minutes of Meeting",
        children: [
          { id: "82-01-00", code: "82 01 00", title: "Internal Meeting" },
          { id: "82-02-00", code: "82 02 00", title: "Client Meeting" },
          { id: "82-03-00", code: "82 03 00", title: "Site Meeting" },
          { id: "82-04-00", code: "82 04 00", title: "Consultant / Vendor Meeting" },
        ],
      },
      {
        id: "83-00-00",
        code: "83 00 00",
        title: "CCO — Change Order",
        children: [
          { id: "83-01-00", code: "83 01 00", title: "Change Request" },
          { id: "83-02-00", code: "83 02 00", title: "Change Assessment" },
          { id: "83-03-00", code: "83 03 00", title: "Variation Order" },
          { id: "83-04-00", code: "83 04 00", title: "Approved Change" },
        ],
      },
      {
        id: "84-00-00",
        code: "84 00 00",
        title: "PCH — Punch List",
        children: [
          { id: "84-01-00", code: "84 01 00", title: "Inspection" },
          { id: "84-02-00", code: "84 02 00", title: "Defect / Finding" },
          { id: "84-03-00", code: "84 03 00", title: "Rectification" },
          { id: "84-04-00", code: "84 04 00", title: "Verification" },
          { id: "84-05-00", code: "84 05 00", title: "Closeout" },
        ],
      },
      {
        id: "85-00-00",
        code: "85 00 00",
        title: "COM — Commissioning",
        children: [
          { id: "85-01-00", code: "85 01 00", title: "Pre-Commissioning" },
          { id: "85-02-00", code: "85 02 00", title: "Testing" },
          { id: "85-03-00", code: "85 03 00", title: "Commissioning" },
          { id: "85-04-00", code: "85 04 00", title: "Retest" },
          { id: "85-05-00", code: "85 05 00", title: "Final Acceptance" },
        ],
      },
      {
        id: "86-00-00",
        code: "86 00 00",
        title: "NOT — Notice / Memo",
        children: [
          { id: "86-01-00", code: "86 01 00", title: "Site Notice" },
          { id: "86-02-00", code: "86 02 00", title: "Instruction" },
          { id: "86-03-00", code: "86 03 00", title: "Information" },
          { id: "86-04-00", code: "86 04 00", title: "Internal Memo" },
          { id: "86-05-00", code: "86 05 00", title: "Formal Notification" },
        ],
      },
      { id: "87-89", code: "87–89", title: "Reserve" },
    ],
  },

  // 90–99 — Project Registers
  {
    id: "90-99",
    code: "90–99",
    title: "Project Registers",
    children: [
      { id: "90-00-00", code: "90 00 00", title: "Register General" },
      {
        id: "91-00-00",
        code: "91 00 00",
        title: "DOC — Document Control",
        children: [
          { id: "91-01-00", code: "91 01 00", title: "Document Register" },
          { id: "91-02-00", code: "91 02 00", title: "Drawing Register" },
          { id: "91-03-00", code: "91 03 00", title: "Submittal Register" },
          { id: "91-04-00", code: "91 04 00", title: "Revision Register" },
          { id: "91-05-00", code: "91 05 00", title: "Approval Register" },
          { id: "91-06-00", code: "91 06 00", title: "Transmittal" },
        ],
      },
      {
        id: "92-00-00",
        code: "92 00 00",
        title: "PRC — Procurement",
        children: [
          { id: "92-01-00", code: "92 01 00", title: "Procurement Request" },
          { id: "92-02-00", code: "92 02 00", title: "Purchase Order" },
          { id: "92-03-00", code: "92 03 00", title: "Vendor" },
          { id: "92-04-00", code: "92 04 00", title: "Delivery" },
          { id: "92-05-00", code: "92 05 00", title: "Material Receipt" },
          { id: "92-06-00", code: "92 06 00", title: "Material Issue / Out" },
          { id: "92-07-00", code: "92 07 00", title: "Procurement Status" },
        ],
      },
      {
        id: "93-00-00",
        code: "93 00 00",
        title: "FIN — Project Finance",
        children: [
          { id: "93-01-00", code: "93 01 00", title: "Finance Summary" },
          { id: "93-02-00", code: "93 02 00", title: "Purchase Request" },
          { id: "93-03-00", code: "93 03 00", title: "Payment" },
          { id: "93-04-00", code: "93 04 00", title: "Invoice" },
          { id: "93-05-00", code: "93 05 00", title: "Expense" },
          { id: "93-06-00", code: "93 06 00", title: "Outstanding" },
          { id: "93-07-00", code: "93 07 00", title: "Vendor Payment" },
        ],
      },
      {
        id: "94-00-00",
        code: "94 00 00",
        title: "RSC — Resources",
        children: [
          {
            id: "94-01-00",
            code: "94 01 00",
            title: "Material",
            children: [
              { id: "94-01-01", code: "94 01 01", title: "Material In" },
              { id: "94-01-02", code: "94 01 02", title: "Material Out" },
              { id: "94-01-03", code: "94 01 03", title: "Material Usage" },
              { id: "94-01-04", code: "94 01 04", title: "Stock Balance" },
            ],
          },
          {
            id: "94-02-00",
            code: "94 02 00",
            title: "Equipment",
            children: [
              { id: "94-02-01", code: "94 02 01", title: "Equipment Assignment" },
              { id: "94-02-02", code: "94 02 02", title: "Equipment Usage" },
              { id: "94-02-03", code: "94 02 03", title: "Equipment Condition" },
            ],
          },
          {
            id: "94-03-00",
            code: "94 03 00",
            title: "Asset",
            children: [
              { id: "94-03-01", code: "94 03 01", title: "Asset Assignment" },
              { id: "94-03-02", code: "94 03 02", title: "Asset Location" },
              { id: "94-03-03", code: "94 03 03", title: "Asset Condition" },
            ],
          },
          {
            id: "94-04-00",
            code: "94 04 00",
            title: "Service",
            children: [
              { id: "94-04-01", code: "94 04 01", title: "Service Assignment" },
              { id: "94-04-02", code: "94 04 02", title: "Service Usage" },
            ],
          },
        ],
      },
      {
        id: "95-00-00",
        code: "95 00 00",
        title: "CRW — Crew",
        children: [
          { id: "95-01-00", code: "95 01 00", title: "Crew Directory" },
          { id: "95-10-00", code: "95 10 00", title: "Crew Assignment" },
          {
            id: "95-20-00",
            code: "95 20 00",
            title: "Crew Daily Log",
            children: [
              { id: "95-21-00", code: "95 21 00", title: "Attendance" },
              { id: "95-25-00", code: "95 25 00", title: "Working Hours" },
            ],
          },
          {
            id: "95-30-00",
            code: "95 30 00",
            title: "Crew Payroll",
            children: [
              { id: "95-31-00", code: "95 31 00", title: "Weekly Payroll" },
              { id: "95-35-00", code: "95 35 00", title: "Monthly Payroll" },
            ],
          },
          {
            id: "95-40-00",
            code: "95 40 00",
            title: "Crew Performance",
            children: [
              { id: "95-41-00", code: "95 41 00", title: "Performance Index" },
              { id: "95-45-00", code: "95 45 00", title: "Productivity" },
            ],
          },
          {
            id: "95-50-00",
            code: "95 50 00",
            title: "Crew Request",
            children: [
              { id: "95-51-00", code: "95 51 00", title: "Cash In Advance" },
              { id: "95-55-00", code: "95 55 00", title: "Crew Reimbursement" },
              { id: "95-59-00", code: "95 59 00", title: "Leave Request" },
            ],
          },
        ],
      },
      {
        id: "96-00-00",
        code: "96 00 00",
        title: "QAC — Quality",
        children: [
          {
            id: "96-01-00",
            code: "96 01 00",
            title: "Quality Inspection",
            children: [
              { id: "96-01-01", code: "96 01 01", title: "Checklist" },
              { id: "96-01-02", code: "96 01 02", title: "Result" },
              { id: "96-01-03", code: "96 01 03", title: "Photo" },
            ],
          },
          {
            id: "96-02-00",
            code: "96 02 00",
            title: "Quality Finding",
            children: [
              { id: "96-02-01", code: "96 02 01", title: "Defect" },
              { id: "96-02-02", code: "96 02 02", title: "NCR" },
              { id: "96-02-03", code: "96 02 03", title: "Observation" },
            ],
          },
          {
            id: "96-03-00",
            code: "96 03 00",
            title: "Corrective Action",
            children: [
              { id: "96-03-01", code: "96 03 01", title: "Rectification" },
              { id: "96-03-02", code: "96 03 02", title: "Reinspection" },
              { id: "96-03-03", code: "96 03 03", title: "Closeout" },
            ],
          },
        ],
      },
      {
        id: "97-00-00",
        code: "97 00 00",
        title: "HSE",
        children: [
          {
            id: "97-01-00",
            code: "97 01 00",
            title: "Safety Inspection",
            children: [
              { id: "97-01-01", code: "97 01 01", title: "PPE" },
              { id: "97-01-02", code: "97 01 02", title: "Work Area" },
              { id: "97-01-03", code: "97 01 03", title: "Tools / Equipment Safety" },
            ],
          },
          { id: "97-02-00", code: "97 02 00", title: "Toolbox Meeting" },
          {
            id: "97-03-00",
            code: "97 03 00",
            title: "Safety Observation",
            children: [
              { id: "97-03-01", code: "97 03 01", title: "Unsafe Act" },
              { id: "97-03-02", code: "97 03 02", title: "Unsafe Condition" },
            ],
          },
          {
            id: "97-04-00",
            code: "97 04 00",
            title: "Incident",
            children: [
              { id: "97-04-01", code: "97 04 01", title: "Near Miss" },
              { id: "97-04-02", code: "97 04 02", title: "First Aid" },
              { id: "97-04-03", code: "97 04 03", title: "Accident" },
            ],
          },
          {
            id: "97-05-00",
            code: "97 05 00",
            title: "Environmental",
            children: [
              { id: "97-05-01", code: "97 05 01", title: "Waste" },
              { id: "97-05-02", code: "97 05 02", title: "Dust / Noise" },
              { id: "97-05-03", code: "97 05 03", title: "Spill / Pollution" },
            ],
          },
        ],
      },
      {
        id: "98-00-00",
        code: "98 00 00",
        title: "RIK — Risk, Issue & Site Condition",
        children: [
          {
            id: "98-01-00",
            code: "98 01 00",
            title: "Risk",
            children: [
              { id: "98-01-01", code: "98 01 01", title: "Identified Risk" },
              { id: "98-01-02", code: "98 01 02", title: "Impact" },
              { id: "98-01-03", code: "98 01 03", title: "Mitigation" },
              { id: "98-01-04", code: "98 01 04", title: "Risk Status" },
            ],
          },
          {
            id: "98-02-00",
            code: "98 02 00",
            title: "Issue",
            children: [
              { id: "98-02-01", code: "98 02 01", title: "Site Issue" },
              { id: "98-02-02", code: "98 02 02", title: "Design Issue" },
              { id: "98-02-03", code: "98 02 03", title: "Procurement Issue" },
              { id: "98-02-04", code: "98 02 04", title: "Cost Issue" },
              { id: "98-02-05", code: "98 02 05", title: "Schedule Issue" },
              { id: "98-02-06", code: "98 02 06", title: "Resolution" },
            ],
          },
          {
            id: "98-03-00",
            code: "98 03 00",
            title: "Weather",
            children: [
              { id: "98-03-01", code: "98 03 01", title: "Weather Condition" },
              { id: "98-03-02", code: "98 03 02", title: "Rainfall" },
              { id: "98-03-03", code: "98 03 03", title: "Work Interruption" },
              { id: "98-03-04", code: "98 03 04", title: "Weather Impact" },
            ],
          },
        ],
      },
      { id: "99-00-00", code: "99 00 00", title: "Reserved / System" },
    ],
  },
];

export default function ProjectIndexView({
  projectName,
  projectCode,
  projectNumber,
}: {
  projectName?: string;
  projectCode?: string;
  projectNumber?: string;
}) {
  const projectTag = projectCode || projectNumber;

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [selectedRevision, setSelectedRevision] = useState<string>("Rev 02");

  // Custom Reserve Items State (Dynamic CRUD for Reserve ranges)
  const [reserveItems, setReserveItems] = useState<CustomReserveItem[]>([
    { id: "custom-17-01", code: "17 00 00", title: "Design License & Site Permits", parentReserveId: "17-19" },
  ]);
  const [newReserveCode, setNewReserveCode] = useState("17 00 00");
  const [newReserveTitle, setNewReserveTitle] = useState("");

  // Custom Sub-Items State (Dynamic CRUD for any parent node e.g. 20 01 00 -> 20 01 05)
  const [customSubItems, setCustomSubItems] = useState<CustomSubItem[]>([
    { id: "custom-sub-20-01-05", code: "20 01 05", title: "Vendor Qualification Assessment", parentId: "20-01-00" },
  ]);
  const [newSubItemCode, setNewSubItemCode] = useState("20 01 05");
  const [newSubItemTitle, setNewSubItemTitle] = useState("");

  const [isSaved, setIsSaved] = useState(false);

  // Load initial custom items from localStorage if present
  React.useEffect(() => {
    try {
      const savedReserve = localStorage.getItem("adidaya_reserve_items");
      if (savedReserve) setReserveItems(JSON.parse(savedReserve));

      const savedSub = localStorage.getItem("adidaya_custom_sub_items");
      if (savedSub) setCustomSubItems(JSON.parse(savedSub));
    } catch (e) {
      console.error("Failed to load taxonomy config from localStorage", e);
    }
  }, []);

  const handleSaveConfig = () => {
    try {
      localStorage.setItem("adidaya_reserve_items", JSON.stringify(reserveItems));
      localStorage.setItem("adidaya_custom_sub_items", JSON.stringify(customSubItems));
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
      alert("✅ Save Config Berhasil! Konfigurasi taksonomi & project tree berhasil disimpan.");
    } catch (e) {
      alert("Gagal menyimpan konfigurasi!");
    }
  };
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalTargetNode, setModalTargetNode] = useState<TreeNode | null>(null);
  const [modalCode, setModalCode] = useState("");
  const [modalTitle, setModalTitle] = useState("");

  // Helper to recursively merge custom sub-items into matching parent nodes
  const mergeCustomSubItems = (nodes: TreeNode[]): TreeNode[] => {
    return nodes.map((node) => {
      let updatedChildren = node.children ? mergeCustomSubItems(node.children) : undefined;
      const matchingCustoms = customSubItems.filter((item) => item.parentId === node.id);

      if (matchingCustoms.length > 0) {
        const customNodes: TreeNode[] = matchingCustoms.map((c) => ({
          id: c.id,
          code: c.code,
          title: c.title,
          isDocument: true,
        }));
        updatedChildren = updatedChildren ? [...updatedChildren, ...customNodes] : customNodes;
      }

      return {
        ...node,
        children: updatedChildren,
      };
    });
  };

  const getDynamicTreeData = (isProject: boolean): TreeNode[] => {
    const baseTree = isProject
      ? TREE_DATA
      : TREE_DATA.map((cat) => {
          if (cat.id === "10-19") {
            return {
              ...cat,
              children: cat.children?.map((child) => {
                if (["11-00-00", "12-00-00"].includes(child.id)) {
                  return {
                    id: child.id,
                    code: child.code,
                    title: child.title,
                    isDocument: true,
                  };
                }
                return child;
              }),
            };
          }
          return cat;
        });

    // 1. Merge custom reserve items
    const treeWithReserve = baseTree.map((cat) => {
      const hasReserveChild = cat.children?.some((c) => RESERVE_IDS.includes(c.id));
      if (!hasReserveChild) return cat;

      const newChildren: TreeNode[] = [];
      cat.children?.forEach((child) => {
        if (RESERVE_IDS.includes(child.id)) {
          const matchingCustoms = reserveItems.filter((item) => item.parentReserveId === child.id);
          matchingCustoms.forEach((custom) => {
            newChildren.push({
              id: custom.id,
              code: custom.code,
              title: custom.title,
              isDocument: true,
            });
          });
        }
        newChildren.push(child);
      });

      return {
        ...cat,
        children: newChildren,
      };
    });

    // 2. Merge custom sub-items recursively
    return mergeCustomSubItems(treeWithReserve);
  };

  const activeTreeData = getDynamicTreeData(!!projectTag);

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Calculate next sub-item code auto-suggest for a given parent node
  const calculateNextSubItemCode = (parent: TreeNode): string => {
    const allChildrenCodes = [
      ...(parent.children || []).map((c) => c.code || ""),
      ...customSubItems.filter((item) => item.parentId === parent.id).map((i) => i.code),
    ].filter(Boolean);

    if (allChildrenCodes.length === 0) {
      return parent.code ? `${parent.code.slice(0, 5)} 01` : "00 00 01";
    }

    const lastCode = allChildrenCodes[allChildrenCodes.length - 1];
    const parts = lastCode.split(" ");
    if (parts.length === 3) {
      const num = parseInt(parts[2], 10);
      if (!isNaN(num)) {
        const nextNum = (num + 1).toString().padStart(2, "0");
        return `${parts[0]} ${parts[1]} ${nextNum}`;
      }
    }
    return lastCode;
  };

  const handleSelectNode = (nodeId: string, nodeObj?: TreeNode) => {
    setSelectedDocId(nodeId);

    // If reserve node
    if (RESERVE_IDS.includes(nodeId)) {
      const defaultPrefix = nodeId.split("-")[0];
      setNewReserveCode(`${defaultPrefix} 00 00`);
      setNewReserveTitle("");
    }

    // If parent node that can receive sub-items
    if (nodeObj) {
      const nextCode = calculateNextSubItemCode(nodeObj);
      setNewSubItemCode(nextCode);
      setNewSubItemTitle("");
    }
  };

  const handleOpenAddModal = (targetNode?: TreeNode | null) => {
    const node = targetNode || selectedNodeObj || activeTreeData[0];
    setModalTargetNode(node);
    const nextCode = calculateNextSubItemCode(node);
    setModalCode(nextCode);
    setModalTitle("");
    setIsAddModalOpen(true);
  };

  const handleSaveModalSubIndex = () => {
    if (!modalCode.trim() || !modalTitle.trim() || !modalTargetNode) {
      alert("Harap isi Kode dan Nama Sub-Index!");
      return;
    }

    const parentId = modalTargetNode.id;
    const newItem: CustomSubItem = {
      id: `custom-sub-${Date.now()}`,
      code: modalCode.trim(),
      title: modalTitle.trim(),
      parentId: parentId,
    };

    setCustomSubItems((prev) => [...prev, newItem]);
    setExpandedNodes((prev) => ({ ...prev, [parentId]: true }));
    setSelectedDocId(newItem.id);
    setIsAddModalOpen(false);
  };

  const handleAddReserveItem = () => {
    if (!newReserveCode.trim() || !newReserveTitle.trim()) {
      alert("Harap isi Kode Dokumen dan Nama Dokumen!");
      return;
    }

    const newItem: CustomReserveItem = {
      id: `custom-${Date.now()}`,
      code: newReserveCode.trim(),
      title: newReserveTitle.trim(),
      parentReserveId: selectedDocId,
    };

    setReserveItems((prev) => [...prev, newItem]);
    setNewReserveTitle("");
  };

  const handleDeleteReserveItem = (id: string) => {
    setReserveItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddCustomSubItem = () => {
    if (!newSubItemCode.trim() || !newSubItemTitle.trim()) {
      alert("Harap isi Kode Sub-Item dan Nama Dokumen/Tugas!");
      return;
    }

    const newItem: CustomSubItem = {
      id: `custom-sub-${Date.now()}`,
      code: newSubItemCode.trim(),
      title: newSubItemTitle.trim(),
      parentId: selectedDocId,
    };

    setCustomSubItems((prev) => [...prev, newItem]);
    setExpandedNodes((prev) => ({ ...prev, [selectedDocId]: true }));
    setNewSubItemTitle("");
  };

  const handleDeleteCustomSubItem = (id: string) => {
    setCustomSubItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Helper to find node by ID in active tree
  const findNodeInTree = (nodes: TreeNode[], id: string): TreeNode | undefined => {
    for (const n of nodes) {
      if (n.id === id) return n;
      if (n.children) {
        const found = findNodeInTree(n.children, id);
        if (found) return found;
      }
    }
    return undefined;
  };

  const selectedNodeObj = findNodeInTree(activeTreeData, selectedDocId);
  const isReserveNode = RESERVE_IDS.includes(selectedDocId);
  const activeReserveItems = reserveItems.filter((item) => item.parentReserveId === selectedDocId);

  // Helper to check if current selected doc belongs to 10-17 Design Documents
  const prefix = selectedDocId.split("-")[0];
  const isDesignDoc = ["10", "11", "12", "13", "14", "15", "16", "17", "10-19"].includes(prefix) || selectedDocId === "10-19";
  const designStageConfig = DESIGN_STAGE_MAP[prefix] || DESIGN_STAGE_MAP["11"];

  const handleDeleteCustomNode = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus index custom ini?")) {
      if (id.startsWith("custom-sub-")) {
        setCustomSubItems((prev) => prev.filter((item) => item.id !== id));
      } else {
        setReserveItems((prev) => prev.filter((item) => item.id !== id));
      }
      setSelectedDocId("11-00-00");
    }
  };

  const canAddSubIndex = (node: TreeNode): boolean => {
    if (!node.code) return false;
    if (RESERVE_IDS.includes(node.id)) return true;
    if (node.code.includes("–")) return true;
    const parts = node.code.trim().split(" ");
    if (parts.length === 3) {
      return parts[2] === "00";
    }
    return false;
  };

  // Helper to render tree recursively with clear typography hierarchy between parent & child
  const renderTreeNode = (node: TreeNode, depth = 0) => {
    const isExpanded = !!expandedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedDocId === node.id;
    const allowAdd = canAddSubIndex(node);
    const isCustomNode = node.id.startsWith("custom");

    // Filter check
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const recursiveCheck = (n: TreeNode): boolean => {
        const t = `${n.code || ""} ${n.title}`.toLowerCase();
        if (t.includes(q)) return true;
        return !!n.children?.some((c) => recursiveCheck(c));
      };
      if (!recursiveCheck(node)) {
        return null;
      }
    }

    const isRootParent = depth === 0;
    const isSubParent = depth === 1;

    return (
      <div key={node.id} className="select-none">
        <div
          onClick={() => {
            if (hasChildren) {
              toggleNode(node.id);
            }
            handleSelectNode(node.id, node);
            if (node.code && node.code.startsWith("Rev")) {
              setSelectedRevision(node.code);
            }
          }}
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
          className={clsx(
            "flex items-center justify-between gap-2 py-1.5 pr-3 rounded-xl cursor-pointer transition-all my-0.5 text-xs group",
            isSelected
              ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold border border-blue-200/60 dark:border-blue-800/60"
              : isRootParent
              ? "text-neutral-900 dark:text-white font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
              : isSubParent
              ? "text-neutral-800 dark:text-neutral-200 font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
              : "text-neutral-600 dark:text-neutral-400 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
          )}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {hasChildren ? (
              <span className="w-4 h-4 flex items-center justify-center text-neutral-400 shrink-0">
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </span>
            ) : (
              <span className="w-4 shrink-0" />
            )}

            {/* Hover + Button on LEFT side next to chevron - ONLY rendered if node code ends in 00 or is category/reserve */}
            {allowAdd ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenAddModal(node);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 shrink-0 cursor-pointer"
                title={`Tambah Sub-Index di bawah ${node.code || node.title}`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="w-4 shrink-0" />
            )}

            {/* Trash Delete button on hover for custom-created nodes */}
            {isCustomNode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteCustomNode(node.id);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-md hover:bg-red-100 dark:hover:bg-red-950/60 text-red-500 hover:text-red-700 shrink-0 cursor-pointer"
                title={`Hapus index custom ${node.code || node.title}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            <span className="truncate flex items-center gap-1.5 min-w-0 flex-1" title={`${node.code || ""} ${node.title}`}>
              {node.code && (
                <span
                  className={clsx(
                    "font-mono text-xs shrink-0",
                    isSelected
                      ? "text-blue-600 dark:text-blue-400 font-bold"
                      : isRootParent
                      ? "font-bold text-neutral-800 dark:text-neutral-200"
                      : isSubParent
                      ? "font-semibold text-neutral-500"
                      : "font-normal text-neutral-400"
                  )}
                >
                  {node.code}
                </span>
              )}
              <span className={clsx("truncate", isSelected && "text-blue-600 dark:text-blue-400 font-bold")}>
                {node.title}
              </span>
            </span>
          </div>
        </div>

        {hasChildren && (isExpanded || searchQuery.trim() !== "") && (
          <div className="space-y-0.5">
            {node.children!.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 w-full max-w-[1400px] mx-auto animate-in fade-in duration-500 px-4 md:px-0 lg:h-[calc(100vh-90px)] lg:flex lg:flex-col lg:overflow-hidden pb-8 lg:pb-0">
      {/* 4XL Header Area */}
      <div className="max-w-4xl mx-auto space-y-2 shrink-0 w-full">
        <Link href="/project/settings" className="lg:hidden w-fit block">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-neutral-900 shadow-sm border border-black/[0.03] dark:border-white/[0.05] active:scale-90 transition-all">
            <ChevronLeft className="w-5 h-5 text-neutral-700 dark:text-white" strokeWidth={1.5} />
          </div>
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Index</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {projectName
              ? `Struktur hirarki taksonomi & direktori dokumen proyek ${projectName}`
              : "Struktur hirarki taksonomi & direktori dokumen proyek"}
          </p>
        </div>
      </div>

      {/* Main Split Layout: Left Tree + Right Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start lg:flex-1 lg:min-h-0 lg:overflow-hidden">
        {/* LEFT PANEL: PROJECT TREE */}
        <div className="lg:col-span-4 xl:col-span-4 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl p-5 shadow-sm lg:h-full lg:flex lg:flex-col lg:overflow-hidden space-y-4">
          <div className="shrink-0 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-bold text-sm text-neutral-900 dark:text-white tracking-tight">
                Project Tree
              </h2>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={handleSaveConfig}
                  className={clsx(
                    "px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all shadow-2xs flex items-center gap-1 cursor-pointer active:scale-95",
                    isSaved
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700"
                  )}
                  title="Simpan Perubahan Konfigurasi Taksonomi & Project Tree"
                >
                  {isSaved ? <Check className="w-3 h-3 text-white" /> : <Save className="w-3 h-3 text-neutral-500" />}
                  <span>{isSaved ? "Saved!" : "Save Config"}</span>
                </button>

                <button
                  onClick={() => handleOpenAddModal(selectedNodeObj)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                  title="Tambah Sub-Index Baru"
                >
                  <Plus className="w-3 h-3" />
                  <span>Sub-Index</span>
                </button>
                {projectTag && (
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                    {projectTag}
                  </span>
                )}
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search code / document..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          {/* Tree Navigation */}
          <div className="pt-1 lg:flex-1 lg:overflow-y-auto pr-1.5 space-y-0.5 scrollbar-thin">
            {activeTreeData.map((node) => renderTreeNode(node))}
          </div>
        </div>

        {/* RIGHT PANEL: DOCUMENT PREVIEW OR CONFIGURATOR */}
        <div className="lg:col-span-8 xl:col-span-8 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl p-6 shadow-sm lg:h-full lg:overflow-y-auto pr-5 space-y-6 scrollbar-thin">
          {!selectedDocId ? (
            /* BLANK PLACEHOLDER STATE WHEN NOTHING IS SELECTED IN TREE */
            <div className="h-full flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-neutral-50/60 dark:bg-neutral-900/40 border border-dashed border-neutral-200/80 dark:border-neutral-800/80 space-y-4 my-auto min-h-[450px] animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-2xs">
                <FolderOpen className="w-8 h-8" strokeWidth={1.5} />
              </div>
              <div className="max-w-sm space-y-1.5">
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Select a Document or Category
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  Select any item from the <span className="font-semibold text-neutral-700 dark:text-neutral-300">Project Tree</span> menu on the left to preview its document structure or configure taxonomy settings.
                </p>
              </div>
            </div>
          ) : isReserveNode ? (
            /* RESERVE CUSTOM DOCUMENT MANAGEMENT MODE */
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="border-b border-neutral-100 dark:border-neutral-800/80 pb-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                    <span>{selectedDocId}</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-[10px] font-bold">Reserve Configurator</span>
                  </div>
                  <h2 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight">
                    Kelola Dokumen Custom / Reserve
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Tambah kode & nama dokumen baru pada kategori reserve ini. Dokumen baru akan otomatis muncul di Project Tree sebelah kiri.
                  </p>
                </div>

                <button
                  onClick={() => handleOpenAddModal(selectedNodeObj)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm flex items-center gap-1.5 active:scale-95 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Sub-Index</span>
                </button>
              </div>

              {/* Form Tambah Dokumen Custom */}
              <div className="p-5 rounded-2xl bg-neutral-50/80 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/80 space-y-4">
                <h3 className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <BookmarkPlus className="w-4 h-4 text-blue-600" />
                  <span>Tambah Dokumen Custom Baru</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-4 space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">Kode Dokumen</label>
                    <input
                      type="text"
                      value={newReserveCode}
                      onChange={(e) => setNewReserveCode(e.target.value)}
                      placeholder="e.g. 17 00 00"
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-mono font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div className="sm:col-span-8 space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">Nama Dokumen</label>
                    <input
                      type="text"
                      value={newReserveTitle}
                      onChange={(e) => setNewReserveTitle(e.target.value)}
                      placeholder="e.g. Design License & Site Permits"
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleAddReserveItem}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm flex items-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah & Simpan Config</span>
                  </button>
                </div>
              </div>

              {/* Daftar Dokumen Custom yang Sudah Ditambahkan */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-neutral-900 dark:text-white flex items-center justify-between">
                  <span>Daftar Dokumen Custom ({activeReserveItems.length})</span>
                  <span className="text-[11px] font-normal text-neutral-400">Kategori {selectedDocId}</span>
                </h3>

                {activeReserveItems.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 text-neutral-400 text-xs space-y-1">
                    <p className="font-semibold text-neutral-600 dark:text-neutral-300">Belum ada dokumen custom</p>
                    <p>Gunakan formulir di atas untuk menambahkan dokumen baru pada rentang {selectedDocId}.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeReserveItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/60 shadow-2xs hover:border-neutral-300 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-900 text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                            {item.code}
                          </span>
                          <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                            {item.title}
                          </span>
                        </div>

                        <button
                          onClick={() => handleDeleteReserveItem(item.id)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer"
                          title="Hapus Dokumen Reserve Ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : isDesignDoc ? (
            /* DESIGN DOCUMENT TEMPLATE PREVIEW MODE (FOR CODES 10-15 & CUSTOM DESIGN DOCS) */
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800/80 pb-4">
                {/* LEFT: Code -> Title -> File Version Dropdown */}
                <div className="space-y-1">
                  <div className="text-xs font-mono font-bold text-neutral-400">
                    {designStageConfig.code}
                  </div>
                  <h2 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight leading-snug">
                    {designStageConfig.title}
                  </h2>
                  {projectTag && (
                    <div className="pt-1">
                      <div className="relative inline-block">
                        <select
                          value={selectedRevision}
                          onChange={(e) => setSelectedRevision(e.target.value)}
                          className="appearance-none pl-3.5 pr-8 py-1.5 rounded-full text-xs font-bold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-200/80 dark:border-neutral-700/80 text-neutral-800 dark:text-neutral-200 focus:outline-none cursor-pointer transition-all shadow-2xs"
                        >
                          <option value="Rev 02">Rev 02 (17/08/2026 - Approved)</option>
                          <option value="Rev 01">Rev 01 (10/08/2026 - Reviewed)</option>
                          <option value="Rev 00">Rev 00 (01/08/2026 - Draft)</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT: Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap pt-0.5">
                  {selectedDocId.startsWith("custom") && (
                    <button
                      onClick={() => handleDeleteCustomNode(selectedDocId)}
                      className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-red-50 dark:bg-red-950/60 border border-red-200/80 dark:border-red-800/80 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white transition-all shadow-2xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
                      title="Hapus Index Custom Ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Index</span>
                    </button>
                  )}

                  {/* PROJECT DETAIL EXPORT ACTION */}
                  {projectTag && (
                    <button
                      onClick={() => alert("Downloading / Exporting document PDF...")}
                      className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700/80 transition-all shadow-2xs flex items-center gap-1.5 active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Export</span>
                    </button>
                  )}

                  <Link
                    href={`/project/settings/stages?tab=document&stage=${designStageConfig.stageKey}`}
                    className="px-4 py-1.5 rounded-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
                  >
                    <span>Edit</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {["10", "11"].includes(prefix) ? (
                /* Render Stage Document Template Preview for KO / Kickoff */
                <KickoffDocumentPreview
                  data={{
                    ...defaultKickoffData,
                    version: selectedRevision,
                    projectName: projectName || defaultKickoffData.projectName,
                  }}
                  customSections={designStageConfig.sections}
                  hideToolbar={false}
                />
              ) : (
                /* UNDER CONSTRUCTION PLACEHOLDER CARD FOR SD, DD, ED, HO (12-16) */
                <div className="p-10 text-center rounded-2xl bg-neutral-50/80 dark:bg-neutral-800/40 border border-dashed border-neutral-300 dark:border-neutral-700 space-y-5 animate-in fade-in duration-300 my-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/80 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400 shadow-xs">
                    <Wrench className="w-7 h-7" />
                  </div>

                  <div className="max-w-md mx-auto space-y-1.5">
                    <div className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                      {designStageConfig.code} · Under Construction
                    </div>
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                      Document {designStageConfig.title} is Under Construction
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                      The document template for <span className="font-semibold text-neutral-700 dark:text-neutral-300">{designStageConfig.title}</span> is currently being prepared. Please update the template or edit the live preview from the associated stage settings page.
                    </p>
                  </div>

                  <div className="pt-2 flex justify-center">
                    <Link
                      href={`/project/settings/stages?tab=document&stage=${designStageConfig.stageKey}`}
                      className="px-5 py-2.5 rounded-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm flex items-center gap-2 active:scale-95 cursor-pointer"
                    >
                      <span>Edit Live Preview</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* STANDARD REPORT & DCR PREVIEW MODE */
            <div className="space-y-6">
              {selectedDocId?.startsWith("71-01") ||
              selectedDocId?.startsWith("71-02") ||
              selectedDocId?.startsWith("71-03") ||
              selectedDocId?.startsWith("71-04") ||
              selectedDocId === "71-00-00" ||
              selectedNodeObj?.code?.startsWith("71 01") ||
              selectedNodeObj?.code?.startsWith("71 02") ||
              selectedNodeObj?.code?.startsWith("71 03") ||
              selectedNodeObj?.code?.startsWith("71 04") ||
              selectedNodeObj?.title?.toLowerCase().includes("daily construction report") ||
              selectedNodeObj?.title?.toLowerCase().includes("dcr") ? (
                /* 71 01 00 DCR — DAILY CONSTRUCTION REPORT FORMAT */
                <DCRDailyConstructionReportPreview
                  isProjectDetail={!!projectTag}
                  data={{
                    documentId: "71-01-00-DCR-2026-001",
                    reportDate: "17/08/2026",
                    dayName: "Monday / Senin",
                    dayNo: "11",
                    totalDays: "180",
                    remainingDays: "169",
                    projectName: projectName || "",
                    contractorName: "PT. ADIDAYA KREASI NUSA",
                  }}
                  onSelectNode={(nodeId) => {
                    setSelectedDocId(nodeId);
                  }}
                />
              ) : selectedDocId === "95-20-00" ||
                selectedDocId === "95-00-00" ||
                selectedNodeObj?.code === "95 20 00" ||
                selectedNodeObj?.title?.toLowerCase().includes("crew daily log") ? (
                /* 95 20 00 CREW DAILY LOG & TIMESHEET FORMAT */
                <CrewDailyLogReportPreview
                  isProjectDetail={!!projectTag}
                  projectName={projectName}
                  onSelectNode={(nodeId) => {
                    setSelectedDocId(nodeId);
                  }}
                />
              ) : selectedDocId === "95-21-00" ||
                selectedNodeObj?.code === "95 21 00" ||
                (selectedNodeObj?.code?.startsWith("95 2") && selectedNodeObj?.title?.toLowerCase().includes("attendance")) ? (
                /* 95 21 00 ATTENDANCE SUMMARY FORMAT */
                <CrewAttendanceReportPreview
                  isProjectDetail={!!projectTag}
                  projectName={projectName}
                  onSelectNode={(nodeId) => {
                    setSelectedDocId(nodeId);
                  }}
                />
              ) : selectedDocId === "95-25-00" ||
                selectedNodeObj?.code === "95 25 00" ||
                (selectedNodeObj?.code?.startsWith("95 2") && selectedNodeObj?.title?.toLowerCase().includes("working hours")) ? (
                /* 95 25 00 WORKING HOURS SUMMARY FORMAT */
                <CrewWorkingHoursReportPreview
                  isProjectDetail={!!projectTag}
                  projectName={projectName}
                  onSelectNode={(nodeId) => {
                    setSelectedDocId(nodeId);
                  }}
                />
              ) : (
                /* UNDER CONSTRUCTION PLACEHOLDER CARD FOR OTHER CODES */
                <div className="space-y-6">
                  {/* Breadcrumb & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800/80 pb-4">
                    <div className="space-y-1">
                      <div className="text-[11px] font-medium text-neutral-400 flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-neutral-500">{selectedNodeObj?.code || selectedDocId}</span>
                        <span>&gt;</span>
                        <span className="font-semibold text-neutral-700 dark:text-neutral-300">{selectedNodeObj?.title || "Dokumen / Kategori"}</span>
                      </div>
                      <h2 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight">
                        {selectedNodeObj?.title || "Dokumen Detail"}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {selectedDocId.startsWith("custom") && (
                        <button
                          onClick={() => handleDeleteCustomNode(selectedDocId)}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white transition-all shadow-sm flex items-center gap-1.5 active:scale-95 cursor-pointer"
                          title="Hapus Index Custom Ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus Index</span>
                        </button>
                      )}

                      {projectTag && (
                        <button
                          onClick={() => alert("Exporting Document PDF...")}
                          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
                        >
                          <Download className="w-3.5 h-3.5 text-neutral-500" />
                          <span>Export</span>
                        </button>
                      )}
                      <button className="px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all shadow-sm">
                        Save Draft
                      </button>
                      <button className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm">
                        Submit
                      </button>
                    </div>
                  </div>

                  <div className="p-10 text-center rounded-2xl bg-neutral-50/80 dark:bg-neutral-800/40 border border-dashed border-neutral-300 dark:border-neutral-700 space-y-5 animate-in fade-in duration-300 my-4">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/80 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400 shadow-xs">
                      <Wrench className="w-7 h-7" />
                    </div>

                    <div className="max-w-md mx-auto space-y-1.5">
                      <div className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                        {selectedNodeObj?.code || selectedDocId} · Under Construction
                      </div>
                      <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                        Document {selectedNodeObj?.title || "Document"} is Under Construction
                      </h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                        The document template for <span className="font-semibold text-neutral-700 dark:text-neutral-300">{selectedNodeObj?.title || selectedDocId}</span> is currently being prepared. Please update the template or edit the live preview from the associated stage settings page.
                      </p>
                    </div>

                    <div className="pt-2 flex justify-center">
                      <Link
                        href={`/project/settings/stages?tab=document&stage=CN`}
                        className="px-5 py-2.5 rounded-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm flex items-center gap-2 active:scale-95 cursor-pointer"
                      >
                        <span>Edit Live Preview</span>
                        <ArrowUpRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ADD INDEX / SUB-INDEX MODAL DIALOG */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Tambah Sub-Index Baru</h3>
                  <p className="text-[11px] text-neutral-400">
                    Kategori Induk: <span className="font-mono font-semibold text-neutral-700 dark:text-neutral-300">{modalTargetNode?.code || selectedDocId}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                  Kode Sub-Index
                </label>
                <input
                  type="text"
                  value={modalCode}
                  onChange={(e) => setModalCode(e.target.value)}
                  placeholder="e.g. 20 01 05"
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-mono font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                  Nama Sub-Index / Dokumen
                </label>
                <input
                  type="text"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  placeholder="e.g. Vendor Qualification Assessment"
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSaveModalSubIndex}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Simpan Sub-Index</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

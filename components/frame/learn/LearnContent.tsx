"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LearnView } from "./LearnPageHeader";
import { QuickView, Department, KnowledgeType } from "./types";
import { FileText, BookOpen, ClipboardList, Scale, Clock, Star, Video, Image, FolderOpen, Presentation, Table, FileSpreadsheet, ChevronDown, ChevronUp } from "lucide-react";
import clsx from "clsx";

type Props = {
  view: LearnView;
  quickView: QuickView;
  department: Department;
  docType: KnowledgeType | "ALL";
  searchQuery: string;
};

// Knowledge item type
export type KnowledgeItem = {
  id: string;
  title: string;
  type: KnowledgeType;
  category: "documentation" | "templates" | "references";
  department: string;
  lastUpdated: string;
  isFavorite: boolean;
  format?: "document" | "spreadsheet" | "presentation" | "video" | "image" | "pdf";
};

// Mock knowledge items - IDs match detail page
const MOCK_KNOWLEDGE: KnowledgeItem[] = [
  // Documentation
  { id: "sop-1", title: "Design Review Process", type: "SOP", category: "documentation", department: "DESIGN", lastUpdated: "2025-12-15", isFavorite: true, format: "document" },
  { id: "checklist-1", title: "Project Handover Checklist", type: "CHECKLIST", category: "documentation", department: "CONSTRUCTION", lastUpdated: "2025-12-10", isFavorite: false, format: "document" },
  { id: "workflow-1", title: "Invoice Processing Workflow", type: "WORKFLOW", category: "documentation", department: "FINANCE", lastUpdated: "2025-12-08", isFavorite: true, format: "document" },
  { id: "policy-1", title: "Employee Leave Policy", type: "POLICY", category: "documentation", department: "HR", lastUpdated: "2025-12-01", isFavorite: false, format: "document" },
  { id: "standard-1", title: "Material Quality Standard", type: "STANDARD", category: "documentation", department: "OPERATION", lastUpdated: "2025-11-28", isFavorite: false, format: "document" },
  { id: "guideline-1", title: "Brand Guidelines", type: "GUIDELINE", category: "documentation", department: "DESIGN", lastUpdated: "2025-11-20", isFavorite: true, format: "pdf" },

  // Templates
  { id: "template-ppt-1", title: "Project Presentation Template", type: "TEMPLATE_PPT", category: "templates", department: "DESIGN", lastUpdated: "2025-12-12", isFavorite: false, format: "presentation" },
  { id: "template-rab-1", title: "RAB Template - Residential", type: "TEMPLATE_RAB", category: "templates", department: "CONSTRUCTION", lastUpdated: "2025-12-05", isFavorite: true, format: "spreadsheet" },
  { id: "template-drawing-1", title: "CAD Drawing Template", type: "TEMPLATE_DRAWING", category: "templates", department: "DESIGN", lastUpdated: "2025-11-25", isFavorite: false, format: "document" },
  { id: "template-contract-1", title: "Contractor Agreement Template", type: "TEMPLATE_CONTRACT", category: "templates", department: "OPERATION", lastUpdated: "2025-11-18", isFavorite: false, format: "document" },
  { id: "template-report-1", title: "Monthly Progress Report Template", type: "TEMPLATE_REPORT", category: "templates", department: "CONSTRUCTION", lastUpdated: "2025-11-10", isFavorite: false, format: "document" },

  // References
  { id: "video-1", title: "Site Inspection Tutorial", type: "VIDEO", category: "references", department: "CONSTRUCTION", lastUpdated: "2025-12-14", isFavorite: true, format: "video" },
  { id: "designref-1", title: "Modern Kitchen Design References", type: "DESIGN_REF", category: "references", department: "DESIGN", lastUpdated: "2025-12-08", isFavorite: false, format: "image" },
  { id: "material-1", title: "Marble & Stone Catalog 2025", type: "MATERIAL_CATALOG", category: "references", department: "DESIGN", lastUpdated: "2025-12-01", isFavorite: true, format: "pdf" },
  { id: "vendor-1", title: "Approved Vendor List 2025", type: "VENDOR_LIST", category: "references", department: "OPERATION", lastUpdated: "2025-11-22", isFavorite: false, format: "spreadsheet" },
  { id: "price-1", title: "Material Price Guide Q4 2025", type: "PRICE_REF", category: "references", department: "FINANCE", lastUpdated: "2025-11-15", isFavorite: false, format: "spreadsheet" },
];

const TYPE_ICON: Record<string, React.ReactNode> = {
  SOP: <FileText className="w-4 h-4" />,
  WORKFLOW: <BookOpen className="w-4 h-4" />,
  GUIDELINE: <FileText className="w-4 h-4" />,
  POLICY: <Scale className="w-4 h-4" />,
  STANDARD: <Scale className="w-4 h-4" />,
  CHECKLIST: <ClipboardList className="w-4 h-4" />,
  TEMPLATE_PPT: <Presentation className="w-4 h-4" />,
  TEMPLATE_RAB: <Table className="w-4 h-4" />,
  TEMPLATE_DRAWING: <FolderOpen className="w-4 h-4" />,
  TEMPLATE_CONTRACT: <FileText className="w-4 h-4" />,
  TEMPLATE_REPORT: <FileSpreadsheet className="w-4 h-4" />,
  VIDEO: <Video className="w-4 h-4" />,
  PHOTO: <Image className="w-4 h-4" />,
  DESIGN_REF: <Image className="w-4 h-4" />,
  MATERIAL_CATALOG: <FolderOpen className="w-4 h-4" />,
  VENDOR_LIST: <ClipboardList className="w-4 h-4" />,
  PRICE_REF: <FileSpreadsheet className="w-4 h-4" />,
};

// Subtle department colors - muted, not too bright
const DEPT_BADGE: Record<string, string> = {
  DESIGN: "text-purple-600",
  CONSTRUCTION: "text-orange-600",
  FINANCE: "text-emerald-600",
  HR: "text-blue-600",
  OPERATION: "text-neutral-600",
};

const DEPT_LABEL: Record<string, string> = {
  DESIGN: "Design",
  CONSTRUCTION: "Construction",
  FINANCE: "Finance",
  HR: "HR",
  OPERATION: "Operation",
};

// Category badge - subtle background
const CATEGORY_BADGE: Record<string, string> = {
  documentation: "bg-blue-50 text-blue-600",
  templates: "bg-violet-50 text-violet-600",
  references: "bg-amber-50 text-amber-600",
};

// Type labels - keep acronyms uppercase
const TYPE_LABEL: Record<string, string> = {
  SOP: "SOP",
  WORKFLOW: "Workflow",
  GUIDELINE: "Guideline",
  POLICY: "Policy",
  STANDARD: "Standard",
  CHECKLIST: "Checklist",
  TEMPLATE_PPT: "PPT Template",
  TEMPLATE_RAB: "RAB Template",
  TEMPLATE_DRAWING: "Drawing Template",
  TEMPLATE_CONTRACT: "Contract Template",
  TEMPLATE_REPORT: "Report Template",
  VIDEO: "Video",
  PHOTO: "Photo",
  DESIGN_REF: "Design Ref",
  MATERIAL_CATALOG: "Material Catalog",
  VENDOR_LIST: "Vendor List",
  PRICE_REF: "Price Ref",
};

function getTypeLabel(type: string): string {
  return TYPE_LABEL[type] || type;
}

export default function LearnContent({ view, quickView, department, docType, searchQuery }: Props) {
  const router = useRouter();

  const filteredItems = useMemo(() => {
    let items = [...MOCK_KNOWLEDGE];

    // Quick view filter (primary category)
    if (quickView === "documentation") items = items.filter(i => i.category === "documentation");
    if (quickView === "templates") items = items.filter(i => i.category === "templates");
    if (quickView === "references") items = items.filter(i => i.category === "references");
    if (quickView === "favorite") items = items.filter(i => i.isFavorite);
    if (quickView === "recent") items = items.slice(0, 5);

    // Department filter
    if (department !== "ALL") items = items.filter(i => i.department === department);

    // Type filter
    if (docType !== "ALL") items = items.filter(i => i.type === docType);

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i => i.title.toLowerCase().includes(q) || i.type.toLowerCase().includes(q));
    }

    return items;
  }, [quickView, department, docType, searchQuery]);

  const handleItemClick = (id: string) => {
    router.push(`/frame/learn/${id}`);
  };

  if (view === "grouped") {
    return <GroupedView items={filteredItems} onItemClick={handleItemClick} />;
  }

  return <ListView items={filteredItems} onItemClick={handleItemClick} />;
}

type SortKey = "title" | "type" | "department" | "lastUpdated";
type SortDir = "asc" | "desc";

function ListView({ items, onItemClick }: { items: KnowledgeItem[]; onItemClick: (id: string) => void }) {
  const [sortKey, setSortKey] = useState<SortKey>("title");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const mult = sortDir === "asc" ? 1 : -1;
      if (sortKey === "title") return mult * a.title.localeCompare(b.title);
      if (sortKey === "type") return mult * a.type.localeCompare(b.type);
      if (sortKey === "department") return mult * a.department.localeCompare(b.department);
      if (sortKey === "lastUpdated") return mult * b.lastUpdated.localeCompare(a.lastUpdated);
      return 0;
    });
  }, [items, sortKey, sortDir]);

  const SortHeader = ({ label, colKey }: { label: string; colKey: SortKey }) => {
    const isActive = sortKey === colKey;
    return (
      <th
        className="px-4 py-3 cursor-pointer hover:text-neutral-600 transition-colors select-none"
        onClick={() => toggleSort(colKey)}
      >
        <div className="flex items-center gap-1">
          {label}
          {isActive && (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
        </div>
      </th>
    );
  };

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-neutral-100 p-12 text-center">
        <div className="text-neutral-400 text-sm">No knowledge items found.</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
      <table className="w-full text-left">
        <thead>
          <tr className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 bg-neutral-50/50">
            <th className="px-4 py-3 cursor-pointer hover:text-neutral-600" onClick={() => toggleSort("title")}>
              <div className="flex items-center gap-1">
                Title
                {sortKey === "title" && (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
              </div>
            </th>
            <th className="px-4 py-3 w-[140px] cursor-pointer hover:text-neutral-600" onClick={() => toggleSort("type")}>
              <div className="flex items-center gap-1">
                Type
                {sortKey === "type" && (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
              </div>
            </th>
            <th className="px-4 py-3 w-[110px] cursor-pointer hover:text-neutral-600" onClick={() => toggleSort("department")}>
              <div className="flex items-center gap-1">
                Dept
                {sortKey === "department" && (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
              </div>
            </th>
            <th className="px-4 py-3 w-[100px] cursor-pointer hover:text-neutral-600" onClick={() => toggleSort("lastUpdated")}>
              <div className="flex items-center gap-1">
                Updated
                {sortKey === "lastUpdated" && (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
              </div>
            </th>
            <th className="px-4 py-3 w-[40px]"></th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map(item => (
            <tr
              key={item.id}
              onClick={() => onItemClick(item.id)}
              className="border-b border-neutral-50 last:border-b-0 hover:bg-neutral-50/70 transition-colors cursor-pointer group"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="text-neutral-400 flex-shrink-0">{TYPE_ICON[item.type]}</div>
                  <span className="text-sm font-medium text-neutral-900 group-hover:text-red-600 transition-colors">{item.title}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${CATEGORY_BADGE[item.category]}`}>
                  {getTypeLabel(item.type)}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`text-xs font-medium ${DEPT_BADGE[item.department] || "text-neutral-600"}`}>
                  {DEPT_LABEL[item.department] || item.department}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-neutral-400">
                {new Date(item.lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </td>
              <td className="px-4 py-3">
                {item.isFavorite && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupedView({ items, onItemClick }: { items: KnowledgeItem[]; onItemClick: (id: string) => void }) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["DESIGN", "CONSTRUCTION"]));

  const grouped = useMemo(() => {
    const groups: Record<string, KnowledgeItem[]> = {};
    items.forEach(item => {
      if (!groups[item.department]) groups[item.department] = [];
      groups[item.department].push(item);
    });
    return groups;
  }, [items]);

  const toggleGroup = (dept: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(dept)) next.delete(dept);
      else next.add(dept);
      return next;
    });
  };

  if (Object.keys(grouped).length === 0) {
    return (
      <div className="bg-white rounded-xl border border-neutral-100 p-12 text-center">
        <div className="text-neutral-400 text-sm">No knowledge items found.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([dept, deptItems]) => {
        const isExpanded = expandedGroups.has(dept);

        return (
          <div key={dept} className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
            <button
              onClick={() => toggleGroup(dept)}
              className="w-full px-4 py-3 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between hover:bg-neutral-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-neutral-900">{DEPT_LABEL[dept] || dept}</span>
                <span className="text-xs text-neutral-400">{deptItems.length} items</span>
              </div>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
            </button>

            {isExpanded && (
              <div className="divide-y divide-neutral-50">
                {deptItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => onItemClick(item.id)}
                    className="px-4 py-3 hover:bg-neutral-50/70 transition-colors cursor-pointer group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-neutral-400">{TYPE_ICON[item.type]}</div>
                      <div>
                        <div className="text-sm font-medium text-neutral-900 group-hover:text-red-600 transition-colors">{item.title}</div>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${CATEGORY_BADGE[item.category]}`}>
                          {getTypeLabel(item.type)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {item.isFavorite && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                      <span className="text-xs text-neutral-400">
                        {new Date(item.lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

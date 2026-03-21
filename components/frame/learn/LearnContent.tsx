"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LearnView } from "./LearnPageHeader";
import { QuickView, Department, KnowledgeType, SortOptionValue } from "./types";
import { FileText, BookOpen, ClipboardList, Scale, Clock, Star, Video, Image, FolderOpen, Presentation, Table, FileSpreadsheet, ChevronDown, ChevronUp, ChevronRight, ExternalLink } from "lucide-react";
import { LearnItemCard } from "./LearnItemCard";
import clsx from "clsx";
import { useUserContext } from "@/components/providers/UserProvider";

type Props = {
  view: LearnView;
  quickView: QuickView;
  department: string[];
  docType: string[];
  searchQuery: string;
  items: KnowledgeItem[];
  sortOption?: SortOptionValue;
  onSortChange?: (val: SortOptionValue) => void;
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
  AID: "text-purple-600",
  SMP: "text-orange-600",
  UDL: "text-emerald-600",
  HFR: "text-blue-600",
  PCC: "text-amber-600",
  RBD: "text-rose-600",
};

const DEPT_LABEL: Record<string, string> = {
  AID: "Architecture, Interior, and Design",
  SMP: "Structure and MEP Engineering",
  UDL: "Urban Design and Landscape",
  HFR: "Human Capital, Finance, and Resources",
  PCC: "Procurement and Construction",
  RBD: "Research and Business Development",
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

export default function LearnContent({ view, quickView, department, docType, searchQuery, items: initialItems, sortOption, onSortChange }: Props) {
  const router = useRouter();
  const { profile } = useUserContext();

  const canManage = !!(profile?.role && ["superadmin", "admin", "administrator", "supervisor", "hr", "pm", "management", "owner"].includes(profile.role.toLowerCase()));

  const filteredItems = useMemo(() => {
    let items = [...initialItems];

    // Quick view filter (primary category)
    if (quickView === "documentation") items = items.filter(i => i.category === "documentation");
    if (quickView === "templates") items = items.filter(i => i.category === "templates");
    if (quickView === "references") items = items.filter(i => i.category === "references");
    if (quickView === "favorite") items = items.filter(i => i.isFavorite);
    if (quickView === "recent") items = items.slice(0, 5);

    // Department filter
    if (department && !department.includes("ALL")) {
      items = items.filter(i => department.includes(i.department));
    }

    // Type filter
    if (docType && !docType.includes("ALL")) {
      items = items.filter(i => docType.includes(i.type));
    }

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
    return <GroupedView items={filteredItems} onItemClick={handleItemClick} canManage={canManage} docType={docType} quickView={quickView} sortOption={sortOption} />;
  }

  return <ListView items={filteredItems} onItemClick={handleItemClick} canManage={canManage} docType={docType} quickView={quickView} sortOption={sortOption} onSortChange={onSortChange} />;
}

type SortKey = "title" | "type" | "department" | "lastUpdated";
type SortDir = "asc" | "desc";

function ListView({ items, onItemClick, canManage, docType, quickView, sortOption, onSortChange }: { items: KnowledgeItem[]; onItemClick: (id: string) => void; canManage: boolean; docType: string[]; quickView: QuickView; sortOption?: SortOptionValue; onSortChange?: (val: SortOptionValue) => void }) {
  const [sortKey, setSortKey] = useState<SortKey>("lastUpdated");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  React.useEffect(() => {
    if (sortOption) {
      if (sortOption === "name-asc") { setSortKey("title"); setSortDir("asc"); }
      else if (sortOption === "name-desc") { setSortKey("title"); setSortDir("desc"); }
      else if (sortOption === "date-asc") { setSortKey("lastUpdated"); setSortDir("asc"); }
      else if (sortOption === "date-desc") { setSortKey("lastUpdated"); setSortDir("desc"); }
    }
  }, [sortOption]);

  const toggleSort = (key: SortKey) => {
    let newDir = "asc";
    if (sortKey === key) {
      newDir = sortDir === "asc" ? "desc" : "asc";
    }
    setSortKey(key);
    setSortDir(newDir as SortDir);

    if (key === "title") onSortChange?.(`name-${newDir}` as SortOptionValue);
    else if (key === "lastUpdated") onSortChange?.(`date-${newDir}` as SortOptionValue);
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
    const isFavorite = quickView.includes('favorite');
    const category = docType[0];
    const categoryLabel = category ? category.toLowerCase() : (isFavorite ? 'favorite' : 'knowledge');
    const naturalMessage = isFavorite
      ? "You haven't added any favorites yet. Start bookmarking important items to see them here."
      : `Ready to start building our library? Add your first ${categoryLabel} piece right here.`;

    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="relative mb-6">
          <div className="relative w-24 h-24 bg-white/40 backdrop-blur-xl rounded-3xl border border-white/20 flex items-center justify-center shadow-2xl">
            <FolderOpen className="w-12 h-12 text-neutral-400" strokeWidth={1.5} />
          </div>
        </div>
        <h3 className="text-xl font-bold text-neutral-900 mb-2">{isFavorite ? "No favorites yet" : "No knowledge found"}</h3>
        <p className="text-neutral-500 max-w-[280px] leading-relaxed mb-8">
          {naturalMessage}
        </p>
        {canManage && (
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('ADIDAYA_OPEN_ADD_KNOWLEDGE'))}
            className="px-8 py-3 bg-blue-600 backdrop-blur-md text-white rounded-full font-bold text-[15px] shadow-lg active:scale-95 transition-all"
          >
            Add New Knowledge
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Mobile: Card View */}
      <div className="lg:hidden space-y-4">
        {sortedItems.map((item) => (
          <LearnItemCard
            key={item.id}
            title={item.title}
            type={item.type}
            department={item.department}
            lastUpdated={item.lastUpdated}
            isFavorite={item.isFavorite}
            onClick={() => onItemClick(item.id)}
          />
        ))}
      </div>

      {/* Desktop: Table View */}
      <div className="hidden lg:block bg-white rounded-xl border border-neutral-100 overflow-hidden">
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
    </>
  );
}

function GroupedView({ items, onItemClick, canManage, docType, quickView, sortOption }: { items: KnowledgeItem[]; onItemClick: (id: string) => void; canManage: boolean; docType: string[]; quickView: QuickView; sortOption?: SortOptionValue }) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["DESIGN", "CONSTRUCTION"]));

  const grouped = useMemo(() => {
    const groups: Record<string, KnowledgeItem[]> = {};
    const sorted = [...items];
    if (sortOption) {
      const mult = sortOption.endsWith("-asc") ? 1 : -1;
      if (sortOption.startsWith("name")) {
        sorted.sort((a, b) => mult * a.title.localeCompare(b.title));
      } else if (sortOption.startsWith("date")) {
        sorted.sort((a, b) => mult * a.lastUpdated.localeCompare(b.lastUpdated));
      }
    }
    sorted.forEach(item => {
      if (!groups[item.department]) groups[item.department] = [];
      groups[item.department].push(item);
    });
    return groups;
  }, [items, sortOption]);

  const toggleGroup = (dept: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(dept)) next.delete(dept);
      else next.add(dept);
      return next;
    });
  };

  if (Object.keys(grouped).length === 0) {
    const isFavorite = quickView.includes('favorite');
    const category = docType[0];
    const categoryLabel = category ? category.toLowerCase() : (isFavorite ? 'favorite' : 'knowledge');
    const naturalMessage = isFavorite
      ? "You haven't added any favorites yet. Start bookmarking important items to see them here."
      : `Ready to start building our library? Add your first ${categoryLabel} piece right here.`;

    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="relative mb-6">
          <div className="relative w-24 h-24 bg-white/40 backdrop-blur-xl rounded-3xl border border-white/20 flex items-center justify-center shadow-2xl">
            <FolderOpen className="w-12 h-12 text-neutral-400" strokeWidth={1.5} />
          </div>
        </div>
        <h3 className="text-xl font-bold text-neutral-900 mb-2">{isFavorite ? "No favorites yet" : "No knowledge found"}</h3>
        <p className="text-neutral-500 max-w-[280px] leading-relaxed mb-8">
          {naturalMessage}
        </p>
        {canManage && (
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('ADIDAYA_OPEN_ADD_KNOWLEDGE'))}
            className="px-8 py-3 bg-blue-600 backdrop-blur-md text-white rounded-full font-bold text-[15px] shadow-lg active:scale-95 transition-all"
          >
            Add New Knowledge
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([dept, deptItems]) => {
        const isExpanded = expandedGroups.has(dept);

        return (
          <div key={dept} className="bg-transparent lg:bg-white rounded-[24px] lg:rounded-xl border-none lg:border lg:border-neutral-100 overflow-hidden">
            <button
              onClick={() => toggleGroup(dept)}
              className="w-full px-4 py-3 bg-neutral-100/50 lg:bg-neutral-50 border-b border-neutral-200/50 lg:border-neutral-100 flex items-center justify-between hover:bg-neutral-100 transition-colors rounded-2xl lg:rounded-none group"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-neutral-900">{DEPT_LABEL[dept] || dept}</span>
                {isExpanded ? <ChevronDown className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 transition-colors" /> : <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 transition-colors" />}
              </div>
              <div className="px-2 py-0.5 bg-neutral-200/50 text-neutral-500 rounded-full text-[11px] font-medium border border-black/5">
                {deptItems.length} items
              </div>
            </button>

            {isExpanded && (
              <div className="mt-3 lg:mt-0 lg:divide-y lg:divide-neutral-50 flex flex-col gap-3 lg:gap-0">
                {deptItems.map(item => (
                  <React.Fragment key={item.id}>
                    {/* Mobile Grouped Item */}
                    <div className="lg:hidden">
                      <LearnItemCard
                        title={item.title}
                        type={item.type}
                        department={item.department}
                        lastUpdated={item.lastUpdated}
                        isFavorite={item.isFavorite}
                        onClick={() => onItemClick(item.id)}
                      />
                    </div>

                    {/* Desktop Grouped Item */}
                    <div
                      onClick={() => onItemClick(item.id)}
                      className="hidden lg:flex px-4 py-3 hover:bg-neutral-50/70 transition-colors cursor-pointer group items-center justify-between"
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
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Package,
  Plus,
  Trash2,
  Save,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Share2,
  ExternalLink,
  ArrowUpRight,
  Edit3,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import clsx from "clsx";
import { fetchProjectsByWorkspace } from "@/lib/flow/repositories/project.repo";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";
import {
  fetchOrCreateDCR,
  fetchDCRMaterials,
  saveDCRMaterial,
  deleteDCRMaterial,
  bulkSaveDCRMaterials,
  DCRReport,
  DCRMaterial,
} from "@/lib/api/dcr";

interface FieldMaterialPreviewProps {
  isProjectDetail?: boolean;
  projectName?: string;
  onSelectNode?: (nodeId: string, stage?: string) => void;
}

export default function FieldMaterialPreview({
  isProjectDetail = false,
  projectName,
  onSelectNode,
}: FieldMaterialPreviewProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "edit" | "related">("preview");
  const [projectList, setProjectList] = useState<any[]>([]);
  const [activeProject, setActiveProject] = useState<string>(projectName || "");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [scale, setScale] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // DCR + Material State
  const [dcrReport, setDcrReport] = useState<DCRReport | null>(null);
  const [materials, setMaterials] = useState<DCRMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Edit mode state
  const [editRows, setEditRows] = useState<Array<{
    id?: string;
    category: string;
    name: string;
    unit: string;
    incoming: number;
    used: number;
    stock: number;
  }>>([]);

  // Dynamic A4 Scale
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const availableWidth = containerRef.current.clientWidth - 80;
        if (availableWidth > 0) {
          const newScale = Math.min(availableWidth / 794, 1);
          setScale(Math.max(0.1, newScale));
        }
      }
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
      window.removeEventListener("resize", updateScale);
      observer.disconnect();
    };
  }, []);

  // Sync prop
  useEffect(() => {
    if (projectName) setActiveProject(projectName);
  }, [projectName]);

  // Load projects
  useEffect(() => {
    async function loadProjects() {
      try {
        const wsId = await fetchDefaultWorkspaceId();
        const dbProjects = await fetchProjectsByWorkspace(wsId || undefined);
        if (dbProjects && dbProjects.length > 0) {
          const formatted = dbProjects.map((p: any) => {
            const rawCode = p.project_code || p.project_number || p.code || "";
            const cleanCode = rawCode.replace("[", "").replace("]", "").trim().toUpperCase();
            const name = p.project_name || p.name || "";
            const fullName = cleanCode ? `[${cleanCode}] ${name}` : name;
            return {
              id: p.id,
              code: cleanCode ? `[${cleanCode}]` : "",
              cleanCode: cleanCode || "",
              name,
              fullName,
              location: p.location || p.site_location || p.address || "",
              stage: p.stage || p.current_stage || "",
            };
          });
          setProjectList(formatted);

          const searchKey = projectName || activeProject;
          if (searchKey) {
            const match = formatted.find((p: any) =>
              p.name.toLowerCase() === searchKey.toLowerCase() ||
              p.fullName.toLowerCase() === searchKey.toLowerCase() ||
              (p.cleanCode && searchKey.toUpperCase().includes(p.cleanCode))
            );
            setActiveProject(match ? match.fullName : formatted[0].fullName);
          } else {
            setActiveProject(formatted[0].fullName);
          }
        }
      } catch (err) {
        console.error("Error loading project list:", err);
      }
    }
    loadProjects();
  }, [projectName]);

  const formatLocationStr = (loc: any): string => {
    if (!loc) return "—";
    if (typeof loc === "string") return loc.trim() || "—";
    if (typeof loc === "object") {
      const parts = [loc.address, loc.city || loc.district, loc.province].filter(Boolean);
      if (parts.length > 0) return parts.join(", ");
    }
    return "—";
  };

  const projInfo = useMemo(() => {
    let matched = projectList.find((p: any) =>
      p.fullName === activeProject ||
      p.name === activeProject ||
      (p.cleanCode && activeProject?.toUpperCase().includes(p.cleanCode))
    );
    if (!matched && projectList.length > 0) matched = projectList[0];

    let code = matched?.cleanCode || "PROJ";
    let cleanName = matched?.name || (activeProject ? activeProject.replace(/\[.*?\]/, "").trim() : "Project");
    let location = matched?.location ? formatLocationStr(matched.location) : "—";
    let stage = matched?.stage && typeof matched.stage === "string" ? matched.stage : "—";

    return { code, cleanName, location, stage };
  }, [activeProject, projectList]);

  // Resolve project code
  const getProjectCode = () => {
    let projCode = activeProject;
    if (activeProject.includes("[")) {
      projCode = activeProject.split("]")[0].replace("[", "").trim().toUpperCase();
    }
    const matchedProj = projectList.find((p: any) => p.name === activeProject || p.id === activeProject);
    if (matchedProj && matchedProj.code) {
      projCode = matchedProj.code.replace("[", "").replace("]", "").trim().toUpperCase();
    }
    return projCode;
  };

  // Load DCR + materials from DB
  useEffect(() => {
    async function loadDCRMaterials() {
      try {
        setIsLoading(true);
        const wsId = await fetchDefaultWorkspaceId();
        if (!wsId) return;

        const projCode = getProjectCode();
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
        const day = String(selectedDate.getDate()).padStart(2, "0");
        const dateStr = `${year}-${month}-${day}`;

        const dcr = await fetchOrCreateDCR(wsId, projCode, dateStr);
        setDcrReport(dcr);

        if (dcr) {
          const dbMaterials = await fetchDCRMaterials(dcr.id);
          setMaterials(dbMaterials);
        } else {
          setMaterials([]);
        }
      } catch (err) {
        console.error("Error loading DCR materials:", err);
        setMaterials([]);
      } finally {
        setIsLoading(false);
      }
    }
    if (activeProject && projectList.length > 0) {
      loadDCRMaterials();
    }
  }, [activeProject, selectedDate, projectList]);

  const handleDateChange = (days: number) => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + days);
    setSelectedDate(nextDate);
  };

  // Enter edit mode
  const handleStartEdit = () => {
    setEditRows(
      materials.length > 0
        ? materials.map((m) => ({
            id: m.id,
            category: m.category,
            name: m.name,
            unit: m.unit,
            incoming: m.incoming,
            used: m.used,
            stock: m.stock,
          }))
        : [{ category: "MATERIAL", name: "", unit: "unit", incoming: 0, used: 0, stock: 0 }]
    );
    setActiveTab("edit");
    setSaveSuccess(false);
  };

  // Add row in edit mode
  const handleAddRow = () => {
    setEditRows((prev) => [
      ...prev,
      { category: "MATERIAL", name: "", unit: "unit", incoming: 0, used: 0, stock: 0 },
    ]);
  };

  // Remove row in edit mode
  const handleRemoveRow = (idx: number) => {
    setEditRows((prev) => prev.filter((_, i) => i !== idx));
  };

  // Update row field
  const handleRowChange = (idx: number, field: string, value: any) => {
    setEditRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row))
    );
  };

  // Save all
  const handleSave = async () => {
    if (!dcrReport) return;
    setIsSaving(true);
    try {
      const validRows = editRows.filter((r) => r.name.trim() !== "");
      const success = await bulkSaveDCRMaterials(
        dcrReport.id,
        validRows.map((r, idx) => ({
          category: r.category as any,
          name: r.name,
          unit: r.unit,
          incoming: r.incoming,
          used: r.used,
          stock: r.stock,
          sortOrder: idx,
        }))
      );

      if (success) {
        // Reload from DB
        const dbMaterials = await fetchDCRMaterials(dcrReport.id);
        setMaterials(dbMaterials);
        setSaveSuccess(true);
        setTimeout(() => {
          setActiveTab("preview");
          setSaveSuccess(false);
        }, 1200);
      }
    } catch (err) {
      console.error("Error saving materials:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Totals
  const totalIncoming = materials.reduce((a, m) => a + m.incoming, 0);
  const totalUsed = materials.reduce((a, m) => a + m.used, 0);
  const totalStock = materials.reduce((a, m) => a + m.stock, 0);

  const PAGE_HEIGHT_PX = 1123;
  const displayWidth = 794 * scale;
  const displayHeight = PAGE_HEIGHT_PX * scale;

  return (
    <div className="w-full space-y-4 font-sans">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800/80 pb-4">
        <div className="space-y-1">
          <div className="text-xs font-mono font-bold text-neutral-400">94 01 00</div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight leading-snug">
            RSC — Field Material Log
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap pt-0.5">
          <div className="flex items-center p-1 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 text-xs font-semibold">
            <button
              onClick={() => setActiveTab("preview")}
              className={clsx(
                "px-3.5 py-1 rounded-full transition-all cursor-pointer",
                activeTab === "preview"
                  ? "bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 shadow-2xs font-bold"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
              )}
            >
              Document Preview
            </button>
            <button
              onClick={handleStartEdit}
              className={clsx(
                "px-3.5 py-1 rounded-full transition-all cursor-pointer",
                activeTab === "edit"
                  ? "bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 shadow-2xs font-bold"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
              )}
            >
              Edit Data
            </button>
            <button
              onClick={() => setActiveTab("related")}
              className={clsx(
                "px-3.5 py-1 rounded-full transition-all cursor-pointer",
                activeTab === "related"
                  ? "bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 shadow-2xs font-bold"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
              )}
            >
              Related Links
            </button>
          </div>
        </div>
      </div>

      {/* RELATED LINKS TAB */}
      {activeTab === "related" ? (
        <div className="space-y-6 animate-in fade-in duration-300 py-2">
          <div className="space-y-1 border-b border-neutral-100 dark:border-neutral-800 pb-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Share2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Related Links & Connected Data Sources</span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Modul yang terhubung dengan pencatatan material, alat, dan jasa lapangan harian:
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 dark:text-neutral-500 font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="pb-3 pr-4 w-28 font-mono">CODE</th>
                  <th className="pb-3 px-4 w-52">MODULE NAME</th>
                  <th className="pb-3 px-4">SHORT DESCRIPTION</th>
                  <th className="pb-3 pl-4 w-32 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-medium">
                {[
                  { code: "71 01 00", name: "DCR — Daily Construction Report", description: "Laporan harian utama yang merangkum field material log.", nodeId: "71-01-00" },
                  { code: "94 00 00", name: "RSC — Resources", description: "Pencatatan resource secara terstruktur harian.", nodeId: "94-00-00" },
                  { code: "94 01 01", name: "Material In", description: "Logistik material masuk harian.", nodeId: "94-01-01" },
                ].map((item) => (
                  <tr
                    key={item.code}
                    onClick={() => onSelectNode?.(item.nodeId)}
                    className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 pr-4 align-top whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/80 dark:border-neutral-700/80 text-xs font-mono font-bold tracking-tight whitespace-nowrap shrink-0 group-hover:border-blue-300 group-hover:text-blue-600 transition-colors">
                        {item.code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 align-top font-bold text-neutral-900 dark:text-white text-xs group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {item.name}
                    </td>
                    <td className="py-3.5 px-4 align-top text-neutral-500 dark:text-neutral-400 text-xs leading-relaxed">
                      {item.description}
                    </td>
                    <td className="py-3.5 pl-4 align-top text-right">
                      <button className="px-3 py-1 rounded-full text-xs font-bold text-neutral-700 dark:text-neutral-300 group-hover:text-blue-600 border border-neutral-200 dark:border-neutral-700 group-hover:border-blue-300 transition-all inline-flex items-center gap-1 cursor-pointer shadow-2xs">
                        <span>Open Node</span>
                        <ExternalLink className="w-3 h-3 text-neutral-400 group-hover:text-blue-600" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Link to Resources module */}
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <a
              href="/flow/resources/materials"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Package className="w-4 h-4" />
              <span>Manage Master Material Catalog</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      ) : activeTab === "edit" ? (
        /* EDIT MODE */
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <div className="relative inline-flex items-center">
              <select
                value={activeProject}
                onChange={(e) => setActiveProject(e.target.value)}
                className="appearance-none rounded-full bg-neutral-100/90 dark:bg-neutral-800/90 backdrop-blur-sm border border-neutral-200/80 dark:border-neutral-700/80 px-4 py-1.5 pr-8 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 transition-all cursor-pointer outline-none focus:outline-none shadow-2xs"
              >
                {projectList.length > 0 ? (
                  projectList.map((p: any) => (
                    <option key={p.id} value={p.fullName} className="dark:bg-neutral-900">
                      {p.fullName}
                    </option>
                  ))
                ) : (
                  <option value={activeProject}>{activeProject}</option>
                )}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-3 pointer-events-none" />
            </div>

            <div className="flex items-center gap-1.5">
              <button onClick={() => handleDateChange(-1)} className="p-1.5 rounded-full bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 transition-all cursor-pointer shadow-2xs">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <div className="px-3 py-1.5 rounded-full bg-neutral-100/80 dark:bg-neutral-800/80 backdrop-blur-sm border border-neutral-200/80 dark:border-neutral-700/80 text-xs font-semibold text-neutral-800 dark:text-neutral-200 shadow-2xs">
                <span className="whitespace-nowrap">{selectedDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>
              <button onClick={() => handleDateChange(1)} className="p-1.5 rounded-full bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 transition-all cursor-pointer shadow-2xs">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setSelectedDate(new Date())} className="px-2.5 py-1.5 rounded-full text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
                Today
              </button>
            </div>
          </div>

          {/* EDITABLE TABLE */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="bg-neutral-50 dark:bg-neutral-800/50 px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                Edit Material Log — {selectedDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddRow}
                  className="px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Row</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={clsx(
                    "px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs",
                    saveSuccess
                      ? "bg-emerald-600 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  )}
                >
                  {saveSuccess ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Saved!</span>
                    </>
                  ) : isSaving ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save All</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-800/30 border-b border-neutral-200 dark:border-neutral-700 text-[11px] font-bold text-neutral-500 uppercase">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3 w-28">Category</th>
                    <th className="py-2.5 px-3">Material / Equipment / Service Name</th>
                    <th className="py-2.5 px-3 w-20">Unit</th>
                    <th className="py-2.5 px-3 w-24 text-center">Incoming</th>
                    <th className="py-2.5 px-3 w-24 text-center">Used</th>
                    <th className="py-2.5 px-3 w-24 text-center">Stock</th>
                    <th className="py-2.5 px-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {editRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-neutral-400 text-xs">
                        <div className="flex flex-col items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-neutral-300" />
                          <span>No entries yet. Click "Add Row" to start.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    editRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                        <td className="py-2 px-3 text-center font-mono font-bold text-neutral-400 text-xs">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-2">
                          <select
                            value={row.category}
                            onChange={(e) => handleRowChange(idx, "category", e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200 outline-none focus:border-blue-400 transition-colors cursor-pointer"
                          >
                            <option value="MATERIAL">MATERIAL</option>
                            <option value="EQUIPMENT">EQUIPMENT</option>
                            <option value="SERVICE">SERVICE</option>
                          </select>
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) => handleRowChange(idx, "name", e.target.value)}
                            placeholder="Enter material name..."
                            className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200 outline-none focus:border-blue-400 transition-colors placeholder:text-neutral-300"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={row.unit}
                            onChange={(e) => handleRowChange(idx, "unit", e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200 outline-none focus:border-blue-400 text-center transition-colors"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            value={row.incoming}
                            onChange={(e) => handleRowChange(idx, "incoming", Number(e.target.value))}
                            className="w-full px-2 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-bold text-neutral-800 dark:text-neutral-200 outline-none focus:border-blue-400 text-center transition-colors"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            value={row.used}
                            onChange={(e) => handleRowChange(idx, "used", Number(e.target.value))}
                            className="w-full px-2 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-bold text-neutral-800 dark:text-neutral-200 outline-none focus:border-blue-400 text-center transition-colors"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            value={row.stock}
                            onChange={(e) => handleRowChange(idx, "stock", Number(e.target.value))}
                            className="w-full px-2 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-bold text-neutral-800 dark:text-neutral-200 outline-none focus:border-blue-400 text-center transition-colors"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={() => handleRemoveRow(idx)}
                            className="p-1 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick link to Resources module */}
          <div className="flex items-center gap-3 pt-2">
            <a
              href="/flow/resources/materials"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all cursor-pointer"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Browse Master Catalog</span>
              <ArrowUpRight className="w-3 h-3 text-neutral-400" />
            </a>
          </div>
        </div>
      ) : (
        /* DOCUMENT PREVIEW */
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-neutral-100 dark:border-neutral-800 print:hidden w-full">
            <div className="relative inline-flex items-center">
              <select
                value={activeProject}
                onChange={(e) => setActiveProject(e.target.value)}
                className="appearance-none rounded-full bg-neutral-100/90 dark:bg-neutral-800/90 backdrop-blur-sm border border-neutral-200/80 dark:border-neutral-700/80 px-4 py-1.5 pr-8 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 transition-all cursor-pointer outline-none focus:outline-none shadow-2xs"
              >
                {projectList.length > 0 ? (
                  projectList.map((p: any) => (
                    <option key={p.id} value={p.fullName} className="dark:bg-neutral-900">
                      {p.fullName}
                    </option>
                  ))
                ) : (
                  <option value={activeProject}>{activeProject}</option>
                )}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-3 pointer-events-none" />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => handleDateChange(-1)} className="p-1.5 rounded-full bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 transition-all cursor-pointer shadow-2xs">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <div className="px-3 py-1.5 rounded-full bg-neutral-100/80 dark:bg-neutral-800/80 backdrop-blur-sm border border-neutral-200/80 dark:border-neutral-700/80 text-xs font-semibold text-neutral-800 dark:text-neutral-200 shadow-2xs">
                <span className="whitespace-nowrap">{selectedDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>
              <button onClick={() => handleDateChange(1)} className="p-1.5 rounded-full bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 transition-all cursor-pointer shadow-2xs">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setSelectedDate(new Date())} className="px-2.5 py-1.5 rounded-full text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
                Today
              </button>
              <button
                onClick={handleStartEdit}
                className="ml-1 px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-xs transition-all shadow-2xs flex items-center gap-1 cursor-pointer print:hidden group whitespace-nowrap"
              >
                <span>Edit Material Log</span>
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* A4 Preview */}
          <div ref={containerRef} className="w-full flex justify-center py-2">
            <div
              className="mx-auto relative transition-all duration-150 ease-out shrink-0"
              style={{ width: `${displayWidth}px`, height: `${displayHeight}px` }}
            >
              <div
                className="absolute top-0 left-0"
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
              >
                <div
                  className="bg-white text-neutral-900 shadow-2xl rounded-xs border border-neutral-300 select-none flex flex-col justify-between p-8 print:shadow-none print:p-0 print:border-none"
                  style={{
                    width: "794px",
                    minWidth: "794px",
                    maxWidth: "794px",
                    height: "1123px",
                    minHeight: "1123px",
                    maxHeight: "1123px",
                    fontFamily: "Arial, sans-serif",
                    boxSizing: "border-box",
                  }}
                >
                  {/* TOP SECTION */}
                  <div className="space-y-3">
                    {/* HEADER */}
                    <div className="border-b-2 border-neutral-900 pb-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="shrink-0 pr-1">
                          <img src="/logo-adidaya-red.svg" alt="Adidaya" className="h-8 w-auto object-contain filter brightness-0" />
                        </div>
                        <div className="pl-4 border-l border-neutral-300">
                          <div className="text-[6px] font-bold text-neutral-400">Project</div>
                          <div className="flex items-center gap-2">
                            <span className="inline-block px-1.5 py-0.5 bg-neutral-900 text-white text-[7px] font-black rounded-sm leading-none shrink-0">
                              {projInfo.code}
                            </span>
                            <span className="font-extrabold text-[11px] text-neutral-900 tracking-tight leading-tight">
                              {projInfo.cleanName}
                            </span>
                          </div>
                          <div className="text-[6px] font-bold text-neutral-400 pt-1">Location</div>
                          <div className="text-[8px] font-semibold text-neutral-700 leading-tight">{projInfo.location}</div>
                        </div>
                      </div>
                      <div className="w-[140px] shrink-0 border border-neutral-300 rounded-sm flex flex-col items-center justify-between p-2 text-center bg-neutral-50/50">
                        <div className="font-black text-[22px] text-neutral-900 leading-none tracking-tighter">RSC</div>
                        <div className="text-[5.5px] font-black text-neutral-900 tracking-wider leading-tight pt-1">Field Material Log</div>
                        <div className="text-[5px] font-semibold text-neutral-500 tracking-tight leading-tight">Material, Equipment & Services</div>
                        <div className="w-full border-t border-neutral-300 my-1" />
                        <div className="font-black text-[13px] text-neutral-900 tracking-tight leading-none">94 01 00</div>
                        <div className="w-full border-t border-neutral-200 my-1" />
                        <div className="w-full grid grid-cols-2 gap-x-1 text-[5px] text-neutral-500">
                          <span className="text-left font-bold">Log Date</span>
                          <span className="text-right font-bold">Rev</span>
                          <span className="text-left font-black text-neutral-800">{selectedDate.toLocaleDateString("en-GB")}</span>
                          <span className="text-right font-black text-neutral-800">00</span>
                        </div>
                      </div>
                    </div>

                    {/* DATE META BAR */}
                    <div className="w-full border-y border-neutral-900 py-1.5 my-2">
                      <div className="grid grid-cols-5 text-center">
                        {[
                          { label: "Day", value: selectedDate.toLocaleDateString("en-US", { weekday: "long" }) },
                          { label: "Date", value: selectedDate.toLocaleDateString("en-GB") },
                          { label: "Total Items", value: `${materials.length} Items` },
                          { label: "Total Incoming", value: `${totalIncoming}` },
                          { label: "Total Used", value: `${totalUsed}` },
                        ].map((cell, i) => (
                          <div key={i} className="flex flex-col items-center justify-center">
                            <span className="text-[5.5px] font-bold text-neutral-500 tracking-wider">{cell.label}</span>
                            <span className="text-[9px] font-bold text-neutral-900 leading-tight pt-0.5">{cell.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* MATERIAL TABLE */}
                    <div className="w-full border-y-2 border-neutral-900 bg-white overflow-hidden my-1">
                      <div className="bg-neutral-900 text-white font-extrabold text-[7px] py-1 px-2 uppercase tracking-wider flex items-center justify-between gap-2">
                        <span className="truncate">FIELD MATERIAL, EQUIPMENT & SERVICES</span>
                        <span className="text-[6.5px] font-mono text-neutral-300 font-bold bg-neutral-800 px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap ml-auto text-right">
                          94 01 00
                        </span>
                      </div>
                      <table className="w-full text-left text-xs border-collapse table-fixed">
                        <colgroup>
                          <col style={{ width: "5%" }} />
                          <col style={{ width: "15%" }} />
                          <col style={{ width: "42%" }} />
                          <col style={{ width: "10%" }} />
                          <col style={{ width: "9%" }} />
                          <col style={{ width: "9%" }} />
                          <col style={{ width: "10%" }} />
                        </colgroup>
                        <thead>
                          <tr className="bg-neutral-50 border-b border-neutral-300 text-[6px] font-extrabold text-neutral-500 uppercase">
                            <th className="p-1 text-center">NO</th>
                            <th className="p-1">CATEGORY</th>
                            <th className="p-1">MATERIAL / EQUIPMENT / SERVICE NAME</th>
                            <th className="p-1 text-center">UNIT</th>
                            <th className="p-1 text-center">INCOMING</th>
                            <th className="p-1 text-center">USED</th>
                            <th className="p-1 text-center">STOCK</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 text-[6.5px]">
                          {materials.length > 0 ? (
                            materials.map((m, idx) => (
                              <tr key={m.id} className="border-b border-neutral-200 hover:bg-neutral-50/60">
                                <td className="p-1 text-center font-mono font-bold text-neutral-400">{idx + 1}</td>
                                <td className="p-1 font-bold text-neutral-600 uppercase">{m.category}</td>
                                <td className="p-1 font-bold text-neutral-800">{m.name}</td>
                                <td className="p-1 text-center font-semibold text-neutral-600">{m.unit}</td>
                                <td className="p-1 text-center font-bold text-neutral-800">{m.incoming}</td>
                                <td className="p-1 text-center font-bold text-neutral-800">{m.used}</td>
                                <td className="p-1 text-center font-bold text-neutral-800">{m.stock}</td>
                              </tr>
                            ))
                          ) : (
                            <tr className="border-b border-neutral-200 text-[6.5px]">
                              <td className="p-1 text-center font-bold text-neutral-400">1</td>
                              <td className="p-1 font-bold text-neutral-600 uppercase">MATERIAL</td>
                              <td className="p-1 font-semibold text-neutral-400 italic">No recorded material or equipment entries for this date.</td>
                              <td className="p-1 text-center font-semibold text-neutral-600">unit</td>
                              <td className="p-1 text-center font-bold text-neutral-800">0</td>
                              <td className="p-1 text-center font-bold text-neutral-800">0</td>
                              <td className="p-1 text-center font-bold text-neutral-800">0</td>
                            </tr>
                          )}
                        </tbody>
                        {materials.length > 0 && (
                          <tfoot>
                            <tr className="bg-neutral-100 font-bold text-neutral-900 border-t-2 border-neutral-900 border-b border-neutral-300">
                              <td colSpan={4} className="p-1 pl-2 text-[6.5px] font-extrabold">
                                Total Summary ({materials.length} Items)
                              </td>
                              <td className="p-1 text-center text-[7px] font-black">{totalIncoming}</td>
                              <td className="p-1 text-center text-[7px] font-black">{totalUsed}</td>
                              <td className="p-1 text-center text-[7px] font-black text-blue-600">{totalStock}</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>

                  {/* PAGE FOOTER */}
                  <div className="pt-2 border-t border-neutral-200 flex items-center justify-between text-[7.5px] font-bold text-neutral-400 tracking-wider">
                    <span>Adidaya Studio | Field Material Log</span>
                    <span>RSC 94 01 00 | 1/1</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

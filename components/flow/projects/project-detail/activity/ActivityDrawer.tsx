"use client";

import { useState, useMemo } from "react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Select } from "@/shared/ui/primitives/select/select";
import { Input } from "@/shared/ui/primitives/input/input";
import {
  CloudSun,
  Users,
  Settings,
  Truck,
  Hammer,
  FileText,
  Image as ImageIcon,
  ChevronDown,
  Wallet
} from "lucide-react";

type ActivityDrawerMode = "create" | "task";

interface ActivityDrawerProps {
  open: boolean;
  mode: ActivityDrawerMode;
  onClose: () => void;
}

type Category = "design" | "site" | "expense" | "procurement";
type SiteActivityType = "progress" | "daily_log" | "logistics";
type DesignInputType = "drawing" | "narrative" | "meeting";

/* ================= CONSTANTS ================= */

const STAGES = [
  "01-KO-Kickoff",
  "02-SD-Schematic Design",
  "03-DD-Design Development",
  "04-CD-Construction Drawings",
  "05-TN-Tender",
  "06-CN-Construction",
  "07-HO-Handover"
];

const TASKS_BY_STAGE: Record<string, string[]> = {
  "01-KO-Kickoff": ["KO-01 Site Survey", "KO-02 Initial Brief"],
  "02-SD-Schematic Design": ["SD-01 Area Programming", "SD-02 Floor Plans", "SD-03 Elevations", "SD-04 3D Massing"],
  "03-DD-Design Development": ["DD-01 Facade Details", "DD-02 MEP Coordination", "DD-03 Structural Grid"],
  "04-CD-Construction Drawings": ["CD-01 Foundation Plan", "CD-02 Beam Layout", "CD-03 Power Points"],
  "05-TN-Tender": ["TN-01 BoQ Prep", "TN-02 Vendor Selection"],
  "06-CN-Construction": ["CN-01 Site Supervision", "CN-02 As-Built Drawings"],
  "07-HO-Handover": ["HO-01 Defect List", "HO-02 Final Handover"]
};

// Mock WBS Tree
const WBS_TREE = [
  {
    id: "4.0", label: "4.0 Structure Works", children: [
      { id: "4.1", label: "4.1 Sub-Structure" },
      {
        id: "4.2", label: "4.2 Upper Structure", children: [
          { id: "4.2.1", label: "4.2.1 Columns L1" },
          { id: "4.2.2", label: "4.2.2 Slab L2" },
          { id: "4.2.3", label: "4.2.3 Beams L2" },
        ]
      }
    ]
  },
  {
    id: "5.0", label: "5.0 Architectural Works", children: [
      { id: "5.1", label: "5.1 Masonry" },
      { id: "5.2", label: "5.2 Floor Finishes" }
    ]
  }
];

const LOGISTICS_ACTIONS = [
  "Material Delivery",
  "Material Depleted",
  "Tool Mobilization",
  "Tool Demobilization",
  "Tool Repair",
  "Tool Borrowed"
];

const WEATHER_OPTIONS = ["Sunny", "Cloudy", "Rain", "Heavy Rain"];
const EXPENSE_CATS = ["Transport", "Meals", "Material (Emergency)", "Tools (Small)", "Accommodation", "Other"];
const PROCUREMENT_DOCS = ["Quotation", "Purchase Order", "Invoice", "Delivery Order"];
const RAB_PACKAGES = ["Div 3 Concrete", "Div 5 Metals", "Div 8 Doors/Windows", "Div 9 Finishes"];

/* ================= COMPONENT ================= */

export default function ActivityDrawer({
  open,
  mode,
  onClose,
}: ActivityDrawerProps) {
  const [category, setCategory] = useState<Category>("design");

  // Design State
  const [designStage, setDesignStage] = useState(STAGES[1]);
  const [designTask, setDesignTask] = useState("");
  const [designInputType, setDesignInputType] = useState<DesignInputType>("drawing");

  // Site State
  const [siteType, setSiteType] = useState<SiteActivityType>("progress");
  const [wbsSelection, setWbsSelection] = useState("");
  const [wbsChildSelection, setWbsChildSelection] = useState("");

  // Daily Log State
  const [weatherAM, setWeatherAM] = useState("");
  const [weatherPM, setWeatherPM] = useState("");

  // Expense State
  const [isReimburse, setIsReimburse] = useState(true);
  const [expenseCat, setExpenseCat] = useState("");

  // Procurement State
  const [rabPackage, setRabPackage] = useState("");
  const [docType, setDocType] = useState("");
  const [logisticsAction, setLogisticsAction] = useState("");

  // Time State
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  if (!open) return null;

  const title = mode === "create" ? "Add Activity" : "Edit Activity";
  const secondaryLabel = mode === "create" ? "Save Draft" : "Discard";

  // Helpers to transform string arrays to options
  const toOptions = (arr: string[]) => arr.map(s => ({ label: s, value: s }));
  const stageOptions = toOptions(STAGES);
  const taskOptions = TASKS_BY_STAGE[designStage] ? toOptions(TASKS_BY_STAGE[designStage]) : [];
  const weatherOptions = toOptions(WEATHER_OPTIONS);
  const expenseOptions = toOptions(EXPENSE_CATS);
  const logActionOptions = toOptions(LOGISTICS_ACTIONS);
  const rabOptions = toOptions(RAB_PACKAGES);
  const docOptions = toOptions(PROCUREMENT_DOCS);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* BACKDROP */}
      <div
        className="absolute inset-0 bg-neutral-900/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* DRAWER PANEL */}
      <div className="relative z-10 w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 sm:rounded-l-3xl overflow-hidden border-l border-neutral-100">

        {/* HEADER */}
        <div className="px-6 py-5 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-neutral-100">
          <div>
            <h2 className="text-xl font-bold text-neutral-900 tracking-tight leading-none">
              {title}
            </h2>
            <p className="text-xs text-neutral-500 mt-1">Fill in the details to record progress.</p>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full flex items-center justify-center bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 transition-all active:scale-95"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 bg-neutral-50/50">

          {/* CATEGORY SELECTION */}
          <section className="bg-white p-4 rounded-2xl border border-neutral-200/60 shadow-sm">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
              Log Category
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(["design", "site", "expense", "procurement"] as Category[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`flex flex-col items-center justify-center py-3 rounded-xl transition-all duration-200 gap-1.5 ${category === cat
                    ? "bg-neutral-900 text-white shadow-md scale-[1.02]"
                    : "bg-neutral-50 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
                    }`}
                >
                  {/* Icons per category */}
                  {cat === "design" && <Hammer className="w-5 h-5" />}
                  {cat === "site" && <Truck className="w-5 h-5" />}
                  {cat === "expense" && <Wallet className="w-5 h-5" />}
                  {cat === "procurement" && <FileText className="w-5 h-5" />}

                  <span className="text-[10px] font-bold capitalize">{cat}</span>
                </button>
              ))}
            </div>
          </section>

          {/* DYNAMIC FORMS */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-200/60 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-neutral-100">
              <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600">
                {category === "design" && <Hammer className="w-5 h-5" />}
                {category === "site" && <Truck className="w-5 h-5" />}
                {category === "expense" && <Wallet className="w-5 h-5" />}
                {category === "procurement" && <FileText className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">
                  {category} Details
                </h3>
                <p className="text-xs text-neutral-400">Specify input for this log.</p>
              </div>
            </div>

            {/* ================= DESIGN ================= */}
            {category === "design" && (
              <div className="space-y-5">
                <Select
                  label="Stage"
                  value={designStage}
                  onChange={setDesignStage}
                  options={stageOptions}
                />

                <Select
                  label="Link to Task"
                  value={designTask}
                  onChange={setDesignTask}
                  options={taskOptions}
                  helperText={taskOptions.length === 0 ? "No tasks available for this stage" : ""}
                />

                {/* Time */}
                <TimeInputRow startTime={startTime} setStartTime={setStartTime} endTime={endTime} setEndTime={setEndTime} />

                {/* Work Type */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-2">Work Material</label>
                  <div className="flex gap-3">
                    <TypeButton
                      active={designInputType === "drawing"}
                      onClick={() => setDesignInputType("drawing")}
                      icon={<ImageIcon className="w-4 h-4" />}
                      label="Drawing"
                    />
                    <TypeButton
                      active={designInputType === "narrative"}
                      onClick={() => setDesignInputType("narrative")}
                      icon={<FileText className="w-4 h-4" />}
                      label="Narrative"
                    />
                  </div>
                </div>

                {/* Dynamic Input based on Work Type */}
                {designInputType === "drawing" ? (
                  <FileUploadBox label="Upload Drawing (PDF/DWG)" />
                ) : (
                  <textarea
                    className="w-full rounded-xl border border-neutral-200 p-3 text-sm min-h-[120px] bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all placeholder:text-neutral-400"
                    placeholder="Describe the narrative or spec update..."
                  />
                )}
              </div>
            )}

            {/* ================= SITE ================= */}
            {category === "site" && (
              <div className="space-y-5">
                {/* Site Type Switcher */}
                <div className="flex p-1 bg-neutral-100 rounded-xl gap-1">
                  <button
                    onClick={() => setSiteType("progress")}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${siteType === "progress" ? "bg-white shadow-sm text-neutral-900 ring-1 ring-black/5" : "text-neutral-500 hover:text-neutral-700"}`}
                  >
                    Progress
                  </button>
                  <button
                    onClick={() => setSiteType("daily_log")}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${siteType === "daily_log" ? "bg-white shadow-sm text-neutral-900 ring-1 ring-black/5" : "text-neutral-500 hover:text-neutral-700"}`}
                  >
                    Daily Log
                  </button>
                  <button
                    onClick={() => setSiteType("logistics")}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${siteType === "logistics" ? "bg-white shadow-sm text-neutral-900 ring-1 ring-black/5" : "text-neutral-500 hover:text-neutral-700"}`}
                  >
                    Logistics
                  </button>
                </div>

                {/* 1. TASK PROGRESS */}
                {siteType === "progress" && (
                  <div className="space-y-4 animate-in fade-in duration-300 relative">
                    <Select
                      label="Select WBS Parent"
                      value={wbsSelection}
                      onChange={setWbsSelection}
                      options={WBS_TREE.map(w => ({ label: w.label, value: w.id }))}
                    />
                    {wbsSelection && (
                      <Select
                        label="Select Specific Task (Child)"
                        value={wbsChildSelection}
                        onChange={setWbsChildSelection}
                        options={WBS_TREE.find(w => w.id === wbsSelection)?.children?.map(c => ({ label: c.label, value: c.id })) || []}
                      />
                    )}
                    <InputField label="Volume Achieved" placeholder="e.g. 15.5 m3" type="number" step="any" />
                    <div className="grid grid-cols-2 gap-4">
                      <InputField label="Start Time" type="time" />
                      <InputField label="End Time" type="time" />
                    </div>
                    <FileUploadBox label="Progress Photo/Video" />
                  </div>
                )}

                {/* 2. DAILY LOG */}
                {siteType === "daily_log" && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="grid grid-cols-2 gap-4">
                      <Select label="Weather AM" value={weatherAM} onChange={setWeatherAM} options={weatherOptions} />
                      <Select label="Weather PM" value={weatherPM} onChange={setWeatherPM} options={weatherOptions} />
                    </div>
                    <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-100 space-y-4">
                      <h4 className="text-xs font-bold text-neutral-900 flex items-center gap-2 uppercase tracking-wide">
                        <Users className="w-3 h-3" /> Manpower On Site
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <InputField label="Worker Count" inputSize="sm" placeholder="0" type="number" />
                        <InputField label="Mandor Count" inputSize="sm" placeholder="0" type="number" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-2">Site Notes</label>
                      <textarea
                        className="w-full rounded-xl border border-neutral-200 p-3 text-sm min-h-[100px] bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all placeholder:text-neutral-400"
                        placeholder="Note any issues, delays, or general updates..."
                      />
                    </div>
                  </div>
                )}

                {/* 3. LOGISTICS */}
                {siteType === "logistics" && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <Select label="Action Type" value={logisticsAction} onChange={setLogisticsAction} options={logActionOptions} />
                    <InputField label="Item / Tool Name" placeholder="e.g. Excavator Hitachi #4" />
                    <div className="grid grid-cols-2 gap-4">
                      <InputField label="Quantity" type="number" />
                      <InputField label="Condition" placeholder="Good/Broken" />
                    </div>
                    <FileUploadBox label="Delivery Note / Photo" />
                  </div>
                )}
              </div>
            )}

            {/* ================= EXPENSE ================= */}
            {category === "expense" && (
              <div className="space-y-5">
                <div className="flex bg-neutral-100 p-1 rounded-xl">
                  <label className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer transition-all font-medium ${isReimburse ? 'bg-white shadow-sm text-neutral-900 ring-1 ring-black/5' : 'text-neutral-500 hover:text-neutral-900'}`}>
                    <input type="radio" checked={isReimburse} onChange={() => setIsReimburse(true)} name="exp_type" className="hidden" />
                    Reimbursement
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer transition-all font-medium ${!isReimburse ? 'bg-white shadow-sm text-neutral-900 ring-1 ring-black/5' : 'text-neutral-500 hover:text-neutral-900'}`}>
                    <input type="radio" checked={!isReimburse} onChange={() => setIsReimburse(false)} name="exp_type" className="hidden" />
                    Request / Advance
                  </label>
                </div>

                <Select label="Expense Category" options={expenseOptions} value={expenseCat} onChange={setExpenseCat} />
                <InputField label="Amount (IDR)" type="number" placeholder="0" />

                <div className="grid grid-cols-2 gap-4">
                  <InputField label={isReimburse ? "Beneficiary Name" : "Pay To"} placeholder="Name" />
                  <InputField label="Bank Account No (Optional)" placeholder="e.g. BCA 123..." />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-2">Description</label>
                  <textarea
                    className="w-full rounded-xl border border-neutral-200 p-3 text-sm min-h-[80px] bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all"
                    placeholder="Details of the expense..."
                  />
                </div>

                <FileUploadBox label="Upload Receipt/Invoice (Mandatory)" />
              </div>
            )}

            {/* ================= PROCUREMENT ================= */}
            {category === "procurement" && (
              <div className="space-y-5">
                <Select label="Link to RAB Package" value={rabPackage} onChange={setRabPackage} options={rabOptions} />
                <Select label="Document Type" value={docType} onChange={setDocType} options={docOptions} />

                <div className="p-5 border border-neutral-200 rounded-2xl space-y-4 bg-neutral-50">
                  <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wide border-b border-neutral-200 pb-2">Item Details</h4>
                  <InputField label="Item Name" placeholder="e.g. Portland Cement" />
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="Quantity" type="number" step="any" />
                    <InputField label="Unit" placeholder="e.g. Bag" />
                  </div>
                  <InputField label="Total Budget Impact (IDR)" type="number" />
                </div>

                <div className="flex gap-3 p-3 rounded-lg bg-blue-50 text-blue-700 items-start">
                  <div className="shrink-0 mt-0.5">ℹ️</div>
                  <p className="text-xs leading-relaxed font-medium">
                    Material purchase is typically capped at 50% progress payment until verifying on-site delivery.
                  </p>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* FOOTER */}
        <div className="px-6 py-5 bg-white border-t border-neutral-100 flex justify-end gap-3 sticky bottom-0 z-20">
          <Button onClick={onClose} className="bg-transparent text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 shadow-none border-transparent">
            {secondaryLabel}
          </Button>
          <Button className="bg-neutral-900 text-white hover:bg-neutral-800 shadow-lg shadow-neutral-900/20 active:scale-95 transition-all rounded-lg px-6">
            Submit Activity
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ================= HELPERS COMPONENTS ================= */

function TimeInputRow({ startTime, setStartTime, endTime, setEndTime }: any) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-medium text-neutral-500 mb-1">Start Time <span className="text-red-500">*</span></label>
        <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} inputSize="sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500 mb-1">End Time</label>
        <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} inputSize="sm" />
      </div>
    </div>
  )
}

function TypeButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${active
        ? "border-brand-red bg-brand-red text-white"
        : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
        }`}
    >
      {icon}
      {label}
    </button>
  )
}

function FileUploadBox({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 p-4 text-center hover:bg-neutral-50 transition-colors cursor-pointer group">
      <div className="mx-auto w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center mb-2 group-hover:bg-white border text-neutral-400 font-light text-xl">
        +
      </div>
      <p className="text-xs font-medium text-neutral-600">{label}</p>
      <p className="text-[10px] text-neutral-400">Click to upload or drag files</p>
    </div>
  )
}

interface InputProps {
  label: string;
  placeholder?: string;
  type?: string;
  inputSize?: "sm" | "md";
  step?: string;
}

function InputField({ label, placeholder, type = "text", inputSize = "md", step }: InputProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-neutral-500 mb-1">{label}</label>
      <Input type={type} placeholder={placeholder} className="w-full focus:border-brand-red focus:ring-brand-red" inputSize={inputSize} step={step} />
    </div>
  )
}

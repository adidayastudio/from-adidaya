"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Select } from "@/shared/ui/primitives/select/select";
import { PROJECT_STAGES } from "@/components/flow/projects/data";
import { Upload, FileText, X } from "lucide-react";

interface DocsUploadModalProps {
    open: boolean;
    onClose: () => void;
    project: any;
}

const DOC_TYPES = [
    { label: "Contract (CON)", value: "CON" },
    { label: "Drawing (DRW)", value: "DRW" },
    { label: "Visualization (VIZ)", value: "VIZ" },
    { label: "Bundle / Export (ALL)", value: "ALL" },
    { label: "SketchUp (SKP)", value: "SKP" },
    { label: "ArchiCAD (ACD)", value: "ACD" },
    { label: "AutoCAD (DWG)", value: "DWG" },
    { label: "RAB / BOQ (RAB)", value: "RAB" },
    { label: "Schedule (SCH)", value: "SCH" },
    { label: "Other (OTH)", value: "OTH" },
];

export default function DocsUploadModal({ open, onClose, project }: DocsUploadModalProps) {
    // Form State
    const [date, setDate] = useState("");
    const [stage, setStage] = useState(PROJECT_STAGES[1].value); // Default SD
    const [type, setType] = useState(DOC_TYPES[1].value); // Default DRW
    const [title, setTitle] = useState("");
    const [version, setVersion] = useState("1");
    const [file, setFile] = useState<File | null>(null);

    // Init Date
    useEffect(() => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        setDate(`${yyyy}${mm}${dd}`);
    }, []);

    // Derived Name
    // CONVENTION: Date_ProNo_Code_Stage_Type_Title_vX
    const generatedName = `${date}_${project.projectNo}_${project.code}_${stage}_${type}_${title || "Untitled"}_v${version}`;
    const fullFileName = file ? `${generatedName}.${file.name.split('.').pop()}` : `${generatedName}.pdf`;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity ${open ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}`}>
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
                    <h3 className="font-bold text-lg text-neutral-900">Upload Document</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-neutral-100 transition-colors">
                        <X className="w-5 h-5 text-neutral-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">

                    {/* File Drop Simulated */}
                    <div className="border-2 border-dashed border-neutral-200 rounded-xl p-8 flex flex-col items-center justify-center gap-3 hover:border-brand-red/50 hover:bg-red-50/10 transition-colors cursor-pointer relative">
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                        <div className="h-10 w-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500">
                            <Upload className="w-5 h-5" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-neutral-900">{file ? file.name : "Click to upload or drag and drop"}</p>
                            <p className="text-xs text-neutral-400 mt-1">PDF, DWG, SKP, JPG (Max 50MB)</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-neutral-500">Stage</label>
                                <Select options={PROJECT_STAGES} value={stage} onChange={setStage} selectSize="sm" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-neutral-500">Doc Type</label>
                                <Select options={DOC_TYPES} value={type} onChange={setType} selectSize="sm" />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2 space-y-1.5">
                                <label className="text-xs font-medium text-neutral-500">Title</label>
                                <Input inputSize="sm" placeholder="e.g. Floor Plan" value={title} onChange={e => setTitle(e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-neutral-500">Version</label>
                                <Input inputSize="sm" placeholder="1" value={version} onChange={e => setVersion(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-100">
                        <p className="text-[10px] uppercase font-bold text-neutral-400 mb-1">Generated Filename</p>
                        <p className="text-sm font-mono text-neutral-700 break-all flex items-center gap-2">
                            <FileText className="w-4 h-4 text-brand-red shrink-0" />
                            {fullFileName}
                        </p>
                    </div>

                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-neutral-100 flex justify-end gap-3 bg-neutral-50/50">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={onClose}>Upload File</Button>
                </div>

            </div>
        </div>
    );
}

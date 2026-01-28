"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FileTreeItem {
    id: string;
    name: string;
    type: string;
    source: "opportunity" | "company";
}

export interface FileTreeSection {
    id: string;
    label: string;
    files: FileTreeItem[];
}

interface FileTreeProps {
    sections: FileTreeSection[];
    selectedFileId?: string | null;
    onSelectFile: (file: FileTreeItem) => void;
    onUploadClick?: () => void;
}

const getFileIcon = (type: string) => {
    const normalized = type.toLowerCase();
    if (normalized.includes("rfp") || normalized.includes("pws") || normalized.includes("sow")) {
        return "text-emerald-600";
    }
    if (normalized.includes("amend") || normalized.includes("attach")) {
        return "text-blue-600";
    }
    if (normalized.includes("past") || normalized.includes("proposal") || normalized.includes("cpars")) {
        return "text-amber-600";
    }
    return "text-slate-500";
};

export function FileTree({ sections, selectedFileId, onSelectFile, onUploadClick }: FileTreeProps) {
    const initialOpen = useMemo(() => {
        const state: Record<string, boolean> = {};
        sections.forEach((section) => {
            state[section.id] = true;
        });
        return state;
    }, [sections]);

    const [openSections, setOpenSections] = useState<Record<string, boolean>>(initialOpen);

    return (
        <div className="flex flex-col h-full border border-gray-200 rounded-xl bg-white">
            <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Files</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {sections.map((section) => {
                    const isOpen = openSections[section.id];
                    return (
                        <div key={section.id} className="space-y-2">
                            <button
                                onClick={() => setOpenSections((prev) => ({ ...prev, [section.id]: !isOpen }))}
                                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700"
                            >
                                {isOpen ? (
                                    <ChevronDown className="h-4 w-4" />
                                ) : (
                                    <ChevronRight className="h-4 w-4" />
                                )}
                                {section.label}
                            </button>
                            {isOpen && (
                                <div className="space-y-1">
                                    {section.files.length === 0 ? (
                                        <div className="text-xs text-gray-400 pl-6">No files</div>
                                    ) : (
                                        section.files.map((file) => (
                                            <button
                                                key={file.id}
                                                onClick={() => onSelectFile(file)}
                                                className={cn(
                                                    "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left hover:bg-slate-50",
                                                    selectedFileId === file.id && "bg-slate-100 text-slate-900"
                                                )}
                                            >
                                                <FileText className={cn("h-4 w-4", getFileIcon(file.type))} />
                                                <span className="truncate">{file.name}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="border-t border-gray-100 p-3">
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={onUploadClick}
                    disabled={!onUploadClick}
                >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                </Button>
            </div>
        </div>
    );
}

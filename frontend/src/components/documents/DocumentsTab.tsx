"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import axios from "axios";
import { ChevronDown, ChevronUp, FileText, Upload, X } from "lucide-react";
import api from "@/lib/api";
import type { Citation } from "@/lib/roxyApi";
import { FileTree, type FileTreeItem, type FileTreeSection } from "./FileTree";
import { DocumentViewer } from "./DocumentViewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface OpportunityDocument {
    id: string;
    filename: string;
    document_type: string;
    file_path?: string;
    file_url?: string;
    processed_at?: string;
}

interface CompanyDocument {
    id: string;
    filename: string;
    document_type: string;
    file_path?: string;
    file_url?: string;
    processed_at?: string;
}

export interface DocumentsTabProps {
    opportunityId: string;
    highlightedCitation?: Citation | null;
    onClearHighlight: () => void;
    onDocumentsRefresh?: () => void | Promise<void>;
    opportunityDocuments?: OpportunityDocument[];
    companyDocuments?: CompanyDocument[];
}

const isRfpType = (type: string) => ["rfp", "pws", "sow", "solicitation"].includes(type.toLowerCase());
const isAttachmentType = (type: string) => ["amendment", "attachment", "other"].includes(type.toLowerCase());
const isPastPerformanceType = (type: string) =>
    ["past_performance", "cpars", "proposal", "capability_statement"].includes(type.toLowerCase());

const resolveDocumentUrl = (doc?: OpportunityDocument | CompanyDocument | null) => {
    if (!doc) return null;
    return doc.file_url || doc.file_path || null;
};

export function DocumentsTab({
    opportunityId,
    highlightedCitation,
    onClearHighlight,
    onDocumentsRefresh,
    opportunityDocuments,
    companyDocuments,
}: DocumentsTabProps) {
    const [opportunityDocs, setOpportunityDocs] = useState<OpportunityDocument[]>([]);
    const [companyDocs, setCompanyDocs] = useState<CompanyDocument[]>([]);
    const [selectedFile, setSelectedFile] = useState<FileTreeItem | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadDocType, setUploadDocType] = useState("pws");
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploadExpanded, setIsUploadExpanded] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const hasInitializedRef = useRef(false);

    // Update local state when props change (only after initial load)
    useEffect(() => {
        if (hasInitializedRef.current && opportunityDocuments) {
            setOpportunityDocs(opportunityDocuments);
        }
    }, [opportunityDocuments]);

    useEffect(() => {
        if (hasInitializedRef.current && companyDocuments !== undefined) {
            setCompanyDocs(companyDocuments);
        }
    }, [companyDocuments]);

    // Initialize documents once on mount - NO INFINITE LOOP
    useEffect(() => {
        if (hasInitializedRef.current) return;
        
        const initializeDocuments = async () => {
            setIsLoading(true);
            try {
                if (opportunityDocuments) {
                    setOpportunityDocs(opportunityDocuments);
                } else {
                    const docsRes = await api.get(`/api/opportunities/${opportunityId}/documents`);
                    setOpportunityDocs(docsRes.data || []);
                }

                if (companyDocuments === undefined) {
                    try {
                        const oppRes = await api.get(`/api/opportunities/${opportunityId}`);
                        const companyId = oppRes.data?.company_id;
                        if (companyId) {
                            const companyDocsRes = await api.get(`/api/documents/?company_id=${companyId}`);
                            setCompanyDocs(companyDocsRes.data || []);
                        } else {
                            setCompanyDocs([]);
                        }
                    } catch (err) {
                        console.error("Failed to fetch company documents", err);
                        setCompanyDocs([]);
                    }
                } else {
                    setCompanyDocs(companyDocuments || []);
                }
            } catch (error) {
                console.error("[DocumentsTab] Failed to initialize documents", error);
                setOpportunityDocs([]);
                setCompanyDocs([]);
            } finally {
                setIsLoading(false);
                hasInitializedRef.current = true;
            }
        };

        initializeDocuments();
    }, [opportunityId, opportunityDocuments, companyDocuments]);

    const sections = useMemo<FileTreeSection[]>(() => {
        const rfpOppDocs = opportunityDocs.filter((doc) => isRfpType(doc.document_type));
        const rfpCompanyDocs = companyDocs.filter((doc) => isRfpType(doc.document_type));

        const attachmentDocs = opportunityDocs.filter((doc) => !isRfpType(doc.document_type));
        const pastPerformanceDocs = companyDocs.filter((doc) => isPastPerformanceType(doc.document_type));
        const otherCompanyDocs = companyDocs.filter((doc) => !isPastPerformanceType(doc.document_type));

        const mapDocs = (
            docs: Array<OpportunityDocument | CompanyDocument>,
            source: "opportunity" | "company"
        ): FileTreeItem[] =>
            docs.map((doc) => ({
                id: doc.id,
                name: doc.filename,
                type: doc.document_type,
                source,
            }));

        return [
            {
                id: "rfp",
                label: "RFP Files",
                files: [...mapDocs(rfpOppDocs, "opportunity"), ...mapDocs(rfpCompanyDocs, "company")],
            },
            {
                id: "attachments",
                label: "Attachments",
                files: [
                    ...mapDocs(attachmentDocs, "opportunity"),
                    ...mapDocs(otherCompanyDocs, "company").filter((doc) => isAttachmentType(doc.type)),
                ],
            },
            {
                id: "past-performance",
                label: "Past Performance",
                files: mapDocs(pastPerformanceDocs, "company"),
            },
        ];
    }, [companyDocs, opportunityDocs]);

    const selectedDocument = useMemo(() => {
        if (!selectedFile) return null;
        const list = selectedFile.source === "opportunity" ? opportunityDocs : companyDocs;
        return list.find((doc) => doc.id === selectedFile.id) || null;
    }, [companyDocs, opportunityDocs, selectedFile]);

    useEffect(() => {
        if (!highlightedCitation) return;
        const allDocs = [...opportunityDocs, ...companyDocs];
        const match = allDocs.find((doc) => doc.id === highlightedCitation.documentId);
        if (match) {
            setSelectedFile({
                id: match.id,
                name: match.filename,
                type: match.document_type,
                source: opportunityDocs.some((doc) => doc.id === match.id) ? "opportunity" : "company",
            });
            setCurrentPage(highlightedCitation.pageNumber || 1);
        }
    }, [companyDocs, highlightedCitation, opportunityDocs]);

    const handleDrag = (event: DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.type === "dragenter" || event.type === "dragover") {
            setDragActive(true);
        } else if (event.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (event: DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setDragActive(false);
        setUploadError(null);
        if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
            const files = Array.from(event.dataTransfer.files);
            const validFiles = files.filter((file) =>
                file.name.toLowerCase().endsWith(".pdf") && file.size <= 50 * 1024 * 1024
            );
            if (validFiles.length !== files.length) {
                setUploadError("Some files were rejected. PDFs only, max 50MB.");
            }
            setSelectedFiles((prev) => [...prev, ...validFiles]);
        }
    };

    const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setUploadError(null);
            const files = Array.from(event.target.files);
            const validFiles = files.filter((file) =>
                file.name.toLowerCase().endsWith(".pdf") && file.size <= 50 * 1024 * 1024
            );
            if (validFiles.length !== files.length) {
                setUploadError("Some files were rejected. PDFs only, max 50MB.");
            }
            setSelectedFiles((prev) => [...prev, ...validFiles]);
        }
    };

    const handleBatchUpload = async () => {
        if (selectedFiles.length === 0 || uploading) return;
        setUploading(true);
        setUploadError(null);
        setUploadProgress(0);

        const totalFiles = selectedFiles.length;
        let completedFiles = 0;

        try {
            for (const file of selectedFiles) {
                const formData = new FormData();
                formData.append("file", file);

                let typeToUse = uploadDocType;
                const lowerName = file.name.toLowerCase();
                if (lowerName.includes("pws") || lowerName.includes("sow") || lowerName.includes("statement")) {
                    typeToUse = "pws";
                } else if (lowerName.includes("rfp") || lowerName.includes("solicitation")) {
                    typeToUse = "rfp";
                } else if (lowerName.includes("amend")) {
                    typeToUse = "amendment";
                }

                formData.append("document_type", typeToUse);

                await api.post(`/api/opportunities/${opportunityId}/documents`, formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                completedFiles += 1;
                setUploadProgress((completedFiles / totalFiles) * 100);
            }

            setSelectedFiles([]);
            setUploadProgress(0);
            // Refresh documents after upload
            if (onDocumentsRefresh) {
                await onDocumentsRefresh();
            } else {
                const docsRes = await api.get(`/api/opportunities/${opportunityId}/documents`);
                setOpportunityDocs(docsRes.data || []);
            }
        } catch (error: unknown) {
            console.error("Upload failed", error);

            let message = "Upload failed.";
            if (axios.isAxiosError(error)) {
                const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail;
                if (typeof detail === "string" && detail) {
                    message = detail;
                } else if (typeof error.message === "string" && error.message) {
                    message = error.message;
                }
            } else if (error instanceof Error && error.message) {
                message = error.message;
            }

            setUploadError(message);
        } finally {
            setUploading(false);
        }
    };

    // Show loading spinner while initializing
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                    <div className="text-sm text-gray-500">Loading documents...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full gap-4 p-6">
            {/* Left sidebar - File tree */}
            <div className="w-56 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
                <FileTree
                    sections={sections}
                    selectedFileId={selectedFile?.id}
                    onSelectFile={(file) => {
                        setSelectedFile(file);
                        setCurrentPage(1);
                        if (highlightedCitation) {
                            onClearHighlight();
                        }
                    }}
                    onUploadClick={() => setIsUploadExpanded(!isUploadExpanded)}
                />
            </div>

            {/* Main content - PDF viewer */}
            <div className="flex-1 flex flex-col min-w-0 gap-3">
                {/* Collapsible upload area */}
                <div className="border border-gray-200 rounded-lg bg-white">
                    <button
                        onClick={() => setIsUploadExpanded(!isUploadExpanded)}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        <div className="flex items-center gap-2">
                            <Upload className="h-4 w-4 text-gray-400" />
                            <span>Upload Documents</span>
                            {selectedFiles.length > 0 && (
                                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                                    {selectedFiles.length} selected
                                </span>
                            )}
                        </div>
                        {isUploadExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    
                    {isUploadExpanded && (
                        <div className="px-3 pb-3 border-t border-gray-100">
                            <div className="flex items-center gap-3 mt-3">
                                <div
                                    className={`flex-1 border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${dragActive
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-slate-200 hover:border-blue-400 hover:bg-slate-50"
                                        }`}
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        accept=".pdf"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                    <Upload className={`mx-auto h-5 w-5 mb-1 ${dragActive ? "text-blue-500" : "text-slate-400"}`} />
                                    <div className="text-xs text-slate-600">Drop PDFs here or click</div>
                                </div>
                                <div className="w-40">
                                    <Label className="text-xs text-gray-500">Type</Label>
                                    <Select value={uploadDocType} onValueChange={setUploadDocType}>
                                        <SelectTrigger className="mt-1 h-8 text-xs">
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pws">PWS</SelectItem>
                                            <SelectItem value="rfp">RFP</SelectItem>
                                            <SelectItem value="amendment">Amendment</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {selectedFiles.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {selectedFiles.map((file, idx) => (
                                        <div key={`${file.name}-${idx}`} className="flex items-center gap-1 text-xs bg-slate-100 px-2 py-1 rounded">
                                            <FileText className="h-3 w-3 text-blue-500" />
                                            <span className="truncate max-w-[120px]">{file.name}</span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
                                                }}
                                                className="text-gray-400 hover:text-red-500"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                    <Button size="sm" className="h-6 text-xs" onClick={handleBatchUpload} disabled={uploading}>
                                        {uploading ? `${Math.round(uploadProgress)}%` : "Upload"}
                                    </Button>
                                </div>
                            )}

                            {uploadError && (
                                <div className="text-xs text-red-500 mt-2">{uploadError}</div>
                            )}
                        </div>
                    )}
                </div>

                {/* PDF Viewer - takes remaining space */}
                <div className="flex-1 min-h-0">
                    <DocumentViewer
                        documentUrl={resolveDocumentUrl(selectedDocument)}
                        documentName={selectedDocument?.filename || selectedFile?.name || null}
                        pageNumber={currentPage}
                        onPageChange={setCurrentPage}
                        highlightedCitation={highlightedCitation}
                        onClearHighlight={onClearHighlight}
                    />
                </div>
            </div>
        </div>
    );
}

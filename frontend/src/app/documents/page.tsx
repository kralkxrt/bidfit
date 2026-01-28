"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import {
    FileText,
    Upload,
    Loader2,
    Trash2,
    X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

import { useOrgStore } from "@/lib/stores/orgStore";
import api from "@/lib/api";
import axios from "axios";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { MessageDialog } from "@/components/ui/MessageDialog";

type ParsedContent = {
    contract_number?: string;
    customer_agency?: string;
    [key: string]: unknown;
};

type Document = {
    id: string;
    filename: string;
    document_type: string;
    processing_status: string;
    created_at: string;
    parsed_content?: ParsedContent;
};

export default function DocumentsPage() {
    const { currentOrg } = useOrgStore();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isDialogOpen, setIsDialogOpen] = useState(false); // Upload Dialog
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);


    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(filteredDocuments.map(doc => doc.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(item => item !== id));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        setIsBulkDeleting(true);
        try {
            await api.post('/api/documents/bulk-delete', { ids: selectedIds });
            fetchDocuments();
            setSelectedIds([]);
        } catch (error) {
            console.error("Bulk delete failed", error);
        } finally {
            setIsBulkDeleting(false);
        }
    };


    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [documentType, setDocumentType] = useState<string>("past_performance");

    // Message Dialog State
    const [messageOpen, setMessageOpen] = useState(false);
    const [messageLogin, setMessageLogin] = useState({ title: "", description: "", variant: "default" as "default" | "error" | "success" | "info" });


    const [filterType, setFilterType] = useState<string>("all");
    const [dragActive, setDragActive] = useState(false);

    const fetchDocuments = useCallback(async () => {
        if (!currentOrg?.id) return;

        setIsLoading(true);
        try {
            const params: Record<string, string> = {};
            params.company_id = currentOrg.id;

            const response = await api.get('/api/documents/', { params });
            setDocuments(response.data);
        } catch (error) {
            console.error("Failed to fetch documents", error);
        } finally {
            setIsLoading(false);
        }
    }, [currentOrg?.id]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            const validFiles = files.filter(file => {
                const isValidSize = file.size <= 50 * 1024 * 1024;
                return isValidSize;
            });

            if (validFiles.length !== files.length) {
                setMessageLogin({
                    title: "Files Rejected",
                    description: "Some files were rejected because they exceed the 50MB limit.",
                    variant: "error"
                });
                setMessageOpen(true);
            }

            setSelectedFiles(validFiles);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            const validTypes = ['.pdf', '.docx', '.doc', '.txt'];
            const validFiles = files.filter(file => {
                const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
                // Check size (50MB)
                const isValidSize = file.size <= 50 * 1024 * 1024;
                return validTypes.includes(fileExtension) && isValidSize;
            });

            if (validFiles.length > 0) {
                setSelectedFiles(prev => [...prev, ...validFiles]);
            }

            if (validFiles.length !== files.length) {
                // Show message about rejected files
                setMessageLogin({
                    title: "Files Rejected",
                    description: "Some files were rejected. Ensure they are PDF/DOCX/TXT and under 50MB.",
                    variant: "error"
                });
                setMessageOpen(true);
            }
        }
    };

    const filteredDocuments = documents.filter(doc => {
        if (filterType === 'all') return true;
        return doc.document_type === filterType;
    });

    const handleUpload = async () => {
        if (selectedFiles.length === 0 || !currentOrg?.id) return;

        setIsUploading(true);
        setUploadProgress(0);

        const totalFiles = selectedFiles.length;
        let completedFiles = 0;
        const failedFiles: { name: string; reason: string }[] = [];

        try {
            for (const file of selectedFiles) {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("company_id", currentOrg.id);
                formData.append("document_type", documentType);

                try {
                    await api.post('/api/documents/upload', formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                        },
                    });

                    completedFiles++;
                    setUploadProgress((completedFiles / totalFiles) * 100);
                } catch (error: unknown) {
                    console.error(`Failed to upload ${file.name}`, error);

                    let errorMessage = "Unknown error";

                    if (axios.isAxiosError(error)) {
                        const data = error.response?.data;
                        const detail =
                            typeof data === "object" && data !== null && "detail" in data
                                ? String((data as { detail?: unknown }).detail)
                                : undefined;

                        errorMessage = detail || error.message || errorMessage;
                    } else if (error instanceof Error) {
                        errorMessage = error.message || errorMessage;
                    }

                    failedFiles.push({ name: file.name, reason: errorMessage });
                }
            }

            // Close dialog and reset
            setIsDialogOpen(false);
            setSelectedFiles([]);
            setUploadProgress(0);

            // Refresh list
            fetchDocuments();

            if (failedFiles.length > 0) {
                const description = failedFiles.length === 1
                    ? `Failed to upload ${failedFiles[0].name}: ${failedFiles[0].reason}`
                    : `Failed to upload ${failedFiles.length} files:\n` + failedFiles.map(f => `• ${f.name}: ${f.reason}`).join('\n');

                setMessageLogin({
                    title: "Upload Completed with Errors",
                    description: description,
                    variant: "error"
                });
                setMessageOpen(true);
            }

        } catch (error) {
            console.error("Batch upload encountered errors", error);
            setMessageLogin({
                title: "System Error",
                description: "An unexpected error occurred during the upload process.",
                variant: "error"
            });
            setMessageOpen(true);
        } finally {
            setIsUploading(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        setIsDeleting(true);
        try {
            await api.delete(`/api/documents/${deleteId}`);
            fetchDocuments(); // Refresh list
            setDeleteId(null);
        } catch (error) {
            console.error("Delete failed", error);
        } finally {
            setIsDeleting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const base = "px-2 py-1 rounded-md text-xs font-semibold";

        switch (status) {
            case 'completed':
                return <span className={`${base} bg-green-100 text-green-700`}>Processed</span>;
            case 'processing':
                return <span className={`${base} bg-amber-100 text-amber-700 animate-pulse`}>Processing</span>;
            case 'failed':
                return <span className={`${base} bg-red-100 text-red-700`}>Failed</span>;
            default:
                return <span className={`${base} bg-slate-100 text-slate-700`}>{status}</span>;
        }
    };

    // Org context drives filtering

    return (
        <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
                        <p className="text-sm text-slate-500">
                            Manage past performance contracts and opportunity documents.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="past_performance">Past Performance</SelectItem>
                            <SelectItem value="cpars">CPARS / PPE</SelectItem>
                            <SelectItem value="proposal">Proposal Draft</SelectItem>
                            <SelectItem value="capability_statement">Capability Statement</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Upload className="mr-2 h-4 w-4" />
                                Upload Document
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Upload Document</DialogTitle>
                                <DialogDescription>
                                    Upload PDF or DOCX files for analysis.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="file">File</Label>
                                    <div
                                        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${dragActive
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'
                                            }`}
                                        onDragEnter={handleDrag}
                                        onDragLeave={handleDrag}
                                        onDragOver={handleDrag}
                                        onDrop={handleDrop}
                                        onClick={() => document.getElementById("file-upload")?.click()}
                                    >
                                        <Input
                                            id="file-upload"
                                            type="file"
                                            multiple
                                            accept=".pdf,.docx,.doc,.txt"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                        <Upload className={`mx-auto h-8 w-8 mb-2 ${dragActive ? "text-blue-500" : "text-slate-400"}`} />

                                        <div className="text-sm font-medium text-slate-700">
                                            Click to upload or drag and drop
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            PDF, DOCX, DOC, TXT (Max 50MB)
                                        </div>
                                    </div>

                                    {selectedFiles.length > 0 && (
                                        <div className="bg-slate-50 rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto mt-2">
                                            <div className="text-xs font-semibold text-gray-500 mb-2">
                                                Selected Files ({selectedFiles.length})
                                            </div>
                                            {selectedFiles.map((file, idx) => (
                                                <div key={idx} className="flex items-center justify-between text-sm bg-white p-2 rounded border shadow-sm">
                                                    <span className="truncate flex-1 max-w-[200px] text-slate-700">{file.name}</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
                                                        }}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="type">Document Type</Label>
                                    <Select
                                        value={documentType}
                                        onValueChange={setDocumentType}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="past_performance">Past Performance / Contract</SelectItem>
                                            <SelectItem value="cpars">CPARS / PPE</SelectItem>
                                            <SelectItem value="proposal">Proposal Draft</SelectItem>
                                            <SelectItem value="capability_statement">Capability Statement</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {isUploading && (
                                    <div className="grid gap-2">
                                        <div className="flex justify-between text-xs">
                                            <span>Uploading & Processing...</span>
                                            <span>{Math.round(uploadProgress)}%</span>
                                        </div>
                                        <Progress value={uploadProgress} />
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setIsDialogOpen(false);
                                        setSelectedFiles([]);
                                    }}
                                    disabled={isUploading}
                                >
                                    Cancel
                                </Button>
                                <Button onClick={handleUpload} disabled={selectedFiles.length === 0 || isUploading}>
                                    {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Upload {selectedFiles.length > 0 && !isUploading && `(${selectedFiles.length})`}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {selectedIds.length > 0 && (
                <div className="bg-slate-100 border border-slate-200 text-slate-700 px-4 py-2 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{selectedIds.length} selected</span>
                    </div>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setIsBulkDeleting(true)}
                        disabled={isBulkDeleting}
                    >
                        {isBulkDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                        Delete Selected
                    </Button>
                </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
                <div className="mb-4">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                        Library
                    </h3>
                    <p className="text-sm text-slate-500">
                        Past performance library for {currentOrg?.name || "your organization"}
                    </p>
                </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40px]">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={filteredDocuments.length > 0 && selectedIds.length === filteredDocuments.length}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                    />
                                </TableHead>
                                <TableHead className="w-[300px]">Filename</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Uploaded</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Metadata</TableHead>
                                <TableHead className="w-[80px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        <Loader2 className="mr-2 h-6 w-6 animate-spin inline" />
                                        Loading...
                                    </TableCell>
                                </TableRow>
                            ) : filteredDocuments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                        {filterType === 'all'
                                            ? "No documents found. Upload one to get started."
                                            : "No documents found matching the selected type."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredDocuments.map((doc) => (
                                    <TableRow key={doc.id} data-state={selectedIds.includes(doc.id) ? "selected" : undefined}>
                                        <TableCell>
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                checked={selectedIds.includes(doc.id)}
                                                onChange={(e) => handleSelectOne(doc.id, e.target.checked)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-blue-500" />
                                                {doc.filename}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="px-2 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
                                                {doc.document_type.replace('_', ' ')}
                                            </span>
                                        </TableCell>
                                        <TableCell>{format(new Date(doc.created_at), 'MMM d, yyyy')}</TableCell>
                                        <TableCell>{getStatusBadge(doc.processing_status)}</TableCell>
                                        <TableCell>
                                            {doc.parsed_content?.contract_number ? (
                                                <div className="text-xs text-slate-500">
                                                    <div className="font-semibold text-slate-700">
                                                        {doc.parsed_content.contract_number}
                                                    </div>
                                                    <div>{doc.parsed_content.customer_agency}</div>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-500">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setDeleteId(doc.id)}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>

                    </Table>
            </div>

            <DeleteConfirmDialog
                isOpen={isBulkDeleting}
                onClose={() => setIsBulkDeleting(false)}
                onConfirm={handleBulkDelete}
                title={`Delete ${selectedIds.length} Documents`}
                description="Are you sure you want to delete these documents? This action cannot be undone."
                isDeleting={isBulkDeleting}
            />

            <DeleteConfirmDialog
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                title="Delete Document"
                description="Are you sure you want to delete this document? This action cannot be undone."
                isDeleting={isDeleting}
            />

            <MessageDialog
                isOpen={messageOpen}
                onClose={() => setMessageOpen(false)}
                title={messageLogin.title}
                description={messageLogin.description}
                variant={messageLogin.variant}
            />
        </div>
    );
}

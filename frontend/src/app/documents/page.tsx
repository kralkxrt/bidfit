"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import {
    FileText,
    Upload,
    Loader2,
    Trash2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

import { useCompanyStore } from "@/store/useCompanyStore";
import api from "@/lib/api";

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
    const { selectedCompanyId, companies } = useCompanyStore();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Upload form state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [documentType, setDocumentType] = useState<string>("past_performance");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [documentType, setDocumentType] = useState<string>("past_performance");
    const [filterType, setFilterType] = useState<string>("all");
    const [dragActive, setDragActive] = useState(false);

    const fetchDocuments = useCallback(async () => {
        setIsLoading(true);
        try {
            const params: Record<string, string> = {};
            if (selectedCompanyId && selectedCompanyId !== 'all') {
                params.company_id = selectedCompanyId;
            }

            const response = await api.get('/api/documents/', { params });
            setDocuments(response.data);
        } catch (error) {
            console.error("Failed to fetch documents", error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedCompanyId]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
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
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            const validTypes = ['.pdf', '.docx', '.doc', '.txt'];
            const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
            if (validTypes.includes(fileExtension)) {
                setSelectedFile(file);
            } else {
                alert("Invalid file type. Please upload PDF, DOCX, DOC, or TXT.");
            }
        }
    };

    const filteredDocuments = documents.filter(doc => {
        if (filterType === 'all') return true;
        return doc.document_type === filterType;
    });

    const handleUpload = async () => {
        if (!selectedFile || !selectedCompanyId) return;

        setIsUploading(true);
        setUploadProgress(10); // Start progress

        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("company_id", selectedCompanyId);
        formData.append("document_type", documentType);

        try {
            // Simulate progress for UX
            const interval = setInterval(() => {
                setUploadProgress(prev => Math.min(prev + 10, 90));
            }, 500);

            await api.post('/api/documents/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            clearInterval(interval);
            setUploadProgress(100);

            // Close dialog and reset
            setIsDialogOpen(false);
            setSelectedFile(null);
            setUploadProgress(0);

            // Refresh list
            fetchDocuments();

        } catch (error) {
            console.error("Upload failed", error);
            alert("Upload failed. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (docId: string) => {
        if (!confirm("Are you sure you want to delete this document?")) return;

        try {
            await api.delete(`/api/documents/${docId}`);
            fetchDocuments(); // Refresh list
        } catch (error) {
            console.error("Delete failed", error);
            alert("Failed to delete document.");
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <Badge className="bg-green-500 hover:bg-green-600">Processed</Badge>;
            case 'processing':
                return <Badge variant="secondary" className="animate-pulse">Processing</Badge>;
            case 'failed':
                return <Badge variant="destructive">Failed</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    // Removed blocking check to allow "All" view or default view
    // if (!selectedCompanyId) { ... }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
                        <p className="text-muted-foreground">
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
                                        className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${dragActive ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-400 hover:bg-slate-50"
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
                                            accept=".pdf,.docx,.doc,.txt"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                        <Upload className={`h-8 w-8 mb-2 ${dragActive ? "text-blue-500" : "text-slate-400"}`} />
                                        {selectedFile ? (
                                            <div className="text-sm font-medium text-blue-600">
                                                {selectedFile.name}
                                            </div>
                                        ) : (
                                            <>
                                                <p className="text-sm font-medium text-slate-700">
                                                    Drag & drop or click to upload
                                                </p>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    PDF, DOCX, DOC, TXT (Max 50MB)
                                                </p>
                                            </>
                                        )}
                                    </div>
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
                                            <span>{uploadProgress}%</span>
                                        </div>
                                        <Progress value={uploadProgress} />
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isUploading}>
                                    Cancel
                                </Button>
                                <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
                                    {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Upload
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Library</CardTitle>
                    <CardDescription>
                        List of documents for {selectedCompanyId === 'all' || !selectedCompanyId ? 'all organizations' : companies.find(c => c.id === selectedCompanyId)?.name}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
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
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <Loader2 className="mr-2 h-6 w-6 animate-spin inline" />
                                        Loading...
                                    </TableCell>
                                </TableRow>
                            ) : filteredDocuments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        {filterType === 'all'
                                            ? "No documents found. Upload one to get started."
                                            : "No documents found matching the selected type."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredDocuments.map((doc) => (
                                    <TableRow key={doc.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-blue-500" />
                                                {doc.filename}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">
                                                {doc.document_type.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{format(new Date(doc.created_at), 'MMM d, yyyy')}</TableCell>
                                        <TableCell>{getStatusBadge(doc.processing_status)}</TableCell>
                                        <TableCell>
                                            {doc.parsed_content?.contract_number ? (
                                                <div className="text-xs text-muted-foreground">
                                                    <div className="font-semibold text-foreground">
                                                        {doc.parsed_content.contract_number}
                                                    </div>
                                                    <div>{doc.parsed_content.customer_agency}</div>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(doc.id)}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>

                    </Table>
                </CardContent >
            </Card >
        </div >
    );
}

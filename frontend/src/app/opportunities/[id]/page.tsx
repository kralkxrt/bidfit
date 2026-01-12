"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Upload, FileText, Loader2, Trash2, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// Simple toast mock if not present (assuming shadcn standard though)
// Actually let's assume standard shadcn layout isn't fully scaffolded with Toaster
// We'll use simple alert/console for now in catch blocks.

import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { MessageDialog } from "@/components/ui/MessageDialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Opportunity {
    id: string;
    title: string;
    solicitation_number: string;
    agency: string;
    status: string;
    created_at: string;
    notes: string;
    latest_analysis?: {
        id: string;
        overall_relevance_score: number;
        overall_relevance_label: string;
        go_no_go: 'GO' | 'CONDITIONAL_GO' | 'NO_GO';
        requirements_summary: any;
    };
}

interface OpportunityDocument {
    id: string;
    filename: string;
    document_type: string;
    processed_at: string;
    created_at?: string; // For ordering documents (RFP first, then amendments)
    parsed_requirements?: {
        requirements: {
            id: string;
            text: string;
            category: string;
            criticality: string;
        }[];
    }
}

export default function OpportunityDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
    const [documents, setDocuments] = useState<OpportunityDocument[]>([]); // In real app, fetch these separately
    // Note: Current API doesn't have a route to list opp docs separately, 
    // but we might add it or just rely on manual state updates after upload for now/MVP.

    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [docToDelete, setDocToDelete] = useState<string | null>(null);
    const [isDeletingDoc, setIsDeletingDoc] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Multi-file upload state
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadDocType, setUploadDocType] = useState<string>("pws");
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);

    // Message Dialog State
    const [messageOpen, setMessageOpen] = useState(false);
    const [messageData, setMessageData] = useState({ title: "", description: "", variant: "default" as "default" | "error" | "success" | "info" });

    const fetchOpportunity = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/api/opportunities/${id}`);
            setOpportunity(res.data);

            // Fetch PWS/SOW documents for this opportunity
            try {
                const docsRes = await api.get(`/api/opportunities/${id}/documents`);
                setDocuments(docsRes.data || []);
            } catch (err) {
                console.error("Failed to fetch opportunity documents", err);
            }
        } catch (error) {
            console.error("Failed to fetch opportunity", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchOpportunity();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // Obsolete single-file upload handlers removed.

    const confirmDeleteDocument = async () => {
        if (!docToDelete) return;
        setIsDeletingDoc(true);
        try {
            await api.delete(`/api/opportunities/${id}/documents/${docToDelete}`);
            fetchOpportunity(); // Refresh
            setDocToDelete(null);
        } catch (error) {
            console.error("Delete failed", error);
            alert("Failed to delete document.");
        } finally {
            setIsDeletingDoc(false);
        }
    };

    const handleRescan = async () => {
        setRefreshing(true);
        try {
            await api.post(`/api/opportunities/${id}/rescan`);
            // Refresh opportunity to get new requirements
            await fetchOpportunity();

            setMessageData({
                title: "Requirements Updated",
                description: "Requirements have been successfully re-scanned from the latest document.",
                variant: "success"
            });
            setMessageOpen(true);
        } catch (error) {
            console.error("Rescan failed", error);
            setMessageData({
                title: "Rescan Failed",
                description: "Failed to re-scan requirements. Please try again or upload the document again.",
                variant: "error"
            });
            setMessageOpen(true);
        } finally {
            setRefreshing(false);
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
            // Size check (50MB)
            const validFiles = files.filter(file => file.size <= 50 * 1024 * 1024);

            if (validFiles.length !== files.length) {
                setMessageData({
                    title: "Files Rejected",
                    description: "Some files were rejected because they exceed the 50MB limit.",
                    variant: "error"
                });
                setMessageOpen(true);
            }

            if (validFiles.length > 0) {
                setSelectedFiles(prev => [...prev, ...validFiles]);
            }
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            const validFiles = files.filter(file => file.size <= 50 * 1024 * 1024);
            if (validFiles.length !== files.length) {
                setMessageData({
                    title: "Files Rejected",
                    description: "Some files were rejected because they exceed the 50MB limit.",
                    variant: "error"
                });
                setMessageOpen(true);
            }
            setSelectedFiles(prev => [...prev, ...validFiles]);
        }
    };

    const handleBatchUpload = async () => {
        if (selectedFiles.length === 0) return;

        setUploading(true);
        setUploadProgress(0);

        const totalFiles = selectedFiles.length;
        let completedFiles = 0;
        const failedFiles: { name: string; reason: string }[] = [];

        try {
            for (const file of selectedFiles) {
                const formData = new FormData();
                formData.append("file", file);

                // Auto-detect type based on name if possible, else use selected type
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

                try {
                    await api.post(`/api/opportunities/${id}/documents`, formData, {
                        headers: { "Content-Type": "multipart/form-data" },
                    });
                    completedFiles++;
                    setUploadProgress((completedFiles / totalFiles) * 100);
                } catch (error: any) {
                    console.error(`Failed to upload ${file.name}`, error);
                    const msg = error.response?.data?.detail || error.message || "Unknown error";
                    failedFiles.push({ name: file.name, reason: msg });
                }
            }

            // Success or partial success
            setIsUploadDialogOpen(false);
            setSelectedFiles([]);
            setUploadProgress(0);
            fetchOpportunity(); // Refresh list

            if (failedFiles.length > 0) {
                const description = failedFiles.length === 1
                    ? `Failed to upload ${failedFiles[0].name}: ${failedFiles[0].reason}`
                    : `Failed to upload ${failedFiles.length} files:\n` + failedFiles.map(f => `• ${f.name}: ${f.reason}`).join('\n');

                setMessageData({
                    title: "Upload Completed with Errors",
                    description: description,
                    variant: "error"
                });
                setMessageOpen(true);
            }

        } catch (error) {
            console.error("Batch upload error", error);
            setMessageData({
                title: "Upload Failed",
                description: "An unexpected error occurred during upload.",
                variant: "error"
            });
            setMessageOpen(true);
        } finally {
            setUploading(false);
        }
    };

    // Keep legacy single handlers for now if needed, or remove them. 
    // The user requirement implies replacing/enhancing. 
    // I will comment them out or remove them to avoid unused code if I replace the UI buttons.
    // For safety, I'll keep handleFileUpload for the "Empty State" button which I might refactor later, 
    // but the instruction says "add multiple additional documents".
    // I will assume the new dialog replaces the amendment upload button logic too.

    if (loading) {
        return <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!opportunity) {
        return <div>Opportunity not found</div>;
    }

    // Consolidate requirements from ALL documents with amendment override logic
    // 1. Sort documents by created_at (oldest first = main RFP, newest = latest amendments)
    // 2. Build a map of requirement ID → requirement (later docs override earlier for same ID)
    // 3. Return consolidated list with most current versions
    const sortedDocs = [...documents].sort((a, b) =>
        new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    );

    const requirementsMap = new Map<string, { id: string; text: string; category: string; criticality: string; source?: string }>();

    for (const doc of sortedDocs) {
        const docReqs = doc.parsed_requirements?.requirements || [];
        for (const req of docReqs) {
            // Use requirement ID as key - amendments override RFP for same ID
            requirementsMap.set(req.id, {
                ...req,
                source: doc.filename // Track which document this came from
            });
        }
    }

    // Convert map back to array
    const requirements = Array.from(requirementsMap.values());

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{opportunity.title}</h1>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <span>{opportunity.solicitation_number}</span>
                        <span>•</span>
                        <span>{opportunity.agency}</span>
                        <span>•</span>
                        <Badge variant="outline">{opportunity.status}</Badge>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="requirements" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="requirements">Requirements</TabsTrigger>
                    <TabsTrigger value="analysis">Gap Analysis</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                </TabsList>

                <TabsContent value="requirements" className="space-y-4">
                    {requirements.length === 0 ? (
                        <Card>
                            <CardHeader className="text-center pb-10 pt-10">
                                <div className="mx-auto bg-muted rounded-full p-3 w-fit mb-4">
                                    <Upload className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <CardTitle>No Requirements Extracted Yet</CardTitle>
                                <CardDescription className="max-w-md mx-auto mt-2">
                                    Upload a Performance Work Statement (PWS) or Statement of Objectives (SOO) to automatically extract requirements.
                                </CardDescription>
                                <div className="mt-6">
                                    <Button onClick={() => setIsUploadDialogOpen(true)} disabled={uploading}>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Upload PWS / SOW
                                    </Button>
                                </div>
                            </CardHeader>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-medium">Extracted Requirements ({requirements.length})</h3>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={handleRescan} disabled={refreshing}>
                                        <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                                        {refreshing ? "Scanning..." : "Re-scan"}
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => setIsUploadDialogOpen(true)}>
                                        <Upload className="mr-2 h-4 w-4" /> Upload Document
                                    </Button>
                                </div>
                            </div>

                            {/* List uploaded documents */}
                            {documents.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm">Uploaded Documents</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {documents.map((doc) => (
                                                <div key={doc.id} className="flex items-center justify-between p-2 border rounded">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="h-4 w-4" />
                                                        <div>
                                                            <div className="text-sm font-medium">{doc.filename}</div>
                                                            <div className="text-xs text-muted-foreground capitalize">{doc.document_type}</div>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setDocToDelete(doc.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Delete Document Dialog */}
                            <DeleteConfirmDialog
                                isOpen={!!docToDelete}
                                onClose={() => setDocToDelete(null)}
                                onConfirm={confirmDeleteDocument}
                                title="Delete Document"
                                description="Are you sure you want to delete this document? This will remove all extracted requirements and cannot be undone."
                                isDeleting={isDeletingDoc}
                            />

                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {/* Summary Cards */}
                                <Card>
                                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Technical</CardTitle></CardHeader>
                                    <CardContent><div className="text-2xl font-bold">{requirements.filter(r => r.category.includes('Technical')).length}</div></CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Personnel</CardTitle></CardHeader>
                                    <CardContent><div className="text-2xl font-bold">{requirements.filter(r => r.category.includes('Personnel')).length}</div></CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Critical Items</CardTitle></CardHeader>
                                    <CardContent><div className="text-2xl font-bold text-red-600">{requirements.filter(r => r.criticality === 'Critical').length}</div></CardContent>
                                </Card>
                            </div>

                            <div className="space-y-4 mt-4">
                                {requirements.map((req, idx) => (
                                    <Card key={idx}>
                                        <CardContent className="pt-6">
                                            <div className="flex justify-between items-start mb-2">
                                                <Badge variant="outline">{req.id}</Badge>
                                                <div className="flex space-x-2">
                                                    <Badge variant="secondary">{req.category}</Badge>
                                                    {req.criticality === 'Critical' && <Badge variant="destructive">Critical</Badge>}
                                                </div>
                                            </div>
                                            <p className="text-sm">{req.text}</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="analysis">
                    {opportunity.latest_analysis ? (
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>Latest Gap Analysis Results</CardTitle>
                                            <CardDescription>
                                                Analysis performed on {new Date().toLocaleDateString()}
                                            </CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                className={
                                                    opportunity.latest_analysis.go_no_go === 'GO' ? 'bg-emerald-600' :
                                                        opportunity.latest_analysis.go_no_go === 'NO_GO' ? 'bg-red-600' : 'bg-amber-600'
                                                }
                                            >
                                                {opportunity.latest_analysis.go_no_go.replace('_', ' ')}
                                            </Badge>
                                            <span className="text-2xl font-bold">
                                                {opportunity.latest_analysis.overall_relevance_score}%
                                            </span>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <p className="text-sm text-gray-600">
                                            Relevance: <span className="font-medium">{opportunity.latest_analysis.overall_relevance_label}</span>
                                        </p>
                                        <div className="flex gap-4">
                                            <Button onClick={() => router.push(`/opportunities/${id}/analysis/${opportunity.latest_analysis?.id}`)}>
                                                View Full Report
                                            </Button>
                                            <Button variant="outline" onClick={() => setOpportunity({ ...opportunity, latest_analysis: undefined })}>
                                                Run New Analysis
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <AnalysisWizard opportunityId={id} requirements={requirements} />
                    )}
                </TabsContent>

                <TabsContent value="documents">
                    {/* Simple list of uploaded files */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Opportunity Documents</CardTitle>
                            <Button size="sm" onClick={() => setIsUploadDialogOpen(true)}>
                                <Upload className="mr-2 h-4 w-4" />
                                Upload Documents
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {documents.length === 0 ? (
                                <div className="text-sm text-muted-foreground">No documents uploaded.</div>
                            ) : (
                                <div className="space-y-2">
                                    {documents.map((doc) => (
                                        <div key={doc.id} className="flex justify-between items-center p-3 border rounded-md">
                                            <div className="flex items-center space-x-3">
                                                <FileText className="h-5 w-5 text-blue-600" />
                                                <div>
                                                    <div className="font-medium">{doc.filename}</div>
                                                    <div className="text-xs text-muted-foreground">{doc.document_type} • {new Date(doc.processed_at).toLocaleDateString()}</div>
                                                </div>
                                            </div>
                                            <Badge variant="outline">Parsed</Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Upload Dialog */}
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Upload Opportunity Documents</DialogTitle>
                        <DialogDescription>
                            Upload PWS, RFP, Amendments, or other supporting files.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="file">Files</Label>
                            <div
                                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${dragActive
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'
                                    }`}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => document.getElementById("opp-file-upload")?.click()}
                            >
                                <Input
                                    id="opp-file-upload"
                                    type="file"
                                    multiple
                                    accept=".pdf,.docx,.doc,.txt"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                                <Upload className={`mx-auto h-8 w-8 mb-2 ${dragActive ? "text-blue-500" : "text-slate-400"}`} />
                                <div className="text-sm font-medium text-slate-700">
                                    Click to upload or drag and drop
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                    PDF, DOCX, TXT (Max 50MB)
                                </div>
                            </div>
                        </div>

                        {selectedFiles.length > 0 && (
                            <div className="bg-slate-50 rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                                <div className="text-xs font-semibold text-gray-500 mb-2">
                                    Selected Files ({selectedFiles.length})
                                </div>
                                {selectedFiles.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-sm bg-white p-2 rounded border shadow-sm">
                                        <div className="flex items-center gap-2 truncate">
                                            <FileText className="h-3 w-3 text-blue-500" />
                                            <span className="truncate max-w-[200px] text-slate-700">{file.name}</span>
                                        </div>
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

                        <div className="grid gap-2">
                            <Label htmlFor="type">Default Document Type</Label>
                            <Select value={uploadDocType} onValueChange={setUploadDocType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pws">Performance Work Statement (PWS)</SelectItem>
                                    <SelectItem value="rfp">Request for Proposal (RFP)</SelectItem>
                                    <SelectItem value="amendment">Amendment</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-muted-foreground">
                                We will attempt to auto-detect type from filenames (e.g. "amend", "PWS").
                            </p>
                        </div>

                        {uploading && (
                            <div className="grid gap-2">
                                <div className="flex justify-between text-xs">
                                    <span>Uploading...</span>
                                    <span>{Math.round(uploadProgress)}%</span>
                                </div>
                                <Progress value={uploadProgress} />
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)} disabled={uploading}>
                            Cancel
                        </Button>
                        <Button onClick={handleBatchUpload} disabled={selectedFiles.length === 0 || uploading}>
                            {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Upload {selectedFiles.length > 0 && !uploading && `(${selectedFiles.length})`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <DeleteConfirmDialog
                isOpen={!!docToDelete}
                onClose={() => setDocToDelete(null)}
                onConfirm={confirmDeleteDocument}
                title="Delete Document"
                description="Are you sure you want to delete this document? This will remove all extracted requirements and cannot be undone."
                isDeleting={isDeletingDoc}
            />

            <MessageDialog
                isOpen={messageOpen}
                onClose={() => setMessageOpen(false)}
                title={messageData.title}
                description={messageData.description}
                variant={messageData.variant}
            />
        </div>
    );
}

// Analysis Wizard Component
function AnalysisWizard({ opportunityId, requirements }: { opportunityId: string; requirements: Array<{ id: string; text: string; category: string; criticality: string }> }) {
    const router = useRouter();
    const [ppDocuments, setPpDocuments] = useState<Array<{ id: string; contract_title?: string; filename: string; customer_agency?: string; contract_number?: string }>>([]);
    const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
    const [analyzing, setAnalyzing] = useState(false);
    const [loadingDocs, setLoadingDocs] = useState(true);

    useEffect(() => {
        fetchPPDocuments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchPPDocuments = async () => {
        try {
            setLoadingDocs(true);
            // Get company_id from the opportunity
            const oppRes = await api.get(`/api/opportunities/${opportunityId}`);
            const companyId = oppRes.data.company_id;

            const res = await api.get(`/api/documents/?company_id=${companyId}`);
            setPpDocuments(res.data);
        } catch (error) {
            console.error("Failed to fetch PP documents", error);
        } finally {
            setLoadingDocs(false);
        }
    };

    const handleRunAnalysis = async () => {
        if (selectedDocs.length === 0) {
            alert("Please select at least one past performance document.");
            return;
        }

        setAnalyzing(true);
        try {
            const res = await api.post("/api/analyses/", {
                opportunity_id: opportunityId,
                document_ids: selectedDocs,
            }, { timeout: 300000 }); // 5 minute timeout for long analyses

            // Redirect to analysis results
            router.push(`/opportunities/${opportunityId}/analysis/${res.data.id}`);
        } catch (error) {
            console.error("Analysis failed", error);
            alert("Analysis failed. Check console for details.");
        } finally {
            setAnalyzing(false);
        }
    };

    const toggleDoc = (docId: string) => {
        setSelectedDocs(prev =>
            prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
        );
    };

    const toggleAll = () => {
        if (selectedDocs.length === ppDocuments.length) {
            setSelectedDocs([]); // Deselect all
        } else {
            setSelectedDocs(ppDocuments.map(d => d.id)); // Select all
        }
    };

    if (requirements.length === 0) {
        return (
            <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                    <p>Please upload and extract requirements from a PWS/SOW first.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Run Gap Analysis</CardTitle>
                <CardDescription>
                    Select past performance documents to compare against the {requirements.length} extracted requirements.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {loadingDocs ? (
                    <div className="text-center py-4 text-muted-foreground">Loading documents...</div>
                ) : ppDocuments.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                        No past performance documents found. Upload some in the Documents section first.
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium">Select Documents ({selectedDocs.length})</div>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="select-all"
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    checked={ppDocuments.length > 0 && selectedDocs.length === ppDocuments.length}
                                    onChange={toggleAll}
                                />
                                <label htmlFor="select-all" className="text-sm text-slate-600 cursor-pointer select-none">Select All</label>
                            </div>
                        </div>
                        {ppDocuments.map((doc) => (
                            <div
                                key={doc.id}
                                className={`flex items-center space-x-3 p-3 border rounded-md cursor-pointer hover:bg-muted ${selectedDocs.includes(doc.id) ? "bg-blue-50 border-blue-300" : ""
                                    }`}
                                onClick={() => toggleDoc(doc.id)}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedDocs.includes(doc.id)}
                                    onChange={() => toggleDoc(doc.id)}
                                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <div className="flex-1">
                                    <div className="font-medium text-sm">{doc.contract_title || doc.filename}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {doc.customer_agency} • {doc.contract_number}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <div className="flex justify-end w-full">
                    <Button onClick={handleRunAnalysis} disabled={analyzing || selectedDocs.length === 0} className="w-full sm:w-auto">
                        {analyzing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Starting...
                            </>
                        ) : (
                            "Run Gap Analysis"
                        )}
                    </Button>
                </div>
            </CardFooter>

            {/* Analysis Progress Modal */}
            <Dialog open={analyzing} onOpenChange={() => { }}>
                <DialogContent className="sm:max-w-md [&>button]:hidden">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                            Analyzing Opportunity...
                        </DialogTitle>
                        <DialogDescription className="space-y-4 pt-4" asChild>
                            <div className="space-y-4 pt-4 text-sm text-muted-foreground">
                                <p className="text-gray-700 font-medium">
                                    This process typically takes 30-60 seconds.
                                </p>
                                <div className="bg-amber-50 text-amber-800 p-3 rounded-md text-sm border border-amber-200">
                                    ⚠️ Please do not refresh the page or navigate away.
                                </div>
                                <Progress value={undefined} className="h-2 w-full animate-pulse" />
                                <p className="text-xs text-muted-foreground text-center">
                                    Analyzing {selectedDocs.length} documents against {requirements.length} requirements...
                                </p>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Upload, FileText, Loader2, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("document_type", "pws"); // Defaulting to PWS for Phase 3

        setUploading(true);
        try {
            const res = await api.post(`/api/opportunities/${id}/documents`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            // Add to local state (MVP shortcut)
            setDocuments(prev => [res.data, ...prev]);

        } catch (error) {
            console.error("Upload failed", error);
            alert("Upload failed. Check console.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleDeleteDocument = async (docId: string) => {
        if (!confirm("Delete this document? This will remove all extracted requirements.")) return;

        try {
            await api.delete(`/api/opportunities/${id}/documents/${docId}`);
            fetchOpportunity(); // Refresh
        } catch (error) {
            console.error("Delete failed", error);
            alert("Failed to delete document.");
        }
    };

    const handleUploadAmendment = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("document_type", "amendment");

        try {
            await api.post(`/api/opportunities/${id}/documents`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            fetchOpportunity(); // Refresh
        } catch (error) {
            console.error("Amendment upload failed", error);
            alert("Upload failed");
        } finally {
            setUploading(false);
            if (e.target) e.target.value = "";
        }
    };

    if (loading) {
        return <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!opportunity) {
        return <div>Opportunity not found</div>;
    }

    // Get requirements from the most recent PWS doc
    const latestDoc = documents.length > 0 ? documents[0] : null;
    const requirements = latestDoc?.parsed_requirements?.requirements || [];

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
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept=".pdf,.docx,.txt"
                                        onChange={handleFileUpload}
                                    />
                                    <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                                        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                        {uploading ? "Analyzing Document..." : "Upload PWS / SOW"}
                                    </Button>
                                </div>
                            </CardHeader>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-medium">Extracted Requirements ({requirements.length})</h3>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                                        <Upload className="mr-2 h-4 w-4" /> Upload Amendment
                                    </Button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept=".pdf,.docx,.txt"
                                        onChange={handleUploadAmendment}
                                    />
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
                                                        onClick={() => handleDeleteDocument(doc.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

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
                        <CardHeader>
                            <CardTitle>Opportunity Documents</CardTitle>
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
            }, { timeout: 90000 }); // 90s timeout

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
                        <div className="text-sm font-medium mb-2">Select Documents ({selectedDocs.length} selected)</div>
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
                                    className="h-4 w-4"
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

                <Button
                    onClick={handleRunAnalysis}
                    disabled={analyzing || selectedDocs.length === 0}
                    className="w-full"
                >
                    {analyzing ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Analyzing... This may take 30-60 seconds
                        </>
                    ) : (
                        "Run Analysis"
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { FileText, ArrowRight, Trash2, Loader2 } from "lucide-react";
import { useOrgStore } from "@/lib/stores/orgStore";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface Analysis {
    id: string;
    opportunity_id: string;
    overall_relevance_score: string;
    go_no_go_recommendation: string;
    created_at: string;
    // We'll need to fetch opportunity details separately or join
}

interface AnalysisWithOpportunity extends Analysis {
    opportunity_title?: string;
    opportunity_solicitation?: string;
}

export default function AnalysesPage() {
    const router = useRouter();
    const { currentOrg } = useOrgStore();
    const [analyses, setAnalyses] = useState<AnalysisWithOpportunity[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    useEffect(() => {
        if (currentOrg?.id) {
            fetchAnalyses();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentOrg?.id]);

    const fetchAnalyses = async () => {
        if (!currentOrg?.id) return;
        try {
            setLoading(true);
            // Fetch analyses - backend filters by org_id from header
            const res = await api.get('/api/analyses');

            // Fetch opportunity details for each analysis
            const analysesWithOpps = await Promise.all(
                res.data.map(async (analysis: Analysis) => {
                    try {
                        const oppRes = await api.get(`/api/opportunities/${analysis.opportunity_id}`);
                        return {
                            ...analysis,
                            opportunity_title: oppRes.data.title,
                            opportunity_solicitation: oppRes.data.solicitation_number,
                        };
                    } catch {
                        return {
                            ...analysis,
                            opportunity_title: "Unknown Opportunity",
                            opportunity_solicitation: "",
                        };
                    }
                })
            );

            setAnalyses(analysesWithOpps);
        } catch (error) {
            console.error("Failed to fetch analyses", error);
        } finally {
            setLoading(false);
        }
    };

    const getScoreBadge = (score: string) => {
        if (score?.includes("VERY RELEVANT")) {
            return (
                <span className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-green-100 text-green-700">
                    Very Relevant
                </span>
            );
        }
        if (score?.includes("RELEVANT")) {
            return (
                <span className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-blue-100 text-blue-700">
                    Relevant
                </span>
            );
        }
        if (score?.includes("SOMEWHAT")) {
            return (
                <span className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-amber-100 text-amber-700">
                    Somewhat Relevant
                </span>
            );
        }
        return (
            <span className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-100 text-red-700">
                Not Relevant
            </span>
        );
    };

    const getGoNoGoBadge = (recommendation: string) => {
        if (recommendation?.includes("GO") && !recommendation.includes("NO")) {
            return (
                <span className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-green-100 text-green-700">
                    GO
                </span>
            );
        }
        if (recommendation?.includes("CONDITIONAL")) {
            return (
                <span className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-amber-100 text-amber-700">
                    CONDITIONAL
                </span>
            );
        }
        return (
            <span className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-100 text-red-700">
                NO-GO
            </span>
        );
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        setIsDeleting(true);
        try {
            await api.delete(`/api/analyses/${deleteId}`);
            setAnalyses(prev => prev.filter(a => a.id !== deleteId));
            setDeleteId(null);
        } catch (error) {
            console.error("Failed to delete analysis", error);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(analyses.map(a => a.id));
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
            await api.post('/api/analyses/bulk-delete', { ids: selectedIds });
            fetchAnalyses();
            setSelectedIds([]);
        } catch (error) {
            console.error("Bulk delete failed", error);
        } finally {
            setIsBulkDeleting(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Analysis History</h1>
                <p className="text-sm text-slate-500">
                    View all gap analyses for your company.
                </p>
            </div>

            {selectedIds.length > 0 && (
                <div className="bg-slate-100 border border-slate-200 text-slate-700 px-4 py-2 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2 mb-4">
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
                        All Analyses
                    </h3>
                    <div className="text-sm text-slate-500">
                        {analyses.length} {analyses.length === 1 ? "analysis" : "analyses"} found
                    </div>
                </div>
                {loading ? (
                    <div className="py-10 text-center text-slate-500">Loading...</div>
                ) : analyses.length === 0 ? (
                    <div className="py-10 text-center">
                        <FileText className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                        <h3 className="text-lg font-semibold mb-2 text-slate-900">No analyses yet</h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Run your first gap analysis to see results here.
                        </p>
                        <Button onClick={() => router.push("/opportunities")}>
                            Go to Opportunities
                        </Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40px]">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={analyses.length > 0 && selectedIds.length === analyses.length}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                    />
                                </TableHead>
                                <TableHead>Opportunity</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Overall Score</TableHead>
                                <TableHead>Recommendation</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {analyses.map((analysis) => (
                                <TableRow
                                    key={analysis.id}
                                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                                    data-state={selectedIds.includes(analysis.id) ? "selected" : undefined}
                                    onClick={() =>
                                        router.push(
                                            `/opportunities/${analysis.opportunity_id}/analysis/${analysis.id}`
                                        )
                                    }
                                >
                                    <TableCell>
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            checked={selectedIds.includes(analysis.id)}
                                            onChange={(e) => handleSelectOne(analysis.id, e.target.checked)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center space-x-2">
                                            <FileText className="h-4 w-4 text-slate-400" />
                                            <div>
                                                <div className="text-slate-900">{analysis.opportunity_title}</div>
                                                {analysis.opportunity_solicitation && (
                                                    <div className="text-xs text-slate-500">
                                                        {analysis.opportunity_solicitation}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {format(new Date(analysis.created_at), "MMM d, yyyy")}
                                    </TableCell>
                                    <TableCell>{getScoreBadge(analysis.overall_relevance_score)}</TableCell>
                                    <TableCell>{getGoNoGoBadge(analysis.go_no_go_recommendation)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="ghost" size="sm">
                                                View <ArrowRight className="ml-2 h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteId(analysis.id);
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            <DeleteConfirmDialog
                isOpen={isBulkDeleting}
                onClose={() => setIsBulkDeleting(false)}
                onConfirm={handleBulkDelete}
                title={`Delete ${selectedIds.length} Analyses`}
                description="Are you sure you want to delete these reports? This action cannot be undone."
                isDeleting={isBulkDeleting}
            />

            <DeleteConfirmDialog
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                title="Delete Analysis"
                description="Are you sure you want to delete this analysis? This action cannot be undone."
                isDeleting={isDeleting}
            />
        </div>
    );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PlayCircle } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComplianceChecklistCard } from "@/components/analysis/ComplianceChecklistCard";

interface OpportunityAnalysis {
    id: string;
    overall_relevance_score?: number;
    overall_relevance_label?: string;
    go_no_go?: string;
}

interface OpportunityResponse {
    latest_analysis?: OpportunityAnalysis | null;
}

export function GapAnalysisTab({ opportunityId, initialAnalysis }: { opportunityId: string, initialAnalysis?: OpportunityAnalysis | null }) {
    const router = useRouter();
    const [analysis, setAnalysis] = useState<OpportunityAnalysis | null>(initialAnalysis || null);
    const [isRunning, setIsRunning] = useState(false);

    const fetchAnalysis = useCallback(async () => {
        try {
            const res = await api.get<OpportunityResponse>(`/api/opportunities/${opportunityId}`);
            setAnalysis(res.data?.latest_analysis || null);
        } catch (error) {
            console.error("Failed to load gap analysis", error);
        }
    }, [opportunityId]);

    useEffect(() => {
        if (initialAnalysis !== undefined) {
            setAnalysis(initialAnalysis);
            return;
        }

        if (opportunityId) {
            void fetchAnalysis();
        }
    }, [opportunityId, initialAnalysis, fetchAnalysis]);

    const handleRunAnalysis = async () => {
        setIsRunning(true);
        try {
            // 1. Fetch documents to analyze
            const docsRes = await api.get<{ id: string }[]>(`/api/opportunities/${opportunityId}/documents`);
            const documents = docsRes.data || [];

            if (documents.length === 0) {
                toast.error("No documents found to analyze. Please upload PWS/SOW first.");
                setIsRunning(false);
                return;
            }

            toast.loading("Starting gap analysis...", { id: "analysis-toast" });

            // 2. Trigger analysis
            await api.post("/api/analyses", {
                opportunity_id: opportunityId,
                document_ids: documents.map(d => d.id)
            });

            toast.success("Analysis complete!", { id: "analysis-toast" });

            // 3. Refresh data
            await fetchAnalysis();

        } catch (error) {
            console.error("Analysis failed", error);
            toast.error("Analysis failed. Please try again.", { id: "analysis-toast" });
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="p-6 space-y-4 overflow-y-auto h-full">
            <ComplianceChecklistCard opportunityId={opportunityId} />

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-base text-slate-900">Latest Gap Analysis</CardTitle>
                    {analysis && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRunAnalysis}
                            disabled={isRunning}
                            className="h-8"
                        >
                            {isRunning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlayCircle className="h-4 w-4 mr-2" />}
                            Run New Analysis
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="p-5 pt-0 space-y-4">
                    {!analysis ? (
                        <EmptyState
                            icon="search"
                            title="No gap analysis available"
                            description="Run an analysis to compare RFP requirements against your company profile."
                            action={{
                                label: isRunning ? "Analyzing..." : "Run Analysis",
                                onClick: handleRunAnalysis,
                                disabled: isRunning
                            }}
                            className="py-8"
                        />
                    ) : (
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">
                                    {analysis.overall_relevance_label || "Relevance not available"}
                                </p>
                            </div>
                            <div className="text-2xl font-bold text-slate-900">
                                {analysis.overall_relevance_score
                                    ? `${analysis.overall_relevance_score}%`
                                    : "--"}
                            </div>
                        </div>
                    )}

                    {analysis && (
                        <Button
                            onClick={() => router.push(`/opportunities/${opportunityId}/analysis/${analysis.id}`)}
                        >
                            View Full Report
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

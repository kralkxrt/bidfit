"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
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

export function GapAnalysisTab({ opportunityId }: { opportunityId: string }) {
    const router = useRouter();
    const [analysis, setAnalysis] = useState<OpportunityAnalysis | null>(null);

    useEffect(() => {
        const fetchAnalysis = async () => {
            try {
                const res = await api.get<OpportunityResponse>(`/api/opportunities/${opportunityId}`);
                setAnalysis(res.data?.latest_analysis || null);
            } catch (error) {
                console.error("Failed to load gap analysis", error);
            }
        };

        if (opportunityId) {
            void fetchAnalysis();
        }
    }, [opportunityId]);

    return (
        <div className="p-6 space-y-4 overflow-y-auto h-full">
            <ComplianceChecklistCard opportunityId={opportunityId} />

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="p-5 pb-3">
                    <CardTitle className="text-base text-slate-900">Latest Gap Analysis</CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0 space-y-4">
                    {!analysis ? (
                        <div className="text-sm text-slate-500">
                            No gap analysis available yet. Run an analysis to see scoring and recommendations.
                        </div>
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

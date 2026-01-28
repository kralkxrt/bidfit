"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, HelpCircle, MinusCircle, XCircle } from "lucide-react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ComplianceStatus = "pass" | "fail" | "partial" | "unknown";

interface ComplianceRequirement {
    id: string;
    category: string;
    requirement: string;
    source: string;
    met: boolean;
    status: ComplianceStatus;
    details: string;
    evidence: string[];
    recommendation?: string;
}

interface ComplianceCheckResponse {
    overall_status: Exclude<ComplianceStatus, "unknown">;
    met_count: number;
    total_count: number;
    requirements: ComplianceRequirement[];
}

const complianceBadgeStyles: Record<Exclude<ComplianceStatus, "unknown">, string> = {
    pass: "bg-green-100 text-green-800 border-green-200",
    partial: "bg-amber-100 text-amber-800 border-amber-200",
    fail: "bg-red-100 text-red-800 border-red-200",
};

const requirementIcon = (status: ComplianceStatus) => {
    switch (status) {
        case "pass":
            return <CheckCircle2 className="h-4 w-4 text-green-600" />;
        case "fail":
            return <XCircle className="h-4 w-4 text-red-600" />;
        case "partial":
            return <MinusCircle className="h-4 w-4 text-amber-600" />;
        default:
            return <HelpCircle className="h-4 w-4 text-slate-400" />;
    }
};

export function ComplianceChecklistCard({
    opportunityId,
    title = "Compliance Checklist",
    description = "Matches extracted requirements against your company profile and uploaded documents.",
}: {
    opportunityId: string;
    title?: string;
    description?: string;
}) {
    const [compliance, setCompliance] = useState<ComplianceCheckResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchCompliance = useCallback(async () => {
        if (!opportunityId) return;
        setLoading(true);
        setError(null);

        try {
            const res = await api.post<ComplianceCheckResponse>(
                "/api/roxy/tools/compliance-check",
                { opportunity_id: opportunityId }
            );
            setCompliance(res.data);
        } catch (err) {
            console.error("Failed to load compliance checklist", err);
            setError("Failed to load compliance checklist.");
        } finally {
            setLoading(false);
        }
    }, [opportunityId]);

    useEffect(() => {
        void fetchCompliance();
    }, [fetchCompliance]);

    const requirementsByCategory = useMemo(() => {
        const requirements = compliance?.requirements || [];
        const grouped = new Map<string, ComplianceRequirement[]>();

        for (const req of requirements) {
            const key = req.category || "other";
            grouped.set(key, [...(grouped.get(key) || []), req]);
        }

        return grouped;
    }, [compliance?.requirements]);

    return (
        <Card className="border-slate-200 shadow-sm">
            <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                        <CardTitle className="text-base text-slate-900">{title}</CardTitle>
                        <p className="text-sm text-slate-500">{description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg border-slate-200 text-slate-700"
                            onClick={fetchCompliance}
                            disabled={loading}
                        >
                            {loading ? "Refreshing..." : "Refresh"}
                        </Button>
                        {compliance?.overall_status && (
                            <Badge
                                variant="outline"
                                className={cn(
                                    "font-semibold",
                                    complianceBadgeStyles[compliance.overall_status]
                                )}
                            >
                                {compliance.overall_status.toUpperCase()}
                            </Badge>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-5 pt-0 space-y-4">
                {error && <div className="text-sm text-red-600">{error}</div>}

                {compliance && (
                    <div className="flex items-center justify-between text-sm text-slate-600">
                        <div>
                            Met {compliance.met_count} of {compliance.total_count}
                        </div>
                    </div>
                )}

                {!loading && (!compliance || compliance.requirements.length === 0) ? (
                    <div className="text-sm text-slate-500">
                        No checklist items yet. (This usually means requirements haven’t been extracted for the
                        opportunity, or there isn’t enough company profile data.)
                    </div>
                ) : null}

                {Array.from(requirementsByCategory.entries()).map(([category, reqs]) => (
                    <div key={category} className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            {category.replace(/_/g, " ")}
                        </div>
                        <div className="rounded-xl border border-slate-200 overflow-hidden">
                            <div className="divide-y divide-slate-100">
                                {reqs.map((req) => (
                                    <div key={req.id} className="p-4 bg-white">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5">{requirementIcon(req.status)}</div>
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="text-sm font-semibold text-slate-900">
                                                        {req.requirement}
                                                    </div>
                                                    <div className="text-xs text-slate-500">{req.source}</div>
                                                </div>
                                                <div className="text-sm text-slate-600">{req.details}</div>

                                                {req.evidence?.length > 0 && (
                                                    <ul className="list-disc list-inside text-xs text-slate-500 space-y-1">
                                                        {req.evidence.map((ev) => (
                                                            <li key={ev}>{ev}</li>
                                                        ))}
                                                    </ul>
                                                )}

                                                {req.recommendation && (
                                                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                                                        Recommendation: {req.recommendation}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

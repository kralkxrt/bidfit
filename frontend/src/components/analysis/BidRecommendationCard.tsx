"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, AlertTriangle, ClipboardList, Target } from "lucide-react";
import { cn } from "@/lib/utils";

type RecommendationStatus = "GO" | "CONDITIONAL" | "NO-GO";

interface BidRecommendationCardProps {
    recommendation: RecommendationStatus;
    confidence?: number;
    strengths?: string[];
    risks?: string[];
    actions?: string[];
    onAskRoxy?: () => void;
}

const statusStyles: Record<RecommendationStatus, { label: string; className: string }> = {
    GO: { label: "GO", className: "bg-green-100 text-green-800 border-green-200" },
    CONDITIONAL: { label: "CONDITIONAL", className: "bg-amber-100 text-amber-800 border-amber-200" },
    "NO-GO": { label: "NO-GO", className: "bg-red-100 text-red-800 border-red-200" },
};

export function BidRecommendationCard({
    recommendation,
    confidence,
    strengths = [],
    risks = [],
    actions = [],
    onAskRoxy,
}: BidRecommendationCardProps) {
    const status = statusStyles[recommendation];
    const confidenceLabel =
        typeof confidence === "number"
            ? `${Math.round(confidence)}%`
            : confidence === 0
                ? "0%"
                : null;

    return (
        <Card className="rounded-[2rem] border-slate-100 shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                    <Target className="h-4 w-4 text-blue-600" />
                    Bid Recommendation
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                    <Badge variant="outline" className={cn("text-sm font-semibold", status.className)}>
                        {status.label}
                    </Badge>
                    {confidenceLabel && (
                        <span className="text-sm text-slate-500">Confidence: {confidenceLabel}</span>
                    )}
                </div>

                <Separator />

                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Strengths
                    </div>
                    {strengths.length === 0 ? (
                        <p className="text-sm text-slate-500">No strengths listed.</p>
                    ) : (
                        <ul className="space-y-1 text-sm text-slate-600 list-disc list-inside">
                            {strengths.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    )}
                </div>

                <Separator />

                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Risks
                    </div>
                    {risks.length === 0 ? (
                        <p className="text-sm text-slate-500">No risks listed.</p>
                    ) : (
                        <ul className="space-y-1 text-sm text-slate-600 list-disc list-inside">
                            {risks.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    )}
                </div>

                <Separator />

                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <ClipboardList className="h-4 w-4 text-blue-600" />
                        If you proceed
                    </div>
                    {actions.length === 0 ? (
                        <p className="text-sm text-slate-500">No follow-up actions listed.</p>
                    ) : (
                        <ul className="space-y-1 text-sm text-slate-600 list-disc list-inside">
                            {actions.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    )}
                </div>

                {onAskRoxy && (
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={onAskRoxy}
                            className="text-sm text-blue-500 hover:underline"
                        >
                            Ask Roxy to explain this recommendation
                        </button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

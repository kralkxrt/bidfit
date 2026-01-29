"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import { Plus } from "lucide-react";
import api from "@/lib/api";
import { useOrgStore } from "@/lib/stores/orgStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BidStatus = "GO" | "CONDITIONAL" | "NO-GO";

interface OpportunityLatestAnalysis {
    id: string;
    overall_relevance_score?: number;
    overall_relevance_label?: string;
    go_no_go?: BidStatus;
}

interface Opportunity {
    id: string;
    title: string;
    solicitation_number?: string | null;
    agency?: string | null;
    response_due_date?: string | null;
    latest_analysis?: OpportunityLatestAnalysis | null;
}

const statusBadgeStyles: Record<BidStatus, string> = {
    GO: "px-3 py-1.5 rounded-lg text-sm font-semibold bg-green-100 text-green-700",
    CONDITIONAL: "px-3 py-1.5 rounded-lg text-sm font-semibold bg-amber-100 text-amber-700",
    "NO-GO": "px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-100 text-red-700",
};

import { CardSkeleton } from "@/components/ui/skeleton";

export default function OpportunitiesPage() {
    const { currentOrg } = useOrgStore();
    const orgId = currentOrg?.id;

    // Avoid timezone-dependent SSR output.
    const [now, setNow] = useState<Date | null>(null);
    useEffect(() => {
        setNow(new Date());
    }, []);

    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchOpportunities = useCallback(async () => {
        if (!orgId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const res = await api.get<Opportunity[]>("/api/opportunities", {
                params: { org_id: orgId },
            });
            setOpportunities(res.data || []);
        } catch (error) {
            console.error("Failed to fetch opportunities", error);
            setOpportunities([]);
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => {
        fetchOpportunities();
    }, [fetchOpportunities]);

    const content = useMemo(() => {
        if (!currentOrg) {
            return (
                <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 text-sm text-slate-500">
                    Select an organization to view opportunities.
                </div>
            );
        }

        if (loading) {
            return (
                <div className="space-y-4">
                    <div className="space-y-4">
                        <CardSkeleton />
                        <CardSkeleton />
                        <CardSkeleton />
                    </div>
                </div>
            );
        }

        if (opportunities.length === 0) {
            return (
                <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
                    <div className="text-sm text-slate-600">No opportunities yet.</div>
                    <div className="text-sm text-slate-500 mt-1">
                        Create one to start tracking deadlines and running gap analyses.
                    </div>
                    <div className="mt-4">
                        <Button asChild>
                            <Link href="/opportunities/new">New Opportunity</Link>
                        </Button>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {opportunities.map((opp) => {
                    const status = opp.latest_analysis?.go_no_go;
                    const score = opp.latest_analysis?.overall_relevance_score;

                    const dueDate = opp.response_due_date
                        ? parseISO(opp.response_due_date)
                        : null;
                    const daysLeft = dueDate && now
                        ? differenceInCalendarDays(dueDate, now)
                        : null;

                    const dueLabel = !dueDate
                        ? "Due: —"
                        : !now
                            ? `Due: ${format(dueDate, "MMM d, yyyy")}`
                            : `Due: ${format(dueDate, "MMM d, yyyy")} (${daysLeft === 0
                                ? "today"
                                : `${Math.abs(daysLeft ?? 0)} ${Math.abs(daysLeft ?? 0) === 1 ? "day" : "days"}${(daysLeft ?? 0) < 0 ? " ago" : ""}`
                            })`;

                    const dueIsUrgent =
                        typeof daysLeft === "number" && (daysLeft < 0 || daysLeft < 7);

                    return (
                        <Link
                            key={opp.id}
                            href={`/opportunities/${opp.id}/analyze`}
                            className="block bg-white rounded-xl border border-slate-200 shadow-card p-5 hover:shadow-card-hover hover:border-blue-200 transition-all duration-200"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="text-lg font-semibold text-slate-900 truncate">
                                        {opp.title}
                                    </div>
                                </div>

                                {status ? (
                                    <span className={cn("shrink-0", statusBadgeStyles[status])}>{status}</span>
                                ) : (
                                    <span className="shrink-0 px-3 py-1.5 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700">—</span>
                                )}
                            </div>

                            <div className="mt-1 text-sm text-slate-600">
                                {opp.agency || "Agency N/A"}
                            </div>
                            <div className="text-sm text-slate-500">
                                {opp.solicitation_number || "Solicitation N/A"}
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-4 text-sm">
                                <div className={cn("text-slate-500", dueIsUrgent && "text-red-600")}>
                                    {dueLabel}
                                </div>
                                <div className="text-slate-500 shrink-0">
                                    Gap Score:{" "}
                                    <span className="font-semibold text-slate-900">
                                        {typeof score === "number" ? `${Math.round(score)}%` : "—"}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        );
    }, [currentOrg, loading, opportunities, now]);

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Opportunities</h1>
                    <p className="text-sm text-slate-500">
                        Review deadlines, see gap scores, and jump into analysis.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/opportunities/new">
                        <Plus className="mr-2 h-4 w-4" /> New Opportunity
                    </Link>
                </Button>
            </div>

            {content}
        </div>
    );
}

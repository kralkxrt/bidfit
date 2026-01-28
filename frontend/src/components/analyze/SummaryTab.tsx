"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface OpportunitySummary {
    title?: string;
    solicitation_number?: string;
    agency?: string;
    set_aside_type?: string;
    response_due_date?: string;
}

export function SummaryTab({ opportunityId }: { opportunityId: string }) {
    const [opportunity, setOpportunity] = useState<OpportunitySummary | null>(null);

    useEffect(() => {
        const fetchOpportunity = async () => {
            try {
                const res = await api.get(`/api/opportunities/${opportunityId}`);
                setOpportunity(res.data || null);
            } catch (error) {
                console.error("Failed to load opportunity summary", error);
            }
        };
        if (opportunityId) {
            fetchOpportunity();
        }
    }, [opportunityId]);

    return (
        <div className="p-6 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                    {opportunity?.title || "Opportunity Summary"}
                </h2>
                <p className="text-sm text-slate-500">
                    {opportunity?.solicitation_number || "Solicitation not available"}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">Agency</div>
                    <div className="text-sm font-medium text-slate-900">
                        {opportunity?.agency || "N/A"}
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">Set-Aside</div>
                    <div className="text-sm font-medium text-slate-900">
                        {opportunity?.set_aside_type || "N/A"}
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">Due Date</div>
                    <div className="text-sm font-medium text-slate-900">
                        {opportunity?.response_due_date
                            ? new Date(opportunity.response_due_date).toLocaleDateString()
                            : "N/A"}
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">Status</div>
                    <div className="text-sm font-medium text-slate-900">Active</div>
                </div>
            </div>
        </div>
    );
}

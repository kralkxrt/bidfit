"use client";

import {
    Building2,
    DollarSign,
    Calendar,
    Users,
    AlertTriangle,
    FileText
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ContractAssessment } from "@/types/analysis";
import { cn } from "@/lib/utils";

interface ContractAssessmentsProps {
    contracts: ContractAssessment[];
}

export function ContractAssessments({ contracts }: ContractAssessmentsProps) {
    if (!contracts || contracts.length === 0) return null;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {contracts.map((ca, i) => (
                    <div
                        key={i}
                        className={cn(
                            "bg-white rounded-xl border border-gray-200 shadow-sm transition-all duration-200 p-6",
                            ca.is_padding ? "opacity-75 border-dashed" : "hover:shadow-lg hover:border-emerald-200"
                        )}
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                    <FileText className="w-6 h-6 text-gray-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1">
                                        {ca.contract_name}
                                    </h3>
                                    <p className="text-sm font-mono text-gray-500 bg-gray-50 px-2 py-0.5 rounded w-fit">
                                        {ca.contract_number || "Reference Document"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <div className={cn(
                                    "flex flex-col items-center justify-center w-16 h-16 rounded-full border-4",
                                    ca.relevance_score >= 80 ? "bg-emerald-50 border-emerald-500" :
                                        ca.relevance_score >= 50 ? "bg-amber-50 border-amber-500" :
                                            "bg-red-50 border-red-500"
                                )}>
                                    <span className={cn(
                                        "text-sm font-bold",
                                        ca.relevance_score >= 80 ? "text-emerald-700" :
                                            ca.relevance_score >= 50 ? "text-amber-700" :
                                                "text-red-700"
                                    )}>
                                        {ca.relevance_score}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-y-4 gap-x-8 pb-6 border-b border-gray-100">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2.5 text-sm text-gray-600">
                                    <Building2 className="w-4 h-4 text-emerald-500/70" />
                                    <span className="font-medium text-gray-900">{ca.customer_agency}</span>
                                </div>
                                <div className="flex items-center gap-2.5 text-sm text-gray-600">
                                    <DollarSign className="w-4 h-4 text-emerald-500/70" />
                                    <span className="font-medium text-gray-900">
                                        {typeof ca.contract_value === 'number' ? `$${ca.contract_value.toLocaleString()}` : ca.contract_value}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2.5 text-sm text-gray-600">
                                    <Users className="w-4 h-4 text-emerald-500/70" />
                                    <span className="font-medium text-gray-900">{ca.fte_count || 'N/A'} FTEs</span>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2.5 text-sm text-gray-600">
                                    <Calendar className="w-4 h-4 text-emerald-500/70" />
                                    <span className="font-medium text-gray-900">{ca.duration_months || 'N/A'} Months</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                                        ca.environment_match === 'MATCH' ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
                                    )}>
                                        {ca.service_branch} - {ca.environment_match}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Scope:</span>
                                    <span className={cn(
                                        "text-xs font-bold uppercase",
                                        ca.scope_match === 'HIGH' ? "text-emerald-600" : "text-orange-600"
                                    )}>
                                        {ca.scope_match}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-5 space-y-5">
                            <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Primary Support Area</h4>
                                <p className="text-sm text-gray-700 font-medium leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    {ca.primary_use}
                                </p>
                            </div>

                            {ca.limitations && ca.limitations.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold text-red-300 uppercase tracking-widest mb-2 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        Evaluator Concerns
                                    </h4>
                                    <ul className="space-y-2">
                                        {ca.limitations.map((lim, i) => (
                                            <li key={i} className="flex gap-2 text-sm text-red-700 bg-red-50 p-2.5 rounded-lg border border-red-100/50">
                                                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                                {lim}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

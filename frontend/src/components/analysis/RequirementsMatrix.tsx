"use client";

import React from "react";
import {
    CheckCircle,
    AlertCircle,
    XCircle,
    Search,
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RequirementAssessment } from "@/types/analysis";
import { cn } from "@/lib/utils";

interface RequirementsMatrixProps {
    requirements: RequirementAssessment[];
    summary: {
        total: number;
        strong: number;
        moderate: number;
        weak: number;
        gap: number;
        coverage_percentage: number;
    };
}

export function RequirementsMatrix({ requirements, summary }: RequirementsMatrixProps) {
    const [searchTerm, setSearchTerm] = React.useState("");
    const [filterStatus, setFilterStatus] = React.useState<string | null>(null);

    const filteredRequirements = requirements.filter(req => {
        const matchesSearch = req.requirement_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.req_id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus ? req.coverage_status === filterStatus : true;
        return matchesSearch && matchesStatus;
    });

    const renderStatusBadge = (status: string) => {
        switch (status) {
            case "STRONG":
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Strong
                    </span>
                );
            case "MODERATE":
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Moderate
                    </span>
                );
            case "WEAK":
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Weak
                    </span>
                );
            case "GAP":
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        <XCircle className="w-3.5 h-3.5" />
                        Gap
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {status}
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                    <div className="text-sm font-medium text-gray-500">Total</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">{summary.total}</div>
                </div>
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl shadow-sm">
                    <div className="text-sm font-medium text-emerald-600">Strong</div>
                    <div className="text-2xl font-bold text-emerald-700 mt-1">{summary.strong}</div>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl shadow-sm">
                    <div className="text-sm font-medium text-amber-600">Moderate</div>
                    <div className="text-2xl font-bold text-amber-700 mt-1">{summary.moderate}</div>
                </div>
                <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl shadow-sm">
                    <div className="text-sm font-medium text-orange-600">Weak</div>
                    <div className="text-2xl font-bold text-orange-700 mt-1">{summary.weak}</div>
                </div>
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl shadow-sm">
                    <div className="text-sm font-medium text-red-600">Gaps</div>
                    <div className="text-2xl font-bold text-red-700 mt-1">{summary.gap}</div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Search requirements..."
                        className="pl-10 rounded-lg border-gray-300 focus:ring-emerald-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <Button
                        variant={filterStatus === null ? "default" : "secondary"}
                        size="sm"
                        onClick={() => setFilterStatus(null)}
                        className={cn("rounded-lg", filterStatus === null && "bg-gray-900 hover:bg-gray-800")}
                    >
                        All
                    </Button>
                    <Button
                        variant={filterStatus === "STRONG" ? "default" : "secondary"}
                        size="sm"
                        onClick={() => setFilterStatus("STRONG")}
                        className={cn("rounded-lg", filterStatus === "STRONG" && "bg-emerald-500 hover:bg-emerald-600")}
                    >
                        Strong
                    </Button>
                    <Button
                        variant={filterStatus === "GAP" ? "default" : "secondary"}
                        size="sm"
                        onClick={() => setFilterStatus("GAP")}
                        className={cn("rounded-lg", filterStatus === "GAP" && "bg-red-500 hover:bg-red-600")}
                    >
                        Gaps
                    </Button>
                </div>
            </div>

            {/* Requirements Matrix Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <Table>
                    <TableHeader className="bg-gray-50 border-b border-gray-200">
                        <TableRow className="hover:bg-gray-50">
                            <TableHead className="w-28 text-xs font-semibold text-gray-500 uppercase tracking-wider py-4">ID</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider py-4">Requirement</TableHead>
                            <TableHead className="w-36 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider py-4">Status</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider py-4">Evidence & Notes</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100">
                        {filteredRequirements.map((req) => (
                            <TableRow key={req.req_id} className="hover:bg-gray-50/50 transition-colors">
                                <TableCell className="font-mono text-xs font-semibold text-gray-500 align-top py-4">{req.req_id}</TableCell>
                                <TableCell className="max-w-md py-4 align-top">
                                    <div className="text-sm font-medium text-gray-900 leading-snug">{req.requirement_text}</div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded uppercase tracking-wider">{req.category}</span>
                                        <span className={cn(
                                            "text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider",
                                            req.criticality === "CRITICAL" ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"
                                        )}>
                                            {req.criticality}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center align-top py-4">
                                    {renderStatusBadge(req.coverage_status)}
                                </TableCell>
                                <TableCell className="align-top py-4">
                                    <div className="space-y-2">
                                        {req.supporting_evidence.length > 0 ? (
                                            req.supporting_evidence.map((evidence, i) => (
                                                <div key={i} className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100/50 italic leading-relaxed">
                                                    “{evidence}”
                                                </div>
                                            ))
                                        ) : !req.notes ? (
                                            <span className="text-sm text-gray-400 italic">No specific evidence provided</span>
                                        ) : null}

                                        {req.notes && (
                                            <div className="text-xs text-blue-700 bg-blue-50 p-2.5 rounded-lg border border-blue-100/50 flex items-start gap-2">
                                                <span className="font-bold uppercase tracking-wider text-[10px] mt-0.5">Note:</span>
                                                <span>{req.notes}</span>
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {filteredRequirements.length === 0 && (
                    <div className="p-12 text-center text-gray-500">
                        <p className="text-lg font-medium text-gray-900">No requirements found</p>
                        <p className="text-sm">Try adjusting your search or filters</p>
                    </div>
                )}
            </div>
        </div>
    );
}

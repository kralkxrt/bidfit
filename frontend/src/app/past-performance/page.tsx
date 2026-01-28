"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Plus, Search, Briefcase } from "lucide-react";

import api from "@/lib/api";
import { useOrgStore } from "@/lib/stores/orgStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface PastPerformanceContract {
    id: string;
    contract_title?: string | null;
    customer_agency?: string | null;
    contract_number?: string | null;
    contract_value?: number | null;
    period_of_performance_start?: string | null;
    period_of_performance_end?: string | null;
    naics_code?: string | null;
    notes?: string | null;
}

const formatCurrency = (value?: number | null) => {
    if (typeof value !== "number") return "—";
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(value);
};

const formatPeriod = (start?: string | null, end?: string | null) => {
    const startLabel = start ? format(parseISO(start), "MMM d, yyyy") : "—";
    const endLabel = end ? format(parseISO(end), "MMM d, yyyy") : "—";
    return `${startLabel} – ${endLabel}`;
};

export default function PastPerformancePage() {
    const { currentOrg } = useOrgStore();
    const orgId = currentOrg?.id;

    const [contracts, setContracts] = useState<PastPerformanceContract[]>([]);
    const [loading, setLoading] = useState(true);

    const [keyword, setKeyword] = useState("");
    const [agencyFilter, setAgencyFilter] = useState<string>("all");
    const [naicsFilter, setNaicsFilter] = useState<string>("all");

    const fetchContracts = useCallback(async () => {
        if (!orgId) {
            setContracts([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // api interceptor auto-includes org_id; keep explicit params to match backend expectation.
            const res = await api.get<PastPerformanceContract[]>("/api/past-performance", {
                params: { org_id: orgId },
            });
            setContracts(res.data || []);
        } catch (error) {
            console.error("Failed to fetch past performance contracts", error);
            setContracts([]);
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => {
        fetchContracts();
    }, [fetchContracts]);

    const agencies = useMemo(() => {
        const unique = new Set<string>();
        for (const c of contracts) {
            const val = c.customer_agency?.trim();
            if (val) unique.add(val);
        }
        return Array.from(unique).sort((a, b) => a.localeCompare(b));
    }, [contracts]);

    const naicsCodes = useMemo(() => {
        const unique = new Set<string>();
        for (const c of contracts) {
            const val = c.naics_code?.trim();
            if (val) unique.add(val);
        }
        return Array.from(unique).sort((a, b) => a.localeCompare(b));
    }, [contracts]);

    const filteredContracts = useMemo(() => {
        const q = keyword.trim().toLowerCase();

        return contracts.filter((c) => {
            if (agencyFilter !== "all" && (c.customer_agency || "") !== agencyFilter) {
                return false;
            }
            if (naicsFilter !== "all" && (c.naics_code || "") !== naicsFilter) {
                return false;
            }

            if (!q) return true;

            const haystack = [
                c.contract_title,
                c.customer_agency,
                c.contract_number,
                c.naics_code,
                c.notes,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return haystack.includes(q);
        });
    }, [agencyFilter, contracts, keyword, naicsFilter]);

    const content = useMemo(() => {
        if (!currentOrg) {
            return (
                <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 text-sm text-slate-500">
                    Select an organization to view past performance contracts.
                </div>
            );
        }

        if (loading) {
            return (
                <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 animate-pulse h-28" />
                    <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 animate-pulse h-28" />
                    <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 animate-pulse h-28" />
                </div>
            );
        }

        if (filteredContracts.length === 0) {
            return (
                <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
                    <div className="text-sm text-slate-600">No past performance contracts found.</div>
                    <div className="text-sm text-slate-500 mt-1">
                        Add a contract to start building your past performance library.
                    </div>
                    <div className="mt-4">
                        <Button asChild>
                            <Link href="/past-performance/new">Add Contract</Link>
                        </Button>
                    </div>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredContracts.map((contract) => (
                    <Link
                        key={contract.id}
                        href={`/past-performance/${contract.id}`}
                        className="block bg-white rounded-xl border border-slate-200 shadow-card p-5 hover:shadow-card-hover hover:border-blue-200 transition-all duration-200"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <div className="text-lg font-semibold text-slate-900 truncate">
                                    {contract.contract_title || "Untitled Contract"}
                                </div>
                                <div className="mt-1 text-sm text-slate-600">
                                    {contract.customer_agency || "Agency N/A"}
                                </div>
                            </div>

                            <Badge
                                variant="outline"
                                className="shrink-0 bg-slate-100 text-slate-700 border-slate-200"
                            >
                                <Briefcase className="w-3.5 h-3.5 mr-1" />
                                Contract
                            </Badge>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-2 text-sm">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-500">Contract Value</span>
                                <span className="font-semibold text-slate-900">{formatCurrency(contract.contract_value)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-500">Period of Performance</span>
                                <span className="text-slate-700">{formatPeriod(contract.period_of_performance_start, contract.period_of_performance_end)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-500">NAICS</span>
                                <span className="text-slate-700">{contract.naics_code || "—"}</span>
                            </div>
                        </div>

                    </Link>
                ))}
            </div>
        );
    }, [currentOrg, filteredContracts, loading]);

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Past Performance</h1>
                    <p className="text-sm text-slate-500">
                        Manage past performance contracts for {currentOrg?.name || "your organization"}.
                    </p>
                </div>

                <Button asChild>
                    <Link href="/past-performance/new">
                        <Plus className="mr-2 h-4 w-4" /> Add Contract
                    </Link>
                </Button>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="relative w-full md:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search by agency, NAICS, keyword..."
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        className="pl-9 bg-white border-slate-200"
                    />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Select value={agencyFilter} onValueChange={setAgencyFilter}>
                        <SelectTrigger className="w-full sm:w-[220px] bg-white border-slate-200">
                            <SelectValue placeholder="Filter by agency" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Agencies</SelectItem>
                            {agencies.map((agency) => (
                                <SelectItem key={agency} value={agency}>
                                    {agency}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={naicsFilter} onValueChange={setNaicsFilter}>
                        <SelectTrigger className="w-full sm:w-[180px] bg-white border-slate-200">
                            <SelectValue placeholder="Filter by NAICS" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All NAICS</SelectItem>
                            {naicsCodes.map((naics) => (
                                <SelectItem key={naics} value={naics}>
                                    {naics}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {content}
        </div>
    );
}

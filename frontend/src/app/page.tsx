"use client";

import Link from "next/link";
import axios from "axios";
import {
    ArrowRight,
    BarChart3,
    FileUp,
    FolderOpen,
    ListChecks,
    ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { useOrgStore } from "@/lib/stores/orgStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DashboardOpportunity {
    id: string;
    title: string;
    agency?: string;
    solicitation_number?: string;
    updated_at?: string;
}

interface DashboardSummaryResponse {
    activeOpportunities?: number;
    analyzedThisMonth?: number;
    avgGapScore?: number | null;
    goCount?: number;
    noGoCount?: number;
    conditionalCount?: number;
    recentOpportunities?: DashboardOpportunity[];
}

const toNumber = (value: unknown, fallback = 0) => {
    if (typeof value === "number" && !Number.isNaN(value)) return value;
    if (typeof value === "string") {
        const n = Number(value);
        return Number.isNaN(n) ? fallback : n;
    }
    return fallback;
};

const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
};

export default function Home() {
    const currentOrg = useOrgStore((s) => s.currentOrg);

    // Avoid Date-based SSR output which can cause hydration mismatches.
    const [greeting, setGreeting] = useState<string>("Hello");
    useEffect(() => {
        setGreeting(getGreeting());
    }, []);

    const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Upload RFP modal
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [uploadOpportunityId, setUploadOpportunityId] = useState<string>("");
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const fetchDashboardSummary = useCallback(async () => {
        if (!currentOrg?.id) return;

        try {
            setLoading(true);
            setError(null);

            const res = await api.get<DashboardSummaryResponse>("/api/dashboard/summary", {
                params: { org_id: currentOrg.id },
            });

            setSummary(res.data);
        } catch (err) {
            console.error("Failed to fetch dashboard summary", err);
            setError("Dashboard summary unavailable.");
            setSummary(null);
        } finally {
            setLoading(false);
        }
    }, [currentOrg?.id]);

    useEffect(() => {
        if (!currentOrg?.id) return;
        void fetchDashboardSummary();
    }, [currentOrg?.id, fetchDashboardSummary]);

    const recentOpportunities = useMemo(() => summary?.recentOpportunities ?? [], [summary]);

    const activeOpportunitiesCount = toNumber(summary?.activeOpportunities);
    const analyzedThisMonthCount = toNumber(summary?.analyzedThisMonth);
    const averageGapScore = toNumber(summary?.avgGapScore);

    const goCount = toNumber(summary?.goCount);
    const noGoCount = toNumber(summary?.noGoCount);
    const conditionalCount = toNumber(summary?.conditionalCount);

    const handleUploadRfp = async () => {
        if (!uploadOpportunityId || !uploadFile) return;

        setUploading(true);
        setUploadError(null);

        try {
            const formData = new FormData();
            formData.append("file", uploadFile);
            formData.append("document_type", "rfp");

            await api.post(`/api/opportunities/${uploadOpportunityId}/documents`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            setIsUploadOpen(false);
            setUploadOpportunityId("");
            setUploadFile(null);

            void fetchDashboardSummary();
        } catch (err: unknown) {
            console.error("RFP upload failed", err);

            let message = "Upload failed.";
            if (axios.isAxiosError(err)) {
                const detail = (err.response?.data as { detail?: unknown } | undefined)?.detail;
                if (typeof detail === "string" && detail) {
                    message = detail;
                } else if (typeof err.message === "string" && err.message) {
                    message = err.message;
                }
            } else if (err instanceof Error && err.message) {
                message = err.message;
            }

            setUploadError(message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="h-full overflow-auto p-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{greeting}</h1>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                Organization
                            </span>
                            <span className="font-medium text-slate-700">
                                {currentOrg?.name || "—"}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button asChild className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg">
                            <Link href="/opportunities/new">New Opportunity</Link>
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="rounded-lg border-slate-300"
                            onClick={() => setIsUploadOpen(true)}
                            disabled={!currentOrg?.id}
                        >
                            <FileUp className="w-4 h-4 mr-2" />
                            Upload RFP
                        </Button>
                    </div>
                </div>

                {error && <div className="text-sm text-red-600">{error}</div>}

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 flex items-start justify-between">
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Opportunities</div>
                            <div className="text-3xl font-bold text-slate-900 mt-1">
                                {loading ? "—" : activeOpportunitiesCount}
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <FolderOpen className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 flex items-start justify-between">
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Analyzed This Month</div>
                            <div className="text-3xl font-bold text-slate-900 mt-1">
                                {loading ? "—" : analyzedThisMonthCount}
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 flex items-start justify-between">
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Average Gap Score</div>
                            <div className="text-3xl font-bold text-slate-900 mt-1">
                                {loading ? "—" : `${Math.round(averageGapScore)}%`}
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Go / No-Go</div>
                                <div className="text-sm text-slate-500 mt-1">Decision breakdown</div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
                                <ListChecks className="w-5 h-5" />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-3">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                GO: {loading ? "—" : goCount}
                            </Badge>
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                CONDITIONAL: {loading ? "—" : conditionalCount}
                            </Badge>
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                NO-GO: {loading ? "—" : noGoCount}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Recent opportunities */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-medium text-slate-800">Recent Opportunities</h2>
                            <p className="text-sm text-slate-500">Last 5 updated</p>
                        </div>
                        <Button asChild variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                            <Link href="/opportunities" className="flex items-center gap-2">
                                View all <ArrowRight className="w-4 h-4" />
                            </Link>
                        </Button>
                    </div>

                    <div className="mt-4 space-y-2">
                        {loading ? (
                            <>
                                <div className="h-14 rounded-lg bg-slate-50 border border-slate-100 animate-pulse" />
                                <div className="h-14 rounded-lg bg-slate-50 border border-slate-100 animate-pulse" />
                                <div className="h-14 rounded-lg bg-slate-50 border border-slate-100 animate-pulse" />
                                <div className="h-14 rounded-lg bg-slate-50 border border-slate-100 animate-pulse" />
                                <div className="h-14 rounded-lg bg-slate-50 border border-slate-100 animate-pulse" />
                            </>
                        ) : recentOpportunities.length === 0 ? (
                            <div className="text-sm text-slate-500">No recent opportunities.</div>
                        ) : (
                            recentOpportunities.slice(0, 5).map((opp) => (
                                <Link
                                    key={opp.id}
                                    href={`/opportunities/${opp.id}`}
                                    className="block bg-white rounded-lg border border-slate-200 shadow-card px-4 py-3 hover:shadow-card-hover hover:border-blue-200 transition-all duration-200"
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="min-w-0">
                                            <div className="font-medium text-slate-900 truncate">{opp.title}</div>
                                            <div className="text-xs text-slate-500 truncate">
                                                {[opp.agency, opp.solicitation_number].filter(Boolean).join(" • ")}
                                            </div>
                                        </div>
                                        <span className="text-xs text-slate-400">View</span>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Upload RFP Dialog */}
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogContent className="rounded-2xl border-slate-200">
                    <DialogHeader>
                        <DialogTitle>Upload RFP</DialogTitle>
                        <DialogDescription>
                            Attach an RFP PDF to an existing opportunity.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Opportunity</Label>
                            <Select value={uploadOpportunityId} onValueChange={setUploadOpportunityId}>
                                <SelectTrigger className="h-10 rounded-lg border-slate-300">
                                    <SelectValue placeholder="Select an opportunity" />
                                </SelectTrigger>
                                <SelectContent>
                                    {recentOpportunities.slice(0, 5).map((opp) => (
                                        <SelectItem key={opp.id} value={opp.id}>
                                            {opp.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-500">
                                Need another opportunity? Go to{" "}
                                <Link href="/opportunities" className="text-blue-600 hover:text-blue-700">
                                    Opportunities
                                </Link>
                                .
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>PDF</Label>
                            <Input
                                type="file"
                                accept=".pdf"
                                className="rounded-lg"
                                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                            />
                        </div>

                        {uploadError && <div className="text-sm text-red-600">{uploadError}</div>}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            className="rounded-lg border-slate-300"
                            onClick={() => setIsUploadOpen(false)}
                            disabled={uploading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                            onClick={handleUploadRfp}
                            disabled={!uploadOpportunityId || !uploadFile || uploading}
                        >
                            {uploading ? "Uploading..." : "Upload"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

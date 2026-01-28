"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export interface CompanyProfile {
    id?: string;
    name: string;
    naics_codes?: string[];
    certifications?: string[];
    clearances?: string[];
    set_asides?: Record<string, boolean>;
    employee_count?: number;
    annual_revenue?: number;
    bonding_capacity?: number;
    cage_code?: string;
    duns_number?: string;
}

interface CompanyProfileCardProps {
    profile: CompanyProfile | null;
    isLoading?: boolean;
}

const formatCurrency = (value?: number) => {
    if (!value && value !== 0) return "—";
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(value);
};

const formatNumber = (value?: number) => {
    if (!value && value !== 0) return "—";
    return new Intl.NumberFormat("en-US").format(value);
};

const getSetAsideLabels = (setAsides?: Record<string, boolean>) => {
    if (!setAsides) return [];
    const labels: Record<string, string> = {
        small_business: "Small Business",
        sdvosb: "SDVOSB",
        wosb: "WOSB",
        eight_a: "8(a)",
        hubzone: "HUBZone",
    };
    return Object.entries(setAsides)
        .filter(([, value]) => value)
        .map(([key]) => labels[key] || key);
};

export function CompanyProfileCard({ profile, isLoading }: CompanyProfileCardProps) {
    const setAsideLabels = getSetAsideLabels(profile?.set_asides);

    return (
        <Card className="rounded-[2rem] border-slate-100 shadow-sm">
            <CardHeader>
                <CardTitle className="text-xl text-slate-900">Current Company Profile</CardTitle>
                <p className="text-sm text-slate-500">
                    Snapshot of the capabilities Roxy will use in gap analysis.
                </p>
            </CardHeader>
            <CardContent className="space-y-5">
                {isLoading ? (
                    <p className="text-sm text-slate-500">Loading profile...</p>
                ) : (
                    <>
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Company
                            </p>
                            <p className="text-lg font-semibold text-slate-900">
                                {profile?.name || "Not set"}
                            </p>
                            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                                <span>CAGE: {profile?.cage_code || "—"}</span>
                                <span>DUNS/UEI: {profile?.duns_number || "—"}</span>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                NAICS Codes
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {profile?.naics_codes?.length ? (
                                    profile.naics_codes.map((code) => (
                                        <Badge key={code} variant="outline" className="bg-slate-50 text-slate-700">
                                            {code}
                                        </Badge>
                                    ))
                                ) : (
                                    <span className="text-sm text-slate-500">No NAICS codes added.</span>
                                )}
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Certifications
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {profile?.certifications?.length ? (
                                    profile.certifications.map((cert) => (
                                        <Badge key={cert} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                            {cert}
                                        </Badge>
                                    ))
                                ) : (
                                    <span className="text-sm text-slate-500">No certifications listed.</span>
                                )}
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Clearances
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {profile?.clearances?.length ? (
                                    profile.clearances.map((clearance) => (
                                        <Badge key={clearance} variant="outline" className="bg-slate-100 text-slate-700">
                                            {clearance}
                                        </Badge>
                                    ))
                                ) : (
                                    <span className="text-sm text-slate-500">No clearances listed.</span>
                                )}
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Set-Asides
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {setAsideLabels.length ? (
                                    setAsideLabels.map((label) => (
                                        <Badge key={label} variant="secondary" className="bg-blue-100 text-blue-800">
                                            {label}
                                        </Badge>
                                    ))
                                ) : (
                                    <span className="text-sm text-slate-500">No set-asides selected.</span>
                                )}
                            </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Employees
                                </p>
                                <p className="text-slate-700">{formatNumber(profile?.employee_count)}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Annual Revenue
                                </p>
                                <p className="text-slate-700">{formatCurrency(profile?.annual_revenue)}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Bonding Capacity
                                </p>
                                <p className="text-slate-700">{formatCurrency(profile?.bonding_capacity)}</p>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

"use client";

import React, { useCallback, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, Circle, Pencil, Save } from "lucide-react";
import api from "@/lib/api";
import { useOrgStore } from "@/lib/stores/orgStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CompanyProfileAPIResponse {
    id: string;
    name: string;
    duns?: string | null;
    cage?: string | null;
    uei?: string | null;
    naics_primary?: string | null;
    naics_secondary?: string[];
    certifications?: string[];
    set_asides?: string[];
    clearance_level?: string | null;
    cleared_personnel_count?: number;
    past_performance_summary?: {
        contract_count: number;
        total_value: number;
        agencies: string[];
    };
}

interface Company {
    id: string;
    name: string;
    cage_code?: string | null;
    uei?: string | null;
    duns?: string | null;
    naics_codes?: string[] | null;
    primary_naic_code?: string | null;
    facility_clearance?: string | null;
}

interface Document {
    id: string;
    document_type?: string | null;
    contract_value?: string | number | null;
    customer_agency?: string | null;
}

type BidwinDraft = {
    name: string;
    duns: string;
    cage: string;
    uei: string;
    primaryNaics: string;
    secondaryNaicsCsv: string;
    certifications: string[];
    setAsides: Record<string, boolean>;
    facilityClearance: string;
    clearedPersonnelCount: string;
};

const CERTIFICATION_OPTIONS = [
    "ISO 27001",
    "ISO 9001",
    "CMMI Level 3",
    "CMMI Level 5",
    "FedRAMP",
    "SOC 2",
    "CMMC",
] as const;

const SET_ASIDE_OPTIONS: Array<{ key: string; label: string }> = [
    { key: "sdvosb", label: "SDVOSB" },
    { key: "eight_a", label: "8(a)" },
    { key: "hubzone", label: "HUBZone" },
    { key: "wosb", label: "WOSB" },
    { key: "edwosb", label: "EDWOSB" },
    { key: "small_business", label: "Small Business" },
];

const DEFAULT_SET_ASIDES = SET_ASIDE_OPTIONS.reduce<Record<string, boolean>>((acc, item) => {
    acc[item.key] = false;
    return acc;
}, {});

const parseCsv = (value: string) =>
    value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(value);

function SectionHeading({ children }: { children: string }) {
    return (
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            {children}
        </h3>
    );
}

function Card({ children }: { children: ReactNode }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
            {children}
        </div>
    );
}

function RowToggle({
    label,
    checked,
    disabled,
    onChange,
}: {
    label: string;
    checked: boolean;
    disabled: boolean;
    onChange: () => void;
}) {
    return (
        <label className={cn("flex items-center gap-3 text-sm", disabled ? "cursor-default" : "cursor-pointer")}>
            <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={onChange}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 disabled:opacity-60"
            />
            <span className={cn(checked ? "text-slate-900" : "text-slate-600")}>{label}</span>
        </label>
    );
}

export default function CompanyProfilePage() {
    const { currentOrg } = useOrgStore();
    const orgId = currentOrg?.id;

    const [profile, setProfile] = useState<CompanyProfileAPIResponse | null>(null);
    const [company, setCompany] = useState<Company | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [draft, setDraft] = useState<BidwinDraft | null>(null);

    const loadAll = useCallback(async () => {
        if (!orgId) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const [companyRes, docsRes] = await Promise.all([
                api.get<Company>(`/api/companies/${orgId}`),
                api.get<Document[]>("/api/documents", { params: { org_id: orgId } }).catch(() => ({ data: [] as Document[] })),
            ]);

            const profileRes = await api.get<CompanyProfileAPIResponse>("/api/company-profile", {
                params: { org_id: orgId },
            });

            setCompany(companyRes.data);
            setProfile(profileRes.data);
            setDocuments(docsRes.data || []);
        } catch (e) {
            console.error("Failed to load company profile data", e);
            setError("Unable to load company profile. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }, [orgId]);

    React.useEffect(() => {
        loadAll();
    }, [loadAll]);

    const pastPerformance = useMemo(() => {
        const contractLike = documents.filter((d) => {
            const t = (d.document_type || "").toLowerCase();
            return t.includes("past") || t.includes("contract") || t.includes("cpars");
        });

        const contractsCount = contractLike.length;
        const totalValue = contractLike.reduce((sum, d) => {
            if (d.contract_value === null || d.contract_value === undefined) return sum;
            const num = typeof d.contract_value === "number" ? d.contract_value : parseFloat(d.contract_value);
            return Number.isFinite(num) ? sum + num : sum;
        }, 0);

        const agencies = Array.from(
            new Set(
                contractLike
                    .map((d) => d.customer_agency)
                    .map((v) => (v || "").trim())
                    .filter(Boolean)
            )
        ).slice(0, 8);

        return { contractsCount, totalValue, agencies };
    }, [documents]);

    const startEditing = () => {
        const effectiveName = profile?.name || company?.name || currentOrg?.name || "";

        const primaryNaics =
            profile?.naics_primary ||
            company?.primary_naic_code ||
            (company?.naics_codes || []).filter(Boolean)[0] ||
            "";

        const secondaryNaics = profile?.naics_secondary || [];

        const setAsidesMap = { ...DEFAULT_SET_ASIDES };
        for (const key of profile?.set_asides || []) {
            if (Object.prototype.hasOwnProperty.call(setAsidesMap, key)) {
                setAsidesMap[key] = true;
            }
        }

        setDraft({
            name: effectiveName,
            duns: profile?.duns || company?.duns || "",
            cage: profile?.cage || company?.cage_code || "",
            uei: profile?.uei || company?.uei || "",
            primaryNaics,
            secondaryNaicsCsv: secondaryNaics.join(", "),
            certifications: (profile?.certifications || []).filter(Boolean),
            setAsides: setAsidesMap,
            facilityClearance: profile?.clearance_level || company?.facility_clearance || "",
            clearedPersonnelCount:
                typeof profile?.cleared_personnel_count === "number"
                    ? String(profile.cleared_personnel_count)
                    : "",
        });
        setIsEditing(true);
    };

    const cancelEditing = () => {
        setIsEditing(false);
        setDraft(null);
    };

    const save = async () => {
        if (!orgId || !draft) return;

        setIsSaving(true);
        setError(null);

        const clearedCount = draft.clearedPersonnelCount.trim() === "" ? null : Number(draft.clearedPersonnelCount);
        const clearedCountValue = typeof clearedCount === "number" && Number.isFinite(clearedCount) ? Math.trunc(clearedCount) : null;

        const setAsides = Object.entries(draft.setAsides)
            .filter(([, value]) => Boolean(value))
            .map(([key]) => key);

        try {
            await api.put(
                "/api/company-profile",
                {
                    name: draft.name,
                    duns: draft.duns.trim() || null,
                    cage: draft.cage.trim() || null,
                    uei: draft.uei.trim() || null,
                    naics_primary: draft.primaryNaics.trim() || null,
                    naics_secondary: parseCsv(draft.secondaryNaicsCsv),
                    certifications: draft.certifications,
                    set_asides: setAsides,
                    clearance_level: draft.facilityClearance.trim() || null,
                    cleared_personnel_count: clearedCountValue,
                },
                { params: { org_id: orgId } }
            );

            await loadAll();
            setIsEditing(false);
            setDraft(null);
        } catch (e) {
            console.error("Failed to save company profile", e);
            setError("Unable to save company profile. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!currentOrg) {
        return (
            <div className="p-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 text-sm text-slate-500">
                    Select an organization to view its company profile.
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Company Profile</h1>
                    <p className="text-sm text-slate-500">
                        Keep this up to date so Roxy can flag gaps and eligibility risks.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => (isEditing ? cancelEditing() : startEditing())}
                        disabled={isLoading || isSaving}
                    >
                        <Pencil className="mr-2 h-4 w-4" />
                        {isEditing ? "Cancel" : "Edit"}
                    </Button>
                    <Button
                        type="button"
                        onClick={save}
                        disabled={!isEditing || isSaving}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        <Save className="mr-2 h-4 w-4" />
                        {isSaving ? "Saving..." : "Save"}
                    </Button>
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {isLoading ? (
                <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 animate-pulse h-28" />
                    <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 animate-pulse h-24" />
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 animate-pulse h-48" />
                        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 animate-pulse h-48" />
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="space-y-3">
                        <SectionHeading>Company Info</SectionHeading>
                        <Card>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="text-sm font-medium text-slate-700">Name</div>
                                    {isEditing && draft ? (
                                        <Input
                                            value={draft.name}
                                            onChange={(e) => setDraft((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                                            placeholder="Company name"
                                            className="rounded-xl"
                                        />
                                    ) : (
                                        <div className="text-sm text-slate-900 font-semibold">
                                            {profile?.name || company?.name || "—"}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                    <div className="space-y-2">
                                        <div className="text-sm font-medium text-slate-700">DUNS</div>
                                        {isEditing && draft ? (
                                            <Input
                                                value={draft.duns}
                                                onChange={(e) => setDraft((prev) => (prev ? { ...prev, duns: e.target.value } : prev))}
                                                placeholder="123456789"
                                                className="rounded-xl"
                                            />
                                        ) : (
                                            <div className="text-sm text-slate-700">
                                                {profile?.duns || company?.duns || "—"}
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-sm font-medium text-slate-700">CAGE</div>
                                        {isEditing && draft ? (
                                            <Input
                                                value={draft.cage}
                                                onChange={(e) => setDraft((prev) => (prev ? { ...prev, cage: e.target.value } : prev))}
                                                placeholder="1ABC2"
                                                className="rounded-xl"
                                            />
                                        ) : (
                                            <div className="text-sm text-slate-700">
                                                {profile?.cage || company?.cage_code || "—"}
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-sm font-medium text-slate-700">UEI</div>
                                        {isEditing && draft ? (
                                            <Input
                                                value={draft.uei}
                                                onChange={(e) => setDraft((prev) => (prev ? { ...prev, uei: e.target.value } : prev))}
                                                placeholder="XYZ123"
                                                className="rounded-xl"
                                            />
                                        ) : (
                                            <div className="text-sm text-slate-700">{profile?.uei || company?.uei || "—"}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    <div className="space-y-3">
                        <SectionHeading>NAICS Codes</SectionHeading>
                        <Card>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <div className="text-sm font-medium text-slate-700">Primary</div>
                                    {isEditing && draft ? (
                                        <Input
                                            value={draft.primaryNaics}
                                            onChange={(e) => setDraft((prev) => (prev ? { ...prev, primaryNaics: e.target.value } : prev))}
                                            placeholder="541512"
                                            className="rounded-xl"
                                        />
                                    ) : (
                                        <div className="text-sm text-slate-700">
                                            {profile?.naics_primary || company?.primary_naic_code || "—"}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <div className="text-sm font-medium text-slate-700">Secondary</div>
                                    {isEditing && draft ? (
                                        <Input
                                            value={draft.secondaryNaicsCsv}
                                            onChange={(e) =>
                                                setDraft((prev) => (prev ? { ...prev, secondaryNaicsCsv: e.target.value } : prev))
                                            }
                                            placeholder="541519, 541611, 541330"
                                            className="rounded-xl"
                                        />
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {(profile?.naics_secondary || []).length ? (
                                                (profile?.naics_secondary || []).map((code) => (
                                                    <Badge key={code} variant="outline" className="bg-slate-50 text-slate-700">
                                                        {code}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className="text-sm text-slate-500">—</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-3">
                            <SectionHeading>Certifications</SectionHeading>
                            <Card>
                                <div className="space-y-3">
                                    {CERTIFICATION_OPTIONS.map((label) => {
                                        const checked = Boolean(profile?.certifications?.includes(label));

                                        if (!isEditing) {
                                            return (
                                                <div key={label} className="flex items-center gap-2 text-sm">
                                                    {checked ? (
                                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                    ) : (
                                                        <Circle className="h-4 w-4 text-slate-300" />
                                                    )}
                                                    <span className={cn(checked ? "text-slate-900" : "text-slate-600")}>{label}</span>
                                                </div>
                                            );
                                        }

                                        const editableChecked = Boolean(draft?.certifications?.includes(label));
                                        return (
                                            <RowToggle
                                                key={label}
                                                label={label}
                                                checked={editableChecked}
                                                disabled={!isEditing}
                                                onChange={() => {
                                                    if (!isEditing) return;
                                                    setDraft((prev) => {
                                                        if (!prev) return prev;
                                                        const set = new Set(prev.certifications);
                                                        if (set.has(label)) set.delete(label);
                                                        else set.add(label);
                                                        return { ...prev, certifications: Array.from(set) };
                                                    });
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            </Card>
                        </div>

                        <div className="space-y-3">
                            <SectionHeading>Set-Asides</SectionHeading>
                            <Card>
                                <div className="space-y-3">
                                    {SET_ASIDE_OPTIONS.map(({ key, label }) => {
                                        const viewChecked = Boolean(profile?.set_asides?.includes(key));

                                        if (!isEditing) {
                                            return (
                                                <div key={key} className="flex items-center gap-2 text-sm">
                                                    {viewChecked ? (
                                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                    ) : (
                                                        <Circle className="h-4 w-4 text-slate-300" />
                                                    )}
                                                    <span className={cn(viewChecked ? "text-slate-900" : "text-slate-600")}>{label}</span>
                                                </div>
                                            );
                                        }

                                        const editChecked = Boolean((draft?.setAsides || DEFAULT_SET_ASIDES)[key]);
                                        return (
                                            <RowToggle
                                                key={key}
                                                label={label}
                                                checked={editChecked}
                                                disabled={!isEditing}
                                                onChange={() => {
                                                    if (!isEditing) return;
                                                    setDraft((prev) => {
                                                        if (!prev) return prev;
                                                        return {
                                                            ...prev,
                                                            setAsides: {
                                                                ...prev.setAsides,
                                                                [key]: !prev.setAsides[key],
                                                            },
                                                        };
                                                    });
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            </Card>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <SectionHeading>Clearances</SectionHeading>
                        <Card>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <div className="text-sm font-medium text-slate-700">Facility clearance level</div>
                                    {isEditing && draft ? (
                                        <Input
                                            value={draft.facilityClearance}
                                            onChange={(e) =>
                                                setDraft((prev) => (prev ? { ...prev, facilityClearance: e.target.value } : prev))
                                            }
                                            placeholder="Secret / Top Secret / TS/SCI"
                                            className="rounded-xl"
                                        />
                                    ) : (
                                        <div className="text-sm text-slate-700">
                                            {profile?.clearance_level || company?.facility_clearance || "—"}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <div className="text-sm font-medium text-slate-700">Cleared personnel count</div>
                                    {isEditing && draft ? (
                                        <Input
                                            value={draft.clearedPersonnelCount}
                                            onChange={(e) =>
                                                setDraft((prev) => (prev ? { ...prev, clearedPersonnelCount: e.target.value } : prev))
                                            }
                                            placeholder="e.g. 12"
                                            className="rounded-xl"
                                        />
                                    ) : (
                                        <div className="text-sm text-slate-700">
                                            {profile?.cleared_personnel_count ?? "—"}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    </div>

                    <div className="space-y-3">
                        <SectionHeading>Past Performance Summary</SectionHeading>
                        <Card>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div>
                                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                        Contracts
                                    </div>
                                    <div className="text-lg font-semibold text-slate-900">
                                        {pastPerformance.contractsCount}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                        Total Value
                                    </div>
                                    <div className="text-lg font-semibold text-slate-900">
                                        {formatCurrency(pastPerformance.totalValue)}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                        Agencies
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {pastPerformance.agencies.length ? (
                                            pastPerformance.agencies.map((agency) => (
                                                <Badge key={agency} variant="outline" className="bg-slate-50 text-slate-700">
                                                    {agency}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-sm text-slate-500">—</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}

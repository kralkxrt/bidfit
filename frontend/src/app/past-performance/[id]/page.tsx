"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";

import api from "@/lib/api";
import { useOrgStore } from "@/lib/stores/orgStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";

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

type FormState = {
    contract_name: string;
    agency: string;
    contract_number: string;
    contract_value: string;
    period_start: string;
    period_end: string;
    naics_code: string;
    description: string;
    relevance_tags: string;
    key_accomplishments: string;
    poc_name: string;
    poc_email: string;
    poc_phone: string;
};

const toNullIfEmpty = (value: string) => {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
};

const parseTags = (value: string) => {
    const tags = value
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    return tags.length ? tags : null;
};

const toFormState = (contract: PastPerformanceContract): FormState => ({
    contract_name: contract.contract_title ?? "",
    agency: contract.customer_agency ?? "",
    contract_number: contract.contract_number ?? "",
    contract_value: typeof contract.contract_value === "number" ? String(contract.contract_value) : "",
    period_start: contract.period_of_performance_start ?? "",
    period_end: contract.period_of_performance_end ?? "",
    naics_code: contract.naics_code ?? "",
    description: contract.notes ?? "",
    relevance_tags: "",
    key_accomplishments: "",
    poc_name: "",
    poc_email: "",
    poc_phone: "",
});

export default function PastPerformanceDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const { currentOrg } = useOrgStore();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const [contract, setContract] = useState<PastPerformanceContract | null>(null);
    const [form, setForm] = useState<FormState>({
        contract_name: "",
        agency: "",
        contract_number: "",
        contract_value: "",
        period_start: "",
        period_end: "",
        naics_code: "",
        description: "",
        relevance_tags: "",
        key_accomplishments: "",
        poc_name: "",
        poc_email: "",
        poc_phone: "",
    });

    const tagPreview = useMemo(() => parseTags(form.relevance_tags) ?? [], [form.relevance_tags]);

    const fetchContract = useCallback(async () => {
        if (!id) return;

        setLoading(true);
        try {
            const res = await api.get<PastPerformanceContract>(`/api/past-performance/${id}`);
            setContract(res.data);
            setForm(toFormState(res.data));
        } catch (error) {
            console.error("Failed to fetch past performance contract", error);
            setContract(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchContract();
    }, [fetchContract]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;

        setSaving(true);
        try {
            await api.put(`/api/past-performance/${id}`, {
                contract_title: toNullIfEmpty(form.contract_name),
                customer_agency: toNullIfEmpty(form.agency),
                contract_number: toNullIfEmpty(form.contract_number),
                contract_value: form.contract_value.trim().length ? Number(form.contract_value) : null,
                period_of_performance_start: toNullIfEmpty(form.period_start),
                period_of_performance_end: toNullIfEmpty(form.period_end),
                naics_code: toNullIfEmpty(form.naics_code),
                notes: toNullIfEmpty(form.description),
            });

            await fetchContract();
        } catch (error) {
            console.error("Failed to save past performance contract", error);
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!id) return;
        setDeleting(true);
        try {
            await api.delete(`/api/past-performance/${id}`);
            router.push("/past-performance");
        } catch (error) {
            console.error("Failed to delete past performance contract", error);
        } finally {
            setDeleting(false);
            setDeleteOpen(false);
        }
    };

    const title = form.contract_name.trim() || contract?.contract_title || "Contract";

    return (
        <div className="p-6">
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <Link
                            href="/past-performance"
                            className="text-slate-500 hover:text-blue-600 flex items-center gap-2 text-sm font-medium mb-4"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to Past Performance
                        </Link>
                        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
                        <p className="text-sm text-slate-500">
                            Edit past performance details for {currentOrg?.name || "your organization"}.
                        </p>
                    </div>

                    <Button
                        variant="destructive"
                        type="button"
                        onClick={() => setDeleteOpen(true)}
                        disabled={loading || deleting}
                    >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                </div>

                <Card className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
                    {loading ? (
                        <div className="space-y-4">
                            <div className="h-6 bg-slate-100 rounded w-2/3 animate-pulse" />
                            <div className="h-10 bg-slate-100 rounded animate-pulse" />
                            <div className="h-10 bg-slate-100 rounded animate-pulse" />
                            <div className="h-40 bg-slate-100 rounded animate-pulse" />
                        </div>
                    ) : !contract ? (
                        <div className="text-sm text-slate-600">
                            Contract not found.
                            <div className="mt-3">
                                <Button asChild variant="outline">
                                    <Link href="/past-performance">Back</Link>
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="contract_name">Contract Name</Label>
                                    <Input
                                        id="contract_name"
                                        value={form.contract_name}
                                        onChange={(e) => setForm((p) => ({ ...p, contract_name: e.target.value }))}
                                        className="bg-white border-slate-200"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="agency">Agency</Label>
                                    <Input
                                        id="agency"
                                        value={form.agency}
                                        onChange={(e) => setForm((p) => ({ ...p, agency: e.target.value }))}
                                        className="bg-white border-slate-200"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="contract_number">Contract Number</Label>
                                    <Input
                                        id="contract_number"
                                        value={form.contract_number}
                                        onChange={(e) => setForm((p) => ({ ...p, contract_number: e.target.value }))}
                                        className="bg-white border-slate-200"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contract_value">Contract Value</Label>
                                    <Input
                                        id="contract_value"
                                        type="number"
                                        inputMode="numeric"
                                        value={form.contract_value}
                                        onChange={(e) => setForm((p) => ({ ...p, contract_value: e.target.value }))}
                                        className="bg-white border-slate-200"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="period_start">Period Start</Label>
                                    <Input
                                        id="period_start"
                                        type="date"
                                        value={form.period_start}
                                        onChange={(e) => setForm((p) => ({ ...p, period_start: e.target.value }))}
                                        className="bg-white border-slate-200"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="period_end">Period End</Label>
                                    <Input
                                        id="period_end"
                                        type="date"
                                        value={form.period_end}
                                        onChange={(e) => setForm((p) => ({ ...p, period_end: e.target.value }))}
                                        className="bg-white border-slate-200"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="naics_code">NAICS Code</Label>
                                    <Input
                                        id="naics_code"
                                        value={form.naics_code}
                                        onChange={(e) => setForm((p) => ({ ...p, naics_code: e.target.value }))}
                                        className="bg-white border-slate-200"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="relevance_tags">Relevance Tags</Label>
                                    <Input
                                        id="relevance_tags"
                                        value={form.relevance_tags}
                                        onChange={(e) => setForm((p) => ({ ...p, relevance_tags: e.target.value }))}
                                        className="bg-white border-slate-200"
                                    />
                                    {tagPreview.length > 0 && (
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {tagPreview.slice(0, 8).map((tag) => (
                                                <Badge key={tag} variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={form.description}
                                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                                    className="bg-white border-slate-200 min-h-[120px]"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="key_accomplishments">Key Accomplishments</Label>
                                <Textarea
                                    id="key_accomplishments"
                                    value={form.key_accomplishments}
                                    onChange={(e) => setForm((p) => ({ ...p, key_accomplishments: e.target.value }))}
                                    className="bg-white border-slate-200 min-h-[140px]"
                                />
                            </div>

                            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                                <div className="text-sm font-semibold text-slate-900 mb-4">Point of Contact</div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="poc_name">Name</Label>
                                        <Input
                                            id="poc_name"
                                            value={form.poc_name}
                                            onChange={(e) => setForm((p) => ({ ...p, poc_name: e.target.value }))}
                                            className="bg-white border-slate-200"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="poc_email">Email</Label>
                                        <Input
                                            id="poc_email"
                                            type="email"
                                            value={form.poc_email}
                                            onChange={(e) => setForm((p) => ({ ...p, poc_email: e.target.value }))}
                                            className="bg-white border-slate-200"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="poc_phone">Phone</Label>
                                        <Input
                                            id="poc_phone"
                                            value={form.poc_phone}
                                            onChange={(e) => setForm((p) => ({ ...p, poc_phone: e.target.value }))}
                                            className="bg-white border-slate-200"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <Button variant="outline" type="button" asChild disabled={saving}>
                                    <Link href="/past-performance">Back</Link>
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {saving ? "Saving..." : "Save Changes"}
                                </Button>
                            </div>
                        </form>
                    )}
                </Card>

                <DeleteConfirmDialog
                    isOpen={deleteOpen}
                    onClose={() => setDeleteOpen(false)}
                    onConfirm={confirmDelete}
                    title="Delete Contract"
                    description="Are you sure you want to delete this past performance contract? This action cannot be undone."
                    isDeleting={deleting}
                    deleteButtonText="Delete Contract"
                />
            </div>
        </div>
    );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, Plus, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type ResponseStatus = "not_started" | "in_progress" | "complete" | "n_a";

interface ComplianceMatrixItem {
    id: string;
    opportunity_id: string;
    section: string;
    requirement: string;
    source_document?: string | null;
    page_number?: number | null;
    response_status: ResponseStatus;
    notes?: string | null;
    assigned_to?: string | null;
    created_at: string;
    updated_at: string;
}

const STATUS_BADGE_CLASSES: Record<ResponseStatus, string> = {
    not_started: "bg-slate-100 text-slate-700 border-slate-200",
    in_progress: "bg-amber-100 text-amber-800 border-amber-200",
    complete: "bg-emerald-100 text-emerald-800 border-emerald-200",
    n_a: "bg-slate-100 text-slate-500 border-slate-200",
};

export function ComplianceMatrixTab({ opportunityId }: { opportunityId: string }) {
    const [items, setItems] = useState<ComplianceMatrixItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newSection, setNewSection] = useState("");
    const [newRequirement, setNewRequirement] = useState("");
    const [newSourceDocument, setNewSourceDocument] = useState("");
    const [newPageNumber, setNewPageNumber] = useState<string>("");
    const [newNotes, setNewNotes] = useState("");
    const [newAssignedTo, setNewAssignedTo] = useState("");
    const [newStatus, setNewStatus] = useState<ResponseStatus>("not_started");

    const fetchItems = useCallback(async () => {
        if (!opportunityId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await api.get<ComplianceMatrixItem[]>(
                `/api/opportunities/${opportunityId}/compliance-matrix`
            );
            setItems(res.data || []);
        } catch (err) {
            console.error("Failed to load compliance matrix", err);
            setError("Failed to load compliance matrix.");
        } finally {
            setLoading(false);
        }
    }, [opportunityId]);

    useEffect(() => {
        void fetchItems();
    }, [fetchItems]);

    const resetAddForm = () => {
        setNewSection("");
        setNewRequirement("");
        setNewSourceDocument("");
        setNewPageNumber("");
        setNewNotes("");
        setNewAssignedTo("");
        setNewStatus("not_started");
    };

    const handleAddItem = async () => {
        if (!newSection.trim() || !newRequirement.trim()) {
            setError("Section and Requirement are required.");
            return;
        }

        setSaving(true);
        setError(null);
        try {
            await api.post(`/api/opportunities/${opportunityId}/compliance-matrix`, {
                section: newSection.trim(),
                requirement: newRequirement.trim(),
                source_document: newSourceDocument.trim() || null,
                page_number: newPageNumber ? Number(newPageNumber) : null,
                response_status: newStatus,
                notes: newNotes.trim() || null,
                assigned_to: newAssignedTo.trim() || null,
            });
            setIsAddOpen(false);
            resetAddForm();
            await fetchItems();
        } catch (err) {
            console.error("Failed to add compliance matrix item", err);
            setError("Failed to add item.");
        } finally {
            setSaving(false);
        }
    };

    const handleAutoGenerate = async () => {
        setSaving(true);
        setError(null);
        try {
            await api.post(`/api/opportunities/${opportunityId}/compliance-matrix/generate`);
            await fetchItems();
        } catch (err) {
            console.error("Failed to auto-generate compliance matrix", err);
            setError("Auto-generate failed.");
        } finally {
            setSaving(false);
        }
    };

    const handleStatusChange = async (item: ComplianceMatrixItem, status: ResponseStatus) => {
        setItems((prev) =>
            prev.map((x) => (x.id === item.id ? { ...x, response_status: status } : x))
        );

        try {
            await api.put(
                `/api/opportunities/${opportunityId}/compliance-matrix/${item.id}`,
                { response_status: status }
            );
        } catch (err) {
            console.error("Failed to update compliance matrix item", err);
            setError("Failed to update status.");
            await fetchItems();
        }
    };

    const handleDelete = async (item: ComplianceMatrixItem) => {
        setSaving(true);
        setError(null);
        try {
            await api.delete(
                `/api/opportunities/${opportunityId}/compliance-matrix/${item.id}`
            );
            setItems((prev) => prev.filter((x) => x.id !== item.id));
        } catch (err) {
            console.error("Failed to delete compliance matrix item", err);
            setError("Failed to delete item.");
        } finally {
            setSaving(false);
        }
    };

    const hasItems = items.length > 0;

    const emptyState = useMemo(() => {
        if (loading) {
            return "Loading compliance matrix…";
        }
        return "No compliance matrix items yet. Add an item or auto-generate from uploaded RFP documents.";
    }, [loading]);

    return (
        <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Compliance Matrix</h2>
                    <p className="text-sm text-slate-500">
                        Track Section L/M requirements and completion status.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-lg border-slate-200 text-slate-700"
                        onClick={() => setIsAddOpen(true)}
                        disabled={saving}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        className="h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700"
                        onClick={handleAutoGenerate}
                        disabled={saving}
                    >
                        <Bot className="h-4 w-4 mr-2" />
                        Auto-Generate
                    </Button>
                </div>
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50 border-b border-slate-200">
                        <TableRow className="hover:bg-slate-50">
                            <TableHead className="w-28 text-xs font-semibold text-slate-500 uppercase tracking-wider py-4">
                                Section
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider py-4">
                                Requirement
                            </TableHead>
                            <TableHead className="w-40 text-xs font-semibold text-slate-500 uppercase tracking-wider py-4">
                                Source
                            </TableHead>
                            <TableHead className="w-20 text-xs font-semibold text-slate-500 uppercase tracking-wider py-4">
                                Page
                            </TableHead>
                            <TableHead className="w-44 text-xs font-semibold text-slate-500 uppercase tracking-wider py-4">
                                Status
                            </TableHead>
                            <TableHead className="w-12 py-4" />
                        </TableRow>
                    </TableHeader>

                    <TableBody className="divide-y divide-slate-100">
                        {items.map((item) => (
                            <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                <TableCell className="font-mono text-xs font-semibold text-slate-600 align-top py-4">
                                    {item.section}
                                </TableCell>
                                <TableCell className="py-4 align-top">
                                    <div className="text-sm font-medium text-slate-900 leading-snug">
                                        {item.requirement}
                                    </div>
                                </TableCell>
                                <TableCell className="py-4 align-top">
                                    <div className="text-sm text-slate-600 truncate max-w-[12rem]">
                                        {item.source_document || "—"}
                                    </div>
                                </TableCell>
                                <TableCell className="py-4 align-top">
                                    <div className="text-sm text-slate-600">
                                        {item.page_number ?? "—"}
                                    </div>
                                </TableCell>
                                <TableCell className="py-4 align-top">
                                    <Select
                                        value={item.response_status}
                                        onValueChange={(value) =>
                                            handleStatusChange(item, value as ResponseStatus)
                                        }
                                    >
                                        <SelectTrigger
                                            className={`h-9 rounded-lg border ${STATUS_BADGE_CLASSES[item.response_status]}`}
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="not_started">⬜ Not Started</SelectItem>
                                            <SelectItem value="in_progress">🔄 In Progress</SelectItem>
                                            <SelectItem value="complete">✅ Complete</SelectItem>
                                            <SelectItem value="n_a">➖ N/A</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell className="py-4 align-top">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-slate-400 hover:text-red-600"
                                        onClick={() => handleDelete(item)}
                                        disabled={saving}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {!hasItems && (
                    <div className="p-12 text-center text-slate-500">
                        <p className="text-base font-semibold text-slate-900">Compliance Matrix</p>
                        <p className="text-sm mt-1">{emptyState}</p>
                    </div>
                )}
            </div>

            <Dialog open={isAddOpen} onOpenChange={(open) => {
                setIsAddOpen(open);
                if (!open) resetAddForm();
            }}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Add Compliance Matrix Item</DialogTitle>
                        <DialogDescription>
                            Track a Section L/M requirement and its completion status.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <div className="text-sm font-medium text-slate-700">Section</div>
                            <Input
                                placeholder='e.g. "L.5.1"'
                                value={newSection}
                                onChange={(e) => setNewSection(e.target.value)}
                            />
                        </div>

                        <div className="grid gap-2">
                            <div className="text-sm font-medium text-slate-700">Requirement</div>
                            <Textarea
                                placeholder="e.g. Minimum 3 references within 5 years"
                                value={newRequirement}
                                onChange={(e) => setNewRequirement(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <div className="text-sm font-medium text-slate-700">Source Document</div>
                                <Input
                                    placeholder="e.g. Solicitation.pdf"
                                    value={newSourceDocument}
                                    onChange={(e) => setNewSourceDocument(e.target.value)}
                                />
                            </div>

                            <div className="grid gap-2">
                                <div className="text-sm font-medium text-slate-700">Page Number</div>
                                <Input
                                    placeholder="e.g. 12"
                                    inputMode="numeric"
                                    value={newPageNumber}
                                    onChange={(e) => setNewPageNumber(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <div className="text-sm font-medium text-slate-700">Status</div>
                                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as ResponseStatus)}>
                                    <SelectTrigger className="h-9 rounded-lg border-slate-200">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="not_started">⬜ Not Started</SelectItem>
                                        <SelectItem value="in_progress">🔄 In Progress</SelectItem>
                                        <SelectItem value="complete">✅ Complete</SelectItem>
                                        <SelectItem value="n_a">➖ N/A</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <div className="text-sm font-medium text-slate-700">Assigned To</div>
                                <Input
                                    placeholder="Optional"
                                    value={newAssignedTo}
                                    onChange={(e) => setNewAssignedTo(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <div className="text-sm font-medium text-slate-700">Notes</div>
                            <Textarea
                                placeholder="Optional"
                                value={newNotes}
                                onChange={(e) => setNewNotes(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsAddOpen(false)}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleAddItem}
                            disabled={saving}
                        >
                            {saving ? "Saving..." : "Add Item"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

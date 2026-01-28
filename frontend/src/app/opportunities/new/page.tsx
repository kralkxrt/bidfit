"use client";

import { useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { ArrowLeft, FileUp, X } from "lucide-react";
import { useOrgStore } from "@/lib/stores/orgStore";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type SetAsideType =
    | "none"
    | "sdvosb"
    | "8a"
    | "hubzone"
    | "wosb"
    | "small_business";

const setAsideLabel: Record<SetAsideType, string> = {
    none: "None",
    sdvosb: "SDVOSB",
    "8a": "8(a)",
    hubzone: "HUBZone",
    wosb: "WOSB",
    small_business: "Small Business",
};

const normalizeSetAside = (value: SetAsideType): string | null => {
    if (value === "none") return null;

    // Keep backend-friendly strings (best-effort)
    if (value === "small_business") return "Small Business";
    if (value === "sdvosb") return "SDVOSB";
    if (value === "hubzone") return "HUBZone";
    if (value === "wosb") return "WOSB";
    if (value === "8a") return "8(a)";

    return null;
};

const isValidNaics = (value: string) => /^[0-9]{6}$/.test(value);

type CreatedOpportunity = {
    id: string;
};

export default function NewOpportunityPage() {
    const router = useRouter();
    const currentOrg = useOrgStore((s) => s.currentOrg);

    const [title, setTitle] = useState("");
    const [solicitationNumber, setSolicitationNumber] = useState("");
    const [agency, setAgency] = useState("");
    const [responseDueDate, setResponseDueDate] = useState("");
    const [setAsideType, setSetAsideType] = useState<SetAsideType>("none");
    const [naicsCode, setNaicsCode] = useState("");
    const [description, setDescription] = useState("");

    // Upload RFP state (PDF only)
    const [dragActive, setDragActive] = useState(false);
    const [rfpFile, setRfpFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const canSubmit = useMemo(() => {
        if (!currentOrg?.id) return false;
        if (!title.trim()) return false;
        if (naicsCode.trim() && !isValidNaics(naicsCode.trim())) return false;
        return true;
    }, [currentOrg?.id, naicsCode, title]);

    const validateAndSetRfp = (file: File) => {
        const lower = file.name.toLowerCase();
        const looksLikePdf = lower.endsWith(".pdf") || file.type === "application/pdf";
        if (!looksLikePdf) {
            setUploadError("PDF only.");
            return;
        }
        if (file.size > 50 * 1024 * 1024) {
            setUploadError("Max file size is 50MB.");
            return;
        }

        setUploadError(null);
        setRfpFile(file);
    };

    const handleDrag = (event: DragEvent) => {
        event.preventDefault();
        event.stopPropagation();

        if (event.type === "dragenter" || event.type === "dragover") {
            setDragActive(true);
        } else if (event.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (event: DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setDragActive(false);

        const file = event.dataTransfer.files?.[0];
        if (!file) return;
        validateAndSetRfp(file);
    };

    const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        validateAndSetRfp(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentOrg?.id) {
            setFormError("Select an organization first.");
            return;
        }

        if (!title.trim()) {
            setFormError("Title is required.");
            return;
        }

        if (naicsCode.trim() && !isValidNaics(naicsCode.trim())) {
            setFormError("NAICS must be 6 digits.");
            return;
        }

        setSubmitting(true);
        setFormError(null);
        setUploadError(null);

        try {
            const payload = {
                title: title.trim(),
                solicitation_number: solicitationNumber.trim() || null,
                agency: agency.trim() || null,
                response_due_date: responseDueDate || null,
                set_aside_type: normalizeSetAside(setAsideType),
                naics_code: naicsCode.trim() || null,
                notes: description.trim() || null,
            };

            const oppRes = await api.post<CreatedOpportunity>("/api/opportunities/", payload);
            const opportunityId = oppRes.data?.id;

            if (!opportunityId) {
                throw new Error("Opportunity creation succeeded but no ID was returned.");
            }

            if (rfpFile) {
                const formData = new FormData();
                formData.append("file", rfpFile);
                formData.append("document_type", "rfp");

                await api.post("/api/documents/upload", formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
            }

            router.push(`/opportunities/${opportunityId}/analyze`);
        } catch (err: unknown) {
            console.error("Failed to create opportunity", err);

            let message = "Failed to create opportunity.";
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

            setFormError(message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="h-full overflow-auto p-6">
            <div className="max-w-4xl mx-auto space-y-4">
                <div>
                    <Link
                        href="/"
                        className="text-slate-500 hover:text-blue-600 flex items-center gap-2 text-sm font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                    </Link>
                </div>

                <div>
                    <h1 className="text-2xl font-bold text-slate-900">New Opportunity</h1>
                    <p className="text-sm text-slate-500">
                        Create an opportunity, attach the RFP, and jump into analysis.
                    </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
                    <form onSubmit={handleSubmit} className="space-y-4">
                            {formError && <div className="text-sm text-red-600">{formError}</div>}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="title">Title</Label>
                                    <Input
                                        id="title"
                                        required
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g. Cyber Security Support Services"
                                        className="rounded-lg"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="solicitation_number">Solicitation Number</Label>
                                    <Input
                                        id="solicitation_number"
                                        value={solicitationNumber}
                                        onChange={(e) => setSolicitationNumber(e.target.value)}
                                        placeholder="e.g. 70B05C-26-R-0001"
                                        className="rounded-lg"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="agency">Agency</Label>
                                    <Input
                                        id="agency"
                                        value={agency}
                                        onChange={(e) => setAgency(e.target.value)}
                                        placeholder="e.g. DHS"
                                        className="rounded-lg"
                                        list="agency-list"
                                    />
                                    <datalist id="agency-list">
                                        <option value="DOD" />
                                        <option value="DHS" />
                                        <option value="VA" />
                                        <option value="GSA" />
                                        <option value="DOE" />
                                        <option value="HHS" />
                                        <option value="USAF" />
                                        <option value="US Army" />
                                        <option value="US Navy" />
                                        <option value="USMC" />
                                    </datalist>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="response_due_date">Due Date</Label>
                                    <Input
                                        id="response_due_date"
                                        type="date"
                                        value={responseDueDate}
                                        onChange={(e) => setResponseDueDate(e.target.value)}
                                        className="rounded-lg"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Set-Aside Type</Label>
                                    <Select
                                        value={setAsideType}
                                        onValueChange={(v) => setSetAsideType(v as SetAsideType)}
                                    >
                                        <SelectTrigger className="h-10 rounded-lg border-slate-300">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(Object.keys(setAsideLabel) as SetAsideType[]).map((key) => (
                                                <SelectItem key={key} value={key}>
                                                    {setAsideLabel[key]}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="naics">NAICS Code</Label>
                                    <Input
                                        id="naics"
                                        value={naicsCode}
                                        onChange={(e) => setNaicsCode(e.target.value)}
                                        placeholder="6 digits (e.g. 541512)"
                                        className="rounded-lg"
                                        inputMode="numeric"
                                        maxLength={6}
                                    />
                                    {naicsCode.trim() && !isValidNaics(naicsCode.trim()) && (
                                        <div className="text-xs text-amber-700">NAICS must be 6 digits.</div>
                                    )}
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Optional notes about the scope, context, or what you care about."
                                        className="min-h-[110px] rounded-lg"
                                    />
                                </div>
                            </div>

                            {/* Upload RFP */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-3">
                                    <Label>Upload RFP (PDF)</Label>
                                    {rfpFile && (
                                        <button
                                            type="button"
                                            onClick={() => setRfpFile(null)}
                                            className="text-xs text-slate-500 hover:text-red-600 inline-flex items-center gap-1"
                                        >
                                            <X className="w-3 h-3" /> Remove
                                        </button>
                                    )}
                                </div>

                                <div
                                    className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${dragActive
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                                        }`}
                                    onDragEnter={handleDrag}
                                    onDragOver={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />

                                    <div className="mx-auto w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                                        <FileUp className="w-5 h-5" />
                                    </div>

                                    <div className="mt-2 text-sm font-medium text-slate-700">
                                        {rfpFile ? rfpFile.name : "Drop a PDF here or click to upload"}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">PDF only, max 50MB.</div>
                                </div>

                                {uploadError && <div className="text-sm text-red-600">{uploadError}</div>}
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="rounded-lg border-slate-300"
                                    onClick={() => router.push("/")}
                                    disabled={submitting}
                                >
                                    Cancel
                                </Button>

                                <Button
                                    type="submit"
                                    disabled={!canSubmit || submitting}
                                    className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                                >
                                    {submitting ? "Creating..." : "Create & Analyze"}
                                </Button>
                            </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

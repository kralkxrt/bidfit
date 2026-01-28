"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CompanyProfile } from "./CompanyProfileCard";
import { X } from "lucide-react";

interface CompanyProfileFormProps {
    profile: CompanyProfile | null;
    onSave: (payload: CompanyProfile) => Promise<void>;
    isSaving?: boolean;
}

const certificationSuggestions = [
    "ISO 27001",
    "CMMI Level 3",
    "CMMI Level 5",
    "FedRAMP Moderate",
    "FedRAMP High",
    "SOC 2",
    "ITIL",
];

const clearanceSuggestions = [
    "Public Trust",
    "Secret",
    "Top Secret",
    "TS/SCI",
];

const defaultSetAsides = {
    small_business: false,
    sdvosb: false,
    wosb: false,
    eight_a: false,
    hubzone: false,
};

const toNumber = (value: string) => {
    if (value.trim() === "") return undefined;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
};

function TagInput({
    label,
    placeholder,
    values,
    onChange,
    suggestions = [],
}: {
    label: string;
    placeholder: string;
    values: string[];
    onChange: (next: string[]) => void;
    suggestions?: string[];
}) {
    const [inputValue, setInputValue] = useState("");

    const normalizedValues = useMemo(
        () => values.map((value) => value.trim()).filter(Boolean),
        [values]
    );

    const addTag = (tag: string) => {
        const normalized = tag.trim();
        if (!normalized) return;
        if (normalizedValues.includes(normalized)) return;
        onChange([...normalizedValues, normalized]);
        setInputValue("");
    };

    const removeTag = (tag: string) => {
        onChange(normalizedValues.filter((value) => value !== tag));
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
            event.preventDefault();
            addTag(inputValue);
        }
    };

    const toggleSuggestion = (tag: string) => {
        if (normalizedValues.includes(tag)) {
            removeTag(tag);
        } else {
            addTag(tag);
        }
    };

    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <div className="flex gap-2">
                <Input
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="rounded-xl"
                />
                <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => addTag(inputValue)}
                >
                    Add
                </Button>
            </div>
            {normalizedValues.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {normalizedValues.map((tag) => (
                        <Badge key={tag} variant="outline" className="rounded-full border-slate-200 bg-white text-slate-700">
                            {tag}
                            <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
            {suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {suggestions.map((suggestion) => (
                        <Button
                            key={suggestion}
                            type="button"
                            size="sm"
                            variant={normalizedValues.includes(suggestion) ? "default" : "outline"}
                            className="rounded-full text-xs"
                            onClick={() => toggleSuggestion(suggestion)}
                        >
                            {suggestion}
                        </Button>
                    ))}
                </div>
            )}
        </div>
    );
}

export function CompanyProfileForm({ profile, onSave, isSaving }: CompanyProfileFormProps) {
    const [formData, setFormData] = useState<CompanyProfile>({
        name: "",
        naics_codes: [],
        certifications: [],
        clearances: [],
        set_asides: defaultSetAsides,
        employee_count: undefined,
        annual_revenue: undefined,
        bonding_capacity: undefined,
        cage_code: "",
        duns_number: "",
    });

    useEffect(() => {
        if (profile) {
            setFormData({
                ...profile,
                naics_codes: profile.naics_codes || [],
                certifications: profile.certifications || [],
                clearances: profile.clearances || [],
                set_asides: { ...defaultSetAsides, ...(profile.set_asides || {}) },
            });
        }
    }, [profile]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        await onSave({
            ...formData,
            set_asides: formData.set_asides || defaultSetAsides,
        });
    };

    const updateSetAside = (key: keyof typeof defaultSetAsides) => {
        setFormData((prev) => ({
            ...prev,
            set_asides: {
                ...(prev.set_asides || defaultSetAsides),
                [key]: !(prev.set_asides || defaultSetAsides)[key],
            },
        }));
    };

    return (
        <Card className="rounded-[2rem] border-slate-100 shadow-sm">
            <CardHeader>
                <CardTitle className="text-xl text-slate-900">Edit Company Profile</CardTitle>
                <p className="text-sm text-slate-500">
                    Keep this profile current so Roxy can assess your fit against RFP requirements.
                </p>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label>Company Name</Label>
                        <Input
                            value={formData.name}
                            onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                            placeholder="Your company name"
                            className="rounded-xl"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>CAGE Code</Label>
                            <Input
                                value={formData.cage_code || ""}
                                onChange={(event) => setFormData((prev) => ({ ...prev, cage_code: event.target.value }))}
                                placeholder="e.g. 1A2B3"
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>DUNS / UEI</Label>
                            <Input
                                value={formData.duns_number || ""}
                                onChange={(event) => setFormData((prev) => ({ ...prev, duns_number: event.target.value }))}
                                placeholder="DUNS or UEI"
                                className="rounded-xl"
                            />
                        </div>
                    </div>

                    <TagInput
                        label="NAICS Codes"
                        placeholder="Add NAICS code"
                        values={formData.naics_codes || []}
                        onChange={(values) => setFormData((prev) => ({ ...prev, naics_codes: values }))}
                    />

                    <TagInput
                        label="Certifications"
                        placeholder="Add certification"
                        values={formData.certifications || []}
                        onChange={(values) => setFormData((prev) => ({ ...prev, certifications: values }))}
                        suggestions={certificationSuggestions}
                    />

                    <TagInput
                        label="Clearances"
                        placeholder="Add clearance"
                        values={formData.clearances || []}
                        onChange={(values) => setFormData((prev) => ({ ...prev, clearances: values }))}
                        suggestions={clearanceSuggestions}
                    />

                    <Separator />

                    <div className="space-y-3">
                        <Label>Set-Asides</Label>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {[
                                { key: "small_business", label: "Small Business" },
                                { key: "sdvosb", label: "SDVOSB" },
                                { key: "wosb", label: "WOSB" },
                                { key: "eight_a", label: "8(a)" },
                                { key: "hubzone", label: "HUBZone" },
                            ].map(({ key, label }) => (
                                <label key={key} className="flex items-center gap-3 text-sm text-slate-600">
                                    <input
                                        type="checkbox"
                                        checked={(formData.set_asides || defaultSetAsides)[key as keyof typeof defaultSetAsides]}
                                        onChange={() => updateSetAside(key as keyof typeof defaultSetAsides)}
                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                                    />
                                    {label}
                                </label>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label>Employee Count</Label>
                            <Input
                                type="number"
                                value={formData.employee_count ?? ""}
                                onChange={(event) =>
                                    setFormData((prev) => ({ ...prev, employee_count: toNumber(event.target.value) }))
                                }
                                placeholder="e.g. 120"
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Annual Revenue</Label>
                            <Input
                                type="number"
                                value={formData.annual_revenue ?? ""}
                                onChange={(event) =>
                                    setFormData((prev) => ({ ...prev, annual_revenue: toNumber(event.target.value) }))
                                }
                                placeholder="e.g. 12000000"
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Bonding Capacity</Label>
                            <Input
                                type="number"
                                value={formData.bonding_capacity ?? ""}
                                onChange={(event) =>
                                    setFormData((prev) => ({ ...prev, bonding_capacity: toNumber(event.target.value) }))
                                }
                                placeholder="e.g. 5000000"
                                className="rounded-xl"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button type="submit" className="rounded-xl bg-blue-600 hover:bg-blue-700" disabled={isSaving}>
                            {isSaving ? "Saving..." : "Save Profile"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

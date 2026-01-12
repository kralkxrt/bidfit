"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCompanyStore } from "@/store/useCompanyStore";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewOpportunityPage() {
    const router = useRouter();
    const { selectedCompanyId } = useCompanyStore();
    const [formData, setFormData] = useState({
        title: "",
        agency: "",
        solicitation_number: "",
        due_date: "",
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCompanyId) return;

        setLoading(true);
        try {
            await api.post("/api/opportunities/", {
                ...formData,
                company_id: selectedCompanyId,
                pipeline_stage: "capture", // Default stage
            });
            router.push("/"); // Redirect to dashboard
        } catch (error) {
            console.error("Failed to create opportunity", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-10">
            <div className="mb-6">
                <Link href="/" className="text-slate-500 hover:text-blue-600 flex items-center gap-2 text-sm font-medium mb-4">
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </Link>
                <h1 className="text-3xl font-bold text-slate-900">New Opportunity</h1>
                <p className="text-slate-500">Track a new solicitation or prospect.</p>
            </div>

            <Card className="rounded-[2rem] shadow-sm border-slate-100">
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">Opportunity Title</Label>
                            <Input
                                id="title"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g. Cyber Security Support Services"
                                className="rounded-xl"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="agency">Agency</Label>
                                <Input
                                    id="agency"
                                    required
                                    value={formData.agency}
                                    onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                                    placeholder="e.g. DHS"
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="solicitation">Solicitation Number</Label>
                                <Input
                                    id="solicitation"
                                    value={formData.solicitation_number}
                                    onChange={(e) => setFormData({ ...formData, solicitation_number: e.target.value })}
                                    placeholder="e.g. 12345-abc"
                                    className="rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="due_date">Due Date</Label>
                            <Input
                                id="due_date"
                                type="date"
                                value={formData.due_date}
                                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                className="rounded-xl"
                            />
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8">
                                {loading ? "Creating..." : "Create Opportunity"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

"use client";

import { useEffect, useState } from 'react';
import { useCompanyStore } from '@/store/useCompanyStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OrganizationSheet } from '@/components/organizations/OrganizationSheet';
import {
    PlusCircle,
    Search,
    Building2,
    MoreHorizontal,
    ShieldCheck,
    Users,
    DollarSign,
    Briefcase,
    Trash2
} from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export default function OrganizationsPage() {
    const { companies, fetchCompanies, addCompany, removeCompany, isLoading } = useCompanyStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // Add Dialog State
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newCompanyName, setNewCompanyName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Delete Dialog State
    const [deleteId, setDeleteId] = useState<string | null>(null);

    useEffect(() => {
        fetchCompanies();
    }, [fetchCompanies]);

    const handleEdit = (id: string) => {
        setSelectedId(id);
        setIsSheetOpen(true);
    };

    const handleCreate = async () => {
        if (!newCompanyName.trim()) return;
        setIsSubmitting(true);
        try {
            await addCompany(newCompanyName);
            setIsAddOpen(false);
            setNewCompanyName("");
        } catch (error) {
            console.error("Failed to create company", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        setIsSubmitting(true);
        try {
            await removeCompany(deleteId);
            setDeleteId(null);
        } catch (error) {
            console.error("Failed to delete company", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredCompanies = companies.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.uei?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatCurrency = (val: number | undefined) => {
        if (!val) return '-';
        if (val >= 1000000000) return `$${(val / 1000000000).toFixed(1)}B`;
        if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
        return `$${(val / 1000).toFixed(0)}k`;
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Organizations</h1>
                    <p className="text-slate-500 mt-1">Manage company profiles, capabilities, and contract vehicles.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Organization
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Organization</DialogTitle>
                                <DialogDescription>
                                    Create a profile to manage opportunities and documents.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Organization Name</Label>
                                    <Input
                                        id="name"
                                        value={newCompanyName}
                                        onChange={(e) => setNewCompanyName(e.target.value)}
                                        placeholder="e.g. Acme Federal Systems"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                                <Button onClick={handleCreate} disabled={!newCompanyName.trim() || isSubmitting}>
                                    {isSubmitting ? "Creating..." : "Create Organization"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search organizations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-white border-slate-200"
                    />
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCompanies.map((company) => (
                    <Card key={company.id} className="group hover:shadow-lg transition-all duration-200 border-slate-200 bg-white cursor-pointer relative" onClick={() => handleEdit(company.id)}>
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                        <Building2 className="w-5 h-5 text-blue-600" />
                                        {company.name}
                                    </CardTitle>
                                    <CardDescription className="line-clamp-1">
                                        {company.description || "No description provided."}
                                    </CardDescription>
                                </div>
                                {company.business_size === 'small' && (
                                    <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">Small Biz</Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pb-4">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="flex items-center gap-2 text-slate-500">
                                    <ShieldCheck className="w-4 h-4 text-slate-400" />
                                    <span>UEI: {company.uei || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-500">
                                    <Users className="w-4 h-4 text-slate-400" />
                                    <span>{company.employee_count || 0} Emps</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-500">
                                    <DollarSign className="w-4 h-4 text-slate-400" />
                                    <span>{formatCurrency(company.annual_revenue)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-500">
                                    <Briefcase className="w-4 h-4 text-slate-400" />
                                    <span>{company.facility_clearance === 'none' ? 'No Clearance' : (company.facility_clearance || 'N/A')}</span>
                                </div>
                            </div>

                            {/* Badges for Certs */}
                            {company.certifications && company.certifications.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {company.certifications.slice(0, 3).map(cert => (
                                        <Badge key={cert} variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
                                            {cert}
                                        </Badge>
                                    ))}
                                    {company.certifications.length > 3 && (
                                        <Badge variant="outline" className="text-xs text-slate-400">+ {company.certifications.length - 3}</Badge>
                                    )}
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="pt-0 pb-4 flex justify-between items-center">
                            <Button variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 -ml-2">
                                Manage Profile →
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-slate-300 hover:text-red-500 hover:bg-red-50"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteId(company.id);
                                }}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            <OrganizationSheet
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
                companyId={selectedId}
            />

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Organization</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this organization? This action cannot be undone and will remove all associated data.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Deleting..." : "Delete Organization"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

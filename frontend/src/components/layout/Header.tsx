"use client";
import { useEffect, useState } from 'react';
import { useCompanyStore } from '@/store/useCompanyStore';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectSeparator,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlusCircle, Settings, Trash2, Search, Bell } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function Header() {
    const { companies, selectedCompanyId, selectCompany, fetchCompanies, addCompany, removeCompany, isLoading } = useCompanyStore();

    // Dialog States
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    // Form States
    const [newCompanyName, setNewCompanyName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchCompanies();
    }, [fetchCompanies]);

    const handleSelectChange = (value: string) => {
        if (value === "add_new") {
            setIsAddDialogOpen(true);
        } else if (value === "manage") {
            setIsManageDialogOpen(true);
        } else {
            selectCompany(value);
        }
    };

    const handleAddCompany = async () => {
        if (!newCompanyName.trim()) return;
        setIsSubmitting(true);
        try {
            await addCompany(newCompanyName);
            setIsAddDialogOpen(false);
            setNewCompanyName("");
        } catch (error) {
            console.error("Failed to add company", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveCompany = async (id: string) => {
        setIsSubmitting(true);
        try {
            await removeCompany(id);
            setDeleteConfirmId(null);
        } catch (error) {
            console.error("Failed to remove company", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <header className="flex h-20 items-center gap-4 bg-transparent px-8">
            {/* Title / Organization Context */}
            <div className="flex flex-col">
                <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Org:</span>
                    <div className="w-[200px]">
                        <Select
                            value={selectedCompanyId || ''}
                            onValueChange={handleSelectChange}
                            disabled={isLoading}
                        >
                            <SelectTrigger className="h-8 border-none bg-transparent shadow-none p-0 focus:ring-0 text-slate-600 font-semibold hover:text-blue-600">
                                <SelectValue placeholder="Select Company" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-100 shadow-lg shadow-blue-900/5">
                                <div className="p-2 text-xs font-semibold text-slate-400">Your Organizations</div>
                                <SelectItem value="all">All Organizations</SelectItem>
                                {companies.map((company) => (
                                    <SelectItem key={company.id} value={company.id}>
                                        {company.name}
                                    </SelectItem>
                                ))}
                                <SelectSeparator className="my-2 bg-slate-100" />
                                <SelectItem value="add_new" className="text-blue-600 font-medium focus:bg-blue-50 focus:text-blue-700">
                                    <span className="flex items-center gap-2">
                                        <PlusCircle className="w-4 h-4" />
                                        Add New Organization
                                    </span>
                                </SelectItem>
                                <SelectItem value="manage" className="text-slate-500 font-medium focus:bg-slate-50">
                                    <span className="flex items-center gap-2">
                                        <Settings className="w-4 h-4" />
                                        Manage Organizations
                                    </span>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Global Search Bar (Removed as per request) */}
            <div className="flex-1" />

            {/* Right Controls */}
            <div className="flex items-center gap-4">
                {/* Bell and Admin User removed as per request */}
            </div>

            {/* Add Company Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="rounded-3xl border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle>Add New Organization</DialogTitle>
                        <DialogDescription>
                            Create a new organization workspace to manage opportunities and documents.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Organization Name</Label>
                            <Input
                                id="name"
                                value={newCompanyName}
                                onChange={(e) => setNewCompanyName(e.target.value)}
                                placeholder="e.g. Acme Corp Federal Systems"
                                autoFocus
                                className="rounded-xl border-slate-200"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="rounded-xl border-slate-200">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddCompany}
                            disabled={!newCompanyName.trim() || isSubmitting}
                            className="bg-blue-600 hover:bg-blue-700 rounded-xl"
                        >
                            {isSubmitting ? "Creating..." : "Create Organization"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Manage Organizations Dialog */}
            <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
                <DialogContent className="max-w-md rounded-3xl border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle>Manage Organizations</DialogTitle>
                        <DialogDescription>
                            Delete organizations. This action is permanent.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                        {companies.length === 0 ? (
                            <p className="text-sm text-center text-slate-400 py-4">No organizations found.</p>
                        ) : (
                            <div className="space-y-3">
                                {companies.map((company) => (
                                    <div key={company.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-2xl bg-slate-50/50">
                                        <div>
                                            <p className="font-medium text-sm text-slate-700">{company.name}</p>
                                            <p className="text-[10px] text-slate-400 truncate max-w-[200px] uppercase tracking-wide">ID: {company.id?.split('-')[0]}...</p>
                                        </div>

                                        {deleteConfirmId === company.id ? (
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setDeleteConfirmId(null)}
                                                    className="h-8 px-2 text-xs rounded-lg text-slate-500 hover:text-slate-700"
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleRemoveCompany(company.id)}
                                                    disabled={isSubmitting}
                                                    className="h-8 px-2 text-xs rounded-lg bg-red-500 hover:bg-red-600"
                                                >
                                                    {isSubmitting ? "..." : "Confirm"}
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full"
                                                onClick={() => setDeleteConfirmId(company.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsManageDialogOpen(false)} className="rounded-xl border-slate-200">
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </header>
    );
}

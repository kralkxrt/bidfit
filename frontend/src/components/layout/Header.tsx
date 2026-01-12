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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PlusCircle, Settings, Trash2 } from 'lucide-react';
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
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
            <div className="flex flex-1 items-center gap-4">
                <h1 className="text-sm font-medium text-muted-foreground mr-2">Organization context:</h1>
                <div className="w-[250px]">
                    <Select
                        value={selectedCompanyId || ''}
                        onValueChange={handleSelectChange}
                        disabled={isLoading}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select Company" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">(All)</SelectItem>
                            {companies.map((company) => (
                                <SelectItem key={company.id} value={company.id}>
                                    {company.name}
                                </SelectItem>
                            ))}
                            <SelectSeparator />
                            <SelectItem value="add_new" className="text-emerald-600 font-medium">
                                <span className="flex items-center gap-2">
                                    <PlusCircle className="w-4 h-4" />
                                    Add New Organization
                                </span>
                            </SelectItem>
                            <SelectItem value="manage" className="text-gray-600 font-medium">
                                <span className="flex items-center gap-2">
                                    <Settings className="w-4 h-4" />
                                    Manage Organizations
                                </span>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-medium leading-none">Admin User</p>
                        <p className="text-xs text-muted-foreground">admin@internal.local</p>
                    </div>
                    <Avatar>
                        <AvatarFallback>AD</AvatarFallback>
                    </Avatar>
                </div>
            </div>

            {/* Add Company Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent>
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
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddCompany}
                            disabled={!newCompanyName.trim() || isSubmitting}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {isSubmitting ? "Creating..." : "Create Organization"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Manage Organizations Dialog */}
            <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Manage Organizations</DialogTitle>
                        <DialogDescription>
                            Manage your existing organization workspaces. Deleting an organization is permanent.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                        {companies.length === 0 ? (
                            <p className="text-sm text-center text-gray-500 py-4">No organizations found.</p>
                        ) : (
                            <div className="space-y-3">
                                {companies.map((company) => (
                                    <div key={company.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                                        <div>
                                            <p className="font-medium text-sm">{company.name}</p>
                                            <p className="text-xs text-gray-500 truncate max-w-[200px]">{company.id}</p>
                                        </div>

                                        {deleteConfirmId === company.id ? (
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setDeleteConfirmId(null)}
                                                    className="h-8 px-2 text-xs"
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleRemoveCompany(company.id)}
                                                    disabled={isSubmitting}
                                                    className="h-8 px-2 text-xs"
                                                >
                                                    {isSubmitting ? "..." : "Confirm"}
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
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
                        <Button variant="outline" onClick={() => setIsManageDialogOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </header>
    );
}

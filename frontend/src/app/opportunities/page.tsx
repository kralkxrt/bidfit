"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Plus, Search, FileText, ArrowRight, Trash2 } from "lucide-react";
import { useCompanyStore } from "@/store/useCompanyStore";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface Opportunity {
    id: string;
    title: string;
    solicitation_number: string;
    agency: string;
    status: string;
    response_due_date: string;
    created_at: string;
}

export default function OpportunitiesPage() {
    const router = useRouter();
    const { selectedCompanyId } = useCompanyStore();
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newOpp, setNewOpp] = useState({
        title: "",
        solicitation_number: "",
        agency: "",
    });

    useEffect(() => {
        if (selectedCompanyId) {
            fetchOpportunities();
        }
    }, [selectedCompanyId]);

    const fetchOpportunities = async () => {
        try {
            setLoading(true);
            const params = selectedCompanyId && selectedCompanyId !== 'all'
                ? `?company_id=${selectedCompanyId}`
                : '';
            const res = await api.get(`/api/opportunities/${params}`);
            setOpportunities(res.data);
        } catch (error) {
            console.error("Failed to fetch opportunities", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!selectedCompanyId) return;
        try {
            const res = await api.post(`/api/opportunities/?company_id=${selectedCompanyId}`, newOpp);
            setIsCreateOpen(false);
            setNewOpp({ title: "", solicitation_number: "", agency: "" });
            router.push(`/opportunities/${res.data.id}`);
        } catch (error) {
            console.error("Failed to create opportunity", error);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Prevent row click
        if (!confirm("Are you sure you want to delete this opportunity?")) return;

        try {
            await api.delete(`/api/opportunities/${id}`);
            setOpportunities(prev => prev.filter(o => o.id !== id));
        } catch (error) {
            console.error("Failed to delete opportunity", error);
        }
    };

    const filteredOpps = opportunities.filter((opp) =>
        opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.solicitation_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.agency?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Opportunities</h1>
                    <p className="text-muted-foreground">
                        Manage your pipeline and analyze gaps.
                    </p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> New Opportunity
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Opportunity</DialogTitle>
                            <DialogDescription>
                                Start a new pursuit. You can upload PWS documents later.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="title" className="text-right">
                                    Title
                                </Label>
                                <Input
                                    id="title"
                                    value={newOpp.title}
                                    onChange={(e) => setNewOpp({ ...newOpp, title: e.target.value })}
                                    className="col-span-3"
                                    placeholder="e.g. Cyber Security Support 2026"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="solicitation" className="text-right">
                                    Solicitation #
                                </Label>
                                <Input
                                    id="solicitation"
                                    value={newOpp.solicitation_number}
                                    onChange={(e) =>
                                        setNewOpp({ ...newOpp, solicitation_number: e.target.value })
                                    }
                                    className="col-span-3"
                                    placeholder="e.g. N00019-26-R-0001"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="agency" className="text-right">
                                    Agency
                                </Label>
                                <Input
                                    id="agency"
                                    value={newOpp.agency}
                                    onChange={(e) => setNewOpp({ ...newOpp, agency: e.target.value })}
                                    className="col-span-3"
                                    placeholder="e.g. Department of the Navy"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreate} disabled={!newOpp.title}>
                                Create & View
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search opportunities..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle>Active Pursuits</CardTitle>
                    <CardDescription>
                        {filteredOpps.length} opportunities found
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="py-10 text-center text-muted-foreground">Loading...</div>
                    ) : filteredOpps.length === 0 ? (
                        <div className="py-10 text-center text-muted-foreground">
                            No opportunities found. Create one to get started.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Solicitation</TableHead>
                                    <TableHead>Agency</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredOpps.map((opp) => (
                                    <TableRow key={opp.id} className="cursor-pointer" onClick={() => router.push(`/opportunities/${opp.id}`)}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center space-x-2">
                                                <FileText className="h-4 w-4 text-muted-foreground" />
                                                <span>{opp.title}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{opp.solicitation_number || "-"}</TableCell>
                                        <TableCell>{opp.agency || "-"}</TableCell>
                                        <TableCell>
                                            <Badge variant={opp.status === 'active' ? 'default' : 'secondary'}>
                                                {opp.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {opp.response_due_date
                                                ? format(new Date(opp.response_due_date), "MMM d, yyyy")
                                                : "-"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={`/opportunities/${opp.id}`}>
                                                        View <ArrowRight className="ml-2 h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                    onClick={(e) => handleDelete(e, opp.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

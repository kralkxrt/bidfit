"use client";

import { useEffect, useState } from 'react';
import { Company, useCompanyStore } from '@/store/useCompanyStore';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Building2, ShieldCheck, FileText, DollarSign, Globe, Briefcase } from 'lucide-react';

interface OrganizationSheetProps {
    companyId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function OrganizationSheet({ companyId, open, onOpenChange }: OrganizationSheetProps) {
    const { companies, updateCompany } = useCompanyStore();
    const [formData, setFormData] = useState<Partial<Company>>({});
    const [isSaving, setIsSaving] = useState(false);

    // Load data when opening
    useEffect(() => {
        if (open && companyId) {
            const company = companies.find(c => c.id === companyId);
            if (company) {
                setFormData(JSON.parse(JSON.stringify(company))); // Deep copy
            }
        } else if (open && !companyId) {
            setFormData({});
        }
    }, [open, companyId, companies]);

    const handleChange = <K extends keyof Company>(field: K, value: Company[K]) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!companyId) return;
        setIsSaving(true);
        try {
            await updateCompany(companyId, formData);
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to save", error);
        } finally {
            setIsSaving(false);
        }
    };

    const formatCurrency = (val: number | undefined) => {
        if (!val) return '';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[800px] sm:max-w-[800px] overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle className="flex items-center gap-2 text-2xl">
                        <Building2 className="w-6 h-6 text-blue-600" />
                        {formData.name || 'Organization Profile'}
                    </SheetTitle>
                    <SheetDescription>
                        Manage comprehensive profile details for gap analysis matching.
                    </SheetDescription>
                </SheetHeader>

                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="mb-4 w-full justify-start h-auto p-1 bg-slate-100/50 rounded-xl overflow-x-auto">
                        <TabsTrigger value="overview" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Globe className="w-4 h-4" /> Overview
                        </TabsTrigger>
                        <TabsTrigger value="gov" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <ShieldCheck className="w-4 h-4" /> Gov IDs
                        </TabsTrigger>
                        <TabsTrigger value="contracting" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <FileText className="w-4 h-4" /> Contracts
                        </TabsTrigger>
                        <TabsTrigger value="capabilities" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Briefcase className="w-4 h-4" /> Capabilities
                        </TabsTrigger>
                        <TabsTrigger value="financial" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <DollarSign className="w-4 h-4" /> Financial
                        </TabsTrigger>
                    </TabsList>

                    {/* OVERVIEW TAB */}
                    <TabsContent value="overview" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Organization Name</Label>
                                <Input
                                    value={formData.name || ''}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Website</Label>
                                <Input
                                    value={formData.website || ''}
                                    onChange={(e) => handleChange('website', e.target.value)}
                                    placeholder="https://"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>LinkedIn URL</Label>
                                <Input
                                    value={formData.linkedin_url || ''}
                                    onChange={(e) => handleChange('linkedin_url', e.target.value)}
                                    placeholder="https://linkedin.com/company/..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Employees</Label>
                                    <Input
                                        type="number"
                                        value={formData.employee_count || ''}
                                        onChange={(e) => handleChange('employee_count', parseInt(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Founded</Label>
                                    <Input
                                        type="number"
                                        value={formData.founded_year || ''}
                                        onChange={(e) => handleChange('founded_year', parseInt(e.target.value))}
                                        placeholder="YYYY"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Description / Capabilities Statement</Label>
                            <Textarea
                                className="min-h-[120px]"
                                value={formData.description || ''}
                                onChange={(e) => handleChange('description', e.target.value)}
                                placeholder="Brief overview of the company..."
                            />
                        </div>
                    </TabsContent>

                    {/* GOV IDS TAB */}
                    <TabsContent value="gov" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>UEI (Unique Entity ID)</Label>
                                <Input
                                    value={formData.uei || ''}
                                    onChange={(e) => handleChange('uei', e.target.value)}
                                    placeholder="SAM.gov UEI"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>CAGE Code</Label>
                                <Input
                                    value={formData.cage_code || ''}
                                    onChange={(e) => handleChange('cage_code', e.target.value)}
                                    placeholder="5-char CAGE"
                                />
                            </div>
                        </div>

                        <Separator className="my-4" />

                        <div className="space-y-4">
                            <h3 className="font-semibold text-sm">Socioeconomic Status</h3>
                            <div className="space-y-2">
                                <Label>Business Size</Label>
                                <Select
                                    value={formData.business_size || 'other_than_small'}
                                    onValueChange={(val) => handleChange('business_size', val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Size" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="small">Small Business</SelectItem>
                                        <SelectItem value="other_than_small">Other Than Small (Large)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Certifications (comma separated for now)</Label>
                                <Input
                                    value={formData.certifications?.join(', ') || ''}
                                    onChange={(e) => handleChange('certifications', e.target.value.split(',').map(s => s.trim()))}
                                    placeholder="8a, HUBZone, SDVOSB, WOSB..."
                                />
                                <p className="text-xs text-slate-500">Enter codes like: 8a, hubzone, sdvosb, wosb, edwosb</p>
                            </div>
                        </div>
                    </TabsContent>

                    {/* CONTRACTS TAB */}
                    <TabsContent value="contracting" className="space-y-4">
                        <div className="space-y-2">
                            <Label>GSA Schedules (JSON/Raw input for prototype)</Label>
                            <Textarea
                                value={JSON.stringify(formData.gsa_schedules || [], null, 2)}
                                onChange={(e) => {
                                    try {
                                        handleChange('gsa_schedules', JSON.parse(e.target.value));
                                    } catch {
                                        // Ignore parse error while typing
                                    }
                                }}
                                placeholder='[{"schedule": "MAS", "contract_number": "GS-..."}]'
                                className="font-mono text-xs"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Other Contract Vehicles (comma separated)</Label>
                            <Input
                                value={formData.contract_vehicles?.join(', ') || ''}
                                onChange={(e) => handleChange('contract_vehicles', e.target.value.split(',').map(s => s.trim()))}
                                placeholder="OASIS Pool 1, SEWP V, CIO-SP3..."
                            />
                        </div>
                    </TabsContent>

                    {/* CAPABILITIES TAB */}
                    <TabsContent value="capabilities" className="space-y-4">
                        <div className="space-y-2">
                            <Label>Primary NAICS Code</Label>
                            <Input
                                value={formData.primary_naic_code || ''}
                                onChange={(e) => handleChange('primary_naic_code', e.target.value)}
                                placeholder="541512"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>All NAICS Codes</Label>
                            <Input
                                value={formData.naics_codes?.join(', ') || ''}
                                onChange={(e) => handleChange('naics_codes', e.target.value.split(',').map(s => s.trim()))}
                                placeholder="541512, 541330..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Facility Clearance</Label>
                            <Select
                                value={formData.facility_clearance || 'none'}
                                onValueChange={(val) => handleChange('facility_clearance', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Clearance" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None / Unspecified</SelectItem>
                                    <SelectItem value="confidential">Confidential</SelectItem>
                                    <SelectItem value="secret">Secret</SelectItem>
                                    <SelectItem value="top_secret">Top Secret</SelectItem>
                                    <SelectItem value="top_secret_sci">Top Secret / SCI</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Service Areas / Tags</Label>
                            <Input
                                value={formData.service_areas?.join(', ') || ''}
                                onChange={(e) => handleChange('service_areas', e.target.value.split(',').map(s => s.trim()))}
                                placeholder="IT Services, Cyber, logistics..."
                            />
                        </div>
                    </TabsContent>

                    {/* FINANCIAL TAB */}
                    <TabsContent value="financial" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Annual Revenue ($)</Label>
                                <Input
                                    type="number"
                                    value={formData.annual_revenue || ''}
                                    onChange={(e) => handleChange('annual_revenue', parseInt(e.target.value))}
                                    placeholder="10000000"
                                />
                                <p className="text-xs text-slate-500">
                                    {formatCurrency(formData.annual_revenue)}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label>Bonding Capacity ($)</Label>
                                <Input
                                    type="number"
                                    value={formData.bonding_capacity || ''}
                                    onChange={(e) => handleChange('bonding_capacity', parseInt(e.target.value))}
                                    placeholder="5000000"
                                />
                                <p className="text-xs text-slate-500">
                                    {formatCurrency(formData.bonding_capacity)}
                                </p>
                            </div>
                        </div>
                    </TabsContent>

                </Tabs>

                <SheetFooter className="mt-8">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

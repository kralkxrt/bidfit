"use client";

import { Check, ChevronDown, Building2, Plus } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOrgStore } from "@/lib/stores/orgStore";

export function OrgSwitcher() {
    const { currentOrg, organizations, setCurrentOrg } = useOrgStore();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors">
                <Building2 className="w-4 h-4 text-slate-500" />
                <span className="font-medium text-slate-900">
                    {currentOrg?.name || "Select Organization"}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel className="text-xs text-slate-400 uppercase">
                    Your Organizations
                </DropdownMenuLabel>

                {organizations.map((org) => (
                    <DropdownMenuItem
                        key={org.id}
                        onClick={() => setCurrentOrg(org)}
                        className="flex items-center justify-between"
                    >
                        <span>{org.name}</span>
                        {currentOrg?.id === org.id && (
                            <Check className="w-4 h-4 text-blue-500" />
                        )}
                    </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator />

                <DropdownMenuItem className="text-blue-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Organization
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

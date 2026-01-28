"use client";

import { HelpCircle, Search } from "lucide-react";
import { OrgSwitcher } from "./OrgSwitcher";
import { UserNav } from "./UserNav";

export function TopBar() {
    return (
        <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6">
            <OrgSwitcher />

            <div className="flex items-center gap-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="pl-9 pr-4 py-2 w-64 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                <button className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                    <HelpCircle className="w-5 h-5" />
                </button>

                <UserNav />
            </div>
        </header>
    );
}

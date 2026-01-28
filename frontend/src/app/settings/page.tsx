"use client";

import { Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-4 border border-blue-100 shadow-sm">
                <Settings className="w-12 h-12 text-blue-600 animate-spin-slow" style={{ animationDuration: '10s' }} />
            </div>

            <div className="space-y-4 max-w-md">
                <div className="flex flex-col items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200 px-3 py-1 text-xs font-semibold tracking-wider uppercase">
                        Coming Soon
                    </Badge>
                    <h1 className="text-3xl font-bold text-slate-900">Settings & Configuration</h1>
                </div>

                <p className="text-slate-500 text-lg leading-relaxed">
                    We&apos;re building a powerful control center for your workspace. Soon you&apos;ll be able to manage:
                </p>

                <div className="grid grid-cols-1 gap-2 text-left bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    {[
                        "User Roles & Permissions",
                        "Notification Preferences",
                        "API Keys & Integrations",
                        "Audit Logs & Security"
                    ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 text-slate-600">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                            {item}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

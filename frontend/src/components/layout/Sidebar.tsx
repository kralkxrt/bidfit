"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
    BarChart3,
    FileText,
    Settings,
    Home,
    FolderOpen,
    User,
    LogOut,
    Briefcase,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BidWinLogoIcon } from "./BidWinLogo";

const navItems = [
    { href: "/", icon: Home, label: "Dashboard" },
    { href: "/opportunities", icon: FileText, label: "Opportunities" },
    { href: "/documents", icon: FolderOpen, label: "Documents" },
    { href: "/past-performance", icon: Briefcase, label: "Past Performance" },
    { href: "/analyses", icon: BarChart3, label: "Analyses" },
    { href: "/company-profile", icon: User, label: "Company Profile" },
];

const bottomItems = [
    { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
    const pathname = usePathname();

    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        try {
            const stored = window.localStorage.getItem("bidwin_sidebar_collapsed");
            if (stored === "true") setIsCollapsed(true);
        } catch {
            // ignore
        }
    }, []);

    const toggleCollapsed = () => {
        setIsCollapsed((prev) => {
            const next = !prev;
            try {
                window.localStorage.setItem("bidwin_sidebar_collapsed", String(next));
            } catch {
                // ignore
            }
            return next;
        });
    };

    const handleLogout = async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/login";
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    return (
        <aside
            className={cn(
                "flex flex-col h-screen bg-slate-900 border-r border-slate-700/60 transition-all duration-300",
                isCollapsed ? "w-16" : "w-64"
            )}
        >
            {/* Header */}
            <div className={cn("flex items-center", isCollapsed ? "justify-center py-4" : "justify-between px-4 py-4")}>
                {isCollapsed ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                            <BidWinLogoIcon className="w-6 h-6 text-white" />
                        </div>
                        <button
                            type="button"
                            onClick={toggleCollapsed}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                            title="Expand sidebar"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-3">
                            {/* Logo mark */}
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                                <BidWinLogoIcon className="w-6 h-6 text-white" />
                            </div>
                            {/* Wordmark */}
                            <span className="text-xl font-bold tracking-tight">
                                <span className="text-white">Bid</span>
                                <span className="text-blue-400">Win</span>
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={toggleCollapsed}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
                            title="Collapse sidebar"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                    </>
                )}
            </div>

            {/* Main Nav */}
            <nav className={cn("flex-1 flex flex-col", isCollapsed ? "px-2" : "px-3", "space-y-1")}>
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={isCollapsed ? item.label : undefined}
                            className={cn(
                                "flex items-center rounded-lg text-sm font-medium transition-colors",
                                isCollapsed ? "justify-center px-0 py-3" : "gap-3 px-3 py-2",
                                isActive
                                    ? "bg-blue-500/20 text-blue-200"
                                    : "text-slate-200 hover:text-white hover:bg-white/10"
                            )}
                        >
                            <Icon className="w-5 h-5 flex-shrink-0" />
                            {!isCollapsed && <span>{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Nav */}
            <div className={cn("flex flex-col", isCollapsed ? "px-2" : "px-3", "space-y-1 pb-4")}>
                {bottomItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={isCollapsed ? item.label : undefined}
                            className={cn(
                                "flex items-center rounded-lg text-sm font-medium transition-colors",
                                isCollapsed ? "justify-center px-0 py-3" : "gap-3 px-3 py-2",
                                "text-slate-200 hover:text-white hover:bg-white/10"
                            )}
                        >
                            <Icon className="w-5 h-5 flex-shrink-0" />
                            {!isCollapsed && <span>{item.label}</span>}
                        </Link>
                    );
                })}

                <button
                    type="button"
                    onClick={handleLogout}
                    title={isCollapsed ? "Logout" : undefined}
                    className={cn(
                        "flex items-center rounded-lg text-sm font-medium transition-colors",
                        isCollapsed ? "justify-center px-0 py-3" : "gap-3 px-3 py-2",
                        "text-slate-200 hover:text-red-200 hover:bg-red-500/10"
                    )}
                >
                    <LogOut className="w-5 h-5 flex-shrink-0" />
                    {!isCollapsed && <span>Logout</span>}
                </button>
            </div>
        </aside>
    );
}

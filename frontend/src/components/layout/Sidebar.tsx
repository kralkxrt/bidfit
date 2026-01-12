"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    BarChart3,
    FileText,
    Settings,
    LayoutDashboard,
    Briefcase,
    Hexagon,
    LogOut,
    Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Opportunities', href: '/opportunities', icon: Briefcase },
    { name: 'Organizations', href: '/organizations', icon: Building2 },
    { name: 'Documents', href: '/documents', icon: FileText },
    { name: 'Analyses', href: '/analyses', icon: BarChart3 },
];

export function Sidebar() {
    const pathname = usePathname();

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/login';
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    return (
        <aside className="w-64 bg-slate-50 border-r border-slate-200 min-h-screen p-4 flex flex-col fixed left-0 top-0 bottom-0 z-50">
            {/* Logo */}
            <div className="px-4 py-8 mb-4">
                <Link href="/" className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/30">
                        <Hexagon className="w-6 h-6 text-white fill-white" />
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="text-2xl font-bold tracking-tight leading-none">
                            <span className="text-slate-900">Bid</span>
                            <span className="text-blue-600">Fit</span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 pr-0.5">from Pera Inc</span>
                    </div>
                </Link>
            </div>

            {/* Nav items */}
            <h3 className="px-4 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Menu
            </h3>
            <nav className="flex-1 space-y-2">
                {navigation.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-all duration-200 group relative",
                                isActive
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 translate-x-1"
                                    : "text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm"
                            )}
                        >
                            <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600")} />
                            {item.name}

                            {/* Optional: Right chevron for active? Or simple dot. Keeping it clean as per reference. */}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer Actions */}
            <div className="px-4 py-4 mt-auto border-t border-slate-100 space-y-2">
                <Link
                    href="/settings"
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl font-medium text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm transition-all duration-200"
                >
                    <Settings className="w-5 h-5 text-slate-400" />
                    Settings
                </Link>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200 group"
                >
                    <LogOut className="w-5 h-5 text-slate-400 group-hover:text-red-500" />
                    Logout
                </button>
            </div>
        </aside>
    );
}

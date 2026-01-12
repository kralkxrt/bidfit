"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    BarChart3,
    FileText,
    Settings,
    LayoutDashboard,
    Briefcase
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Opportunities', href: '/opportunities', icon: Briefcase },
    { name: 'Documents', href: '/documents', icon: FileText },
    { name: 'Analyses', href: '/analyses', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 bg-gray-900 text-white min-h-screen p-4 flex flex-col fixed left-0 top-0 bottom-0 z-50">
            {/* Logo */}
            <div className="px-2 py-4 mb-6">
                <Link href="/" className="text-2xl font-bold tracking-tight flex items-center gap-0.5">
                    <span className="text-white">Bid</span>
                    <span className="text-emerald-500">Fit</span>
                </Link>
            </div>

            {/* Nav items */}
            <nav className="flex-1 space-y-1">
                {navigation.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors",
                                isActive
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <Icon className="w-5 h-5" />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}

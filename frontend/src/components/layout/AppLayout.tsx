"use client";

import { ReactNode, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useOrgStore } from '@/lib/stores/orgStore';

interface AppLayoutProps {
    children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    const pathname = usePathname();
    const isPublicPage = pathname === '/login' || pathname === '/how-it-works';
    const fetchOrganizations = useOrgStore((state) => state.fetchOrganizations);

    useEffect(() => {
        if (isPublicPage) return;

        fetchOrganizations().catch((error) => {
            console.error("Failed to load organizations", error);
        });
    }, [fetchOrganizations, isPublicPage]);

    if (isPublicPage) {
        return (
            <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
                {children}
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <TopBar />
                <main className="flex-1 overflow-hidden">
                    {children}
                </main>
            </div>
        </div>
    );
}

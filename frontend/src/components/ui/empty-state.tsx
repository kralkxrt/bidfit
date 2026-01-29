'use client';

import { cn } from '@/lib/utils';
import {
    FileText,
    ClipboardList,
    Search,
    BarChart3,
    Briefcase,
    FolderOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
    icon?: 'document' | 'clipboard' | 'search' | 'chart' | 'briefcase' | 'folder';
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
        disabled?: boolean;
    };
    className?: string;
}

const iconMap = {
    document: FileText,
    clipboard: ClipboardList,
    search: Search,
    chart: BarChart3,
    briefcase: Briefcase,
    folder: FolderOpen,
};

export function EmptyState({
    icon = 'folder',
    title,
    description,
    action,
    className
}: EmptyStateProps) {
    const Icon = iconMap[icon];

    return (
        <div className={cn(
            'flex flex-col items-center justify-center py-12 px-4 text-center',
            className
        )}>
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Icon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-500 max-w-sm mb-6">{description}</p>
            {action && (
                <Button
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                    {action.label}
                </Button>
            )}
        </div>
    );
}

import React from 'react';
import { Download, FileText, FileSpreadsheet, File } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DownloadButtonProps {
    url: string;
    filename: string;
}

export function DownloadButton({ url, filename }: DownloadButtonProps) {
    const getIcon = () => {
        if (filename.endsWith('.docx') || filename.endsWith('.doc')) return <FileText className="w-4 h-4" />;
        if (filename.endsWith('.xlsx') || filename.endsWith('.xls') || filename.endsWith('.csv')) return <FileSpreadsheet className="w-4 h-4" />;
        return <File className="w-4 h-4" />; // Default icon
    };

    const getLabel = () => {
        if (filename.endsWith('.docx')) return 'Word Doc';
        if (filename.endsWith('.xlsx')) return 'Excel File';
        if (filename.endsWith('.pdf')) return 'PDF Document';
        return 'File';
    };

    const handleDownload = () => {
        // Check if it's a full URL or relative path
        const downloadUrl = url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${url}`;

        // Create temporary link to trigger download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', filename); // Helper for some browsers
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="mt-3 mb-2 max-w-sm group">
            <button
                onClick={handleDownload}
                className="w-full flex items-center gap-3 p-3 text-left bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 hover:border-violet-200 dark:hover:border-violet-500/30 transition-all duration-200 shadow-sm hover:shadow"
            >
                {/* Icon Box */}
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 group-hover:scale-105 transition-transform">
                    {getIcon()}
                </div>

                {/* Text Info */}
                <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-slate-900 dark:text-white truncate">
                        {filename}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        Generated {getLabel()}
                    </div>
                </div>

                {/* Download Icon */}
                <div className="flex-shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                    <Download className="w-5 h-5" />
                </div>
            </button>
        </div>
    );
}

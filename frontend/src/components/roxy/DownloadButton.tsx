"use client";

import { Download, File, FileSpreadsheet, FileText } from "lucide-react";

interface DownloadButtonProps {
    url: string;
    filename: string;
}

export function DownloadButton({ url, filename }: DownloadButtonProps) {
    const getIcon = () => {
        if (filename.endsWith(".docx") || filename.endsWith(".doc")) return <FileText className="w-4 h-4" />;
        if (filename.endsWith(".xlsx") || filename.endsWith(".xls") || filename.endsWith(".csv"))
            return <FileSpreadsheet className="w-4 h-4" />;
        return <File className="w-4 h-4" />;
    };

    const getLabel = () => {
        if (filename.endsWith(".docx")) return "Word Doc";
        if (filename.endsWith(".xlsx")) return "Excel File";
        if (filename.endsWith(".pdf")) return "PDF Document";
        return "File";
    };

    const handleDownload = () => {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const downloadUrl = url.startsWith("http") ? url : `${apiBase}${url}`;

        const link = document.createElement("a");
        link.href = downloadUrl;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="mt-3 mb-2 max-w-sm group">
            <button
                type="button"
                onClick={handleDownload}
                className="w-full flex items-center gap-3 p-3 text-left bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-violet-200 transition-all duration-200 shadow-sm hover:shadow"
            >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600 group-hover:scale-105 transition-transform">
                    {getIcon()}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-slate-900 truncate">{filename}</div>
                    <div className="text-xs text-slate-500">Generated {getLabel()}</div>
                </div>

                <div className="flex-shrink-0 text-slate-400 group-hover:text-violet-600 transition-colors">
                    <Download className="w-5 h-5" />
                </div>
            </button>
        </div>
    );
}

import React from 'react';
import { Building2, Sparkles, Database, ShieldCheck } from 'lucide-react';

interface CompanyTransitionOverlayProps {
    companyName: string;
    isVisible: boolean;
}

export function CompanyTransitionOverlay({ companyName, isVisible }: CompanyTransitionOverlayProps) {
    if (!isVisible) return null;

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="relative">
                {/* Glow Effect */}
                <div className="absolute -inset-4 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>

                <div className="relative bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-white/10 p-10 rounded-3xl shadow-2xl flex flex-col items-center max-w-md w-full text-center transform scale-100 animate-in zoom-in-95 duration-300">

                    {/* Icon Stack */}
                    <div className="relative mb-6">
                        <div className="w-20 h-20 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center rotate-3 border border-slate-100 dark:border-white/5">
                            <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                        </div>
                        <div className="absolute inset-0 w-20 h-20 bg-violet-50 dark:bg-violet-500/10 rounded-2xl flex items-center justify-center -rotate-6 border border-violet-100 dark:border-white/10 shadow-lg backdrop-blur-sm">
                            <Database className="w-10 h-10 text-violet-500" />
                        </div>

                        {/* Floating Status Badge */}
                        <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-full ring-4 ring-white dark:ring-[#1C1C1E] animate-bounce delay-75">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-violet-800 to-slate-900 dark:from-white dark:via-violet-200 dark:to-white mb-2">
                        Switching Workspace
                    </h2>

                    <p className="text-slate-500 dark:text-slate-400 mb-6">
                        Authenticating into <span className="font-semibold text-slate-800 dark:text-white">{companyName}</span> domain...
                    </p>

                    {/* Loading Bar */}
                    <div className="w-48 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 w-1/2 animate-[loading_1s_ease-in-out_infinite]"></div>
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 font-medium">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>Syncing Knowledge Base</span>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes loading {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
            `}</style>
        </div>
    );
}

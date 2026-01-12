"use client";

import { Eye } from "lucide-react";

interface EvaluatorPerspectiveProps {
    perspective: string;
}

export function EvaluatorPerspective({ perspective }: EvaluatorPerspectiveProps) {
    if (!perspective) return null;

    return (
        <div className="bg-gray-900 rounded-xl p-6 text-white shadow-lg border border-gray-800 relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none"></div>

            <div className="flex gap-4 relative z-10">
                <div className="bg-gray-800/50 p-2.5 rounded-lg h-fit flex-shrink-0 border border-gray-700">
                    <Eye className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                    <h3 className="text-emerald-400 font-bold text-lg tracking-tight">
                        Evaluator Perspective
                    </h3>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mb-4">
                        Simulated Source Selection Board View
                    </p>
                    <div className="relative">
                        <span className="absolute -top-3 -left-4 text-4xl text-emerald-500/20 font-serif">"</span>
                        <p className="text-gray-300 leading-relaxed text-base italic pl-2">
                            {perspective}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

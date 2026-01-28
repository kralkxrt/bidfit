"use client";

import React from "react";
import {
    XCircle,
    TrendingUp,
    TrendingDown,
} from "lucide-react";
import { DimensionalScores as DimensionalScoresType } from "@/types/analysis";
import { cn } from "@/lib/utils";

interface DimensionalScoresProps {
    scores: DimensionalScoresType;
}

export function DimensionalScores({ scores }: DimensionalScoresProps) {
    const dimensions = [
        { name: "Scope Alignment", key: "scope_alignment" },
        { name: "Magnitude", key: "magnitude" },
        { name: "Complexity", key: "complexity" },
        { name: "Recency", key: "recency" },
        { name: "Quality", key: "quality" },
    ] as const;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dimensions.map((dim) => {
                const data = scores[dim.key as keyof DimensionalScoresType];
                if (!data) return null;

                const scoreColor = data.score >= 70 ? "text-emerald-600" :
                    data.score >= 40 ? "text-amber-600" : "text-red-600";

                const progressColor = data.score >= 70 ? "bg-emerald-500" :
                    data.score >= 40 ? "bg-amber-500" : "bg-red-500";

                return (
                    <div key={dim.key} className="flex flex-col h-full bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-bold text-gray-900 text-lg">{dim.name}</h3>
                            <div className={cn("text-2xl font-black", scoreColor)}>
                                {data.score}%
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mb-6">
                            <div
                                className={cn("h-full rounded-full transition-all duration-500", progressColor)}
                                style={{ width: `${data.score}%` }}
                            />
                        </div>

                        <div className="flex-grow space-y-4">
                            <div className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
                                <span className="text-gray-500 font-medium">Evaluation</span>
                                <span className={cn("font-bold", scoreColor)}>{data.label}</span>
                            </div>

                            {/* Strengths */}
                            {data.strengths?.length > 0 && (
                                <div>
                                    <h4 className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">
                                        <TrendingUp className="w-3 h-3" /> Strengths
                                    </h4>
                                    <ul className="space-y-2">
                                        {data.strengths.slice(0, 2).map((s, idx) => (
                                            <li key={idx} className="text-sm text-gray-600 pl-3 border-l-2 border-emerald-100">
                                                <span className="font-semibold text-gray-900">{s.item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Weaknesses */}
                            {data.weaknesses?.length > 0 && (
                                <div>
                                    <h4 className="flex items-center gap-1.5 text-xs font-bold text-amber-600 uppercase tracking-widest mb-2">
                                        <TrendingDown className="w-3 h-3" /> Concerns
                                    </h4>
                                    <ul className="space-y-2">
                                        {data.weaknesses.slice(0, 2).map((w, idx) => (
                                            <li key={idx} className="text-sm text-gray-600 pl-3 border-l-2 border-amber-100">
                                                <span className="font-semibold text-gray-900">{w.item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Gaps */}
                            {data.gaps?.length > 0 && (
                                <div className="bg-red-50 p-3 rounded-lg border border-red-100 mt-2">
                                    <h4 className="flex items-center gap-1.5 text-xs font-bold text-red-600 uppercase tracking-widest mb-2">
                                        <XCircle className="w-3 h-3" /> Critical Gaps
                                    </h4>
                                    <ul className="space-y-1.5">
                                        {data.gaps.map((g, idx) => (
                                            <li key={idx} className="text-xs text-red-800 font-medium flex gap-1.5">
                                                <span className="opacity-50">•</span>
                                                {g.item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

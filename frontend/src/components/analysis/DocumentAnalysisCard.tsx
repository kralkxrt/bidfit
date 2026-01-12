"use client";

import React from 'react';
import { FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { DocumentAnalysis } from '@/types/analysis';

interface DocumentAnalysisCardProps {
    documentAnalysis: DocumentAnalysis | null;
    // Pass in actual PP data to compare against requirements
    submittedReferences?: number;
    oldestReferenceYear?: number;
    largestContractValue?: number;
}

export function DocumentAnalysisCard({
    documentAnalysis,
    submittedReferences,
    oldestReferenceYear,
    largestContractValue
}: DocumentAnalysisCardProps) {
    // Don't render if not an RFP or no document analysis
    if (!documentAnalysis || documentAnalysis.document_type !== 'RFP') {
        return null;
    }

    const pp = documentAnalysis.pp_requirements;
    const eval_factors = documentAnalysis.evaluation_factors;

    // Calculate compliance flags
    const flags = [];

    // Handle references_required as either a number or {min, max} object
    const minRefsRequired = pp?.references_required && typeof pp.references_required === 'object'
        ? pp.references_required.min
        : pp?.references_required as number;
    const maxRefsRequired = pp?.references_required && typeof pp.references_required === 'object'
        ? pp.references_required.max
        : pp?.references_required as number;
    const refsDisplay = minRefsRequired && maxRefsRequired && minRefsRequired !== maxRefsRequired
        ? `${minRefsRequired}-${maxRefsRequired}`
        : minRefsRequired || 'Not specified';

    if (minRefsRequired && submittedReferences && submittedReferences < minRefsRequired) {
        flags.push({
            type: 'warning',
            message: `Section L requires ${refsDisplay} references, you have ${submittedReferences}`
        });
    }

    // Handle contract_value as either numbers or {min, max} object
    const minContractValue = pp?.contract_value && typeof pp.contract_value === 'object'
        ? pp.contract_value.min
        : pp?.min_contract_value as number;
    const maxContractValue = pp?.contract_value && typeof pp.contract_value === 'object'
        ? pp.contract_value.max
        : pp?.max_contract_value as number;

    if (minContractValue && largestContractValue && largestContractValue < minContractValue) {
        flags.push({
            type: 'warning',
            message: `Section L requires minimum $${(minContractValue / 1000000).toFixed(1)}M contract value, your largest is $${(largestContractValue / 1000000).toFixed(1)}M`
        });
    }

    if (pp?.recency_years && oldestReferenceYear) {
        const currentYear = new Date().getFullYear();
        const cutoffYear = currentYear - pp.recency_years;
        if (oldestReferenceYear < cutoffYear) {
            flags.push({
                type: 'warning',
                message: `Section L requires references within ${pp.recency_years} years (${cutoffYear}+), you have references from ${oldestReferenceYear}`
            });
        }
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
                <FileText className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-slate-900">RFP Document Analysis</h3>
                {documentAnalysis.sections_identified && (
                    <div className="flex gap-1 ml-2">
                        {documentAnalysis.sections_identified.map((sec, i) => (
                            <span key={i} className="text-[10px] uppercase font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                                {sec}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Scope Overview (Section C) */}
                {documentAnalysis.scope_overview && (
                    <div className="space-y-4 md:col-span-2">
                        <h4 className="text-sm font-semibold text-gray-900 border-b pb-2">
                            Section C - Scope Overview
                        </h4>
                        <div className="bg-slate-50 p-4 rounded-md">
                            <p className="text-sm text-gray-700 mb-2">{documentAnalysis.scope_overview.summary}</p>
                            {documentAnalysis.scope_overview.key_objectives && documentAnalysis.scope_overview.key_objectives.length > 0 && (
                                <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                                    {documentAnalysis.scope_overview.key_objectives.map((obj, i) => (
                                        <li key={i}>{obj}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}

                {/* Section L Requirements */}
                {pp && (
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Section L Compliance Requirements</h4>
                        <div className="grid grid-cols-2 gap-3">
                            {(pp.references_required || minRefsRequired) && (
                                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                    <p className="text-xs text-slate-500 mb-1">References Required</p>
                                    <p className="text-lg font-semibold text-slate-900">{refsDisplay}</p>
                                </div>
                            )}
                            {pp.recency_years && (
                                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                    <p className="text-xs text-slate-500 mb-1">Recency Period</p>
                                    <p className="text-lg font-semibold text-slate-900">{pp.recency_years} years</p>
                                </div>
                            )}
                            {(pp.contract_value || minContractValue) && (
                                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                    <p className="text-xs text-slate-500 mb-1">Contract Value Range</p>
                                    <p className="text-lg font-semibold text-slate-900">
                                        {minContractValue && maxContractValue
                                            ? `$${(minContractValue / 1000000).toFixed(1)}M - $${(maxContractValue / 1000000).toFixed(1)}M`
                                            : minContractValue
                                                ? `Min $${(minContractValue / 1000000).toFixed(1)}M`
                                                : 'Not specified'}
                                    </p>
                                </div>
                            )}
                            {pp.contract_types_preferred && (
                                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                    <p className="text-xs text-slate-500 mb-1">Contract Types</p>
                                    <p className="text-sm font-medium text-slate-900">{pp.contract_types_preferred.join(', ')}</p>
                                </div>
                            )}
                            {pp.relevancy_criteria && (
                                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 col-span-2">
                                    <p className="text-xs text-slate-500 mb-1">Relevancy Definition</p>
                                    <p className="text-sm font-medium text-slate-900 line-clamp-2" title={pp.relevancy_criteria}>{pp.relevancy_criteria}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Section M Evaluation */}
                {eval_factors && (
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Section M Evaluation Criteria</h4>
                        <div className="space-y-3">
                            {eval_factors.past_performance_weight && (
                                <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                                    <p className="text-xs text-indigo-600 mb-1 font-bold uppercase">Weighting</p>
                                    <p className="text-sm text-indigo-900 font-medium">{eval_factors.past_performance_weight}</p>
                                </div>
                            )}
                            {eval_factors.rating_scale && (
                                <div className="bg-white rounded-lg p-4 border border-slate-200">
                                    <p className="text-xs text-slate-500 mb-2 font-bold uppercase">Rating Scale</p>
                                    <div className="flex flex-wrap gap-2">
                                        {eval_factors.rating_scale.map((rating, i) => (
                                            <span key={i} className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200">
                                                {rating}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {eval_factors.key_criteria && (
                                <div className="bg-white rounded-lg p-4 border border-slate-200">
                                    <p className="text-xs text-slate-500 mb-2 font-bold uppercase">Key Success Factors</p>
                                    <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                                        {eval_factors.key_criteria.map((criteria, i) => (
                                            <li key={i}>{criteria}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Compliance Flags */}
            {flags.length > 0 && (
                <div className="mt-6 border-t border-slate-200 pt-4 animate-in fade-in slide-in-from-top-2">
                    <h4 className="text-sm font-bold text-amber-700 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Compliance Warnings
                    </h4>
                    <div className="space-y-2">
                        {flags.map((flag, i) => (
                            <div key={i} className="flex gap-3 text-sm text-amber-800 bg-amber-50 rounded-lg p-3 border border-amber-100">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>{flag.message}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Success State */}
            {flags.length === 0 && pp && (
                <div className="mt-6 border-t border-slate-200 pt-4">
                    <p className="text-sm text-emerald-700 font-medium flex items-center gap-2 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100 w-fit">
                        <CheckCircle className="w-4 h-4" />
                        Portfolio meets extracted Section L requirements
                    </p>
                </div>
            )}
        </div>
    );
}

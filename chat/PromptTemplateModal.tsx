import React, { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';

interface TemplateField {
    name: string;
    label: string;
    placeholder?: string;
}

interface PromptTemplate {
    label: string;
    prompt: string;
    fields: string[]; // Field names
}

const TEMPLATES: PromptTemplate[] = [
    {
        label: "Draft PP Narrative",
        prompt: "Draft a Past Performance Narrative for {contract_name}. Focus on relevance to {current_requirement}. Include contract value, period of performance, and key accomplishments. Target length: {page_count} pages.",
        fields: ["contract_name", "current_requirement", "page_count"]
    },
    {
        label: "Tech Approach",
        prompt: "Write a Technical Approach addressing SOW requirement: {requirement}. Demonstrate understanding, our methodology, and why our approach is low-risk. Target: {page_count} pages.",
        fields: ["requirement", "page_count"]
    },
    {
        label: "Management Plan",
        prompt: "Draft a Management Approach section covering organizational structure, key personnel roles, communication plan, QC procedures, and risk management. Contract type: {contract_type}. Target: {page_count} pages.",
        fields: ["contract_type", "page_count"]
    },
    {
        label: "Executive Summary",
        prompt: "Write an Executive Summary for {opportunity_name}. Win themes: {win_themes}. Target: 1 page.",
        fields: ["opportunity_name", "win_themes"]
    },
    {
        label: "Review Compliance",
        prompt: "Review the following text for compliance with these requirements: {requirements}. Flag any gaps or weaknesses. Suggest improvements.",
        fields: ["requirements"]
    },
    {
        label: "Strengthen Section",
        prompt: "Strengthen this section to achieve an 'Outstanding' rating. Add specifics, quantify achievements, and make discriminators obvious to evaluators.",
        fields: [] // No fields, runs on context
    },
    {
        label: "Shorten to Limit",
        prompt: "Condense the above to {page_count} pages while keeping all substantive content. Prioritize specific achievements over generic statements.",
        fields: ["page_count"]
    }
];

interface PromptTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (text: string) => void;
    baseTemplate?: PromptTemplate | null;
}

export function PromptTemplateModal({ isOpen, onClose, onGenerate, baseTemplate }: PromptTemplateModalProps) {
    const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
    const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

    useEffect(() => {
        if (baseTemplate) {
            setSelectedTemplate(baseTemplate);
            setFieldValues({});
        } else {
            setSelectedTemplate(null);
        }
    }, [baseTemplate, isOpen]);

    if (!isOpen) return null;

    const handleFieldChange = (field: string, value: string) => {
        setFieldValues(prev => ({ ...prev, [field]: value }));
    };

    const handleGenerate = () => {
        if (!selectedTemplate) return;

        let finalPrompt = selectedTemplate.prompt;
        selectedTemplate.fields.forEach(field => {
            const val = fieldValues[field] || `[${field}]`;
            finalPrompt = finalPrompt.replace(`{${field}}`, val);
        });

        onGenerate(finalPrompt);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-lg border border-white/20 dark:border-white/10 overflow-hidden transition-all scale-100">
                {/* Header */}
                <div className="px-6 py-4 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-transparent">
                    <h3 className="font-semibold text-lg flex items-center gap-2 text-slate-800 dark:text-slate-100">
                        <Sparkles className="w-5 h-5 text-blue-500" strokeWidth={1.5} />
                        {selectedTemplate ? selectedTemplate.label : "Choose Template"}
                    </h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" strokeWidth={1.5} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    {!baseTemplate && !selectedTemplate && (
                        <div className="grid grid-cols-2 gap-3">
                            {TEMPLATES.map(t => (
                                <button
                                    key={t.label}
                                    onClick={() => setSelectedTemplate(t)}
                                    className="p-3 text-left border border-black/5 dark:border-white/5 rounded-xl bg-white/50 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:border-blue-200 dark:hover:border-blue-500/30 transition-all group"
                                >
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                        {t.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {selectedTemplate && (
                        <div className="space-y-4">
                            <div className="text-sm text-slate-600 dark:text-slate-300 italic bg-slate-100/50 dark:bg-white/5 p-4 rounded-xl border border-black/5 dark:border-white/5">
                                "{selectedTemplate.prompt}"
                            </div>

                            {selectedTemplate.fields.length > 0 ? (
                                <div className="space-y-3">
                                    {selectedTemplate.fields.map(field => (
                                        <div key={field}>
                                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                                {field.replace('_', ' ')}
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-black/20 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                                                placeholder={`Enter ${field.replace('_', ' ')}...`}
                                                value={fieldValues[field] || ''}
                                                onChange={e => handleFieldChange(field, e.target.value)}
                                                autoFocus={field === selectedTemplate.fields[0]}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-600 dark:text-slate-300 text-sm">
                                    This template uses the existing conversation context. Ready to generate?
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50/50 dark:bg-white/5 border-t border-black/5 dark:border-white/5 flex justify-end gap-3 backdrop-blur-sm">
                    {selectedTemplate && !baseTemplate && (
                        <button
                            onClick={() => setSelectedTemplate(null)}
                            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg font-medium transition-colors"
                        >
                            Back
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={!selectedTemplate}
                        className="px-4 py-2 bg-[#007AFF] hover:bg-blue-600 text-white rounded-lg text-sm font-medium shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Sparkles className="w-4 h-4" />
                        Generate
                    </button>
                </div>
            </div>
        </div>
    );
}

export { TEMPLATES };

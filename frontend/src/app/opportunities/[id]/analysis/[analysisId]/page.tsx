"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ShieldAlert, Target, Award, ListChecks, CheckCircle, AlertCircle, XCircle, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { RequirementsMatrix } from "@/components/analysis/RequirementsMatrix";
import { GreenFlags } from "@/components/analysis/GreenFlags";
import { RedGaps } from "@/components/analysis/RedGaps";
import { EvaluatorPerspective } from "@/components/analysis/EvaluatorPerspective";
import { ContractAssessments } from "@/components/analysis/ContractAssessments";
import { DimensionalScores } from "@/components/analysis/DimensionalScores";
import { CompanyComplianceCard } from "@/components/analysis/CompanyComplianceCard";
import { DocumentAnalysisCard } from "@/components/analysis/DocumentAnalysisCard";
import { Analysis } from "@/types/analysis";
import { cn } from "@/lib/utils";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";

export default function AnalysisResultsPage() {
    const params = useParams();
    const router = useRouter();
    const analysisId = params.analysisId as string;
    const opportunityId = params.id as string;

    const [analysis, setAnalysis] = useState<Analysis | null>(null);
    const [opportunity, setOpportunity] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (analysisId) {
            fetchData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [analysisId, opportunityId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [analysisRes, oppRes] = await Promise.all([
                api.get(`/api/analyses/${analysisId}`),
                api.get(`/api/opportunities/${opportunityId}`)
            ]);
            setAnalysis(analysisRes.data);
            setOpportunity(oppRes.data);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = async () => {
        setIsDeleting(true);
        try {
            await api.delete(`/api/analyses/${analysisId}`);
            router.push(`/opportunities/${opportunityId}`);
        } catch (error) {
            console.error("Failed to delete analysis", error);
            setIsDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-gray-200 border-t-emerald-500 rounded-full animate-spin" />
                </div>
                <p className="text-gray-900 font-medium text-lg">Analyzing documents...</p>
                <p className="text-gray-500 text-sm">Compiling past performance evidence</p>
            </div>
        );
    }

    if (!analysis) {
        return <div className="p-8 text-center text-gray-500">Analysis not found. Check if the ID is correct.</div>;
    }

    const renderGoNoGoBadge = (status: string = "") => {
        const s = status.toUpperCase();

        if (s.includes("GO") && !s.includes("NO")) {
            return (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-100 text-emerald-700 font-semibold shadow-sm border border-emerald-200">
                    <CheckCircle className="w-5 h-5" />
                    GO
                </div>
            );
        }
        if (s.includes("CONDITIONAL")) {
            return (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-100 text-amber-700 font-semibold shadow-sm border border-amber-200">
                    <AlertCircle className="w-5 h-5" />
                    CONDITIONAL
                </div>
            );
        }
        return (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-100 text-red-700 font-semibold shadow-sm border border-red-200">
                <XCircle className="w-5 h-5" />
                NO-GO
            </div>
        );
    };

    // V1 to V2 Score Compatibility
    const score = Number(analysis.overall_relevance_score);
    const hasNumericScore = !isNaN(score);
    const displayScore = hasNumericScore ? score :
        analysis.overall_relevance_score === "VERY RELEVANT" ? 90 :
            analysis.overall_relevance_score === "RELEVANT" ? 75 :
                analysis.overall_relevance_score === "SOMEWHAT RELEVANT" ? 50 : 0;

    // V1 to V2 Requirements Compatibility
    let requirements = analysis.requirements_matrix || [];

    if ((!requirements || requirements.length === 0) && analysis.gap_matrix) {
        // Handle legacy gap_matrix (Dictionary: { Category: [Items] })
        if (typeof analysis.gap_matrix === 'object' && !Array.isArray(analysis.gap_matrix)) {
            const legacyMatrix = analysis.gap_matrix as Record<string, any[]>;
            const flatReqs: any[] = [];

            Object.entries(legacyMatrix).forEach(([category, items]) => {
                if (Array.isArray(items)) {
                    items.forEach(item => {
                        flatReqs.push({
                            req_id: item.requirement_id || "N/A",
                            requirement_text: item.text || "",
                            coverage_status: item.coverage || "UNKNOWN",
                            supporting_evidence: item.support_references || [],
                            notes: item.gap_notes || "",
                            category: category,
                            criticality: "NORMAL"
                        });
                    });
                }
            });
            requirements = flatReqs;
        } else if (Array.isArray(analysis.gap_matrix)) {
            requirements = analysis.gap_matrix;
        }
    }

    // V1 to V2 Summary Compatibility
    let summary = analysis.requirements_summary;
    if (!summary && requirements.length > 0) {
        summary = {
            total: requirements.length,
            strong: requirements.filter((r: any) => r.coverage_status === "STRONG").length,
            moderate: requirements.filter((r: any) => r.coverage_status === "MODERATE").length,
            weak: requirements.filter((r: any) => r.coverage_status === "WEAK").length,
            gap: requirements.filter((r: any) => r.coverage_status === "GAP").length,
            coverage_percentage: 0 // Calculate if needed, but UI typically assumes this exists
        };
        // Quick calc for coverage
        const weightedScore = (summary.strong * 1.0) + (summary.moderate * 0.5) + (summary.weak * 0.25);
        summary.coverage_percentage = Math.round((weightedScore / summary.total) * 100) || 0;
    } else if (!summary) {
        summary = { total: 0, strong: 0, moderate: 0, weak: 0, gap: 0, coverage_percentage: 0 };
    }

    // V1 to V2 Dimensional Scores Compatibility
    let dimensionalScores = analysis.dimensional_scores;
    if (!dimensionalScores && (analysis.scope_score || analysis.magnitude_score)) {
        const mapScore = (label?: string) => {
            const l = (label || "").toUpperCase();
            if (l.includes("HIGH")) return 90;
            if (l.includes("MEDIUM") || l.includes("MODERATE")) return 60;
            if (l.includes("LOW")) return 20;
            return 0;
        };

        dimensionalScores = {
            scope_alignment: { score: mapScore(analysis.scope_score), label: analysis.scope_score || "N/A", strengths: [], weaknesses: [], gaps: [] },
            magnitude: { score: mapScore(analysis.magnitude_score), label: analysis.magnitude_score || "N/A", strengths: [], weaknesses: [], gaps: [] },
            complexity: { score: mapScore(analysis.complexity_score), label: analysis.complexity_score || "N/A", strengths: [], weaknesses: [], gaps: [] },
            recency: { score: mapScore(analysis.recency_score), label: analysis.recency_score || "N/A", strengths: [], weaknesses: [], gaps: [] },
            quality: { score: 70, label: "Assumed Standard", strengths: [], weaknesses: [], gaps: [] } // Default if missing
        };
    }

    // V1 to V2 Contract Assessments Compatibility
    let contractAssessments = analysis.contract_assessments || [];
    if (contractAssessments.length === 0 && analysis.document_assessments && analysis.document_assessments.length > 0) {
        // Best effort mapping from document assessments
        contractAssessments = analysis.document_assessments.map((doc: any) => ({
            contract_name: doc.document_name || "Legacy Document",
            contract_number: "N/A",
            customer_agency: "Unknown Agency",
            contract_value: "Unknown",
            duration_months: 0,
            service_branch: "Joint",
            environment_match: "UNKNOWN",
            scope_match: doc.relevance_score || "UNKNOWN",
            relevance_score: doc.relevance_score?.includes("VERY") ? 90 : doc.relevance_score?.includes("SOMEWHAT") ? 50 : 70, // Rough guess
            primary_use: doc.summary || "No summary available",
            limitations: [],
            is_padding: false
        }));
    }

    // V1 to V2 Roadmap Compatibility (Strengths/Weaknesses)
    const normalizeItems = (items: any[], type: 'strength' | 'weakness') => {
        if (!items) return [];
        return items.map(item => {
            if (typeof item === 'string') {
                return type === 'strength'
                    ? { title: "Strength", evidence: item, pws_alignment: "General" }
                    : { title: "Weakness", evidence: item, risk_level: "High", mitigation: "Review requirements carefully." };
            }
            return item;
        });
    };

    const strengths = normalizeItems(analysis.strengths || [], 'strength');
    const weaknesses = normalizeItems(analysis.weaknesses || [], 'weakness');

    const scoreColor = displayScore >= 70 ? "text-emerald-700 border-emerald-500 bg-emerald-50" :
        displayScore >= 40 ? "text-amber-700 border-amber-500 bg-amber-50" :
            "text-red-700 border-red-500 bg-red-50";

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-24">
            {/* Breadcrumb */}
            <nav className="text-sm text-gray-500 mb-4 flex items-center gap-2">
                <span className="hover:text-gray-900 cursor-pointer" onClick={() => router.push('/opportunities')}>Opportunities</span>
                <span>/</span>
                <span className="hover:text-gray-900 cursor-pointer" onClick={() => router.push(`/opportunities/${opportunityId}`)}>{opportunity?.title || "Opportunity"}</span>
                <span>/</span>
                <span className="text-gray-900 font-medium">Analysis Results</span>
            </nav>

            {/* Opportunity Header Context */}
            {opportunity && (
                <div className="bg-slate-900 text-white p-6 rounded-xl shadow-sm mb-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-emerald-400 font-bold tracking-wider text-xs uppercase mb-1">Target Opportunity</div>
                            <h1 className="text-2xl font-bold mb-2">{opportunity.title}</h1>
                            <div className="flex gap-4 text-sm text-slate-300">
                                {opportunity.agency && (
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                        {opportunity.agency}
                                    </div>
                                )}
                                {opportunity.solicitation_number && (
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                        {opportunity.solicitation_number}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="destructive"
                                size="icon"
                                className="bg-red-500 hover:bg-red-600 border-red-600 text-white rounded-lg opacity-80 hover:opacity-100 transition-opacity"
                                onClick={() => setDeleteConfirmOpen(true)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="outline"
                                className="bg-transparent text-white border-slate-600 hover:bg-slate-800 hover:text-white hover:border-slate-500 transition-colors"
                                onClick={() => router.push(`/opportunities/${opportunityId}`)}
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Opportunity
                            </Button>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Header Block */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Gap Analysis Results</h1>
                        <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200">
                            Complete
                        </Badge>
                    </div>
                    <p className="text-gray-500 text-lg">Detailed assessment of past performance relevance</p>
                </div>

                <div className="flex items-center gap-6">
                    {/* Score Circle */}
                    <div className={cn(
                        "inline-flex items-center justify-center w-20 h-20 rounded-full border-4 shadow-sm flex-col leading-none",
                        scoreColor
                    )}>
                        <span className="text-2xl font-bold">{displayScore}%</span>
                        <span className="text-[10px] uppercase font-bold tracking-wide opacity-80 mt-1">Match</span>
                    </div>

                    {renderGoNoGoBadge(analysis.go_no_go_recommendation)}
                </div>
            </div>

            {/* Company Compliance Check (Phase 0) */}
            {
                analysis.company_compliance && (
                    <CompanyComplianceCard compliance={analysis.company_compliance} />
                )
            }

            {/* RFP Document Analysis (Phase 0A) */}
            {
                analysis.document_analysis && (
                    <DocumentAnalysisCard
                        documentAnalysis={analysis.document_analysis}
                        // TODO: Calculate these from `analysis.contract_assessments` or `analysis.document_assessments`
                        submittedReferences={analysis.documents_analyzed?.length || 0}
                    // oldestReferenceYear={...} 
                    // largestContractValue={...}
                    />
                )
            }

            {/* Green Flags - Key Strengths */}
            <GreenFlags strengths={strengths} />

            {/* Red Gaps - Critical Weaknesses */}
            <RedGaps weaknesses={weaknesses} />

            {/* Main Content Tabs */}
            <Tabs defaultValue="matrix" className="space-y-6">
                <TabsList className="bg-white p-1 border border-gray-200 rounded-xl w-full md:w-auto h-auto grid grid-cols-2 md:grid-cols-4 gap-2 shadow-sm">
                    <TabsTrigger value="matrix" className="rounded-lg py-2.5 px-4 font-medium data-[state=active]:bg-gray-900 data-[state=active]:text-white transition-all flex items-center justify-center gap-2">
                        <ListChecks className="w-4 h-4" /> Requirements
                    </TabsTrigger>
                    <TabsTrigger value="dimensional" className="rounded-lg py-2.5 px-4 font-medium data-[state=active]:bg-gray-900 data-[state=active]:text-white transition-all flex items-center justify-center gap-2">
                        <Award className="w-4 h-4" /> Scoring
                    </TabsTrigger>
                    <TabsTrigger value="contracts" className="rounded-lg py-2.5 px-4 font-medium data-[state=active]:bg-gray-900 data-[state=active]:text-white transition-all flex items-center justify-center gap-2">
                        <ShieldAlert className="w-4 h-4" /> Contracts
                    </TabsTrigger>
                    <TabsTrigger value="recommendations" className="rounded-lg py-2.5 px-4 font-medium data-[state=active]:bg-gray-900 data-[state=active]:text-white transition-all flex items-center justify-center gap-2">
                        <Target className="w-4 h-4" /> Roadmap
                    </TabsTrigger>
                </TabsList>

                {/* Tab: Requirements Matrix (Full Width) */}
                <TabsContent value="matrix" className="focus-visible:ring-0 outline-none">
                    <RequirementsMatrix
                        requirements={requirements as any}
                        summary={summary}
                    />
                </TabsContent>

                {/* Tab: Dimensional Scores & Perspective */}
                <TabsContent value="dimensional" className="focus-visible:ring-0 outline-none">
                    <div className="space-y-8">
                        {/* Perspective uses full width here */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-3">
                                <EvaluatorPerspective perspective={analysis.evaluator_perspective || ""} />
                            </div>
                        </div>
                        <DimensionalScores scores={dimensionalScores} />
                    </div>
                </TabsContent>

                {/* Tab: Contract Assessment */}
                <TabsContent value="contracts" className="focus-visible:ring-0 outline-none">
                    <ContractAssessments contracts={contractAssessments} />
                </TabsContent>

                {/* Tab: Strategic Recommendations */}
                <TabsContent value="recommendations" className="focus-visible:ring-0 outline-none space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="md:col-span-2 space-y-8">
                            {/* Detailed Strengths */}
                            <div className="space-y-4">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Award className="w-6 h-6 text-emerald-500" /> Key Differentiators
                                </h2>
                                <div className="space-y-4">
                                    {strengths.map((s, i) => (
                                        <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
                                            <h3 className="font-bold text-gray-900 text-lg mb-2">{s.title}</h3>
                                            <p className="text-gray-600 text-sm mb-4 font-medium leading-relaxed">"{s.evidence}"</p>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">HIGH IMPACT</Badge>
                                                {s.pws_alignment && <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Supports {s.pws_alignment}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Detailed Gaps/Mitigations */}
                            <div className="space-y-4">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <ShieldAlert className="w-6 h-6 text-orange-500" /> Critical Weaknesses
                                </h2>
                                <div className="space-y-4">
                                    {weaknesses.map((w, i) => (
                                        <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-gray-900 text-lg">{w.title}</h3>
                                                <Badge variant="destructive" className="px-2">{w.risk_level}</Badge>
                                            </div>
                                            <p className="text-gray-600 text-sm mb-4 font-medium leading-relaxed">"{w.evidence}"</p>
                                            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                                                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                    <Target className="w-3 h-3" /> Recommended Mitigation
                                                </h4>
                                                <p className="text-sm text-indigo-900 font-medium">{w.mitigation}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar / Assessment Summary */}
                        <div className="md:col-span-1 space-y-6">
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-6 sticky top-6">
                                <h3 className="font-bold text-gray-900 text-lg mb-4">Assessment Summary</h3>
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Reasoning</label>
                                        <p className="text-sm text-gray-700 leading-relaxed">
                                            {analysis.go_no_go_reasoning}
                                        </p>
                                    </div>

                                    <div className="pt-6 border-t border-gray-100">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Teaming Strategy</label>
                                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm text-gray-600 italic">
                                            "{analysis.recommendations?.teaming_suggestion || "No specific teaming required."}"
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-gray-100">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Narrative Strategy</label>
                                        <p className="text-sm text-gray-900 font-medium leading-relaxed">
                                            {analysis.recommendations?.narrative_strategy}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
            <DeleteConfirmDialog
                isOpen={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Analysis"
                description="Are you sure you want to delete this analysis permanently? This action cannot be undone."
                isDeleting={isDeleting}
            />
        </div >
    );
}

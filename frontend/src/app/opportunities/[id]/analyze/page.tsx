"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { RoxySidePanel } from "@/components/roxy/RoxySidePanel";
import { SummaryTab } from "@/components/analyze/SummaryTab";
import { DocumentsTab } from "@/components/documents/DocumentsTab";
import { GapAnalysisTab } from "@/components/analyze/GapAnalysisTab";
import { ComplianceMatrixTab } from "@/components/analyze/ComplianceMatrixTab";
import type { Citation } from "@/lib/roxyApi";

export default function OpportunityAnalyzePage() {
    const params = useParams();
    const opportunityId = params.id as string;
    const [activeTab, setActiveTab] = useState("summary");
    const [highlightedCitation, setHighlightedCitation] = useState<Citation | null>(null);

    const handleCitationClick = (citation: Citation) => {
        setHighlightedCitation(citation);
        setActiveTab("documents");
    };

    const breadcrumbItems = useMemo(
        () => [
            { label: "Opportunities", href: "/opportunities" },
            { label: "Analyze" },
        ],
        []
    );

    const roxyTab = activeTab === "documents" ? "documents" : activeTab === "gap-analysis" ? "analysis" : "requirements";

    return (
        <div className="flex flex-col h-full p-6">
            <div className="flex flex-col flex-1 min-h-0 bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
                <Breadcrumb items={breadcrumbItems} />

                <div className="flex-1 flex flex-col lg:flex-row min-h-0">
                    <div className="w-full lg:w-[60%] flex flex-col bg-white">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
                            <TabsList className="bg-transparent border-b border-slate-200 w-full justify-start gap-0 h-auto p-0">
                                <TabsTrigger
                                    value="summary"
                                    className="px-4 py-3 text-sm font-medium text-slate-500 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent"
                                >
                                    Summary
                                </TabsTrigger>
                                <TabsTrigger
                                    value="documents"
                                    className="px-4 py-3 text-sm font-medium text-slate-500 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent"
                                >
                                    Documents
                                </TabsTrigger>
                                <TabsTrigger
                                    value="gap-analysis"
                                    className="px-4 py-3 text-sm font-medium text-slate-500 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent"
                                >
                                    Gap Analysis
                                </TabsTrigger>
                                <TabsTrigger
                                    value="compliance-matrix"
                                    className="px-4 py-3 text-sm font-medium text-slate-500 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent"
                                >
                                    Compliance Matrix
                                </TabsTrigger>
                            </TabsList>

                            <div className="flex-1 overflow-auto">
                                <TabsContent value="summary" className="h-full m-0">
                                    <SummaryTab opportunityId={opportunityId} />
                                </TabsContent>

                                <TabsContent value="documents" className="h-full m-0">
                                    <DocumentsTab
                                        opportunityId={opportunityId}
                                        highlightedCitation={highlightedCitation}
                                        onClearHighlight={() => setHighlightedCitation(null)}
                                    />
                                </TabsContent>

                                <TabsContent value="gap-analysis" className="h-full m-0">
                                    <GapAnalysisTab opportunityId={opportunityId} />
                                </TabsContent>

                                <TabsContent value="compliance-matrix" className="h-full m-0">
                                    <ComplianceMatrixTab opportunityId={opportunityId} />
                                </TabsContent>
                            </div>
                        </Tabs>
                    </div>

                    <div className="w-full lg:w-[40%] flex flex-col bg-white lg:border-l border-slate-200">
                        <RoxySidePanel
                            opportunityId={opportunityId}
                            currentTab={roxyTab}
                            onCitationClick={handleCitationClick}
                            isMinimized={false}
                            onToggleMinimize={() => {}}
                            highlightedCitation={highlightedCitation}
                            allowMinimize={false}
                            layout="full"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

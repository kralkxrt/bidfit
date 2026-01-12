"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { FileText, FolderOpen, BarChart3, ArrowRight } from "lucide-react";
import { useCompanyStore } from "@/store/useCompanyStore";
import api from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PipelineView } from "@/components/dashboard/PipelineView";
import { Opportunity, PipelineStage, PipelineSummary } from "@/types/opportunity";

interface Stats {
  documents: number;
  opportunities: number;
  analyses: number;
}

interface RecentAnalysis {
  id: string;
  opportunity_id: string;
  overall_relevance_score: string;
  go_no_go_recommendation: string;
  created_at: string;
  opportunity_title?: string;
}

export default function Home() {
  const { selectedCompanyId } = useCompanyStore();
  const [stats, setStats] = useState<Stats>({ documents: 0, opportunities: 0, analyses: 0 });
  const [recentAnalyses, setRecentAnalyses] = useState<RecentAnalysis[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [pipelineSummary, setPipelineSummary] = useState<PipelineSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchDashboardData();
    }
  }, [selectedCompanyId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const isAllCompanies = selectedCompanyId === "all";
      let docsRes, oppsRes, analysesRes;

      if (isAllCompanies) {
        // Fetch all data across all companies
        const [allDocs, allOpps, allAnalyses] = await Promise.all([
          api.get("/api/documents/"),
          api.get("/api/opportunities/?is_hidden=true"),
          api.get("/api/analyses/"),
        ]);
        docsRes = allDocs;
        oppsRes = allOpps;
        analysesRes = allAnalyses;
      } else {
        const [companyDocs, companyOpps, summary] = await Promise.all([
          api.get(`/api/documents/?company_id=${selectedCompanyId}`),
          api.get(`/api/opportunities/?company_id=${selectedCompanyId}&is_hidden=true`),
          api.get(`/api/opportunities/pipeline-summary?company_id=${selectedCompanyId}`)
        ]);
        docsRes = companyDocs;
        oppsRes = companyOpps;

        // We no longer fetch ALL analyses here for performance
        // Only fetch recent ones for the "Recent Analyses" card if needed, or rely on a separate endpoint
        // For stats, we might need a count. The analysis count can be fetched separately or we assume
        // the user wants to see *completed* analyses count.
        // Let's fetch just the count or a lightweight list.
        // Actually, for stats, we need the count. Let's keep the analyses call BUT limit it or use a count endpoint eventually.
        // For now, let's just fetch the recent ones for the card, and count from opportunities if possible?
        // No, analyses count is distinct. 
        // OPTIMIZATION: Just fetch the recent 5 analyses for the widget.
        // And for the stats count, we can perhaps get it from a new endpoint /stats
        // But to avoid too many backend changes right now, let's just fetch the recent ones.
        // Wait, stats card needs total count.
        // Let's rely on api.get("/api/analyses/") but maybe we can optimize it later.
        // CRITICAL FIX: The "stuck" issue is likely because we were processing ALL analyses in JS.
        // With the new backend change, oppsRes HAS the analysis data.

        // Let's fetch analyses just for the stats count and recent list (limit=50 maybe?)
        // Or better, let's disable the full analyses fetch and just get recent.
        const recentAnalysesRes = await api.get("/api/analyses/?limit=10"); // Assuming we add limit support or just fetch all if small
        analysesRes = recentAnalysesRes;

        setPipelineSummary(summary.data);
      }

      setStats({
        documents: docsRes.data.length,
        opportunities: oppsRes.data.length,
        analyses: analysesRes.data.length, // This might be inaccurate if we limit, but fast.
      });

      // Set opportunities directly - they now contain latest_analysis from backend!
      setOpportunities(oppsRes.data);

      // Recent analyses logic
      const recent = analysesRes.data.slice(0, 5);
      const analysesWithTitles = await Promise.all(
        recent.map(async (analysis: RecentAnalysis) => {
          try {
            // Check if we already have this opp details in opportunities state to avoid call
            const knownOpp = oppsRes.data.find((o: any) => o.id === analysis.opportunity_id);
            if (knownOpp) return { ...analysis, opportunity_title: knownOpp.title };

            const oppRes = await api.get(`/api/opportunities/${analysis.opportunity_id}`);
            return { ...analysis, opportunity_title: oppRes.data.title };
          } catch {
            return { ...analysis, opportunity_title: "Unknown" };
          }
        })
      );
      setRecentAnalyses(analysesWithTitles);

    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  // Pipeline Handlers
  const handleStageChange = async (opportunityId: string, newStage: PipelineStage) => {
    try {
      // Optimistic Update
      setOpportunities(prev => prev.map(opp =>
        opp.id === opportunityId ? { ...opp, pipeline_stage: newStage } : opp
      ));

      await api.patch(`/api/opportunities/${opportunityId}/stage`, { stage: newStage });
    } catch (error) {
      console.error("Failed to update stage", error);
      fetchDashboardData();
    }
  };

  const handleHide = async (opportunityId: string, isNoBid: boolean, reason?: string) => {
    try {
      await api.patch(`/api/opportunities/${opportunityId}/hide`, { is_no_bid: isNoBid, reason });
      fetchDashboardData();
    } catch (error) {
      console.error("Failed to hide", error);
    }
  };

  const handleRestore = async (opportunityId: string) => {
    try {
      await api.patch(`/api/opportunities/${opportunityId}/restore`);
      fetchDashboardData();
    } catch (error) {
      console.error("Failed to restore", error);
    }
  };

  const handleToggleFavorite = async (opportunityId: string) => {
    try {
      setOpportunities(prev => prev.map(opp =>
        opp.id === opportunityId ? { ...opp, is_favorite: !opp.is_favorite } : opp
      ));
      await api.patch(`/api/opportunities/${opportunityId}/favorite`);
    } catch (error) {
      console.error("Failed to toggle favorite", error);
    }
  };

  const getScoreBadge = (score: string) => {
    // ... existing logic ...
    const numScore = parseFloat(score);
    if (!isNaN(numScore)) {
      if (numScore >= 80) return <Badge className="bg-emerald-600 text-xs hover:bg-emerald-700">Very Relevant</Badge>;
      if (numScore >= 60) return <Badge className="bg-emerald-500 text-xs hover:bg-emerald-600">Relevant</Badge>;
      if (numScore >= 40) return <Badge className="bg-amber-600 text-xs hover:bg-amber-700">Somewhat Relevant</Badge>;
      return <Badge className="bg-red-600 text-xs hover:bg-red-700">Not Relevant</Badge>;
    }
    if (score?.includes("VERY RELEVANT")) return <Badge className="bg-emerald-600 text-xs hover:bg-emerald-700">Very Relevant</Badge>;
    if (score?.includes("RELEVANT")) return <Badge className="bg-emerald-500 text-xs hover:bg-emerald-600">Relevant</Badge>;
    if (score?.includes("SOMEWHAT")) return <Badge className="bg-amber-600 text-xs hover:bg-amber-700">Somewhat</Badge>;
    return <Badge className="bg-red-600 text-xs hover:bg-red-700">Not Relevant</Badge>;
  };

  if (!selectedCompanyId) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Select a company to begin.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your gap analysis activity</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ... Keep existing cards ... */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.documents}</div>
            <p className="text-xs text-muted-foreground">Past performance references</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opportunities</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.opportunities}</div>
            <p className="text-xs text-muted-foreground">Active pursuits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Analyses</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.analyses}</div>
            <p className="text-xs text-muted-foreground">Gap analyses completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline View */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Pipeline</h2>
        {loading ? (
          <div className="h-64 flex items-center justify-center border rounded-xl bg-gray-50">Loading pipeline...</div>
        ) : (
          <PipelineView
            opportunities={opportunities}
            summary={pipelineSummary}
            onStageChange={handleStageChange}
            onHide={handleHide}
            onRestore={handleRestore}
            onToggleFavorite={handleToggleFavorite}
            onRefresh={fetchDashboardData}
          />
        )}
      </div>

      {/* Recent Analyses (Keep at bottom) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Analyses</CardTitle>
              <CardDescription>Your latest gap analysis results</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/analyses">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">Loading...</div>
          ) : recentAnalyses.length === 0 ? (
            <div className="text-center py-8">
              <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No analyses yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Run your first gap analysis to see results here.
              </p>
              <Button asChild>
                <Link href="/opportunities">Go to Opportunities</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAnalyses.map((analysis) => (
                <Link
                  key={analysis.id}
                  href={`/opportunities/${analysis.opportunity_id}/analysis/${analysis.id}`}
                  className="flex items-center justify-between p-3 border rounded-md hover:bg-muted transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium">{analysis.opportunity_title}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(analysis.created_at), "MMM d, yyyy")}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getScoreBadge(analysis.overall_relevance_score)}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

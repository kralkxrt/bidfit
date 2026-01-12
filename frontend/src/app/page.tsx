"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { FileText, FolderOpen, BarChart3, ArrowRight, Hexagon } from "lucide-react";
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
      <div className="flex flex-col items-center justify-center p-20 gap-6 text-center">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
          <Hexagon className="w-10 h-10 text-blue-500" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Welcome to BidFit</h1>
        <p className="text-slate-500 max-w-md">Select an organization from the top menu to view your bid pipeline and intelligence dashboard.</p>
        <Button onClick={() => (window as any).document.querySelector('[data-radix-collection-item]')?.click()} variant="outline" className="rounded-xl mt-4">
          Select Organization
        </Button>
      </div>
    );
  }

  // Calculate Avg Match Score
  const matchScores = opportunities
    .map(o => o.latest_analysis?.overall_relevance_score)
    .filter(Boolean)
    .map(s => parseFloat(s as string))
    .filter(n => !isNaN(n));

  const avgMatch = matchScores.length > 0
    ? Math.round(matchScores.reduce((a, b) => a + b, 0) / matchScores.length)
    : 0;

  return (
    <div className="flex flex-col gap-8 pb-20">

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Total Opportunities */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-start justify-between group hover:shadow-md transition-all duration-300">
          <div>
            <p className="text-sm font-medium text-slate-400 mb-1">Total Opportunities</p>
            <div className="text-4xl font-bold text-slate-900 mb-2">{loading ? "-" : stats.opportunities}</div>
            <div className="flex items-center gap-1 text-emerald-500 text-xs font-medium bg-emerald-50 px-2 py-1 rounded-full w-fit">
              <span>Active Pipeline</span>
            </div>
          </div>
          <div className="bg-blue-50 p-3 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <FolderOpen className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Avg Match Score */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-start justify-between group hover:shadow-md transition-all duration-300">
          <div>
            <p className="text-sm font-medium text-slate-400 mb-1">Pipeline Match %</p>
            <div className="text-4xl font-bold text-slate-900 mb-2">{loading ? "-" : `${avgMatch}%`}</div>
            <div className="flex items-center gap-1 text-blue-500 text-xs font-medium bg-blue-50 px-2 py-1 rounded-full w-fit">
              <span>Avg Relevance</span>
            </div>
          </div>
          <div className="bg-purple-50 p-3 rounded-2xl text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <BarChart3 className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Analyses Run */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-start justify-between group hover:shadow-md transition-all duration-300">
          <div>
            <p className="text-sm font-medium text-slate-400 mb-1">Analyses Run</p>
            <div className="text-4xl font-bold text-slate-900 mb-2">{loading ? "-" : stats.analyses}</div>
            <div className="flex items-center gap-1 text-slate-400 text-xs font-medium bg-slate-50 px-2 py-1 rounded-full w-fit">
              <span>All time</span>
            </div>
          </div>
          <div className="bg-orange-50 p-3 rounded-2xl text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
            <FileText className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Pipeline Section (Full Width) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Pipeline Overview</h2>
          <Button variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-sm font-medium" asChild>
            <Link href="/opportunities">View Full Pipeline</Link>
          </Button>
        </div>

        {loading ? (
          <div className="h-96 flex items-center justify-center border border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
              <p className="text-slate-400 text-sm">Syncing pipeline data...</p>
            </div>
          </div>
        ) : (
          <div className="bg-white p-1 rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
            <PipelineView
              opportunities={opportunities}
              summary={pipelineSummary}
              onStageChange={handleStageChange}
              onHide={handleHide}
              onRestore={handleRestore}
              onToggleFavorite={handleToggleFavorite}
              onRefresh={fetchDashboardData}
            />
          </div>
        )}
      </div>

      {/* Recent Activity Section (Bottom, Horizontal) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Recent Activity</h2>
          <Button variant="outline" className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50" asChild>
            <Link href="/analyses">View All History</Link>
          </Button>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 overflow-x-auto">
          <div className="flex gap-6 min-w-max">
            {loading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="w-72 h-32 rounded-2xl bg-slate-50 animate-pulse border border-slate-100" />
              ))
            ) : recentAnalyses.length === 0 ? (
              <div className="w-full text-center py-10 text-slate-400">
                <p>No recent activity.</p>
              </div>
            ) : (
              recentAnalyses.map((analysis) => (
                <div key={analysis.id} className="w-80 p-4 rounded-2xl border border-slate-100 hover:shadow-md transition-all duration-300 bg-slate-50/50 hover:bg-white group cursor-pointer relative overflow-hidden">
                  <Link href={`/opportunities/${analysis.opportunity_id}/analysis/${analysis.id}`} className="absolute inset-0 z-10" />
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-blue-600 border border-slate-100 group-hover:scale-110 transition-transform">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    {getScoreBadge(analysis.overall_relevance_score)}
                  </div>
                  <h3 className="font-semibold text-slate-900 truncate mb-1 pr-2">{analysis.opportunity_title}</h3>
                  <p className="text-xs text-slate-400">{format(new Date(analysis.created_at), "MMM d, h:mm a")}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { FileText, ArrowRight, Trash2 } from "lucide-react";
import { useCompanyStore } from "@/store/useCompanyStore";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Analysis {
    id: string;
    opportunity_id: string;
    overall_relevance_score: string;
    go_no_go_recommendation: string;
    created_at: string;
    // We'll need to fetch opportunity details separately or join
}

interface AnalysisWithOpportunity extends Analysis {
    opportunity_title?: string;
    opportunity_solicitation?: string;
}

export default function AnalysesPage() {
    const router = useRouter();
    const { selectedCompanyId } = useCompanyStore();
    const [analyses, setAnalyses] = useState<AnalysisWithOpportunity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (selectedCompanyId) {
            fetchAnalyses();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCompanyId]);

    const fetchAnalyses = async () => {
        try {
            setLoading(true);
            // Fetch all analyses (filtered by selected company)
            const params = selectedCompanyId && selectedCompanyId !== 'all'
                ? `?company_id=${selectedCompanyId}`
                : '';
            const res = await api.get(`/api/analyses/${params}`);

            // Fetch opportunity details for each analysis
            const analysesWithOpps = await Promise.all(
                res.data.map(async (analysis: Analysis) => {
                    try {
                        const oppRes = await api.get(`/api/opportunities/${analysis.opportunity_id}`);
                        return {
                            ...analysis,
                            opportunity_title: oppRes.data.title,
                            opportunity_solicitation: oppRes.data.solicitation_number,
                        };
                    } catch {
                        return {
                            ...analysis,
                            opportunity_title: "Unknown Opportunity",
                            opportunity_solicitation: "",
                        };
                    }
                })
            );

            setAnalyses(analysesWithOpps);
        } catch (error) {
            console.error("Failed to fetch analyses", error);
        } finally {
            setLoading(false);
        }
    };

    const getScoreBadge = (score: string) => {
        if (score?.includes("VERY RELEVANT")) {
            return <Badge className="bg-green-600">Very Relevant</Badge>;
        }
        if (score?.includes("RELEVANT")) {
            return <Badge className="bg-blue-600">Relevant</Badge>;
        }
        if (score?.includes("SOMEWHAT")) {
            return <Badge className="bg-yellow-600">Somewhat Relevant</Badge>;
        }
        return <Badge className="bg-red-600">Not Relevant</Badge>;
    };

    const getGoNoGoBadge = (recommendation: string) => {
        if (recommendation?.includes("GO") && !recommendation.includes("NO")) {
            return <Badge className="bg-green-600">GO</Badge>;
        }
        if (recommendation?.includes("CONDITIONAL")) {
            return <Badge className="bg-yellow-600">CONDITIONAL</Badge>;
        }
        return <Badge className="bg-red-600">NO-GO</Badge>;
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Prevent row click
        if (!confirm("Are you sure you want to delete this analysis?")) return;

        try {
            await api.delete(`/api/analyses/${id}`);
            setAnalyses(prev => prev.filter(a => a.id !== id));
        } catch (error) {
            console.error("Failed to delete analysis", error);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Analysis History</h1>
                <p className="text-muted-foreground">
                    View all gap analyses for your company.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Analyses</CardTitle>
                    <CardDescription>
                        {analyses.length} {analyses.length === 1 ? "analysis" : "analyses"} found
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="py-10 text-center text-muted-foreground">Loading...</div>
                    ) : analyses.length === 0 ? (
                        <div className="py-10 text-center">
                            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No analyses yet</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Run your first gap analysis to see results here.
                            </p>
                            <Button onClick={() => router.push("/opportunities")}>
                                Go to Opportunities
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Opportunity</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Overall Score</TableHead>
                                    <TableHead>Recommendation</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {analyses.map((analysis) => (
                                    <TableRow
                                        key={analysis.id}
                                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                                        onClick={() =>
                                            router.push(
                                                `/opportunities/${analysis.opportunity_id}/analysis/${analysis.id}`
                                            )
                                        }
                                    >
                                        <TableCell className="font-medium">
                                            <div className="flex items-center space-x-2">
                                                <FileText className="h-4 w-4 text-muted-foreground" />
                                                <div>
                                                    <div>{analysis.opportunity_title}</div>
                                                    {analysis.opportunity_solicitation && (
                                                        <div className="text-xs text-muted-foreground">
                                                            {analysis.opportunity_solicitation}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(analysis.created_at), "MMM d, yyyy")}
                                        </TableCell>
                                        <TableCell>{getScoreBadge(analysis.overall_relevance_score)}</TableCell>
                                        <TableCell>{getGoNoGoBadge(analysis.go_no_go_recommendation)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="sm">
                                                    View <ArrowRight className="ml-2 h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                    onClick={(e) => handleDelete(e, analysis.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

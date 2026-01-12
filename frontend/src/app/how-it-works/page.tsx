"use client";

import Link from "next/link";
import {
    CheckCircle2,
    Search,
    BarChart3,
    FileText,
    Scale,
    UserCheck,
    AlertTriangle,
    ShieldAlert,
    Clock,
    Target,
    Database,
    Briefcase,
    Building2,
    ArrowRight,
    HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HowItWorksPage() {
    return (
        <div className="flex flex-col min-h-screen pb-20">
            {/* Hero Section */}
            <div className="bg-slate-50 border-b border-slate-200 py-20 px-6 sm:px-12 text-center">
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-4">
                        <HelpCircle className="w-4 h-4" />
                        <span>Methodology Explained</span>
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
                        Stop Guessing. <span className="text-blue-600">Start Winning.</span>
                    </h1>
                    <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                        BidFit performs the same rigorous analysis that government evaluators conduct—before you submit. Eliminate guesswork and validate your win strategy.
                    </p>
                    <div className="pt-4">
                        <Link href="/documents">
                            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 h-12 text-base">
                                Start Your Analysis
                                <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Section 1: The Problem */}
            <div className="py-20 px-6 sm:px-12 bg-white">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">The Problem We Solve</h2>
                        <p className="text-lg text-slate-600">
                            Manual gap analysis is slow, subjective, and prone to costly errors.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <ProblemCard
                            icon={<Clock className="w-8 h-8 text-orange-500" />}
                            title="Time Consuming"
                            description="Spending hours reading PWS documents and manually cross-referencing past contracts."
                        />
                        <ProblemCard
                            icon={<Target className="w-8 h-8 text-red-500" />}
                            title="Subjective Claims"
                            description="Overclaiming relevance based on interpretation rather than evidence, leading to weak scores."
                        />
                        <ProblemCard
                            icon={<ShieldAlert className="w-8 h-8 text-yellow-500" />}
                            title="Blind Spots"
                            description="Missing crucial requirements buried deep in the solicitation that disqualify you later."
                        />
                    </div>
                </div>
            </div>

            {/* Section 2: The Analysis Process */}
            <div className="py-20 px-6 sm:px-12 bg-slate-50 border-y border-slate-200">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">How BidFit Works</h2>
                        <p className="text-lg text-slate-600">
                            Our 6-step deep analysis process simulates a GS-15 evaluator's review.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <ProcessStep
                            number="1"
                            icon={<Building2 className="w-6 h-6" />}
                            title="Company Qualification"
                            description="Checks set-asides, clearances, vehicles, and NAICS codes first. If you're disqualified, you'll know immediately."
                        />
                        <ProcessStep
                            number="2"
                            icon={<Search className="w-6 h-6" />}
                            title="Deep Extraction"
                            description="Extracts 25-40 specific requirements: personnel, technical systems, compliance, deliverables, and metrics."
                        />
                        <ProcessStep
                            number="3"
                            icon={<Scale className="w-6 h-6" />}
                            title="Evidence Mapping"
                            description="Maps requirements to your past performance with brutal honesty. Strong, Moderate, Weak, or Gap."
                        />
                        <ProcessStep
                            number="4"
                            icon={<FileText className="w-6 h-6" />}
                            title="Contract Assessment"
                            description="Evaluates each contract for agency match, scope alignment % coverage, duration, and recency."
                        />
                        <ProcessStep
                            number="5"
                            icon={<BarChart3 className="w-6 h-6" />}
                            title="Dimensional Scoring"
                            description="Scores based on Scope, Magnitude, Complexity, Recency, and Quality (CPARS)."
                        />
                        <ProcessStep
                            number="6"
                            icon={<UserCheck className="w-6 h-6" />}
                            title="Evaluator Perspective"
                            description="Provides a candid narrative from a simulated evaluator's viewpoint, highlighting weaknesses."
                        />
                    </div>
                </div>
            </div>

            {/* Section 3: The Rules */}
            <div className="py-20 px-6 sm:px-12 bg-white">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">Hard-Coded Skepticism</h2>
                        <p className="text-lg text-slate-600">
                            We built BidFit to be tough. Here are the rules that keep our analysis trustworthy.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <RuleCard
                            title="Customer Mismatch Rule"
                            content="If your past performance is Army and the opportunity is Navy, we verify it. Different cultures, different systems."
                        />
                        <RuleCard
                            title="'Similar To' Detection"
                            content="When you say 'similar to' or 'like', we rate it WEAK or MODERATE. Evaluators want direct experience, not approximations."
                        />
                        <RuleCard
                            title="Short Duration Flag"
                            content="Contracts under 12 months are flagged. Seven months of performance isn't the same as five years of track record."
                        />
                        <RuleCard
                            title="Facts vs. Claims"
                            content="We distinguish between verifiable facts (contract numbers, dates) and unverifiable marketing claims."
                        />
                    </div>
                </div>
            </div>

            {/* Section 4: What You Get */}
            <div className="py-20 px-6 sm:px-12 bg-slate-50 border-y border-slate-200">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">Deliverables You Can Use</h2>
                        <p className="text-lg text-slate-600">
                            Actionable intelligence to improve your proposal or make a No-Go decision.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 text-center">
                        <FeatureCard
                            title="Compliance Matrix"
                            description="A complete breakdown of every PWS requirement and your coverage status. Exportable to Word."
                        />
                        <FeatureCard
                            title="Red Flags Report"
                            description="Explicit warnings about what NOT to claim in your proposal to avoid losing trust."
                        />
                        <FeatureCard
                            title="Go/No-Go Decision"
                            description="A data-driven recommendation: GO (strong), CONDITIONAL (needs partners), or NO-GO."
                        />
                    </div>
                </div>
            </div>

            {/* Section 5: The Data (Simple footer-like section) */}
            <div className="py-20 px-6 sm:px-12 bg-white text-center">
                <div className="max-w-3xl mx-auto space-y-8">
                    <h2 className="text-3xl font-bold text-slate-900">Powered By Your Data</h2>
                    <div className="flex flex-wrap justify-center gap-4 text-slate-600 font-medium">
                        <span className="bg-slate-100 px-4 py-2 rounded-full">Organization Profile</span>
                        <span className="bg-slate-100 px-4 py-2 rounded-full">Past Performance Library</span>
                        <span className="bg-slate-100 px-4 py-2 rounded-full">CPARS Ratings</span>
                        <span className="bg-slate-100 px-4 py-2 rounded-full">Opportunity Intelligence</span>
                    </div>
                </div>
            </div>

            {/* CTA */}
            <div className="bg-blue-600 py-20 px-6 text-center text-white">
                <div className="max-w-2xl mx-auto space-y-6">
                    <h2 className="text-3xl sm:text-4xl font-bold">Ready to validate your next bid?</h2>
                    <p className="text-blue-100 text-lg">
                        Upload your first PWS and see exactly where you stand.
                    </p>
                    <div className="pt-4">
                        <Link href="/documents">
                            <Button size="lg" className="bg-white text-blue-600 hover:bg-slate-100 font-bold px-8 h-12 text-base shadow-lg">
                                Get Started
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

        </div>
    );
}

// Sub-components

function ProblemCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <Card className="border-none shadow-sm bg-slate-50/50">
            <CardHeader className="pb-2">
                <div className="mb-4 bg-white p-3 w-fit rounded-xl shadow-sm border border-slate-100">
                    {icon}
                </div>
                <CardTitle className="text-xl font-bold text-slate-900">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-slate-600 leading-relaxed">{description}</p>
            </CardContent>
        </Card>
    )
}

function ProcessStep({ number, icon, title, description }: { number: string, icon: React.ReactNode, title: string, description: string }) {
    return (
        <Card className="relative overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <span className="text-8xl font-black text-slate-900">{number}</span>
            </div>
            <CardHeader className="pb-2">
                <div className="flex items-center gap-3 mb-2">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                        {icon}
                    </div>
                </div>
                <CardTitle className="text-lg font-bold text-slate-900">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
            </CardContent>
        </Card>
    );
}

function RuleCard({ title, content }: { title: string, content: string }) {
    return (
        <div className="flex gap-4 p-6 bg-slate-50 border border-slate-100 rounded-xl">
            <div className="shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div>
                <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{content}</p>
            </div>
        </div>
    );
}

function FeatureCard({ title, description }: { title: string, description: string }) {
    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-3 text-lg">{title}</h3>
            <p className="text-slate-600">{description}</p>
        </div>
    )
}

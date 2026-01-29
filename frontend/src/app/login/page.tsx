"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { BidWinLogo } from "@/components/layout/BidWinLogo";

export default function LoginPage() {
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            // Demoware/MVP login - accepts any input for now
            const res = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });

            if (res.ok) {
                router.push("/");
                router.refresh();
            } else {
                setError("Failed to enter");
            }
        } catch {
            setError("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
            <Card className="w-full max-w-md shadow-xl border-slate-200/60 bg-white/80 backdrop-blur-sm">
                <CardHeader className="space-y-2 text-center pb-8 pt-8">
                    <div className="flex flex-col items-center">
                        <div className="mb-6 group-hover:scale-105 transition-transform duration-300">
                            <BidWinLogo className="h-16 w-auto" />
                        </div>
                        <p className="text-slate-500 font-medium text-sm mt-2 max-w-xs mx-auto">
                            AI-Powered RFP Analysis for Government Contractors
                        </p>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@company.com"
                                    className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <LinkRow label="Password" href="#" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium border border-red-100 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base shadow-md shadow-blue-600/10 transition-all hover:shadow-lg hover:shadow-blue-600/20"
                            disabled={loading}
                        >
                            {loading ? "Signing in..." : "Sign in to Dashboard"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col items-center gap-4 pt-2 pb-8 border-t border-slate-100 mt-2">
                    <p className="text-sm text-slate-500">
                        Don&apos;t have an account?{" "}
                        <a href="#" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                            Contact Sales
                        </a>
                    </p>
                    <div className="text-xs text-slate-400 font-mono">
                        v1.0.2
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}

function LinkRow({ label, href }: { label: string; href: string }) {
    return (
        <div className="flex items-center justify-between">
            <Label htmlFor="password">{label}</Label>
            <a
                href={href}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
                Forgot password?
            </a>
        </div>
    );
}

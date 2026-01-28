import {
    AlertTriangle,
    CheckCircle2,
    XCircle,
    ShieldAlert,
    MinusCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ComplianceFlag {
    field: string;
    requirement: string;
    company_value: string;
    status: 'COMPLIANT' | 'GAP' | 'WEAKNESS' | 'FLAG';
    note: string;
}

interface CompanyCompliance {
    qualification_status: 'QUALIFIED' | 'CONDITIONAL' | 'DISQUALIFIED';
    disqualifiers: string[];
    compliance_flags: ComplianceFlag[];
}

interface CompanyComplianceCardProps {
    compliance: CompanyCompliance;
}

export function CompanyComplianceCard({ compliance }: CompanyComplianceCardProps) {
    if (!compliance) return null;

    const { qualification_status, disqualifiers, compliance_flags } = compliance;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'QUALIFIED': return 'bg-green-100 text-green-800 border-green-200';
            case 'CONDITIONAL': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'DISQUALIFIED': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    const getFlagIcon = (status: string) => {
        switch (status) {
            case 'COMPLIANT': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
            case 'GAP': return <XCircle className="w-4 h-4 text-red-600" />;
            case 'WEAKNESS': return <MinusCircle className="w-4 h-4 text-orange-500" />;
            default: return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
        }
    };

    return (
        <Card
            className={cn(
                "border-slate-200 shadow-sm border-l-4",
                qualification_status === 'QUALIFIED' ? "border-l-green-500" :
                    qualification_status === 'DISQUALIFIED' ? "border-l-red-500" :
                        "border-l-yellow-500"
            )}
        >
            <CardHeader className="p-5 pb-3">
                <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <ShieldAlert className="w-5 h-5" />
                        Company Qualification Check
                    </CardTitle>
                    <Badge variant="outline" className={cn("font-bold", getStatusColor(qualification_status))}>
                        {qualification_status}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">

                {/* Disqualifiers Banner */}
                {disqualifiers && disqualifiers.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <h4 className="font-semibold text-red-800 text-sm mb-1 flex items-center gap-2">
                            <XCircle className="w-4 h-4" /> Disqualifiers Found
                        </h4>
                        <ul className="list-disc list-inside text-sm text-red-700">
                            {disqualifiers.map((d, i) => (
                                <li key={i}>{d}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Compliance Flags Table */}
                <div className="rounded-md border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-3 py-2 text-left font-medium text-slate-600">Requirement</th>
                                <th className="px-3 py-2 text-left font-medium text-slate-600">Company Status</th>
                                <th className="px-3 py-2 text-left font-medium text-slate-600">Assessment</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {compliance_flags?.map((flag, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50">
                                    <td className="px-3 py-2 align-top text-slate-700 font-medium">
                                        {flag.requirement}
                                        <div className="text-xs text-slate-400 font-normal">{flag.field}</div>
                                    </td>
                                    <td className="px-3 py-2 align-top text-slate-600">
                                        {flag.company_value || 'None'}
                                    </td>
                                    <td className="px-3 py-2 align-top">
                                        <div className="flex items-start gap-2">
                                            <div className="mt-0.5">{getFlagIcon(flag.status)}</div>
                                            <div className="text-slate-700">
                                                <span className={cn("font-medium text-xs",
                                                    flag.status === 'GAP' ? "text-red-700" :
                                                        flag.status === 'COMPLIANT' ? "text-green-700" : "text-yellow-700"
                                                )}>
                                                    {flag.status}
                                                </span>
                                                <p className="text-xs text-slate-500 mt-0.5">{flag.note}</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {(!compliance_flags || compliance_flags.length === 0) && (
                                <tr>
                                    <td colSpan={3} className="px-3 py-4 text-center text-slate-500 italic">
                                        No specific compliance flags raised.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}

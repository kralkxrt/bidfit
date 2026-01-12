# Frontend Specifications
## Past Performance Gap Analysis Agent

---

## 1. Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.x | React framework with App Router |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Styling |
| shadcn/ui | latest | Component library |
| React Query | 5.x | Server state management |
| Zustand | 4.x | Client state management |
| React Hook Form | 7.x | Form handling |
| Zod | 3.x | Schema validation |
| Lucide React | latest | Icons |

---

## 2. Project Structure

```
/frontend
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Main app layout with sidebar
│   │   ├── page.tsx                # Dashboard home
│   │   │
│   │   ├── companies/
│   │   │   ├── page.tsx            # Company list
│   │   │   ├── new/
│   │   │   │   └── page.tsx        # Create company
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # Company detail
│   │   │       ├── documents/
│   │   │       │   └── page.tsx    # Document library
│   │   │       └── settings/
│   │   │           └── page.tsx    # Company settings
│   │   │
│   │   ├── documents/
│   │   │   ├── page.tsx            # All documents
│   │   │   ├── upload/
│   │   │   │   └── page.tsx        # Upload interface
│   │   │   └── [id]/
│   │   │       └── page.tsx        # Document detail
│   │   │
│   │   ├── opportunities/
│   │   │   ├── page.tsx            # Opportunity list
│   │   │   ├── new/
│   │   │   │   └── page.tsx        # Create opportunity
│   │   │   └── [id]/
│   │   │       └── page.tsx        # Opportunity detail
│   │   │
│   │   ├── analysis/
│   │   │   ├── page.tsx            # Analysis history
│   │   │   ├── new/
│   │   │   │   └── page.tsx        # Create analysis wizard
│   │   │   └── [id]/
│   │   │       └── page.tsx        # Analysis results
│   │   │
│   │   └── settings/
│   │       └── page.tsx            # User settings
│   │
│   ├── api/                        # API route handlers (if needed)
│   ├── layout.tsx                  # Root layout
│   └── globals.css
│
├── components/
│   ├── ui/                         # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   └── ...
│   │
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   ├── company-switcher.tsx
│   │   └── user-nav.tsx
│   │
│   ├── documents/
│   │   ├── document-list.tsx
│   │   ├── document-card.tsx
│   │   ├── document-upload.tsx
│   │   ├── document-detail.tsx
│   │   └── document-filters.tsx
│   │
│   ├── analysis/
│   │   ├── analysis-wizard.tsx
│   │   ├── analysis-results.tsx
│   │   ├── relevance-score.tsx
│   │   ├── gap-matrix.tsx
│   │   ├── strengths-list.tsx
│   │   ├── weaknesses-list.tsx
│   │   └── recommendations.tsx
│   │
│   └── shared/
│       ├── loading-spinner.tsx
│       ├── empty-state.tsx
│       ├── error-boundary.tsx
│       └── confirmation-dialog.tsx
│
├── lib/
│   ├── api/
│   │   ├── client.ts               # API client setup
│   │   ├── companies.ts            # Company API calls
│   │   ├── documents.ts            # Document API calls
│   │   ├── opportunities.ts        # Opportunity API calls
│   │   └── analyses.ts             # Analysis API calls
│   │
│   ├── hooks/
│   │   ├── use-companies.ts
│   │   ├── use-documents.ts
│   │   ├── use-analyses.ts
│   │   └── use-current-company.ts
│   │
│   ├── stores/
│   │   ├── company-store.ts        # Selected company state
│   │   └── ui-store.ts             # UI state (sidebar, modals)
│   │
│   ├── utils/
│   │   ├── format.ts
│   │   ├── validators.ts
│   │   └── constants.ts
│   │
│   └── types/
│       ├── api.ts
│       ├── company.ts
│       ├── document.ts
│       ├── opportunity.ts
│       └── analysis.ts
│
├── public/
│   └── ...
│
├── tailwind.config.ts
├── next.config.js
├── tsconfig.json
└── package.json
```

---

## 3. Type Definitions

### 3.1 Core Types (lib/types/)

```typescript
// types/company.ts
export interface Company {
  id: string;
  name: string;
  cageCode?: string;
  uei?: string;
  primaryNaics: string[];
  sizeStandard?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zipCode: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CompanyCreate {
  name: string;
  cageCode?: string;
  uei?: string;
  primaryNaics?: string[];
  sizeStandard?: string;
}

// types/document.ts
export type DocumentType = 
  | 'past_performance' 
  | 'contract' 
  | 'cpars' 
  | 'capability' 
  | 'other';

export type ProcessingStatus = 
  | 'pending' 
  | 'processing' 
  | 'completed' 
  | 'failed';

export interface Document {
  id: string;
  companyId: string;
  documentType: DocumentType;
  filename: string;
  filePath: string;
  fileSizeBytes: number;
  mimeType: string;
  
  // Extracted metadata
  contractNumber?: string;
  contractTitle?: string;
  customerAgency?: string;
  customerCommand?: string;
  contractValue?: number;
  periodOfPerformanceStart?: string;
  periodOfPerformanceEnd?: string;
  naicsCode?: string;
  clearanceLevel?: string;
  fteCount?: number;
  geographicScope?: string;
  
  // Content
  parsedContent?: Record<string, any>;
  
  // Status
  processingStatus: ProcessingStatus;
  processingError?: string;
  processedAt?: string;
  
  // Metadata
  tags?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// types/opportunity.ts
export type OpportunityStatus = 
  | 'active' 
  | 'submitted' 
  | 'won' 
  | 'lost' 
  | 'no_bid' 
  | 'cancelled';

export interface Opportunity {
  id: string;
  companyId: string;
  solicitationNumber?: string;
  title: string;
  agency?: string;
  estimatedValue?: number;
  naicsCode?: string;
  setAsideType?: string;
  responseDueDate?: string;
  status: OpportunityStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// types/analysis.ts
export type RelevanceScore = 
  | 'very_relevant' 
  | 'relevant' 
  | 'somewhat_relevant' 
  | 'not_relevant';

export type GoNoGoRecommendation = 'go' | 'no_go' | 'conditional';

export interface Strength {
  title: string;
  description: string;
  evidence: string;
  impactLevel: 'high' | 'medium' | 'low';
  supportingDocuments?: string[];
}

export interface Weakness {
  title: string;
  description: string;
  riskLevel: 'high' | 'medium' | 'low';
  affectedRequirements?: string[];
  mitigationSuggestion?: string;
}

export interface Recommendation {
  type: 'narrative' | 'mitigation' | 'personnel' | 'teaming';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface GapMatrixRequirement {
  requirementId: string;
  requirementText: string;
  coverageRating: 'strong' | 'moderate' | 'weak' | 'gap';
  supportingDocs: Array<{
    documentId: string;
    relevance: 'direct' | 'partial' | 'tangential';
    evidence: string;
  }>;
}

export interface Analysis {
  id: string;
  companyId: string;
  opportunityId: string;
  
  // Scores
  overallRelevanceScore: RelevanceScore;
  scopeScore: RelevanceScore;
  magnitudeScore: RelevanceScore;
  complexityScore: RelevanceScore;
  recencyScore?: RelevanceScore;
  
  // Detailed results
  strengths: Strength[];
  weaknesses: Weakness[];
  recommendations: Recommendation[];
  gapMatrix: {
    requirements: GapMatrixRequirement[];
  };
  
  // Go/No-Go
  goNoGoRecommendation?: GoNoGoRecommendation;
  goNoGoReasoning?: string;
  
  // Metadata
  documentsAnalyzed: string[];
  agentConfidence: number;
  processingTimeSeconds: number;
  createdAt: string;
  
  // Related entities (populated on fetch)
  opportunity?: Opportunity;
  documents?: Document[];
}
```

---

## 4. Key Component Specifications

### 4.1 Analysis Results Component

```tsx
// components/analysis/analysis-results.tsx

import { Analysis, RelevanceScore } from '@/lib/types';
import { RelevanceScoreDisplay } from './relevance-score';
import { GapMatrix } from './gap-matrix';
import { StrengthsList } from './strengths-list';
import { WeaknessesList } from './weaknesses-list';
import { RecommendationsList } from './recommendations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Share2, RefreshCw } from 'lucide-react';

interface AnalysisResultsProps {
  analysis: Analysis;
  onExport: (format: 'docx' | 'pdf') => void;
  onRerun: () => void;
}

export function AnalysisResults({ 
  analysis, 
  onExport, 
  onRerun 
}: AnalysisResultsProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gap Analysis Results</h1>
          <p className="text-muted-foreground">
            {analysis.opportunity?.title || 'Untitled Opportunity'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onExport('docx')}>
            <Download className="h-4 w-4 mr-2" />
            Export DOCX
          </Button>
          <Button variant="outline" onClick={onRerun}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Re-run
          </Button>
        </div>
      </div>

      {/* Overall Score Card */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <RelevanceScoreDisplay 
                score={analysis.overallRelevanceScore}
                size="large"
              />
            </div>
            <div className="md:col-span-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Scope</span>
                <RelevanceScoreDisplay score={analysis.scopeScore} size="small" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Magnitude</span>
                <RelevanceScoreDisplay score={analysis.magnitudeScore} size="small" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Complexity</span>
                <RelevanceScoreDisplay score={analysis.complexityScore} size="small" />
              </div>
              {analysis.recencyScore && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Recency</span>
                  <RelevanceScoreDisplay score={analysis.recencyScore} size="small" />
                </div>
              )}
            </div>
          </div>
          
          {/* Go/No-Go Badge */}
          {analysis.goNoGoRecommendation && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <span className="font-medium">Recommendation:</span>
                <Badge 
                  variant={
                    analysis.goNoGoRecommendation === 'go' ? 'success' :
                    analysis.goNoGoRecommendation === 'no_go' ? 'destructive' :
                    'warning'
                  }
                >
                  {analysis.goNoGoRecommendation.toUpperCase().replace('_', ' ')}
                </Badge>
              </div>
              {analysis.goNoGoReasoning && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {analysis.goNoGoReasoning}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gap Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Gap Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <GapMatrix 
            requirements={analysis.gapMatrix.requirements}
            documents={analysis.documents || []}
          />
        </CardContent>
      </Card>

      {/* Two Column Layout for Strengths/Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            <StrengthsList strengths={analysis.strengths} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Gaps & Weaknesses</CardTitle>
          </CardHeader>
          <CardContent>
            <WeaknessesList weaknesses={analysis.weaknesses} />
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <RecommendationsList recommendations={analysis.recommendations} />
        </CardContent>
      </Card>

      {/* Metadata Footer */}
      <div className="text-sm text-muted-foreground">
        <p>Analysis completed in {analysis.processingTimeSeconds} seconds</p>
        <p>Confidence: {(analysis.agentConfidence * 100).toFixed(0)}%</p>
        <p>Documents analyzed: {analysis.documentsAnalyzed.length}</p>
      </div>
    </div>
  );
}
```

### 4.2 Relevance Score Display

```tsx
// components/analysis/relevance-score.tsx

import { RelevanceScore } from '@/lib/types';
import { cn } from '@/lib/utils';

interface RelevanceScoreDisplayProps {
  score: RelevanceScore;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

const scoreConfig: Record<RelevanceScore, {
  label: string;
  color: string;
  bgColor: string;
  percentage: number;
}> = {
  very_relevant: {
    label: 'Very Relevant',
    color: 'text-green-700',
    bgColor: 'bg-green-500',
    percentage: 100,
  },
  relevant: {
    label: 'Relevant',
    color: 'text-blue-700',
    bgColor: 'bg-blue-500',
    percentage: 75,
  },
  somewhat_relevant: {
    label: 'Somewhat Relevant',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-500',
    percentage: 50,
  },
  not_relevant: {
    label: 'Not Relevant',
    color: 'text-red-700',
    bgColor: 'bg-red-500',
    percentage: 25,
  },
};

export function RelevanceScoreDisplay({ 
  score, 
  size = 'medium',
  showLabel = true 
}: RelevanceScoreDisplayProps) {
  const config = scoreConfig[score];
  
  const sizeClasses = {
    small: 'h-2',
    medium: 'h-3',
    large: 'h-4',
  };

  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex items-center justify-between">
          <span className={cn('font-medium', config.color, {
            'text-sm': size === 'small',
            'text-base': size === 'medium',
            'text-lg': size === 'large',
          })}>
            {config.label}
          </span>
          <span className="text-sm text-muted-foreground">
            {config.percentage}%
          </span>
        </div>
      )}
      <div className={cn('w-full bg-gray-200 rounded-full', sizeClasses[size])}>
        <div
          className={cn('rounded-full transition-all', config.bgColor, sizeClasses[size])}
          style={{ width: `${config.percentage}%` }}
        />
      </div>
    </div>
  );
}
```

### 4.3 Gap Matrix Component

```tsx
// components/analysis/gap-matrix.tsx

import { GapMatrixRequirement, Document } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CheckCircle, Circle, AlertCircle, XCircle } from 'lucide-react';

interface GapMatrixProps {
  requirements: GapMatrixRequirement[];
  documents: Document[];
}

const coverageIcons = {
  strong: <CheckCircle className="h-5 w-5 text-green-600" />,
  moderate: <Circle className="h-5 w-5 text-blue-600 fill-blue-200" />,
  weak: <AlertCircle className="h-5 w-5 text-yellow-600" />,
  gap: <XCircle className="h-5 w-5 text-red-600" />,
};

export function GapMatrix({ requirements, documents }: GapMatrixProps) {
  // Get unique document IDs from all supporting docs
  const documentIds = [...new Set(
    requirements.flatMap(r => r.supportingDocs.map(d => d.documentId))
  )];
  
  // Create document lookup
  const documentMap = Object.fromEntries(
    documents.map(d => [d.id, d])
  );

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Requirement</TableHead>
            {documentIds.map((docId, index) => (
              <TableHead key={docId} className="text-center w-[120px]">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      Ref {index + 1}
                    </TooltipTrigger>
                    <TooltipContent>
                      {documentMap[docId]?.contractTitle || 'Unknown'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
            ))}
            <TableHead className="text-center w-[100px]">Coverage</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requirements.map((req) => (
            <TableRow key={req.requirementId}>
              <TableCell>
                <div>
                  <span className="font-mono text-xs text-muted-foreground">
                    {req.requirementId}
                  </span>
                  <p className="text-sm mt-1">{req.requirementText}</p>
                </div>
              </TableCell>
              {documentIds.map((docId) => {
                const supporting = req.supportingDocs.find(
                  d => d.documentId === docId
                );
                return (
                  <TableCell key={docId} className="text-center">
                    {supporting ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            {supporting.relevance === 'direct' && (
                              <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                            )}
                            {supporting.relevance === 'partial' && (
                              <Circle className="h-5 w-5 text-blue-600 fill-blue-200 mx-auto" />
                            )}
                            {supporting.relevance === 'tangential' && (
                              <AlertCircle className="h-5 w-5 text-yellow-600 mx-auto" />
                            )}
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            {supporting.evidence}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </TableCell>
                );
              })}
              <TableCell className="text-center">
                {coverageIcons[req.coverageRating]}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {/* Legend */}
      <div className="mt-4 flex gap-4 text-sm">
        <div className="flex items-center gap-1">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span>Strong</span>
        </div>
        <div className="flex items-center gap-1">
          <Circle className="h-4 w-4 text-blue-600 fill-blue-200" />
          <span>Moderate</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <span>Weak</span>
        </div>
        <div className="flex items-center gap-1">
          <XCircle className="h-4 w-4 text-red-600" />
          <span>Gap</span>
        </div>
      </div>
    </div>
  );
}
```

### 4.4 Document Upload Component

```tsx
// components/documents/document-upload.tsx

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DocumentType } from '@/lib/types';
import { useUploadDocument } from '@/lib/hooks/use-documents';

interface FileWithProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  documentType: DocumentType;
}

interface DocumentUploadProps {
  companyId: string;
  onComplete?: () => void;
}

const documentTypes: { value: DocumentType; label: string }[] = [
  { value: 'past_performance', label: 'Past Performance Narrative' },
  { value: 'contract', label: 'Contract/PWS Document' },
  { value: 'cpars', label: 'CPARS Report' },
  { value: 'capability', label: 'Capability Statement' },
  { value: 'other', label: 'Other' },
];

export function DocumentUpload({ companyId, onComplete }: DocumentUploadProps) {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const uploadMutation = useUploadDocument();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      progress: 0,
      status: 'pending' as const,
      documentType: 'past_performance' as DocumentType,
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateFileType = (index: number, type: DocumentType) => {
    setFiles(prev => prev.map((f, i) => 
      i === index ? { ...f, documentType: type } : f
    ));
  };

  const uploadFiles = async () => {
    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== 'pending') continue;
      
      setFiles(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: 'uploading' } : f
      ));

      try {
        await uploadMutation.mutateAsync({
          companyId,
          file: files[i].file,
          documentType: files[i].documentType,
          onProgress: (progress) => {
            setFiles(prev => prev.map((f, idx) => 
              idx === i ? { ...f, progress } : f
            ));
          },
        });

        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'completed', progress: 100 } : f
        ));
      } catch (error) {
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { 
            ...f, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Upload failed' 
          } : f
        ));
      }
    }

    onComplete?.();
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 mx-auto text-gray-400 mb-4" />
        {isDragActive ? (
          <p className="text-primary">Drop the files here...</p>
        ) : (
          <>
            <p className="text-lg font-medium">
              Drag & drop files here, or click to select
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              PDF, DOCX, DOC, or TXT up to 50MB
            </p>
          </>
        )}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          {files.map((fileItem, index) => (
            <div
              key={index}
              className="flex items-center gap-4 p-4 border rounded-lg"
            >
              <File className="h-8 w-8 text-blue-600 flex-shrink-0" />
              
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{fileItem.file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(fileItem.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                
                {fileItem.status === 'uploading' && (
                  <Progress value={fileItem.progress} className="mt-2" />
                )}
                
                {fileItem.status === 'error' && (
                  <p className="text-sm text-red-600 mt-1">{fileItem.error}</p>
                )}
              </div>

              {fileItem.status === 'pending' && (
                <Select
                  value={fileItem.documentType}
                  onValueChange={(value) => updateFileType(index, value as DocumentType)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {fileItem.status === 'uploading' && (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              )}

              {fileItem.status === 'pending' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {pendingCount > 0 && (
        <Button onClick={uploadFiles} className="w-full">
          Upload {pendingCount} file{pendingCount !== 1 ? 's' : ''}
        </Button>
      )}
    </div>
  );
}
```

---

## 5. API Client Setup

```typescript
// lib/api/client.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface ApiError {
  message: string;
  detail?: string;
  status: number;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        message: 'An error occurred',
        status: response.status,
      }));
      throw new Error(error.detail || error.message);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async uploadFile<T>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, string>,
    onProgress?: (progress: number) => void
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      
      formData.append('file', file);
      if (additionalData) {
        Object.entries(additionalData).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(xhr.statusText));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', `${this.baseUrl}${endpoint}`);
      if (this.token) {
        xhr.setRequestHeader('Authorization', `Bearer ${this.token}`);
      }
      xhr.send(formData);
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
```

---

## 6. State Management

```typescript
// lib/stores/company-store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Company } from '@/lib/types';

interface CompanyState {
  currentCompany: Company | null;
  setCurrentCompany: (company: Company | null) => void;
}

export const useCompanyStore = create<CompanyState>()(
  persist(
    (set) => ({
      currentCompany: null,
      setCurrentCompany: (company) => set({ currentCompany: company }),
    }),
    {
      name: 'company-storage',
    }
  )
);

// lib/stores/ui-store.ts

import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
```

---

## 7. Environment Variables

```env
# .env.local

# API
NEXT_PUBLIC_API_URL=http://localhost:8000/api

# Auth (if using Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Analytics (optional)
NEXT_PUBLIC_POSTHOG_KEY=...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

# BidWin UI/UX Redesign Specification

## Overview

Complete redesign of BidWin's layout and UX to match modern RFP analysis platforms like SamSearch. This includes a global organization switcher, icon-only sidebar, side-by-side analyze view with Roxy, and consistent navigation patterns.

**Reference:** SamSearch's "AI Opportunity Chat with Sammy" interface.

---

## Core Layout Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR                                                                     │
│ [Logo]     [Org Switcher ▼]                    [Search] [Help] [Profile]   │
├─────────┬───────────────────────────────────────────────────────────────────┤
│         │ BREADCRUMB                                                        │
│ SIDEBAR │ Opportunities > USCG RMACC > Analyze                              │
│ (icons) ├───────────────────────────────────────────────────────────────────┤
│         │ SUB-TABS (contextual)                                             │
│  🏠     │ [Summary] [Documents] [Gap Analysis]                              │
│  📋     ├─────────────────────────────────┬─────────────────────────────────┤
│  📄     │                                 │                                 │
│  📊     │  MAIN CONTENT AREA              │  ROXY PANEL                     │
│  👤     │  (changes based on context)     │  (always visible on analyze)   │
│         │                                 │                                 │
│─────────│         60% width               │        40% width                │
│  ⚙️     │                                 │                                 │
│  🚪     │                                 │                                 │
└─────────┴─────────────────────────────────┴─────────────────────────────────┘
```

---

## Component 1: Global Organization Switcher

### Purpose
Users manage multiple companies (Talion Construction, Pera Inc, RWD Consulting, etc.). The org switcher lets them switch context, and ALL data in the app filters to that organization.

### Location
Top bar, left side after logo.

### UI Design
```tsx
// Collapsed state (in top bar)
┌─────────────────────────────────────────────────────────┐
│ [BidMatch]    [🏢 Talion Construction ▼]    [Search...] │
└─────────────────────────────────────────────────────────┘

// Expanded dropdown
┌─────────────────────────┐
│ YOUR ORGANIZATIONS      │
├─────────────────────────┤
│ ✓ Talion Construction   │  ← Currently selected
│   Pera Inc              │
│   RWD Consulting        │
│   Liberty Alliance      │
│   GovDevPro             │
├─────────────────────────┤
│ + Add Organization      │
└─────────────────────────┘
```

### Component Code
```tsx
// frontend/src/components/layout/OrgSwitcher.tsx

'use client';

import { useState } from 'react';
import { Check, ChevronDown, Building2, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useOrgStore } from '@/lib/stores/orgStore';

export function OrgSwitcher() {
  const { currentOrg, organizations, setCurrentOrg } = useOrgStore();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
        <Building2 className="w-4 h-4 text-gray-500" />
        <span className="font-medium text-gray-900">
          {currentOrg?.name || 'Select Organization'}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-gray-500 uppercase">
          Your Organizations
        </DropdownMenuLabel>
        
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => setCurrentOrg(org)}
            className="flex items-center justify-between"
          >
            <span>{org.name}</span>
            {currentOrg?.id === org.id && (
              <Check className="w-4 h-4 text-blue-500" />
            )}
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem className="text-blue-600">
          <Plus className="w-4 h-4 mr-2" />
          Add Organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### State Management
```tsx
// frontend/src/lib/stores/orgStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Organization {
  id: string;
  name: string;
  logo?: string;
}

interface OrgState {
  currentOrg: Organization | null;
  organizations: Organization[];
  setCurrentOrg: (org: Organization) => void;
  setOrganizations: (orgs: Organization[]) => void;
}

export const useOrgStore = create<OrgState>()(
  persist(
    (set) => ({
      currentOrg: null,
      organizations: [],
      setCurrentOrg: (org) => set({ currentOrg: org }),
      setOrganizations: (orgs) => set({ organizations: orgs }),
    }),
    { name: 'bidwin-org' }
  )
);
```

### Data Filtering
ALL API calls must include the current org ID:

```tsx
// frontend/src/lib/api/client.ts

import { useOrgStore } from '@/lib/stores/orgStore';

// Wrapper for API calls that auto-includes org_id
export async function apiGet<T>(endpoint: string): Promise<T> {
  const { currentOrg } = useOrgStore.getState();
  
  if (!currentOrg) {
    throw new Error('No organization selected');
  }
  
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${API_BASE}${endpoint}${separator}org_id=${currentOrg.id}`;
  
  const response = await fetch(url);
  return response.json();
}
```

### What Filters by Org
- Opportunities list
- Documents list
- Past Performance contracts
- Company Profile (shows this org's profile)
- Gap Analyses
- Roxy's context (she knows which org she's helping)

---

## Component 2: Sidebar (Icon-Only)

### Design
Narrow (60-70px), dark background, icon-only with tooltips on hover.

```
┌────────┐
│ [Logo] │  ← Small logo or "B" mark
├────────┤
│   🏠   │  Dashboard
│   📋   │  Opportunities (active = blue highlight)
│   📄   │  Documents
│   📊   │  Analyses
│   👤   │  Company Profile
├────────┤
│        │  (spacer)
├────────┤
│   ⚙️   │  Settings
│   🚪   │  Logout
└────────┘
```

### Component Code
```tsx
// frontend/src/components/layout/Sidebar.tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  FileText, 
  FolderOpen, 
  BarChart3, 
  User, 
  Settings, 
  LogOut 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const navItems = [
  { href: '/', icon: Home, label: 'Dashboard' },
  { href: '/opportunities', icon: FileText, label: 'Opportunities' },
  { href: '/documents', icon: FolderOpen, label: 'Documents' },
  { href: '/analyses', icon: BarChart3, label: 'Analyses' },
  { href: '/company-profile', icon: User, label: 'Company Profile' },
];

const bottomItems = [
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-16 bg-gray-900 flex flex-col items-center py-4 min-h-screen">
      {/* Logo */}
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-8">
        <span className="text-white font-bold text-lg">B</span>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 flex flex-col items-center gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          
          return (
            <Tooltip key={item.href} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                    isActive
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {/* Bottom Nav */}
      <div className="flex flex-col items-center gap-2">
        {bottomItems.map((item) => (
          <Tooltip key={item.href} delayDuration={0}>
            <TooltipTrigger asChild>
              <Link
                href={item.href}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <item.icon className="w-5 h-5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">
              {item.label}
            </TooltipContent>
          </Tooltip>
        ))}
        
        <button className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
}
```

---

## Component 3: Top Bar

### Design
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Org Switcher ▼]                           [🔍 Search] [❓ Help] [Avatar ▼] │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Code
```tsx
// frontend/src/components/layout/TopBar.tsx

'use client';

import { Search, HelpCircle } from 'lucide-react';
import { OrgSwitcher } from './OrgSwitcher';
import { UserNav } from './UserNav';

export function TopBar() {
  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4">
      {/* Left: Org Switcher */}
      <OrgSwitcher />

      {/* Right: Search, Help, Profile */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-9 pr-4 py-2 w-64 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Help */}
        <button className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* User Nav */}
        <UserNav />
      </div>
    </header>
  );
}
```

---

## Component 4: Breadcrumb Bar

### Design
Shows navigation path. Clickable segments.

```
Opportunities > USCG RMACC > Analyze
```

### Component Code
```tsx
// frontend/src/components/layout/Breadcrumb.tsx

'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 text-sm py-3 px-4 border-b border-gray-100">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1">
          {index > 0 && <ChevronRight className="w-4 h-4 text-gray-300" />}
          
          {item.href ? (
            <Link 
              href={item.href}
              className="text-gray-500 hover:text-gray-900 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900 font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
```

---

## Component 5: Opportunity Analyze Page (Side-by-Side)

### This is the main redesign — Roxy as full panel, not widget.

### Layout
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Summary] [Documents] [Gap Analysis]                           ← Sub-tabs  │
├─────────────────────────────────────┬───────────────────────────────────────┤
│                                     │                                       │
│   MAIN CONTENT AREA                 │   ROXY PANEL                          │
│   (changes based on sub-tab)        │   (always visible)                    │
│                                     │                                       │
│   Summary → RFP overview cards      │   🟣 Roxy                             │
│   Documents → PDF viewer            │   Capture Intelligence Specialist     │
│   Gap Analysis → Scores/matrix      │                                       │
│                                     │   [Chat messages...]                  │
│                                     │                                       │
│                                     │   ─────────────────────────────────   │
│                                     │                                       │
│                                     │   [Quick prompts]                     │
│                                     │   [Ask Roxy...]                    ⏎  │
│                                     │                                       │
└─────────────────────────────────────┴───────────────────────────────────────┘
```

### Component Code
```tsx
// frontend/src/app/opportunities/[id]/analyze/page.tsx

'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { RoxyPanel } from '@/components/roxy/RoxyPanel';
import { SummaryTab } from '@/components/analyze/SummaryTab';
import { DocumentsTab } from '@/components/analyze/DocumentsTab';
import { GapAnalysisTab } from '@/components/analyze/GapAnalysisTab';
import { useOpportunity } from '@/lib/hooks/useOpportunity';

export default function AnalyzePage() {
  const { id } = useParams();
  const { opportunity } = useOpportunity(id as string);
  const [activeTab, setActiveTab] = useState('summary');
  const [highlightedCitation, setHighlightedCitation] = useState(null);

  const handleCitationClick = (citation) => {
    setHighlightedCitation(citation);
    setActiveTab('documents');
  };

  const breadcrumbItems = [
    { label: 'Opportunities', href: '/opportunities' },
    { label: opportunity?.title || 'Loading...', href: `/opportunities/${id}` },
    { label: 'Analyze' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} />

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Tabbed Content (60%) */}
        <div className="w-[60%] flex flex-col border-r border-gray-200">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <TabsList className="border-b border-gray-200 px-4 justify-start rounded-none bg-transparent h-12">
              <TabsTrigger 
                value="summary"
                className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none"
              >
                Summary
              </TabsTrigger>
              <TabsTrigger 
                value="documents"
                className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none"
              >
                Documents
              </TabsTrigger>
              <TabsTrigger 
                value="gap-analysis"
                className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none"
              >
                Gap Analysis
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto">
              <TabsContent value="summary" className="h-full m-0 p-4">
                <SummaryTab opportunityId={id as string} />
              </TabsContent>
              
              <TabsContent value="documents" className="h-full m-0">
                <DocumentsTab 
                  opportunityId={id as string}
                  highlightedCitation={highlightedCitation}
                  onClearHighlight={() => setHighlightedCitation(null)}
                />
              </TabsContent>
              
              <TabsContent value="gap-analysis" className="h-full m-0 p-4">
                <GapAnalysisTab opportunityId={id as string} />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Right: Roxy Panel (40%) */}
        <div className="w-[40%] flex flex-col bg-gray-50">
          <RoxyPanel 
            opportunityId={id as string}
            onCitationClick={handleCitationClick}
          />
        </div>
      </div>
    </div>
  );
}
```

---

## Component 6: Roxy Panel (Full Height, Not Widget)

### Design
Full-height panel, always visible on analyze page. NOT a floating chat widget.

```
┌─────────────────────────────────────┐
│ 🟣 Roxy              ● Online    ─  │  ← Header (purple avatar, minimize optional)
├─────────────────────────────────────┤
│                                     │
│   [Welcome screen if no messages]   │
│                                     │
│   OR                                │
│                                     │
│   [Chat messages with citations]    │
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ Source: document.pdf, Page 12       │  ← Source reference (if citation active)
├─────────────────────────────────────┤
│ [What certs?] [Eval criteria?] ...  │  ← Quick prompts
├─────────────────────────────────────┤
│ [Ask Roxy...]                    ⏎  │  ← Input
└─────────────────────────────────────┘
```

### Component Code
```tsx
// frontend/src/components/roxy/RoxyPanel.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { Minus } from 'lucide-react';
import { useRoxyChat } from '@/lib/hooks/useRoxyChat';
import { RoxyHeader } from './RoxyHeader';
import { RoxyWelcome } from './RoxyWelcome';
import { RoxyMessage } from './RoxyMessage';
import { RoxyInput } from './RoxyInput';
import { RoxyQuickPrompts } from './RoxyQuickPrompts';
import { RoxySourceReference } from './RoxySourceReference';

interface RoxyPanelProps {
  opportunityId: string;
  onCitationClick: (citation: Citation) => void;
}

export function RoxyPanel({ opportunityId, onCitationClick }: RoxyPanelProps) {
  const { messages, isLoading, sendMessage, activeCitation } = useRoxyChat(opportunityId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <RoxyHeader />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <RoxyWelcome onPromptClick={handleQuickPrompt} />
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <RoxyMessage
                key={message.id}
                message={message}
                onCitationClick={onCitationClick}
              />
            ))}
            {isLoading && (
              <div className="text-gray-400 text-sm">Roxy is thinking...</div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Source Reference (if active) */}
      {activeCitation && (
        <RoxySourceReference 
          citation={activeCitation}
          onClick={() => onCitationClick(activeCitation)}
        />
      )}

      {/* Quick Prompts (if few messages) */}
      {messages.length < 3 && (
        <RoxyQuickPrompts onSelect={handleQuickPrompt} />
      )}

      {/* Input */}
      <RoxyInput onSend={sendMessage} isLoading={isLoading} />
    </div>
  );
}
```

### Roxy Header
```tsx
// frontend/src/components/roxy/RoxyHeader.tsx

export function RoxyHeader() {
  return (
    <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-white">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
        <span className="text-lg font-bold text-white">R</span>
      </div>

      {/* Name */}
      <h3 className="flex-1 font-semibold text-gray-900">Roxy</h3>

      {/* Online Indicator */}
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500"></span>
        <span className="text-xs text-gray-400">Online</span>
      </div>
    </div>
  );
}
```

### Roxy Welcome (Empty State)
```tsx
// frontend/src/components/roxy/RoxyWelcome.tsx

'use client';

import { useState, useEffect } from 'react';

const GREETINGS = [
  "What are we winning today?",
  "Ready to analyze.",
  "Drop an RFP, let's see what we're working with.",
  "What's the opportunity?",
  "Let's find the gaps.",
];

const QUICK_PROMPTS = [
  "What certifications are required?",
  "What is the evaluation criteria?",
  "What past performance is needed?",
  "Should we bid on this?",
];

interface RoxyWelcomeProps {
  onPromptClick: (prompt: string) => void;
}

export function RoxyWelcome({ onPromptClick }: RoxyWelcomeProps) {
  const [greeting, setGreeting] = useState('');
  const [displayedGreeting, setDisplayedGreeting] = useState('');

  // Pick random greeting on mount
  useEffect(() => {
    const randomGreeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    setGreeting(randomGreeting);
  }, []);

  // Typewriter effect
  useEffect(() => {
    if (!greeting) return;
    
    let index = 0;
    const interval = setInterval(() => {
      setDisplayedGreeting(greeting.slice(0, index + 1));
      index++;
      if (index >= greeting.length) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [greeting]);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      {/* Avatar */}
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/25">
        <span className="text-2xl font-bold text-white">R</span>
      </div>

      {/* Name */}
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Roxy</h2>

      {/* Greeting with typewriter */}
      <p className="text-gray-700 mb-8 h-6">
        {displayedGreeting}
        <span className="animate-pulse">|</span>
      </p>

      {/* Quick Prompts */}
      <div className="flex flex-wrap gap-2 justify-center">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onPromptClick(prompt)}
            className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## Component 7: Main App Layout

### Brings it all together
```tsx
// frontend/src/app/(dashboard)/layout.tsx

import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <TopBar />

          {/* Page Content */}
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
```

---

## Backend Changes Required

### 1. Filter all queries by org_id

Update all API routes to accept and require `org_id`:

```python
# backend/app/api/routes/opportunities.py

@router.get("/")
async def list_opportunities(
    org_id: str = Query(..., description="Organization ID"),
    db: Session = Depends(get_db)
):
    opportunities = db.query(Opportunity).filter(
        Opportunity.organization_id == org_id
    ).all()
    return opportunities
```

### 2. Inject org context into Roxy

```python
# backend/app/services/roxy_service.py

def _build_system_prompt(self, org_id: str, ...):
    org_profile = self._get_org_profile(org_id)
    
    return f"""
{ROXY_PERSONA}

## CURRENT ORGANIZATION
Name: {org_profile.name}
NAICS: {org_profile.naics_codes}
Certifications: {org_profile.certifications}
Set-Asides: {org_profile.set_asides}
...
"""
```

---

## Implementation Order

1. **Create Zustand store** for org state
2. **Create OrgSwitcher component**
3. **Create new Sidebar** (icon-only)
4. **Create TopBar** with org switcher
5. **Create main layout** combining all
6. **Rebuild analyze page** with side-by-side layout
7. **Update RoxyPanel** to be full-height
8. **Update API calls** to filter by org_id
9. **Update backend routes** to require org_id
10. **Test full flow**

---

## Styling Notes

- **Brand color:** Blue (not green) — match existing repo
- **Sidebar:** Dark (`bg-gray-900`)
- **Roxy avatar:** Purple gradient (`from-violet-500 to-purple-600`)
- **Active states:** Blue highlight
- **Cards:** White, rounded-xl, subtle shadow
- **Fonts:** Match existing (likely Inter)

---

## Files to Create/Modify

### New Files
```
frontend/src/
├── lib/stores/orgStore.ts
├── components/layout/
│   ├── OrgSwitcher.tsx
│   ├── Sidebar.tsx (replace existing)
│   ├── TopBar.tsx
│   ├── Breadcrumb.tsx
│   └── UserNav.tsx
├── components/roxy/
│   ├── RoxyPanel.tsx (replace RoxySidePanel)
│   ├── RoxyHeader.tsx
│   ├── RoxyWelcome.tsx
│   ├── RoxyMessage.tsx
│   ├── RoxyInput.tsx
│   ├── RoxyQuickPrompts.tsx
│   └── RoxySourceReference.tsx
└── app/(dashboard)/
    └── layout.tsx (replace existing)
```

### Modified Files
```
frontend/src/app/opportunities/[id]/analyze/page.tsx
backend/app/api/routes/*.py (add org_id filtering)
backend/app/services/roxy_service.py (add org context)
```

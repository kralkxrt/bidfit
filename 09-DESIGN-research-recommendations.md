# Design Research & Recommendations
## PP Gap Analysis Agent - UI/UX Direction

---

## Executive Summary

Based on extensive research into comparable applications, I recommend a design approach that blends:

1. **Compliance dashboard aesthetics** (Vanta, Drata, Secureframe) - for scoring, status indicators, and gap visualization
2. **GovCon-specific patterns** (GovDash, Capture2Proposal) - for opportunity management and document handling
3. **Modern SaaS design language** (Linear, Notion) - for clean, professional interface feel

The key insight: Your app sits at the intersection of **compliance assessment** and **proposal management** - two established UI paradigms we can draw from heavily.

---

## Comparable Applications to Study

### Tier 1: Direct Inspiration (Study These Closely)

| App | Why It's Relevant | What to Copy |
|-----|-------------------|--------------|
| **Vanta** (vanta.com) | Compliance automation with scoring dashboards | Progress indicators, compliance status visualization, clean dashboard layout |
| **Drata** (drata.com) | Gap analysis for security frameworks | Gap matrix displays, control mapping UI, evidence collection patterns |
| **Secureframe** (secureframe.com) | Document-based compliance assessment | Document library, requirement extraction, audit readiness indicators |
| **GovDash** (govdash.com) | GovCon-specific proposal + capture management | Opportunity cards, proposal workflow, GovCon terminology |
| **Capture2Proposal** (capture2proposal.com) | Pipeline + past performance analytics | Pipeline dashboards, analytics visualization, teaming features |

### Tier 2: General Design Inspiration

| App | Design Element to Borrow |
|-----|-------------------------|
| **Linear** (linear.app) | Clean minimalism, dark mode elegance, keyboard shortcuts |
| **Notion** (notion.so) | Document/database hybrid UX, flexible layouts |
| **Stripe Dashboard** | Data visualization, metric cards, professional polish |
| **Superhuman** | Speed-focused UX, progressive disclosure |
| **Figma** | Collaborative workspace patterns, file organization |

### Tier 3: Compliance/Assessment Tools

| App | Specific Pattern |
|-----|-----------------|
| **ZenGRC** | Color-coded compliance status |
| **Sprinto** | Audit readiness percentage displays |
| **ComplyNexus** | Gap analysis report formatting |
| **MetricStream** | Control environment dashboards |

---

## UI Patterns to Implement

### 1. Relevance Score Display

**Inspiration**: Vanta/Drata compliance status indicators

```
Design Pattern: Traffic Light + Progress Bar Hybrid

┌─────────────────────────────────────────────────┐
│  OVERALL RELEVANCE                              │
│                                                 │
│  ████████████████████░░░░░░░░  RELEVANT (72%)  │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ Very Relevant  ████████████████████████ │   │
│  │ Relevant       ████████████████░░░░░░░░ │   │
│  │ Somewhat       ████████░░░░░░░░░░░░░░░░ │   │
│  │ Not Relevant   ████░░░░░░░░░░░░░░░░░░░░ │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘

Color Scheme:
- Very Relevant: Green (#22c55e)
- Relevant: Blue (#3b82f6)  
- Somewhat Relevant: Yellow/Amber (#eab308)
- Not Relevant: Red (#ef4444)
```

### 2. Gap Matrix Display

**Inspiration**: Drata control mapping + Secureframe evidence collection

```
Design Pattern: Requirements × Documents Matrix

┌──────────────────────────────────────────────────────────────┐
│ REQUIREMENT               │ Ref 1  │ Ref 2  │ Ref 3  │ COVER │
├──────────────────────────────────────────────────────────────┤
│ Joint Planning Support    │   ✓    │   ◐    │   ✓    │ STRONG│
│ JOPES/APEX Experience     │   ✓    │   ○    │   ✓    │ STRONG│
│ Coalition Coordination    │   ◐    │   ✓    │   ○    │  MOD  │
│ WMD Planning              │   ○    │   ◐    │   ○    │  GAP  │
│ TS/SCI Environment        │   ✓    │   ✓    │   ✓    │ STRONG│
└──────────────────────────────────────────────────────────────┘

Legend:
✓ = Strong/Direct support (filled circle, green)
◐ = Partial support (half-filled, blue)
○ = Weak/Tangential (empty circle, gray)
✗ = Gap (red X, only in coverage column)

Interaction: Hover on any cell → tooltip shows evidence text
Click on requirement → expands to show full mapping details
```

### 3. Document Library

**Inspiration**: Notion database view + GovDash document management

```
Design Pattern: Card Grid with Metadata Tags

┌────────────────────────────────────────────────────────────────┐
│ PAST PERFORMANCE LIBRARY                    [+ Upload] [Filter]│
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ ┌─────────────────────┐  ┌─────────────────────┐               │
│ │ 📄                  │  │ 📄                  │               │
│ │ YSG INDOPACOM       │  │ Makwa Intel Support │               │
│ │ Support Contract    │  │                     │               │
│ │                     │  │                     │               │
│ │ DLA | $28M | TS/SCI │  │ DIA | $12M | TS     │               │
│ │ ████████ Processed  │  │ ████████ Processed  │               │
│ └─────────────────────┘  └─────────────────────┘               │
│                                                                │
│ ┌─────────────────────┐  ┌─────────────────────┐               │
│ │ 📄                  │  │ 📄 ⟳                │               │
│ │ Liberty SOCOM       │  │ New Upload.pdf      │               │
│ │ Planning            │  │                     │               │
│ │                     │  │                     │               │
│ │ SOCOM | $7M | Secret│  │ ████░░░░ Processing │               │
│ │ ████████ Processed  │  │                     │               │
│ └─────────────────────┘  └─────────────────────┘               │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 4. Analysis Results Layout

**Inspiration**: Vanta compliance dashboard + Drata audit hub

```
Design Pattern: Summary Card → Details Accordion

┌────────────────────────────────────────────────────────────────┐
│ GAP ANALYSIS: USCENTCOM SPPS (FA481426R0001)                   │
│ Company: Liberty Alliance    │   Jan 11, 2026                  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │  OVERALL: RELEVANT                      GO ✓             │  │
│ │  ████████████████████░░░░░░░░░░  72%                     │  │
│ │                                                          │  │
│ │  Scope: ████████████████░░░░  Relevant                   │  │
│ │  Magnitude: ██████████████████████  Very Relevant        │  │
│ │  Complexity: ████████████░░░░░░░░  Somewhat Relevant     │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│ ┌─────────────────────────┬────────────────────────────────┐  │
│ │ ✓ STRENGTHS (4)         │ ⚠ GAPS (2)                     │  │
│ ├─────────────────────────┼────────────────────────────────┤  │
│ │ • COCOM-level experience│ • No WMD planning experience   │  │
│ │ • $47M demonstrates     │ • Limited coalition evidence   │  │
│ │   scale capability      │                                │  │
│ │ • 100% TS/SCI cleared   │                                │  │
│ │ • Joint planning depth  │                                │  │
│ └─────────────────────────┴────────────────────────────────┘  │
│                                                                │
│ [View Gap Matrix] [Export DOCX] [Re-run Analysis]              │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 5. Go/No-Go Recommendation Badge

**Inspiration**: Vanta trust badges + traffic light systems

```
Design Pattern: Prominent Decision Badge

GO (Green)
┌─────────────────────────────────────────┐
│  ✓ GO - Recommend Pursuit               │
│  Strong position. Gaps addressable      │
│  in technical approach.                 │
└─────────────────────────────────────────┘

CONDITIONAL (Yellow)
┌─────────────────────────────────────────┐
│  ◐ CONDITIONAL                          │
│  Address WMD gap before final           │
│  bid decision.                          │
└─────────────────────────────────────────┘

NO-GO (Red)
┌─────────────────────────────────────────┐
│  ✗ NO-GO - Do Not Pursue                │
│  Critical gaps in scope alignment.      │
│  Win probability <20%.                  │
└─────────────────────────────────────────┘
```

---

## Design System Recommendations

### Color Palette

```css
/* Primary Colors */
--primary: #3b82f6;        /* Blue - main actions */
--primary-hover: #2563eb;

/* Semantic Colors (Scoring) */
--very-relevant: #22c55e;  /* Green */
--relevant: #3b82f6;       /* Blue */
--somewhat-relevant: #eab308; /* Yellow/Amber */
--not-relevant: #ef4444;   /* Red */

/* Go/No-Go */
--go: #22c55e;
--conditional: #f59e0b;
--no-go: #ef4444;

/* Neutrals */
--background: #ffffff;
--background-secondary: #f8fafc;
--border: #e2e8f0;
--text: #1e293b;
--text-muted: #64748b;

/* Dark Mode (optional) */
--background-dark: #0f172a;
--surface-dark: #1e293b;
```

### Typography

```css
/* Font Stack */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* Scale */
--text-xs: 0.75rem;    /* 12px - metadata, tags */
--text-sm: 0.875rem;   /* 14px - secondary text */
--text-base: 1rem;     /* 16px - body */
--text-lg: 1.125rem;   /* 18px - subheadings */
--text-xl: 1.25rem;    /* 20px - card titles */
--text-2xl: 1.5rem;    /* 24px - section headers */
--text-3xl: 1.875rem;  /* 30px - page titles */
```

### Component Library

**Recommendation**: Use **shadcn/ui** as the base

Why shadcn/ui:
- Modern, professional aesthetic
- Highly customizable (not locked into a design)
- Built on Radix primitives (accessible)
- Tailwind-based (matches our stack)
- Active community, regular updates

Key components to use:
- Card (for document cards, score displays)
- Progress (for relevance bars)
- Table (for gap matrix)
- Badge (for status indicators)
- Dialog (for document details)
- Tooltip (for evidence on hover)
- Tabs (for analysis sections)

---

## Page-by-Page Design Notes

### Dashboard (Home)

```
Layout:
┌────────────────────────────────────────────────────────────┐
│ [Company Switcher]                    [User Menu]          │
├────────────────────────────────────────────────────────────┤
│ Welcome back, Kurt                                         │
│                                                            │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│ │ 12           │ │ 45           │ │ 8            │        │
│ │ Documents    │ │ Analyses     │ │ Active Opps  │        │
│ └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                            │
│ Recent Analyses                                            │
│ ┌────────────────────────────────────────────────────┐    │
│ │ USCENTCOM SPPS   │ RELEVANT │ Jan 11 │ [View]     │    │
│ │ DHA OSBP Support │ STRONG   │ Jan 10 │ [View]     │    │
│ │ DISA Zero Trust  │ GAP      │ Jan 8  │ [View]     │    │
│ └────────────────────────────────────────────────────┘    │
│                                                            │
│ [+ New Analysis]                                           │
└────────────────────────────────────────────────────────────┘

Key Elements:
- Quick stats as metric cards
- Recent analyses with color-coded status
- Prominent CTA for new analysis
```

### Analysis Wizard (New Analysis)

```
Layout: Multi-step wizard (Linear/Notion style)

Step 1: Select Company (if multiple)
Step 2: Select/Upload Opportunity
Step 3: Select Past Performance Documents
Step 4: Run Analysis
Step 5: View Results

Design Notes:
- Progress indicator at top
- Clean, focused interface per step
- Preview selected items before running
- Loading state with progress during analysis
```

### Analysis Results

```
Layout: Scrollable single page with anchor navigation

Sections:
1. Summary Card (always visible at top)
2. Dimensional Scores
3. Gap Matrix (interactive table)
4. Strengths (card list)
5. Weaknesses/Gaps (card list with risk indicators)
6. Recommendations (prioritized list)
7. Document Assessments (collapsed by default)

Navigation:
- Sticky header with anchor links
- Floating action button for export
- Collapsible sections for long content
```

---

## Mobile Considerations

Primary use case is desktop, but ensure:
- Responsive sidebar (collapsible on mobile)
- Gap matrix scrolls horizontally on small screens
- Analysis results stack vertically
- File upload works on mobile (but likely rare usage)

---

## Design Resources to Reference

### Screenshots & Inspiration

| Resource | URL | What to Look At |
|----------|-----|-----------------|
| SaaSFrame | saasframe.io | Dashboard layouts, SaaS patterns |
| SaaSInterface | saasinterface.com | Component patterns |
| Dribbble SaaS | dribbble.com/search/saas-dashboard | Visual inspiration |
| Vanta | vanta.com | Compliance dashboard (request demo) |
| Drata | drata.com | Gap analysis UI (request demo) |
| Linear | linear.app | Clean minimalism |
| Notion | notion.so | Document + database UI |

### Design Systems

| System | URL | Notes |
|--------|-----|-------|
| shadcn/ui | ui.shadcn.com | Use as component base |
| Radix | radix-ui.com | Primitive components |
| Tailwind UI | tailwindui.com | Premium templates (paid) |
| Vercel Design | vercel.com/geist/introduction | Typography patterns |

---

## Recommended Design Process

### Before Building

1. **Create a Figma file** with:
   - Color palette
   - Typography scale
   - Key component variants (score displays, gap indicators)
   - 3-4 key page layouts (dashboard, document library, analysis results)

2. **Prototype the analysis results page** - this is the core value prop

3. **Test gap matrix readability** - ensure it works with 10+ requirements and 5+ documents

### During Building

1. **Start with shadcn/ui components**
2. **Customize colors to match scoring scheme**
3. **Build score display components first** - they're used everywhere
4. **Test with real data early** - fake data hides UX issues

### Design Debt to Avoid

- Don't over-engineer dark mode initially
- Don't build complex animations (ship fast)
- Don't obsess over pixel-perfect - functional first
- Don't forget empty states (no documents, no analyses)

---

## Summary: What to Build

| Priority | Component | Inspiration |
|----------|-----------|-------------|
| P0 | Relevance score display | Vanta compliance status |
| P0 | Gap matrix table | Drata control mapping |
| P0 | Document card | Notion database card |
| P0 | Analysis summary card | Vanta dashboard widget |
| P1 | Go/No-Go badge | Traffic light systems |
| P1 | Strengths/Weaknesses lists | Compliance assessment tools |
| P1 | Document upload with progress | Modern SaaS patterns |
| P2 | Pipeline/history view | Capture2Proposal |
| P2 | Comparison view | Side-by-side assessments |

---

## Next Steps

1. **Review live demos** of Vanta, Drata, and GovDash (request demos)
2. **Sketch key screens** before coding
3. **Start with shadcn/ui** and customize from there
4. **Build the analysis results page first** - it's the money shot

Ready to proceed with building when you are.

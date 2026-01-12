# BidFit v2.0 - Design System Implementation

## Overview

Redesign BidFit to have a modern, refined aesthetic similar to Vanta. The design should feel premium, clean, and professional.

**Brand Colors:**
- **Primary Green:** `#10B981` (Emerald 500) - Primary actions, accents, success states
- **Black:** `#000000` - Logo "Bid" text, headings
- **White:** `#FFFFFF` - Backgrounds
- **Grays:** Gray 50-900 scale for text, borders, backgrounds

**Logo:** 
- "Bid" in black (`text-black font-bold`)
- "Fit" in green (`text-emerald-500 font-bold`)

**Reference:** Read `bidfit-design-system.md` in the project folder for complete specifications.

---

## Priority Implementation Order

### P0 - Core Theme (Do First)

#### 1. Update Tailwind Config
**File:** `frontend/tailwind.config.js` or `tailwind.config.ts`

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#10B981',
          'green-dark': '#059669',
          'green-light': '#D1FAE5',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
}
```

#### 2. Update Global Styles
**File:** `frontend/src/app/globals.css`

Add at the top:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  --brand-green: #10B981;
  --brand-green-dark: #059669;
  --brand-green-light: #D1FAE5;
}
```

#### 3. Update Sidebar/Navigation
Transform the sidebar to dark theme with green accents:

```tsx
// Sidebar container
<aside className="w-64 bg-gray-900 text-white min-h-screen p-4 flex flex-col">

  {/* Logo */}
  <div className="px-2 py-4 mb-6">
    <span className="text-2xl font-bold">
      <span className="text-white">Bid</span>
      <span className="text-emerald-400">Fit</span>
    </span>
  </div>
  
  {/* Nav items */}
  <nav className="flex-1 space-y-1">
    {/* Active nav item */}
    <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 font-medium">
      <Icon className="w-5 h-5" />
      Dashboard
    </a>
    
    {/* Default nav item */}
    <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
      <Icon className="w-5 h-5" />
      Opportunities
    </a>
  </nav>
</aside>
```

#### 4. Update All Buttons

**Primary Button (Green):**
```tsx
className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-4 py-2.5 rounded-lg transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
```

**Secondary Button (Outline):**
```tsx
className="bg-white border border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 font-medium px-4 py-2.5 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
```

**Danger Button:**
```tsx
className="bg-red-500 hover:bg-red-600 text-white font-medium px-4 py-2.5 rounded-lg transition-all focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
```

Search all files for button classes and update them consistently.

---

### P1 - Components Update

#### 5. Update Cards
All cards should use this base style:
```tsx
className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6"
```

Interactive/clickable cards add:
```tsx
className="... cursor-pointer hover:border-emerald-200"
```

#### 6. Update Status Badges

**Coverage Status Badges (Gap Analysis):**

```tsx
// STRONG - Green
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
  <CheckCircle className="w-3.5 h-3.5" />
  Strong
</span>

// MODERATE - Amber  
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
  <AlertCircle className="w-3.5 h-3.5" />
  Moderate
</span>

// WEAK - Orange
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
  <AlertCircle className="w-3.5 h-3.5" />
  Weak
</span>

// GAP - Red
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
  <XCircle className="w-3.5 h-3.5" />
  Gap
</span>
```

**Go/No-Go Badges:**

```tsx
// GO - Green
<span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-100 text-emerald-700 font-semibold">
  <CheckCircle className="w-5 h-5" />
  GO
</span>

// CONDITIONAL - Amber
<span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-100 text-amber-700 font-semibold">
  <AlertCircle className="w-5 h-5" />
  CONDITIONAL
</span>

// NO-GO - Red
<span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-100 text-red-700 font-semibold">
  <XCircle className="w-5 h-5" />
  NO-GO
</span>
```

#### 7. Update Score Displays

**Circular Score Badge:**
```tsx
// High (70-100) - Green
<div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 border-4 border-emerald-500">
  <span className="text-2xl font-bold text-emerald-700">85%</span>
</div>

// Medium (40-69) - Amber
<div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-100 border-4 border-amber-500">
  <span className="text-2xl font-bold text-amber-700">62%</span>
</div>

// Low (0-39) - Red
<div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 border-4 border-red-500">
  <span className="text-2xl font-bold text-red-700">28%</span>
</div>
```

#### 8. Update Progress Bars

**Dimensional Score Bar:**
```tsx
<div className="space-y-2">
  <div className="flex justify-between text-sm">
    <span className="font-medium text-gray-700">Scope Alignment</span>
    <span className="text-gray-500">75%</span>
  </div>
  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
    <div 
      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
      style={{ width: '75%' }}
    />
  </div>
</div>
```

#### 9. Update Tables

```tsx
<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
  <table className="w-full">
    <thead>
      <tr className="bg-gray-50 border-b border-gray-200">
        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Column
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-100">
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-6 py-4 text-sm text-gray-900">
          Content
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

#### 10. Update Form Inputs

```tsx
<input
  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
  placeholder="Enter value..."
/>
```

---

### P2 - Analysis Page Components

#### 11. Update RequirementsMatrix.tsx

Key changes:
- Use `rounded-xl` for outer container
- Use `bg-gray-50` for header
- Use new status badge colors
- Add `hover:bg-gray-50` to table rows

#### 12. Update RedFlags.tsx

```tsx
<div className="bg-red-50 border border-red-200 rounded-xl p-5 relative overflow-hidden">
  {/* Left accent bar */}
  <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
  
  <div className="flex gap-3 pl-3">
    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
    <div>
      <h3 className="font-semibold text-red-800">
        Red Flags — Do NOT Include in Proposal
      </h3>
      <ul className="mt-3 space-y-3">
        {flags.map((flag, i) => (
          <li key={i}>
            <p className="font-medium text-red-800">{flag.warning}</p>
            <p className="text-sm text-red-600">{flag.reason}</p>
          </li>
        ))}
      </ul>
    </div>
  </div>
</div>
```

#### 13. Update EvaluatorPerspective.tsx

Dark callout style for emphasis:
```tsx
<div className="bg-gray-900 rounded-xl p-5 text-white">
  <div className="flex gap-3">
    <Eye className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
    <div>
      <h3 className="font-semibold text-emerald-400">
        Evaluator Perspective
      </h3>
      <p className="mt-2 text-gray-300 leading-relaxed italic">
        {perspective}
      </p>
    </div>
  </div>
</div>
```

#### 14. Update DimensionalScores.tsx

- Use green progress bars (`bg-emerald-500`)
- Card with `rounded-xl border border-gray-200`
- Show strengths in green text, gaps in red text

#### 15. Update ContractAssessments.tsx

- Cards with subtle shadows
- Service branch badge
- Relevance score with colored indicator

---

### P3 - Polish

#### 16. Update Loading States

**Spinner:**
```tsx
<div className="w-6 h-6 border-2 border-gray-200 border-t-emerald-500 rounded-full animate-spin" />
```

**Analysis Loading:**
```tsx
<div className="flex flex-col items-center justify-center py-16">
  <div className="relative">
    <div className="w-16 h-16 border-4 border-gray-200 border-t-emerald-500 rounded-full animate-spin" />
  </div>
  <p className="mt-4 text-lg font-medium text-gray-900">Analyzing documents...</p>
  <p className="text-sm text-gray-500">This may take a minute</p>
</div>
```

#### 17. Update Empty States

```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
    <FileText className="w-8 h-8 text-gray-400" />
  </div>
  <h3 className="text-lg font-semibold text-gray-900">No documents yet</h3>
  <p className="mt-1 text-sm text-gray-500 max-w-sm">
    Upload your first past performance document to get started.
  </p>
  <button className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-4 py-2.5 rounded-lg">
    Upload Document
  </button>
</div>
```

#### 18. Add Hover Effects

Cards:
```tsx
className="... hover:shadow-lg hover:border-emerald-200 transition-all duration-200"
```

Buttons lift effect:
```tsx
className="... hover:-translate-y-0.5 transition-transform"
```

#### 19. Update Page Headers

```tsx
<div className="mb-8">
  <h1 className="text-2xl font-bold text-gray-900">Page Title</h1>
  <p className="mt-1 text-gray-500">Page description or subtitle</p>
</div>
```

#### 20. Update Breadcrumbs

```tsx
<nav className="text-sm text-gray-500 mb-6">
  <span className="hover:text-gray-700 cursor-pointer">Opportunities</span>
  <span className="mx-2">/</span>
  <span className="hover:text-gray-700 cursor-pointer">NAVSUP HAZMAT</span>
  <span className="mx-2">/</span>
  <span className="text-gray-900 font-medium">Analysis</span>
</nav>
```

---

## Files to Update

Search and update these files:

```
frontend/
├── tailwind.config.js          # Add brand colors
├── src/
│   ├── app/
│   │   ├── globals.css         # Add Inter font, CSS variables
│   │   ├── layout.tsx          # Update if has global styles
│   │   ├── page.tsx            # Dashboard
│   │   └── opportunities/
│   │       └── [id]/
│   │           └── analysis/
│   │               └── [analysisId]/
│   │                   └── page.tsx  # Main analysis page
│   └── components/
│       ├── Sidebar.tsx         # Dark theme
│       ├── Header.tsx          # If exists
│       ├── Button.tsx          # If exists (or create)
│       ├── Card.tsx            # If exists (or create)
│       └── analysis/
│           ├── RequirementsMatrix.tsx
│           ├── RedFlags.tsx
│           ├── EvaluatorPerspective.tsx
│           ├── DimensionalScores.tsx
│           └── ContractAssessments.tsx
```

---

## Visual Checklist

After implementation, verify:

```
□ Logo shows "Bid" in black, "Fit" in green
□ Sidebar is dark (gray-900) with green accent for active item
□ All primary buttons are green (emerald-500)
□ All cards have rounded-xl corners and subtle shadows
□ Status badges use correct colors (green/amber/orange/red)
□ Score circles use correct color based on value
□ Progress bars are green (emerald-500)
□ Red Flags section has red accent bar on left
□ Evaluator Perspective is dark with green header
□ Tables have hover states
□ Forms have green focus rings
□ Loading spinners use green
□ Empty states have green action button
□ Overall feel is clean, modern, premium
```

---

## Don't Do

- Don't use blue (`blue-500`, `blue-600`) - replace with green
- Don't use rounded-sm or rounded - use rounded-lg or rounded-xl
- Don't use harsh shadows - keep them subtle (shadow-sm, shadow-md)
- Don't forget hover states on interactive elements
- Don't use inconsistent padding - stick to p-4, p-5, p-6 for cards

---

## Reference

Full design system specifications are in `bidfit-design-system.md`. Refer to it for complete component code, color values, and styling details.

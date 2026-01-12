# BidFit v2.0 Design System

## Brand Identity

### Logo
- **"Bid"** → Black (`#000000`)
- **"Fit"** → Green (`#10B981`)
- Font: Inter Bold or Manrope Bold
- Usage: `<span className="text-black font-bold">Bid</span><span className="text-emerald-500 font-bold">Fit</span>`

---

## Color Palette

### Primary Colors
```css
/* Core Brand */
--brand-green: #10B981;        /* Emerald 500 - Primary actions, accents */
--brand-green-dark: #059669;   /* Emerald 600 - Hover states */
--brand-green-light: #D1FAE5;  /* Emerald 100 - Backgrounds, badges */
--brand-black: #000000;        /* Pure black - Logo, headings */

/* Neutrals */
--white: #FFFFFF;
--gray-50: #F9FAFB;            /* Page backgrounds */
--gray-100: #F3F4F6;           /* Card backgrounds, borders */
--gray-200: #E5E7EB;           /* Borders, dividers */
--gray-300: #D1D5DB;           /* Disabled states */
--gray-400: #9CA3AF;           /* Placeholder text */
--gray-500: #6B7280;           /* Secondary text */
--gray-600: #4B5563;           /* Body text */
--gray-700: #374151;           /* Headings */
--gray-800: #1F2937;           /* Dark headings */
--gray-900: #111827;           /* Darkest text */
```

### Semantic Colors
```css
/* Status Colors */
--success: #10B981;            /* Green - matches brand */
--success-light: #D1FAE5;
--warning: #F59E0B;            /* Amber */
--warning-light: #FEF3C7;
--error: #EF4444;              /* Red */
--error-light: #FEE2E2;
--info: #3B82F6;               /* Blue */
--info-light: #DBEAFE;

/* Coverage Status (Gap Analysis) */
--coverage-strong: #10B981;    /* Green */
--coverage-moderate: #F59E0B;  /* Amber */
--coverage-weak: #F97316;      /* Orange */
--coverage-gap: #EF4444;       /* Red */
```

### Tailwind Config Update
```javascript
// tailwind.config.js
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
    },
  },
}
```

---

## Typography

### Font Stack
```css
/* Primary: Inter or system fonts */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* Monospace: For code, IDs, technical data */
font-family: 'JetBrains Mono', 'Fira Code', monospace;
```

### Type Scale
```css
/* Headings */
.text-display    { font-size: 3rem; line-height: 1.1; font-weight: 700; }     /* 48px - Hero */
.text-h1         { font-size: 2.25rem; line-height: 1.2; font-weight: 700; }  /* 36px */
.text-h2         { font-size: 1.875rem; line-height: 1.25; font-weight: 600; } /* 30px */
.text-h3         { font-size: 1.5rem; line-height: 1.3; font-weight: 600; }   /* 24px */
.text-h4         { font-size: 1.25rem; line-height: 1.4; font-weight: 600; }  /* 20px */
.text-h5         { font-size: 1.125rem; line-height: 1.4; font-weight: 500; } /* 18px */

/* Body */
.text-body-lg    { font-size: 1.125rem; line-height: 1.6; }  /* 18px */
.text-body       { font-size: 1rem; line-height: 1.6; }      /* 16px */
.text-body-sm    { font-size: 0.875rem; line-height: 1.5; }  /* 14px */
.text-caption    { font-size: 0.75rem; line-height: 1.4; }   /* 12px */
```

---

## Component Specifications

### Buttons

#### Primary Button (Green)
```tsx
<button className="
  bg-emerald-500 
  hover:bg-emerald-600 
  active:bg-emerald-700
  text-white 
  font-medium 
  px-4 py-2.5 
  rounded-lg 
  transition-all 
  duration-150
  shadow-sm
  hover:shadow-md
  focus:outline-none 
  focus:ring-2 
  focus:ring-emerald-500 
  focus:ring-offset-2
">
  Run Analysis
</button>
```

#### Secondary Button (Outline)
```tsx
<button className="
  bg-white
  border border-gray-300
  hover:border-gray-400
  hover:bg-gray-50
  text-gray-700
  font-medium
  px-4 py-2.5
  rounded-lg
  transition-all
  duration-150
  focus:outline-none
  focus:ring-2
  focus:ring-emerald-500
  focus:ring-offset-2
">
  Cancel
</button>
```

#### Ghost Button
```tsx
<button className="
  text-gray-600
  hover:text-gray-900
  hover:bg-gray-100
  font-medium
  px-4 py-2.5
  rounded-lg
  transition-all
  duration-150
">
  Learn More
</button>
```

#### Danger Button
```tsx
<button className="
  bg-red-500
  hover:bg-red-600
  text-white
  font-medium
  px-4 py-2.5
  rounded-lg
  transition-all
  duration-150
  focus:ring-2
  focus:ring-red-500
  focus:ring-offset-2
">
  Delete
</button>
```

### Cards

#### Standard Card
```tsx
<div className="
  bg-white 
  rounded-xl 
  border border-gray-200
  shadow-sm
  hover:shadow-md
  transition-shadow
  duration-200
  p-6
">
  {/* Card content */}
</div>
```

#### Interactive Card (Clickable)
```tsx
<div className="
  bg-white 
  rounded-xl 
  border border-gray-200
  shadow-sm
  hover:shadow-lg
  hover:border-emerald-200
  transition-all
  duration-200
  p-6
  cursor-pointer
  group
">
  <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
    {title}
  </h3>
</div>
```

#### Stats Card
```tsx
<div className="bg-white rounded-xl border border-gray-200 p-6">
  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
    Total Analyses
  </p>
  <p className="mt-2 text-3xl font-bold text-gray-900">
    247
  </p>
  <p className="mt-1 text-sm text-emerald-600 flex items-center gap-1">
    <TrendingUp className="w-4 h-4" />
    +12% from last month
  </p>
</div>
```

### Navigation

#### Sidebar
```tsx
<aside className="
  w-64 
  bg-gray-900 
  text-white 
  min-h-screen 
  p-4
  flex 
  flex-col
">
  {/* Logo */}
  <div className="px-2 py-4 mb-6">
    <span className="text-2xl font-bold">
      <span className="text-white">Bid</span>
      <span className="text-emerald-400">Fit</span>
    </span>
  </div>
  
  {/* Nav Items */}
  <nav className="flex-1 space-y-1">
    <NavItem icon={Home} label="Dashboard" active />
    <NavItem icon={FileText} label="Opportunities" />
    <NavItem icon={FolderOpen} label="Documents" />
    <NavItem icon={BarChart3} label="Analyses" />
    <NavItem icon={Settings} label="Settings" />
  </nav>
</aside>
```

#### Nav Item Component
```tsx
// Active state
<a className="
  flex items-center gap-3
  px-3 py-2.5
  rounded-lg
  bg-emerald-500/10
  text-emerald-400
  font-medium
  transition-colors
">
  <Icon className="w-5 h-5" />
  {label}
</a>

// Default state
<a className="
  flex items-center gap-3
  px-3 py-2.5
  rounded-lg
  text-gray-400
  hover:text-white
  hover:bg-white/5
  transition-colors
">
  <Icon className="w-5 h-5" />
  {label}
</a>
```

### Tables

#### Modern Table
```tsx
<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
  <table className="w-full">
    <thead>
      <tr className="bg-gray-50 border-b border-gray-200">
        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Requirement
        </th>
        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Status
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-100">
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-6 py-4 text-sm text-gray-900">
          {content}
        </td>
        <td className="px-6 py-4">
          <StatusBadge status="strong" />
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

### Badges & Status Indicators

#### Coverage Status Badges
```tsx
// STRONG - Green
<span className="
  inline-flex items-center gap-1.5
  px-2.5 py-1
  rounded-full
  text-xs font-medium
  bg-emerald-100
  text-emerald-700
">
  <CheckCircle className="w-3.5 h-3.5" />
  Strong
</span>

// MODERATE - Amber
<span className="
  inline-flex items-center gap-1.5
  px-2.5 py-1
  rounded-full
  text-xs font-medium
  bg-amber-100
  text-amber-700
">
  <AlertCircle className="w-3.5 h-3.5" />
  Moderate
</span>

// WEAK - Orange
<span className="
  inline-flex items-center gap-1.5
  px-2.5 py-1
  rounded-full
  text-xs font-medium
  bg-orange-100
  text-orange-700
">
  <AlertCircle className="w-3.5 h-3.5" />
  Weak
</span>

// GAP - Red
<span className="
  inline-flex items-center gap-1.5
  px-2.5 py-1
  rounded-full
  text-xs font-medium
  bg-red-100
  text-red-700
">
  <XCircle className="w-3.5 h-3.5" />
  Gap
</span>
```

#### Score Badges
```tsx
// High Score (70-100)
<div className="
  inline-flex items-center justify-center
  w-16 h-16
  rounded-full
  bg-emerald-100
  border-4 border-emerald-500
">
  <span className="text-xl font-bold text-emerald-700">85%</span>
</div>

// Medium Score (40-69)
<div className="
  inline-flex items-center justify-center
  w-16 h-16
  rounded-full
  bg-amber-100
  border-4 border-amber-500
">
  <span className="text-xl font-bold text-amber-700">62%</span>
</div>

// Low Score (0-39)
<div className="
  inline-flex items-center justify-center
  w-16 h-16
  rounded-full
  bg-red-100
  border-4 border-red-500
">
  <span className="text-xl font-bold text-red-700">28%</span>
</div>
```

### Progress Bars

#### Dimensional Score Bar
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

#### Multi-Segment Progress (Requirements Summary)
```tsx
<div className="space-y-2">
  <div className="flex justify-between text-sm">
    <span className="font-medium text-gray-700">Requirements Coverage</span>
    <span className="text-gray-500">18 of 26 (69%)</span>
  </div>
  <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
    <div className="bg-emerald-500" style={{ width: '38%' }} /> {/* Strong */}
    <div className="bg-amber-400" style={{ width: '31%' }} />   {/* Moderate */}
    <div className="bg-red-400" style={{ width: '31%' }} />     {/* Gap */}
  </div>
  <div className="flex gap-4 text-xs">
    <span className="flex items-center gap-1">
      <div className="w-2 h-2 rounded-full bg-emerald-500" /> 10 Strong
    </span>
    <span className="flex items-center gap-1">
      <div className="w-2 h-2 rounded-full bg-amber-400" /> 8 Partial
    </span>
    <span className="flex items-center gap-1">
      <div className="w-2 h-2 rounded-full bg-red-400" /> 8 Gaps
    </span>
  </div>
</div>
```

### Alerts & Callouts

#### Red Flags Alert (Updated)
```tsx
<div className="
  bg-red-50 
  border border-red-200 
  rounded-xl 
  p-5
  relative
  overflow-hidden
">
  {/* Accent bar */}
  <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
  
  <div className="flex gap-3">
    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
    <div>
      <h3 className="font-semibold text-red-800">
        Red Flags — Do NOT Include in Proposal
      </h3>
      <ul className="mt-3 space-y-2">
        {flags.map((flag, i) => (
          <li key={i} className="text-sm text-red-700">
            <span className="font-medium">{flag.warning}</span>
            <span className="text-red-600 block">{flag.reason}</span>
          </li>
        ))}
      </ul>
    </div>
  </div>
</div>
```

#### Evaluator Perspective Callout (Updated)
```tsx
<div className="
  bg-gray-900 
  rounded-xl 
  p-5
  text-white
">
  <div className="flex gap-3">
    <Eye className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
    <div>
      <h3 className="font-semibold text-emerald-400">
        Evaluator Perspective
      </h3>
      <p className="mt-2 text-gray-300 leading-relaxed">
        {perspective}
      </p>
    </div>
  </div>
</div>
```

#### Success Alert
```tsx
<div className="
  bg-emerald-50 
  border border-emerald-200 
  rounded-xl 
  p-4
  flex items-center gap-3
">
  <CheckCircle className="w-5 h-5 text-emerald-500" />
  <p className="text-sm text-emerald-700">
    Analysis completed successfully
  </p>
</div>
```

### Form Elements

#### Text Input
```tsx
<div className="space-y-1.5">
  <label className="text-sm font-medium text-gray-700">
    Opportunity Title
  </label>
  <input
    type="text"
    className="
      w-full
      px-4 py-2.5
      border border-gray-300
      rounded-lg
      text-gray-900
      placeholder-gray-400
      focus:outline-none
      focus:ring-2
      focus:ring-emerald-500
      focus:border-emerald-500
      transition-shadow
    "
    placeholder="Enter title..."
  />
</div>
```

#### Select Dropdown
```tsx
<select className="
  w-full
  px-4 py-2.5
  border border-gray-300
  rounded-lg
  text-gray-900
  bg-white
  focus:outline-none
  focus:ring-2
  focus:ring-emerald-500
  focus:border-emerald-500
  appearance-none
  cursor-pointer
">
  <option>Select option...</option>
</select>
```

#### Checkbox
```tsx
<label className="flex items-center gap-3 cursor-pointer">
  <input
    type="checkbox"
    className="
      w-4 h-4
      rounded
      border-gray-300
      text-emerald-500
      focus:ring-emerald-500
      focus:ring-offset-0
    "
  />
  <span className="text-sm text-gray-700">Include in analysis</span>
</label>
```

### Modals

#### Modal Container
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
  {/* Backdrop */}
  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
  
  {/* Modal */}
  <div className="
    relative
    bg-white
    rounded-2xl
    shadow-2xl
    w-full
    max-w-lg
    max-h-[90vh]
    overflow-hidden
  ">
    {/* Header */}
    <div className="px-6 py-4 border-b border-gray-200">
      <h2 className="text-xl font-semibold text-gray-900">Modal Title</h2>
    </div>
    
    {/* Body */}
    <div className="px-6 py-4 overflow-y-auto">
      {/* Content */}
    </div>
    
    {/* Footer */}
    <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
      <button className="btn-secondary">Cancel</button>
      <button className="btn-primary">Confirm</button>
    </div>
  </div>
</div>
```

### Empty States

```tsx
<div className="
  flex flex-col items-center justify-center
  py-16
  text-center
">
  <div className="
    w-16 h-16
    rounded-full
    bg-gray-100
    flex items-center justify-center
    mb-4
  ">
    <FileText className="w-8 h-8 text-gray-400" />
  </div>
  <h3 className="text-lg font-semibold text-gray-900">No documents yet</h3>
  <p className="mt-1 text-sm text-gray-500 max-w-sm">
    Upload your first past performance document to get started.
  </p>
  <button className="mt-4 btn-primary">
    <Upload className="w-4 h-4 mr-2" />
    Upload Document
  </button>
</div>
```

### Loading States

#### Skeleton Loader
```tsx
<div className="animate-pulse space-y-4">
  <div className="h-4 bg-gray-200 rounded w-3/4" />
  <div className="h-4 bg-gray-200 rounded w-1/2" />
  <div className="h-4 bg-gray-200 rounded w-5/6" />
</div>
```

#### Spinner
```tsx
<div className="
  w-6 h-6
  border-2 border-gray-200
  border-t-emerald-500
  rounded-full
  animate-spin
" />
```

#### Analysis Loading State
```tsx
<div className="flex flex-col items-center justify-center py-16">
  <div className="relative">
    <div className="w-16 h-16 border-4 border-gray-200 border-t-emerald-500 rounded-full animate-spin" />
    <div className="absolute inset-0 flex items-center justify-center">
      <FileSearch className="w-6 h-6 text-emerald-500" />
    </div>
  </div>
  <p className="mt-4 text-lg font-medium text-gray-900">Analyzing documents...</p>
  <p className="text-sm text-gray-500">This may take a minute</p>
</div>
```

---

## Page Layouts

### Dashboard Layout
```tsx
<div className="min-h-screen bg-gray-50">
  {/* Sidebar */}
  <Sidebar />
  
  {/* Main Content */}
  <main className="ml-64 p-8">
    {/* Page Header */}
    <div className="mb-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="text-gray-500">Welcome back, here's your overview</p>
    </div>
    
    {/* Stats Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatsCard />
      <StatsCard />
      <StatsCard />
      <StatsCard />
    </div>
    
    {/* Content Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card title="Recent Analyses" />
      </div>
      <div>
        <Card title="Quick Actions" />
      </div>
    </div>
  </main>
</div>
```

### Analysis Results Layout
```tsx
<div className="min-h-screen bg-gray-50">
  <Sidebar />
  
  <main className="ml-64 p-8">
    {/* Breadcrumb */}
    <nav className="text-sm text-gray-500 mb-4">
      <span>Opportunities</span> / <span>NAVSUP HAZMAT</span> / <span className="text-gray-900">Analysis</span>
    </nav>
    
    {/* Header with Score */}
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gap Analysis Results</h1>
        <p className="text-gray-500">NAVSUP FLC Norfolk HAZMAT Support Services</p>
      </div>
      <div className="flex items-center gap-4">
        <ScoreBadge score={70} />
        <GoNoGoBadge status="conditional" />
      </div>
    </div>
    
    {/* Requirements Matrix - TOP */}
    <RequirementsMatrix />
    
    {/* Two Column Layout */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
      <div className="lg:col-span-2 space-y-6">
        <EvaluatorPerspective />
        <DimensionalScores />
        <Strengths />
        <Weaknesses />
      </div>
      <div className="space-y-6">
        <RedFlags />
        <Recommendations />
        <ExportCard />
      </div>
    </div>
  </main>
</div>
```

---

## Animation & Transitions

### Standard Transitions
```css
/* Fast (buttons, hover states) */
transition: all 150ms ease;

/* Medium (cards, modals) */
transition: all 200ms ease;

/* Slow (page transitions) */
transition: all 300ms ease;
```

### Micro-interactions
```tsx
// Button hover lift
className="hover:-translate-y-0.5 transition-transform"

// Card hover grow
className="hover:scale-[1.02] transition-transform"

// Fade in on mount
className="animate-in fade-in duration-300"
```

---

## Shadows

```css
/* Subtle (cards, inputs) */
shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);

/* Default (elevated cards) */
shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);

/* Medium (dropdowns, modals) */
shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);

/* Large (popovers) */
shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);

/* XL (modal overlays) */
shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
```

---

## Border Radius

```css
/* Small (badges, small buttons) */
rounded: 0.25rem (4px)
rounded-md: 0.375rem (6px)

/* Default (buttons, inputs, cards) */
rounded-lg: 0.5rem (8px)

/* Large (cards, modals) */
rounded-xl: 0.75rem (12px)
rounded-2xl: 1rem (16px)

/* Full (pills, avatars) */
rounded-full: 9999px
```

---

## Icons

Use **Lucide React** icons consistently:

```tsx
import { 
  // Navigation
  Home, FileText, FolderOpen, BarChart3, Settings,
  
  // Actions
  Plus, Upload, Download, Search, Filter, MoreHorizontal,
  
  // Status
  CheckCircle, AlertCircle, XCircle, AlertTriangle, Info,
  
  // Analysis
  Eye, Target, TrendingUp, TrendingDown, Zap,
  
  // Misc
  ChevronDown, ChevronRight, ArrowRight, ExternalLink
} from 'lucide-react';

// Standard size
<Icon className="w-5 h-5" />

// Small
<Icon className="w-4 h-4" />

// Large
<Icon className="w-6 h-6" />
```

---

## Responsive Breakpoints

```css
/* Mobile first */
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Small laptops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large screens */
```

---

## Dark Mode (Future)

Reserve these for future dark mode implementation:

```css
/* Dark backgrounds */
--dark-bg: #0F0F0F;
--dark-card: #1A1A1A;
--dark-border: #2A2A2A;

/* Dark text */
--dark-text-primary: #FFFFFF;
--dark-text-secondary: #A1A1A1;

/* Dark brand green */
--dark-brand-green: #34D399; /* Slightly lighter for contrast */
```

---

## File Structure for Styles

```
frontend/
├── src/
│   ├── styles/
│   │   └── globals.css          # Tailwind imports + CSS variables
│   ├── components/
│   │   ├── ui/                  # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Table.tsx
│   │   │   └── Modal.tsx
│   │   └── analysis/            # Analysis-specific components
│   │       ├── RequirementsMatrix.tsx
│   │       ├── RedFlags.tsx
│   │       ├── EvaluatorPerspective.tsx
│   │       └── DimensionalScores.tsx
│   └── app/
│       └── globals.css          # App-level styles
└── tailwind.config.js           # Tailwind configuration
```

---

## Implementation Checklist

```
□ Update tailwind.config.js with brand colors
□ Update globals.css with CSS variables
□ Create/update Button component variants
□ Create/update Card component
□ Update Sidebar with dark theme + green accents
□ Update all status badges to use new colors
□ Update RequirementsMatrix with new table styles
□ Update RedFlags with new alert style
□ Update EvaluatorPerspective with dark callout
□ Update DimensionalScores with new progress bars
□ Update page layouts with proper spacing
□ Add loading states with new spinner
□ Test responsive behavior
□ Verify accessibility (contrast ratios)
```

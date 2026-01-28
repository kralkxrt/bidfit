# BidWin Design System

## Brand Identity

### Name
**BidWin** — Clean, strong, memorable. Says exactly what it does.

### Tagline Options
- "Win more. Waste less."
- "Know before you bid."
- "Capture intelligence, delivered."

---

## Color Palette

### Primary Colors
```css
/* Primary Blue - Main actions, active states, links */
--color-primary: #3B82F6;        /* blue-500 */
--color-primary-dark: #2563EB;   /* blue-600 - hover */
--color-primary-light: #60A5FA;  /* blue-400 - accents */
--color-primary-50: #EFF6FF;     /* blue-50 - backgrounds */

/* Roxy Purple - Her brand identity */
--color-roxy: #8B5CF6;           /* violet-500 */
--color-roxy-dark: #7C3AED;      /* violet-600 */
--color-roxy-light: #A78BFA;     /* violet-400 */
--color-roxy-gradient: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
```

### Semantic Colors
```css
/* Success - GO decisions, positive scores */
--color-success: #22C55E;        /* green-500 */
--color-success-bg: #DCFCE7;     /* green-100 */

/* Warning - CONDITIONAL, moderate risks */
--color-warning: #F59E0B;        /* amber-500 */
--color-warning-bg: #FEF3C7;     /* amber-100 */

/* Danger - NO-GO, gaps, critical issues */
--color-danger: #EF4444;         /* red-500 */
--color-danger-bg: #FEE2E2;      /* red-100 */

/* Info - Neutral information */
--color-info: #3B82F6;           /* blue-500 */
--color-info-bg: #DBEAFE;        /* blue-100 */
```

### Neutral Colors
```css
/* Backgrounds */
--bg-app: #F8FAFC;               /* slate-50 - main app background */
--bg-card: #FFFFFF;              /* white - cards, panels */
--bg-sidebar: #0F172A;           /* slate-900 - dark sidebar */
--bg-hover: #F1F5F9;             /* slate-100 - hover states */

/* Text */
--text-primary: #0F172A;         /* slate-900 - headings */
--text-secondary: #475569;       /* slate-600 - body text */
--text-muted: #94A3B8;           /* slate-400 - captions, hints */
--text-inverse: #FFFFFF;         /* white - on dark backgrounds */

/* Borders */
--border-light: #E2E8F0;         /* slate-200 */
--border-default: #CBD5E1;       /* slate-300 */
--border-dark: #94A3B8;          /* slate-400 */
```

### Tailwind Config
```typescript
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      colors: {
        // Custom brand colors
        roxy: {
          DEFAULT: '#8B5CF6',
          dark: '#7C3AED',
          light: '#A78BFA',
          50: '#F5F3FF',
        },
        // Extend existing colors as needed
      },
      
      // Custom shadows
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 16px rgba(0, 0, 0, 0.08)',
        'large': '0 8px 32px rgba(0, 0, 0, 0.12)',
        'roxy': '0 4px 20px rgba(139, 92, 246, 0.25)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.1)',
      },
      
      // Animations
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
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
/* Primary - Clean, modern, readable */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* Mono - Code, technical content */
--font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
```

### Type Scale
```css
/* Headings */
.text-h1 { @apply text-3xl font-bold tracking-tight; }      /* 30px */
.text-h2 { @apply text-2xl font-semibold tracking-tight; }  /* 24px */
.text-h3 { @apply text-xl font-semibold; }                  /* 20px */
.text-h4 { @apply text-lg font-medium; }                    /* 18px */

/* Body */
.text-body { @apply text-base text-slate-600; }             /* 16px */
.text-body-sm { @apply text-sm text-slate-600; }            /* 14px */

/* UI Elements */
.text-label { @apply text-sm font-medium text-slate-700; }
.text-caption { @apply text-xs text-slate-500; }
.text-overline { @apply text-xs font-semibold uppercase tracking-wider text-slate-400; }
```

### Tailwind Classes
```tsx
// Heading examples
<h1 className="text-3xl font-bold text-slate-900 tracking-tight">Page Title</h1>
<h2 className="text-2xl font-semibold text-slate-900">Section Title</h2>
<h3 className="text-lg font-medium text-slate-800">Card Title</h3>

// Body text
<p className="text-base text-slate-600 leading-relaxed">Body content...</p>
<p className="text-sm text-slate-500">Secondary text...</p>

// Labels and captions
<label className="text-sm font-medium text-slate-700">Field Label</label>
<span className="text-xs text-slate-400 uppercase tracking-wider">Overline</span>
```

---

## Component Styles

### Cards
```tsx
// Base Card
<div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
  {/* content */}
</div>

// Interactive Card (clickable)
<div className="bg-white rounded-xl border border-slate-200 shadow-card p-6 
                hover:shadow-card-hover hover:border-blue-200 
                transition-all duration-200 cursor-pointer">
  {/* content */}
</div>

// Elevated Card
<div className="bg-white rounded-xl shadow-medium p-6">
  {/* content */}
</div>
```

### Buttons
```tsx
// Primary Button
<button className="bg-blue-500 hover:bg-blue-600 text-white font-medium 
                   px-4 py-2.5 rounded-lg shadow-sm 
                   hover:shadow-md active:scale-[0.98]
                   transition-all duration-150
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
  Primary Action
</button>

// Secondary Button
<button className="bg-white hover:bg-slate-50 text-slate-700 font-medium 
                   px-4 py-2.5 rounded-lg border border-slate-300
                   hover:border-slate-400 active:scale-[0.98]
                   transition-all duration-150
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
  Secondary
</button>

// Ghost Button
<button className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 
                   font-medium px-4 py-2.5 rounded-lg
                   transition-all duration-150">
  Ghost
</button>

// Danger Button
<button className="bg-red-500 hover:bg-red-600 text-white font-medium 
                   px-4 py-2.5 rounded-lg shadow-sm
                   focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
  Delete
</button>
```

### Inputs
```tsx
// Text Input
<input 
  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 
             bg-white text-slate-900 placeholder-slate-400
             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
             transition-all duration-150"
  placeholder="Enter text..."
/>

// Input with Label
<div className="space-y-1.5">
  <label className="text-sm font-medium text-slate-700">Label</label>
  <input className="..." />
  <p className="text-xs text-slate-500">Helper text goes here.</p>
</div>
```

### Badges
```tsx
// Status Badges
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full 
                 text-xs font-medium bg-green-100 text-green-700">
  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
  Active
</span>

// GO / NO-GO / CONDITIONAL
<span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg 
                 text-sm font-semibold bg-green-100 text-green-700">
  GO
</span>

<span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg 
                 text-sm font-semibold bg-amber-100 text-amber-700">
  CONDITIONAL
</span>

<span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg 
                 text-sm font-semibold bg-red-100 text-red-700">
  NO-GO
</span>

// Gap Coverage Badges
<span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Strong</span>
<span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">Moderate</span>
<span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">Weak</span>
<span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">Gap</span>
```

---

## Roxy-Specific Styling

### Roxy Avatar
```tsx
// Large (welcome screen)
<div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 
                flex items-center justify-center shadow-roxy">
  <span className="text-2xl font-bold text-white">R</span>
</div>

// Medium (header)
<div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 
                flex items-center justify-center shadow-lg shadow-purple-500/25">
  <span className="text-lg font-bold text-white">R</span>
</div>

// Small (inline with messages)
<div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 
                flex items-center justify-center">
  <span className="text-xs font-bold text-white">R</span>
</div>
```

### Roxy Message Styling
```tsx
// Roxy's messages (assistant)
<div className="bg-gradient-to-br from-violet-500/5 to-purple-600/5 
                border border-violet-200/50 rounded-2xl px-4 py-3">
  <div className="flex items-center gap-2 mb-2">
    {/* Small avatar */}
    <span className="text-xs font-medium text-violet-600">Roxy</span>
  </div>
  <p className="text-slate-700">{message}</p>
</div>

// User's messages
<div className="bg-slate-100 rounded-2xl px-4 py-3 ml-auto max-w-[80%]">
  <p className="text-slate-700">{message}</p>
</div>
```

### Roxy Panel Header
```tsx
<div className="flex items-center gap-3 p-4 border-b border-slate-200 bg-white">
  {/* Avatar */}
  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 
                  flex items-center justify-center shadow-lg shadow-purple-500/25">
    <span className="text-lg font-bold text-white">R</span>
  </div>

  {/* Name */}
  <h3 className="flex-1 font-semibold text-slate-900">Roxy</h3>

  {/* Online Status */}
  <div className="flex items-center gap-2">
    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse-soft"></span>
    <span className="text-xs text-slate-400">Online</span>
  </div>
</div>
```

### Citation Pills
```tsx
// Clickable citation in Roxy's message
<button className="inline-flex items-center gap-1 px-2 py-0.5 
                   bg-blue-50 hover:bg-blue-100 
                   text-blue-600 text-xs font-medium rounded
                   transition-colors duration-150">
  <FileText className="w-3 h-3" />
  Section L.5, p.12
</button>
```

---

## Sidebar (Dark Theme)

```tsx
<aside className="w-16 bg-slate-900 flex flex-col items-center py-4 min-h-screen">
  {/* Logo */}
  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 
                  flex items-center justify-center mb-8 shadow-lg">
    <span className="text-white font-bold text-lg">B</span>
  </div>

  {/* Nav Item - Default */}
  <button className="w-10 h-10 rounded-lg flex items-center justify-center 
                     text-slate-400 hover:text-white hover:bg-white/10 
                     transition-colors duration-150">
    <HomeIcon className="w-5 h-5" />
  </button>

  {/* Nav Item - Active */}
  <button className="w-10 h-10 rounded-lg flex items-center justify-center 
                     bg-blue-500/20 text-blue-400">
    <FileTextIcon className="w-5 h-5" />
  </button>
</aside>
```

---

## Organization Switcher

```tsx
<div className="flex items-center gap-2 px-3 py-2 rounded-lg 
                hover:bg-slate-100 cursor-pointer transition-colors">
  <Building2 className="w-4 h-4 text-slate-500" />
  <span className="font-medium text-slate-900">Talion Construction</span>
  <ChevronDown className="w-4 h-4 text-slate-400" />
</div>

{/* Dropdown */}
<div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl 
                border border-slate-200 shadow-large py-2 z-50">
  <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase">
    Your Organizations
  </div>
  
  {/* Selected */}
  <div className="px-3 py-2 flex items-center justify-between bg-blue-50">
    <span className="text-slate-900">Talion Construction</span>
    <Check className="w-4 h-4 text-blue-500" />
  </div>
  
  {/* Other orgs */}
  <div className="px-3 py-2 hover:bg-slate-50 cursor-pointer">
    <span className="text-slate-700">Pera Inc</span>
  </div>
  
  <div className="border-t border-slate-100 mt-2 pt-2">
    <div className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-blue-600 flex items-center gap-2">
      <Plus className="w-4 h-4" />
      Add Organization
    </div>
  </div>
</div>
```

---

## Score Displays

### Circular Score
```tsx
// High Score (70-100) - Green
<div className="relative w-20 h-20">
  <svg className="w-full h-full -rotate-90">
    <circle cx="40" cy="40" r="36" stroke="#E2E8F0" strokeWidth="6" fill="none" />
    <circle cx="40" cy="40" r="36" stroke="#22C55E" strokeWidth="6" fill="none"
            strokeDasharray={`${score * 2.26} 226`} strokeLinecap="round" />
  </svg>
  <div className="absolute inset-0 flex items-center justify-center">
    <span className="text-2xl font-bold text-green-600">{score}%</span>
  </div>
</div>

// Medium Score (40-69) - Amber
<div className="...">
  <circle ... stroke="#F59E0B" />
  <span className="text-amber-600">{score}%</span>
</div>

// Low Score (0-39) - Red
<div className="...">
  <circle ... stroke="#EF4444" />
  <span className="text-red-600">{score}%</span>
</div>
```

### Progress Bar
```tsx
<div className="space-y-2">
  <div className="flex justify-between text-sm">
    <span className="font-medium text-slate-700">Scope Alignment</span>
    <span className="text-slate-500">75%</span>
  </div>
  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
    <div 
      className="h-full bg-blue-500 rounded-full transition-all duration-500"
      style={{ width: '75%' }}
    />
  </div>
</div>
```

---

## Tables

```tsx
<div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
  <table className="w-full">
    <thead>
      <tr className="bg-slate-50 border-b border-slate-200">
        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Column Header
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100">
      <tr className="hover:bg-slate-50 transition-colors">
        <td className="px-6 py-4 text-sm text-slate-900">
          Cell content
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

---

## Loading States

### Spinner
```tsx
<div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 
                rounded-full animate-spin" />
```

### Skeleton
```tsx
<div className="animate-pulse space-y-3">
  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
  <div className="h-4 bg-slate-200 rounded w-1/2"></div>
  <div className="h-4 bg-slate-200 rounded w-5/6"></div>
</div>
```

### Full Page Loading
```tsx
<div className="flex flex-col items-center justify-center h-full">
  <div className="w-12 h-12 border-3 border-slate-200 border-t-blue-500 
                  rounded-full animate-spin mb-4" />
  <p className="text-slate-600 font-medium">Analyzing documents...</p>
  <p className="text-slate-400 text-sm">This may take a moment</p>
</div>
```

---

## Empty States

```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
    <FileText className="w-8 h-8 text-slate-400" />
  </div>
  <h3 className="text-lg font-semibold text-slate-900">No documents yet</h3>
  <p className="mt-1 text-sm text-slate-500 max-w-sm">
    Upload your first RFP document to get started with analysis.
  </p>
  <button className="mt-4 bg-blue-500 hover:bg-blue-600 text-white 
                     font-medium px-4 py-2.5 rounded-lg">
    Upload Document
  </button>
</div>
```

---

## Transitions & Animations

### Standard Transitions
```css
/* Use these consistently */
transition-all duration-150     /* Fast - buttons, hovers */
transition-all duration-200     /* Medium - cards, panels */
transition-all duration-300     /* Slow - modals, drawers */
```

### Hover Effects
```tsx
// Lift effect
className="hover:-translate-y-0.5 transition-transform"

// Glow effect (for important buttons)
className="hover:shadow-lg hover:shadow-blue-500/25 transition-shadow"

// Scale effect (subtle)
className="active:scale-[0.98] transition-transform"
```

---

## Global CSS Variables

```css
/* globals.css */

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  /* Colors */
  --color-primary: #3B82F6;
  --color-roxy: #8B5CF6;
  
  /* Spacing */
  --space-page: 1.5rem;  /* 24px - page padding */
  --space-card: 1.5rem;  /* 24px - card padding */
  --space-section: 2rem; /* 32px - between sections */
  
  /* Radii */
  --radius-sm: 0.5rem;   /* 8px */
  --radius-md: 0.75rem;  /* 12px */
  --radius-lg: 1rem;     /* 16px */
  --radius-xl: 1.5rem;   /* 24px */
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background-color: #F8FAFC;
  color: #0F172A;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #CBD5E1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94A3B8;
}
```

---

## Z-Index Scale

```css
--z-dropdown: 50;
--z-sticky: 100;
--z-modal: 200;
--z-tooltip: 300;
--z-toast: 400;
```

---

## Responsive Breakpoints

```css
/* Tailwind defaults - use these */
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Small laptops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large screens */
```

---

## Do's and Don'ts

### ✅ Do
- Use consistent spacing (4, 6, 8, 12, 16, 24, 32)
- Use rounded-lg or rounded-xl for cards
- Use subtle shadows (shadow-card, shadow-medium)
- Use the blue/purple color system consistently
- Add hover states to all interactive elements
- Use transitions for smooth interactions

### ❌ Don't
- Use harsh shadows
- Use pure black (#000) for text
- Mix rounded sizes inconsistently
- Forget focus states for accessibility
- Use colors outside the defined palette
- Skip loading/empty states

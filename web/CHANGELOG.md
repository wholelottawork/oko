# Web Dashboard Changelog

## v2.0 - Major UI Upgrade (inspired by the nof0 design)

### Style Improvements

#### Color Scheme

- Adopted the nof0 project's minimalist black, white, and gray color scheme.
- Primary palette:
  - Pure black background: `#0a0a0a`
  - White text: `#ededed`
  - Gray borders: `rgba(255, 255, 255, 0.1)`
  - Brand colors reserved for AI-provider identity: DeepSeek blue `#4d6bfe` and Qwen purple `#8b5cf6`
- Added IBM Plex Mono for a professional, monospaced trading-interface style.
- Added a gray terminal scan-line animation for a professional trading atmosphere.

#### UI Components

- **Header**
  - Pure white title text
  - Glass-effect blurred background
  - Sticky positioning
  - Pulsing status indicator
  - Distinct DeepSeek and Qwen provider colors
- **Statistic cards**
  - Translucent `bg-gray-900/50` background
  - Highlighted borders on hover
  - Monospaced numeric values
  - Uppercase labels for a denser professional presentation
- **Shared effects**
  - `animate-fade-in` entry animation
  - Smooth transitions
  - Custom scrollbar styles
  - Button hover states

### New Feature: Account Equity Curve

#### Backend API

- Added `GET /api/equity-history`.
- Returns account-equity data for the most recent 30 cycles.
- Includes timestamps, equity, P&L, and cycle numbers.

#### Frontend Chart Component (`EquityChart`)

- **Display modes**
  - USD mode for absolute amounts
  - Percentage mode for returns
  - One-click switching
- **Chart features**
  - Recharts integration
  - Minimal white-to-gray gradient line
  - Reference line for initial balance or 0%
  - Detailed custom tooltip
  - Responsive layout
- **Data display**
  - Current equity and total P&L
  - Initial-balance comparison
  - Data-point count
  - Automatic refresh every 10 seconds

### Component Structure

```text
web/src/
├── components/
│   └── EquityChart.tsx  # Equity curve chart
├── lib/
│   └── api.ts           # Adds getEquityHistory()
├── index.css            # New styling system
└── App.tsx              # Chart integration
```

### Visual Comparison

**Before:**

- Basic Tailwind dark theme
- Simple card layout
- Monotone gray palette
- No equity chart

**After:**

- Minimal nof0-style black, white, and gray palette
- Terminal scan-line effect
- White text and gray visual language
- Real-time equity curve
- IBM Plex Mono typography
- Glass and motion effects

### Performance Improvements

- SWR caching and automatic refresh
- Component-level code splitting
- Responsive-design optimizations
- Automatic chart-data downsampling

### Responsive Design

- Mobile-optimized layouts
- Multi-column tablet and desktop views
- Charts that adapt to container width
- Touch-friendly interactions

### Technology Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- SWR
- IBM Plex Mono

---

**Updated:** 2025-10-27

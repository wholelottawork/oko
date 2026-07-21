# NOFX Web Dashboard

An AI-powered trading monitoring dashboard built with Vite, React, and TypeScript.

## Technology Stack

- **React 18** - UI framework
- **TypeScript** - type safety
- **Vite** - build tool
- **Tailwind CSS** - styling framework
- **SWR** - data fetching and caching
- **Zustand** - state management
- **Recharts** - charting library

## Install Dependencies

```bash
npm install
```

## Run the Development Server

```bash
npm run dev
```

Visit http://localhost:3000.

## Build for Production

```bash
npm run build
```

## Features

### Real-Time Monitoring

- **System status** - running state, AI provider, and cycle count
- **Account information** - equity, available balance, total P&L, and margin usage
- **Positions** - live price, P&L, leverage, and liquidation price
- **Decision log** - expandable AI reasoning, decisions, and execution results

### AI Reasoning Analysis

Each decision record includes the complete AI reasoning process:

1. **Existing position analysis** - technical indicators and P&L assessment
2. **Account risk assessment** - margin usage and available balance
3. **Opportunity assessment** - candidate asset screening and technical-pattern analysis
4. **Decision summary** - close, open, or hold decisions

Select **AI Reasoning Analysis** to view the complete analysis.

### Automatic Refresh

- System status, account information, and positions refresh every 5 seconds.
- Decision logs and statistics refresh every 10 seconds.

### API Integration

The frontend accesses the backend API through the Vite proxy at `http://localhost:8080`.

**API endpoints:**

- `GET /api/status` - system status
- `GET /api/account` - account information
- `GET /api/positions` - positions
- `GET /api/decisions` - last 30 decision records
- `GET /api/decisions/latest` - latest five decisions
- `GET /api/statistics` - statistics

## Project Structure

```text
web/
├── src/
│   ├── components/      # React components
│   ├── lib/
│   │   └── api.ts       # API client
│   ├── store/           # Zustand state management
│   ├── types/
│   │   └── index.ts     # TypeScript type definitions
│   ├── App.tsx          # Main application component
│   ├── main.tsx         # Application entry point
│   └── index.css        # Global styles
├── index.html           # HTML template
├── vite.config.ts       # Vite configuration
├── tailwind.config.js   # Tailwind configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies and scripts
```

## Notes

1. Ensure the backend API service is running on port `8080`.
2. Node.js `18.0.0` or later is required.
3. Network access to the Binance API is required.

## Development Plan

- [ ] Add account-equity and P&L charts
- [ ] Add a decision-details page with complete reasoning analysis
- [ ] Add manual trading controls
- [ ] Add parameter-configuration pages
- [ ] Add a notification and alerting system

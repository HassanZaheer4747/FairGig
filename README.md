# FairGig — Gig Worker Income & Rights Platform

A production-grade microservices SaaS platform protecting gig worker rights through income tracking, anomaly detection, advocacy tools, and verified certificates.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React :3000)                 │
│    Dashboard · Earnings · Grievances · Analytics · Cert  │
└─────────┬───────────────────────────────────────────────┘
          │ HTTP
    ┌─────▼─────────────────────────────────────────────┐
    │                   Services                         │
    │                                                    │
    │  Auth Service      :5000  (Node.js / MongoDB)     │
    │  Earnings Service  :8001  (FastAPI / MongoDB)     │
    │    ├─→ Anomaly Service :8002 (FastAPI)            │
    │    └─→ Analytics Service :8003 (FastAPI)          │
    │  Grievance Service :5001  (Node.js / MongoDB)     │
    │  Certificate Service :8004 (FastAPI)              │
    │    └─→ Earnings Service (internal endpoint)       │
    └───────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- MongoDB (local, port 27017)
- npm, pip

### 1. Install Dependencies
```bash
start setup.bat
```

### 2. Seed Database
```bash
cd seed
node seed.js
```

### 3. Start All Services
```bash
start-all.bat
```

### 4. Open Browser
http://localhost:3000

---

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Worker | worker@demo.com | demo1234 |
| Advocate | advocate@demo.com | demo1234 |
| Verifier | verifier@demo.com | demo1234 |

---

## Demo Flow

1. **Login as Worker** → worker@demo.com / demo1234
2. **Dashboard** → See KPIs, fairness score, story insights, alerts
3. **Earnings** → Add new earning (triggers anomaly detection)
4. **Grievances** → File a complaint, see trending issues
5. **Login as Verifier** → verifier@demo.com / demo1234
6. **Verification** → Approve worker earnings
7. **Login as Worker** → Generate certificate
8. **Login as Advocate** → advocate@demo.com / demo1234
9. **Analytics** → Platform rankings, vulnerability flags, city data

---

## Features

### Worker Dashboard
- Total Earnings, Weekly Earnings, Hourly Rate, Fairness Score
- Story insights: "Your income dropped 22% this week due to higher commission"
- Income vs deductions trend chart
- Hourly rate bar chart
- You vs City Median comparison
- Color-coded anomaly alerts

### Anomaly Detection
- Income drop > 20% detection
- Abnormal deduction detection (ratio > 30%)
- Hourly rate anomaly (drop > 30%)
- Statistical z-score analysis
- Score + explanation returned

### Grievance System
- File complaints with auto-clustering (8 categories)
- Auto tag extraction
- Severity assessment
- Upvoting system
- Trending issues sidebar
- Platform rankings by complaints

### Analytics (Advocate View)
- Platform income rankings with MongoDB aggregation
- City median calculations
- Income distribution buckets
- Vulnerability flags (high deduction, low income, multiple anomalies)
- Global summary stats

### Certificate
- A4 HTML certificate
- Only verified earnings included
- Professional layout with watermark
- 90-day validity

---

## API Documentation

See docs/API.md for complete endpoint reference and inter-service flow.

---

## Project Structure

```
fairgig/
├── auth-service/          Node.js JWT auth
├── earnings-service/      FastAPI earnings CRUD + analytics calls
├── anomaly-service/       FastAPI income anomaly detection
├── analytics-service/     FastAPI MongoDB aggregation analytics
├── grievance-service/     Node.js complaint management
├── certificate-service/   FastAPI HTML certificate generation
├── frontend/              React SaaS UI
├── seed/                  MongoDB seed data (100+ records)
├── docs/                  API docs + sample CSV
├── setup.bat              One-click dependency installation
└── start-all.bat          One-click service launcher
```

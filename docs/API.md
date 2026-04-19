# FairGig API Documentation

## Service Ports

| Service | Port | Tech |
|---------|------|------|
| Auth Service | 5000 | Node.js / Express |
| Earnings Service | 8001 | FastAPI |
| Anomaly Service | 8002 | FastAPI |
| Analytics Service | 8003 | FastAPI |
| Grievance Service | 5001 | Node.js / Express |
| Certificate Service | 8004 | FastAPI |
| Frontend | 3000 | React |

---

## Auth Service (Port 5000)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/signup | No | Create account |
| POST | /api/auth/login | No | Login |
| GET | /api/auth/me | Yes | Get current user |
| PUT | /api/auth/profile | Yes | Update profile |
| GET | /api/auth/validate | No | Validate token |
| GET | /api/auth/users | Advocate/Verifier | List all users |
| GET | /health | No | Health check |

### POST /api/auth/login
```json
{
  "email": "worker@demo.com",
  "password": "demo1234"
}
```

Response:
```json
{
  "success": true,
  "token": "eyJ...",
  "user": { "name": "Demo Worker", "role": "worker", "city": "Lahore" }
}
```

---

## Earnings Service (Port 8001)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/earnings | Worker | Create earning → calls Anomaly Service |
| GET | /api/earnings | Worker | Get my earnings (paginated) |
| GET | /api/earnings/dashboard | Worker | Dashboard data → calls Analytics Service |
| GET | /api/earnings/{id} | Worker | Get single earning |
| PUT | /api/earnings/{id} | Worker/Verifier | Update earning |
| DELETE | /api/earnings/{id} | Worker | Delete earning |
| POST | /api/earnings/import/csv | Worker | CSV bulk import |
| POST | /api/earnings/upload/screenshot | Worker | Upload screenshot |
| GET | /api/earnings/admin/all | Verifier/Advocate | All earnings (admin) |
| GET | /api/earnings/internal/verified-earnings/{worker_id} | Internal | For certificate service |
| GET | /health | No | Health check |

### POST /api/earnings
```json
{
  "date": "2024-01-15",
  "platform": "Uber",
  "city": "Lahore",
  "gross_amount": 22000,
  "deductions": 4400,
  "hours_worked": 8,
  "trips_or_orders": 18,
  "notes": "Good day"
}
```

Response includes `anomaly_detected` flag and full anomaly analysis.

---

## Anomaly Service (Port 8002)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /analyze-trend | No | Analyze income anomaly |
| POST | /batch-analyze | No | Batch analyze earnings |
| GET | /health | No | Health check |

### POST /analyze-trend
```json
{
  "current_earning": {
    "gross_amount": 12000,
    "deductions": 5000,
    "net_amount": 7000,
    "hours_worked": 8,
    "hourly_rate": 875
  },
  "historical_earnings": [
    { "net_amount": 18000, "hourly_rate": 2000 },
    { "net_amount": 19000, "hourly_rate": 2100 }
  ]
}
```

Response:
```json
{
  "is_anomaly": true,
  "score": 0.65,
  "type": "income_drop",
  "explanation": "⚠️ Income dropped 62% below recent average"
}
```

Detection rules:
- Income drop > 20% from recent average
- Deduction ratio > 30%
- Hourly rate drop > 30%
- Z-score > 2.5 on deduction ratio

---

## Analytics Service (Port 8003)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /city-median | No | City income median |
| GET | /platform-trends | No | Platform rankings |
| GET | /income-distribution | No | Income distribution |
| GET | /vulnerability-flags | No | Flagged workers |
| GET | /city-overview | No | City breakdown |
| GET | /summary | No | Global summary |
| GET | /health | No | Health check |

### GET /city-median?city=Lahore&platform=Uber

Response:
```json
{
  "median": 18500,
  "sample_size": 45,
  "zone": "average",
  "city": "Lahore",
  "platform": "Uber",
  "avg_hourly": 1950,
  "avg_deduction_ratio": 19.5
}
```

---

## Grievance Service (Port 5001)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/grievances | Worker | File complaint (auto-clustered) |
| GET | /api/grievances | Any | List complaints |
| GET | /api/grievances/trending | Any | Trending clusters & tags |
| GET | /api/grievances/{id} | Any | Single complaint |
| PUT | /api/grievances/{id}/status | Advocate | Update status |
| POST | /api/grievances/{id}/upvote | Any | Upvote |
| DELETE | /api/grievances/{id} | Worker | Delete own complaint |
| GET | /health | No | Health check |

Auto-clustering categories:
- Wage Issues, Unfair Deductions, Account & Suspension
- Discrimination, Safety Concerns, App & Technical, Algorithm Fairness

---

## Certificate Service (Port 8004)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/certificate/generate/{worker_id} | Worker/Advocate | Generate HTML certificate |
| GET | /api/certificate/preview/{worker_id} | Worker/Advocate | Check eligibility |
| GET | /health | No | Health check |

Certificate requires at least 1 verified earning. Calls:
`GET http://localhost:8001/api/earnings/internal/verified-earnings/{worker_id}`

---

## Inter-Service Flow

```
[Earning Creation]
Frontend
  → POST /api/earnings (Earnings Service :8001)
    → POST /analyze-trend (Anomaly Service :8002)
    ← { is_anomaly, score, type, explanation }
  ← { earning, anomaly_detected }

[Dashboard]
Frontend
  → GET /api/earnings/dashboard (Earnings Service :8001)
    → GET /city-median (Analytics Service :8003)
    ← { median, sample_size, zone }
  ← { kpis, fairness_score, city_comparison, insights, alerts }

[Certificate]
Frontend
  → GET /api/certificate/generate/{id} (Certificate Service :8004)
    → GET /internal/verified-earnings/{id} (Earnings Service :8001)
    ← { verified_earnings, summary }
  ← HTML Certificate
```

---

## JWT Auth

All protected endpoints require:
```
Authorization: Bearer <token>
```

Token payload: `{ userId, role }`

Roles: `worker`, `verifier`, `advocate`

---

## Failure Handling

If Anomaly or Analytics service is unavailable:
- System continues without crashing
- Returns fallback: `"Service temporarily unavailable"`
- All earnings are still saved normally

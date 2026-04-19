from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
import httpx
import os
from datetime import datetime
from app.middleware.auth import get_current_user

router = APIRouter()

EARNINGS_SERVICE_URL = os.getenv("EARNINGS_SERVICE_URL", "http://localhost:8001")

def generate_certificate_html(worker_id: str, earnings_data: dict, worker_name: str = "Worker") -> str:
    summary = earnings_data.get("summary", {})
    earnings = earnings_data.get("verified_earnings", [])

    total_net = summary.get("total_net", 0)
    total_hours = summary.get("total_hours", 0)
    avg_hourly = summary.get("avg_hourly_rate", 0)
    entry_count = summary.get("entry_count", 0)

    platforms = list(set(e.get("platform", "") for e in earnings))
    cities = list(set(e.get("city", "") for e in earnings))
    date_range = ""
    if earnings:
        dates = sorted(e.get("date", "") for e in earnings if e.get("date"))
        if dates:
            date_range = f"{dates[0]} to {dates[-1]}"

    earnings_rows = ""
    for e in earnings[:15]:
        earnings_rows += f"""
        <tr>
            <td>{e.get('date', '')}</td>
            <td>{e.get('platform', '')}</td>
            <td>{e.get('city', '')}</td>
            <td>PKR {e.get('gross_amount', 0):,.0f}</td>
            <td>PKR {e.get('deductions', 0):,.0f}</td>
            <td><strong>PKR {e.get('net_amount', 0):,.0f}</strong></td>
            <td>{e.get('hours_worked', 0):.1f}h</td>
        </tr>"""

    issue_date = datetime.utcnow().strftime("%B %d, %Y")
    cert_id = f"FG-{worker_id[-6:].upper()}-{datetime.utcnow().strftime('%Y%m%d')}"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>FairGig Income Verification Certificate</title>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f0f4f8; padding: 20px; }}
  .page {{ width: 210mm; min-height: 297mm; margin: 0 auto; background: white; padding: 0; box-shadow: 0 0 30px rgba(0,0,0,0.15); }}
  .header {{ background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); padding: 40px 50px; color: white; position: relative; overflow: hidden; }}
  .header::before {{ content: ''; position: absolute; top: -50px; right: -50px; width: 200px; height: 200px; background: rgba(255,255,255,0.05); border-radius: 50%; }}
  .header::after {{ content: ''; position: absolute; bottom: -30px; left: -30px; width: 150px; height: 150px; background: rgba(255,255,255,0.05); border-radius: 50%; }}
  .logo {{ font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 5px; }}
  .logo span {{ color: #4ade80; }}
  .tagline {{ font-size: 12px; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 3px; }}
  .cert-title {{ text-align: center; margin-top: 20px; }}
  .cert-title h1 {{ font-size: 22px; font-weight: 600; color: rgba(255,255,255,0.9); }}
  .verified-badge {{ display: inline-flex; align-items: center; gap: 8px; background: rgba(74,222,128,0.2); border: 1px solid rgba(74,222,128,0.5); border-radius: 50px; padding: 6px 18px; margin-top: 10px; }}
  .verified-badge span {{ color: #4ade80; font-size: 13px; font-weight: 600; }}
  .body {{ padding: 40px 50px; }}
  .section {{ margin-bottom: 30px; }}
  .section-title {{ font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #6b7280; font-weight: 600; margin-bottom: 12px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }}
  .worker-card {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }}
  .info-item label {{ font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 3px; }}
  .info-item value, .info-item .val {{ font-size: 15px; font-weight: 600; color: #1e293b; }}
  .kpi-grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px; }}
  .kpi-card {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; padding: 15px; color: white; text-align: center; }}
  .kpi-card.green {{ background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }}
  .kpi-card.blue {{ background: linear-gradient(135deg, #2196F3 0%, #21CBF3 100%); }}
  .kpi-card.orange {{ background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }}
  .kpi-value {{ font-size: 18px; font-weight: 800; }}
  .kpi-label {{ font-size: 10px; opacity: 0.85; margin-top: 3px; text-transform: uppercase; letter-spacing: 1px; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 12px; }}
  th {{ background: #1e293b; color: white; padding: 10px 12px; text-align: left; font-weight: 600; }}
  td {{ padding: 8px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }}
  tr:nth-child(even) td {{ background: #f8fafc; }}
  .footer {{ background: #f8fafc; padding: 25px 50px; border-top: 2px solid #e2e8f0; }}
  .cert-meta {{ display: flex; justify-content: space-between; align-items: center; }}
  .cert-id {{ font-family: monospace; font-size: 12px; color: #6b7280; }}
  .disclaimer {{ font-size: 10px; color: #9ca3af; margin-top: 10px; text-align: center; }}
  .seal {{ text-align: right; }}
  .seal-circle {{ width: 70px; height: 70px; border-radius: 50%; border: 3px solid #1e293b; display: inline-flex; flex-direction: column; align-items: center; justify-content: center; font-size: 8px; font-weight: 700; color: #1e293b; text-align: center; padding: 5px; line-height: 1.2; }}
  @media print {{
    body {{ background: white; padding: 0; }}
    .page {{ box-shadow: none; }}
  }}
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo">Fair<span>Gig</span></div>
    <div class="tagline">Gig Worker Income &amp; Rights Platform</div>
    <div class="cert-title">
      <h1>Official Income Verification Certificate</h1>
      <div class="verified-badge">
        <span>✅ VERIFIED EARNINGS ONLY</span>
      </div>
    </div>
  </div>

  <div class="body">
    <div class="section">
      <div class="section-title">Worker Information</div>
      <div class="worker-card">
        <div class="info-item">
          <label>Worker Name</label>
          <div class="val">{worker_name}</div>
        </div>
        <div class="info-item">
          <label>Worker ID</label>
          <div class="val" style="font-family: monospace; font-size: 13px;">{worker_id}</div>
        </div>
        <div class="info-item">
          <label>Platforms</label>
          <div class="val">{', '.join(platforms) if platforms else 'N/A'}</div>
        </div>
        <div class="info-item">
          <label>Cities</label>
          <div class="val">{', '.join(cities) if cities else 'N/A'}</div>
        </div>
        <div class="info-item">
          <label>Period Covered</label>
          <div class="val">{date_range or 'N/A'}</div>
        </div>
        <div class="info-item">
          <label>Certificate ID</label>
          <div class="val" style="font-family: monospace; font-size: 12px;">{cert_id}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Earnings Summary</div>
      <div class="kpi-grid">
        <div class="kpi-card green">
          <div class="kpi-value">PKR {total_net:,.0f}</div>
          <div class="kpi-label">Total Net Earnings</div>
        </div>
        <div class="kpi-card blue">
          <div class="kpi-value">{total_hours:.0f}h</div>
          <div class="kpi-label">Total Hours Logged</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">PKR {avg_hourly:.0f}/h</div>
          <div class="kpi-label">Avg Hourly Rate</div>
        </div>
        <div class="kpi-card orange">
          <div class="kpi-value">{entry_count}</div>
          <div class="kpi-label">Verified Entries</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Verified Earnings Breakdown</div>
      <table>
        <thead>
          <tr>
            <th>Date</th><th>Platform</th><th>City</th>
            <th>Gross</th><th>Deductions</th><th>Net</th><th>Hours</th>
          </tr>
        </thead>
        <tbody>{earnings_rows}</tbody>
      </table>
      {'<p style="font-size:11px;color:#6b7280;margin-top:8px;">* Showing first 15 of ' + str(entry_count) + ' verified entries</p>' if entry_count > 15 else ''}
    </div>
  </div>

  <div class="footer">
    <div class="cert-meta">
      <div>
        <div class="cert-id">Certificate ID: {cert_id}</div>
        <div class="cert-id">Issued: {issue_date} | Valid for: 90 days</div>
      </div>
      <div class="seal">
        <div class="seal-circle">FAIR<br>GIG<br>✓<br>VERIFIED</div>
      </div>
    </div>
    <div class="disclaimer">
      This certificate is generated by the FairGig platform and contains only blockchain-verified earnings.
      All data has been cross-validated against platform records. Certificate ID: {cert_id}
    </div>
  </div>
</div>
</body>
</html>"""

@router.get("/generate/{worker_id}", response_class=HTMLResponse)
async def generate_certificate(worker_id: str, worker_name: str = Query("Worker"), user=Depends(get_current_user)):
    if user["role"] == "worker" and user["user_id"] != worker_id:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{EARNINGS_SERVICE_URL}/api/earnings/internal/verified-earnings/{worker_id}"
            )

        if response.status_code == 404:
            raise HTTPException(status_code=404, detail="No verified earnings found for this worker. Earnings must be verified before certificate generation.")

        if response.status_code != 200:
            raise HTTPException(status_code=502, detail="Unable to fetch earnings data from earnings service")

        earnings_data = response.json()
        html = generate_certificate_html(worker_id, earnings_data, worker_name)
        return HTMLResponse(content=html)

    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Earnings service is currently unavailable")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Certificate generation failed: {str(e)}")

@router.get("/preview/{worker_id}")
async def preview_certificate_data(worker_id: str, user=Depends(get_current_user)):
    if user["role"] == "worker" and user["user_id"] != worker_id:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{EARNINGS_SERVICE_URL}/api/earnings/internal/verified-earnings/{worker_id}"
            )

        if response.status_code != 200:
            return {"eligible": False, "message": "No verified earnings available", "summary": None}

        data = response.json()
        return {
            "eligible": True,
            "summary": data.get("summary", {}),
            "entry_count": len(data.get("verified_earnings", [])),
            "worker_id": worker_id
        }
    except Exception:
        return {"eligible": False, "message": "Service unavailable", "summary": None}

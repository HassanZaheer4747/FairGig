from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import JSONResponse
from typing import Optional, List
from datetime import datetime, timedelta
from bson import ObjectId
import csv
import io
import os
import uuid
import aiofiles
import logging

from app.database import get_db
from app.middleware.auth import get_current_user, require_role
from app.models.earning import EarningCreate, EarningUpdate
from app.services.anomaly_client import analyze_earning_trend
from app.services.analytics_client import get_city_median
from app.config import get_settings

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)

def serialize_doc(doc):
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    return doc

def compute_fairness_score(earnings: list) -> dict:
    if not earnings:
        return {"score": 0, "label": "No Data", "components": {}}

    total_gross = sum(e.get("gross_amount", 0) for e in earnings)
    total_deductions = sum(e.get("deductions", 0) for e in earnings)
    anomaly_count = sum(1 for e in earnings if e.get("anomaly", {}).get("is_anomaly", False))

    deduction_ratio = (total_deductions / total_gross) if total_gross > 0 else 0
    deduction_score = max(0, 100 - (deduction_ratio * 200))

    anomaly_ratio = anomaly_count / len(earnings) if earnings else 0
    stability_score = max(0, 100 - (anomaly_ratio * 150))

    recent = earnings[:4]
    if len(recent) >= 2:
        avg_recent = sum(e.get("net_amount", 0) for e in recent) / len(recent)
        older = earnings[4:8]
        avg_older = sum(e.get("net_amount", 0) for e in older) / len(older) if older else avg_recent
        income_trend = (avg_recent - avg_older) / avg_older * 100 if avg_older > 0 else 0
        income_score = min(100, max(0, 50 + income_trend))
    else:
        income_score = 50

    fairness_score = round((deduction_score * 0.4) + (stability_score * 0.35) + (income_score * 0.25))

    if fairness_score >= 75:
        label = "Fair"
    elif fairness_score >= 50:
        label = "Moderate"
    else:
        label = "Unfair"

    return {
        "score": fairness_score,
        "label": label,
        "components": {
            "deduction_score": round(deduction_score),
            "stability_score": round(stability_score),
            "income_score": round(income_score)
        }
    }

def generate_story_insights(earnings: list, city_median: dict) -> list:
    insights = []
    if not earnings:
        return insights

    if len(earnings) >= 2:
        latest = earnings[0].get("net_amount", 0)
        previous = earnings[1].get("net_amount", 0)
        if previous > 0:
            change_pct = ((latest - previous) / previous) * 100
            if change_pct < -15:
                insights.append({
                    "type": "income_drop",
                    "severity": "high",
                    "message": f"Your income dropped {abs(round(change_pct))}% compared to your previous entry. Consider reviewing your work schedule."
                })
            elif change_pct > 20:
                insights.append({
                    "type": "income_rise",
                    "severity": "positive",
                    "message": f"Great work! Your income increased by {round(change_pct)}% compared to last period."
                })

    total_gross = sum(e.get("gross_amount", 0) for e in earnings[:4])
    total_deductions = sum(e.get("deductions", 0) for e in earnings[:4])
    if total_gross > 0:
        deduction_pct = (total_deductions / total_gross) * 100
        if deduction_pct > 25:
            insights.append({
                "type": "high_deduction",
                "severity": "warning",
                "message": f"Your platform deductions are {round(deduction_pct)}% of gross earnings — significantly above the 15% average."
            })

    if city_median.get("median", 0) > 0:
        avg_net = sum(e.get("net_amount", 0) for e in earnings[:4]) / min(len(earnings), 4)
        median = city_median["median"]
        diff_pct = ((avg_net - median) / median) * 100
        if diff_pct < -20:
            insights.append({
                "type": "below_median",
                "severity": "warning",
                "message": f"You are earning {abs(round(diff_pct))}% below the city median for {earnings[0].get('city', 'your city')}."
            })
        elif diff_pct > 20:
            insights.append({
                "type": "above_median",
                "severity": "positive",
                "message": f"You are earning {round(diff_pct)}% above the city median — excellent performance!"
            })

    anomalies = [e for e in earnings if e.get("anomaly", {}).get("is_anomaly", False)]
    if len(anomalies) >= 2:
        insights.append({
            "type": "recurring_anomaly",
            "severity": "high",
            "message": f"Recurring income anomalies detected across {len(anomalies)} entries. This pattern may indicate platform issues."
        })

    return insights

@router.post("/", status_code=201)
async def create_earning(earning: EarningCreate, user=Depends(get_current_user)):
    db = get_db()
    net_amount = earning.gross_amount - earning.deductions
    hourly_rate = net_amount / earning.hours_worked if earning.hours_worked > 0 else 0

    historical = await db.earnings.find(
        {"worker_id": user["user_id"]},
        sort=[("date", -1)]
    ).limit(10).to_list(10)

    current_data = {
        "gross_amount": earning.gross_amount,
        "deductions": earning.deductions,
        "net_amount": net_amount,
        "hours_worked": earning.hours_worked,
        "hourly_rate": hourly_rate,
        "platform": earning.platform,
        "date": earning.date,
    }

    anomaly_result = await analyze_earning_trend(current_data, [
        {
            "gross_amount": h.get("gross_amount", 0),
            "deductions": h.get("deductions", 0),
            "net_amount": h.get("net_amount", 0),
            "hours_worked": h.get("hours_worked", 0),
            "hourly_rate": h.get("hourly_rate", 0),
        } for h in historical
    ])

    doc = {
        "worker_id": user["user_id"],
        "date": earning.date,
        "platform": earning.platform,
        "city": earning.city,
        "gross_amount": earning.gross_amount,
        "deductions": earning.deductions,
        "net_amount": net_amount,
        "hours_worked": earning.hours_worked,
        "hourly_rate": round(hourly_rate, 2),
        "trips_or_orders": earning.trips_or_orders,
        "notes": earning.notes,
        "screenshot_url": earning.screenshot_url,
        "verification_status": "pending",
        "anomaly": anomaly_result,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }

    result = await db.earnings.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)

    return {"success": True, "earning": doc, "anomaly_detected": anomaly_result.get("is_anomaly", False)}

@router.get("/")
async def get_earnings(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    platform: Optional[str] = None,
    city: Optional[str] = None,
    status: Optional[str] = None,
    user=Depends(get_current_user)
):
    db = get_db()
    query = {"worker_id": user["user_id"]}
    if platform:
        query["platform"] = platform
    if city:
        query["city"] = city
    if status:
        query["verification_status"] = status

    skip = (page - 1) * limit
    total = await db.earnings.count_documents(query)
    cursor = db.earnings.find(query, sort=[("date", -1)]).skip(skip).limit(limit)
    earnings = await cursor.to_list(limit)

    for e in earnings:
        e["id"] = str(e.pop("_id"))

    return {
        "success": True,
        "earnings": earnings,
        "pagination": {"page": page, "limit": limit, "total": total, "pages": -(-total // limit)}
    }

@router.get("/dashboard")
async def get_dashboard(user=Depends(get_current_user)):
    db = get_db()

    all_earnings = await db.earnings.find(
        {"worker_id": user["user_id"]},
        sort=[("date", -1)]
    ).to_list(100)

    for e in all_earnings:
        e["id"] = str(e.pop("_id"))

    now = datetime.utcnow()
    week_ago = (now - timedelta(days=7)).strftime("%Y-%m-%d")

    weekly = [e for e in all_earnings if e.get("date", "") >= week_ago]

    total_earnings = sum(e.get("net_amount", 0) for e in all_earnings)
    weekly_earnings = sum(e.get("net_amount", 0) for e in weekly)
    total_hours = sum(e.get("hours_worked", 0) for e in all_earnings)
    avg_hourly = total_earnings / total_hours if total_hours > 0 else 0

    city = all_earnings[0].get("city", "Lahore") if all_earnings else "Lahore"
    platform = all_earnings[0].get("platform", "Uber") if all_earnings else "Uber"

    city_median_data = await get_city_median(city, platform)

    fairness = compute_fairness_score(all_earnings)
    insights = generate_story_insights(all_earnings, city_median_data)

    alerts = []
    for e in all_earnings[:5]:
        if e.get("anomaly", {}).get("is_anomaly", False):
            alerts.append({
                "type": e["anomaly"].get("type", "anomaly"),
                "severity": "high" if e["anomaly"].get("score", 0) > 0.7 else "medium",
                "message": e["anomaly"].get("explanation", "Anomaly detected"),
                "date": e.get("date"),
                "earning_id": e.get("id")
            })

    trend_data = []
    for e in reversed(all_earnings[:30]):
        trend_data.append({
            "date": e.get("date"),
            "net_amount": e.get("net_amount", 0),
            "gross_amount": e.get("gross_amount", 0),
            "deductions": e.get("deductions", 0),
            "hourly_rate": e.get("hourly_rate", 0),
            "platform": e.get("platform"),
        })

    platform_breakdown = {}
    for e in all_earnings:
        p = e.get("platform", "Unknown")
        if p not in platform_breakdown:
            platform_breakdown[p] = {"total": 0, "count": 0}
        platform_breakdown[p]["total"] += e.get("net_amount", 0)
        platform_breakdown[p]["count"] += 1

    return {
        "success": True,
        "kpis": {
            "total_earnings": round(total_earnings, 2),
            "weekly_earnings": round(weekly_earnings, 2),
            "avg_hourly_rate": round(avg_hourly, 2),
            "total_entries": len(all_earnings),
            "verified_count": sum(1 for e in all_earnings if e.get("verification_status") == "verified"),
        },
        "fairness_score": fairness,
        "city_comparison": {
            "your_avg": round(sum(e.get("net_amount", 0) for e in all_earnings[:4]) / min(len(all_earnings), 4), 2) if all_earnings else 0,
            "city_median": city_median_data,
            "city": city,
            "platform": platform,
        },
        "insights": insights,
        "alerts": alerts,
        "trend_data": trend_data,
        "platform_breakdown": platform_breakdown,
    }

@router.get("/internal/verified-earnings/{worker_id}")
async def get_verified_earnings(worker_id: str):
    db = get_db()
    earnings = await db.earnings.find(
        {"worker_id": worker_id, "verification_status": "verified"},
        sort=[("date", -1)]
    ).to_list(100)

    for e in earnings:
        e["id"] = str(e.pop("_id"))

    if not earnings:
        raise HTTPException(status_code=404, detail="No verified earnings found for this worker")

    total_net = sum(e.get("net_amount", 0) for e in earnings)
    total_gross = sum(e.get("gross_amount", 0) for e in earnings)
    total_hours = sum(e.get("hours_worked", 0) for e in earnings)

    return {
        "worker_id": worker_id,
        "verified_earnings": earnings,
        "summary": {
            "total_net": round(total_net, 2),
            "total_gross": round(total_gross, 2),
            "total_hours": round(total_hours, 2),
            "avg_hourly_rate": round(total_net / total_hours, 2) if total_hours > 0 else 0,
            "entry_count": len(earnings),
        }
    }

@router.get("/{earning_id}")
async def get_earning(earning_id: str, user=Depends(get_current_user)):
    db = get_db()
    try:
        doc = await db.earnings.find_one({"_id": ObjectId(earning_id), "worker_id": user["user_id"]})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid earning ID")
    if not doc:
        raise HTTPException(status_code=404, detail="Earning not found")
    doc["id"] = str(doc.pop("_id"))
    return {"success": True, "earning": doc}

@router.put("/{earning_id}")
async def update_earning(earning_id: str, update: EarningUpdate, user=Depends(get_current_user)):
    db = get_db()
    role = user.get("role", "worker")
    try:
        existing = await db.earnings.find_one({"_id": ObjectId(earning_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid earning ID")

    if not existing:
        raise HTTPException(status_code=404, detail="Earning not found")

    if role == "worker" and existing["worker_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    update_data = {k: v for k, v in update.dict().items() if v is not None}
    if "gross_amount" in update_data or "deductions" in update_data:
        gross = update_data.get("gross_amount", existing["gross_amount"])
        deductions = update_data.get("deductions", existing["deductions"])
        hours = update_data.get("hours_worked", existing["hours_worked"])
        net = gross - deductions
        update_data["net_amount"] = net
        update_data["hourly_rate"] = round(net / hours, 2) if hours > 0 else 0

    update_data["updated_at"] = datetime.utcnow().isoformat()

    await db.earnings.update_one({"_id": ObjectId(earning_id)}, {"$set": update_data})
    updated = await db.earnings.find_one({"_id": ObjectId(earning_id)})
    updated["id"] = str(updated.pop("_id"))
    return {"success": True, "earning": updated}

@router.delete("/{earning_id}")
async def delete_earning(earning_id: str, user=Depends(get_current_user)):
    db = get_db()
    try:
        result = await db.earnings.delete_one({"_id": ObjectId(earning_id), "worker_id": user["user_id"]})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid earning ID")
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Earning not found")
    return {"success": True, "message": "Earning deleted successfully"}

@router.post("/import/csv")
async def import_csv(file: UploadFile = File(...), user=Depends(get_current_user)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files allowed")

    content = await file.read()
    db = get_db()

    try:
        reader = csv.DictReader(io.StringIO(content.decode('utf-8')))
        records = []
        for row in reader:
            gross = float(row.get('gross_amount', 0) or 0)
            deductions = float(row.get('deductions', 0) or 0)
            hours = float(row.get('hours_worked', 1) or 1)
            net = gross - deductions

            records.append({
                "worker_id": user["user_id"],
                "date": row.get('date', datetime.utcnow().strftime('%Y-%m-%d')),
                "platform": row.get('platform', 'Unknown'),
                "city": row.get('city', 'Unknown'),
                "gross_amount": gross,
                "deductions": deductions,
                "net_amount": net,
                "hours_worked": hours,
                "hourly_rate": round(net / hours, 2) if hours > 0 else 0,
                "trips_or_orders": int(row.get('trips_or_orders', 0) or 0),
                "notes": row.get('notes', ''),
                "screenshot_url": None,
                "verification_status": "pending",
                "anomaly": {"is_anomaly": False, "score": 0, "type": "none", "explanation": "Imported via CSV"},
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            })

        if records:
            await db.earnings.insert_many(records)

        return {"success": True, "imported": len(records), "message": f"Successfully imported {len(records)} records"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV parse error: {str(e)}")

@router.post("/upload/screenshot")
async def upload_screenshot(file: UploadFile = File(...), user=Depends(get_current_user)):
    allowed = {'image/jpeg', 'image/png', 'image/webp'}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WEBP images allowed")

    os.makedirs(settings.upload_dir, exist_ok=True)
    ext = file.filename.rsplit('.', 1)[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(settings.upload_dir, filename)

    async with aiofiles.open(filepath, 'wb') as f:
        content = await file.read()
        await f.write(content)

    url = f"/uploads/{filename}"
    return {"success": True, "url": url, "filename": filename}

@router.get("/admin/all")
async def get_all_earnings(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    worker_id: Optional[str] = None,
    user=Depends(require_role("verifier", "advocate"))
):
    db = get_db()
    query = {}
    if status:
        query["verification_status"] = status
    if worker_id:
        query["worker_id"] = worker_id

    skip = (page - 1) * limit
    total = await db.earnings.count_documents(query)
    earnings = await db.earnings.find(query, sort=[("created_at", -1)]).skip(skip).limit(limit).to_list(limit)

    for e in earnings:
        e["id"] = str(e.pop("_id"))

    return {"success": True, "earnings": earnings, "total": total}

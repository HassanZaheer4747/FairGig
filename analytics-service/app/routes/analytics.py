from fastapi import APIRouter, Query
from typing import Optional
import numpy as np
from app.database import get_db

router = APIRouter()

def determine_zone(value: float, median: float) -> str:
    if median == 0:
        return "unknown"
    ratio = value / median
    if ratio >= 1.2:
        return "high"
    elif ratio >= 0.8:
        return "average"
    else:
        return "low"

@router.get("/city-median")
async def get_city_median(
    city: Optional[str] = Query(None),
    platform: Optional[str] = Query(None)
):
    db = get_db()
    match_stage = {"verification_status": "verified"}
    if city:
        match_stage["city"] = city
    if platform:
        match_stage["platform"] = platform

    pipeline = [
        {"$match": match_stage},
        {"$group": {
            "_id": None,
            "net_amounts": {"$push": "$net_amount"},
            "sample_size": {"$sum": 1},
            "avg_net": {"$avg": "$net_amount"},
            "avg_hourly": {"$avg": "$hourly_rate"},
            "avg_deduction_ratio": {
                "$avg": {
                    "$cond": [
                        {"$gt": ["$gross_amount", 0]},
                        {"$divide": ["$deductions", "$gross_amount"]},
                        0
                    ]
                }
            }
        }}
    ]

    result = await db.earnings.aggregate(pipeline).to_list(1)

    if not result or result[0]["sample_size"] == 0:
        # Return fallback with all platforms/cities if specific query returns nothing
        fallback_pipeline = [
            {"$match": {}},
            {"$group": {
                "_id": None,
                "net_amounts": {"$push": "$net_amount"},
                "sample_size": {"$sum": 1},
                "avg_net": {"$avg": "$net_amount"},
            }}
        ]
        fallback = await db.earnings.aggregate(fallback_pipeline).to_list(1)
        if fallback:
            amounts = sorted(fallback[0]["net_amounts"])
            n = len(amounts)
            median = float(np.median(amounts)) if amounts else 0
            return {
                "median": round(median, 2),
                "sample_size": n,
                "zone": "average",
                "city": city or "all",
                "platform": platform or "all",
                "avg_hourly": 0,
                "avg_deduction_ratio": 0
            }
        return {"median": 0, "sample_size": 0, "zone": "unknown", "city": city, "platform": platform}

    data = result[0]
    amounts = sorted(data["net_amounts"])
    median = float(np.median(amounts)) if amounts else 0

    return {
        "median": round(median, 2),
        "sample_size": data["sample_size"],
        "zone": "average",
        "city": city or "all",
        "platform": platform or "all",
        "avg_hourly": round(data.get("avg_hourly", 0) or 0, 2),
        "avg_deduction_ratio": round((data.get("avg_deduction_ratio", 0) or 0) * 100, 1)
    }

@router.get("/platform-trends")
async def get_platform_trends():
    db = get_db()
    pipeline = [
        {"$group": {
            "_id": "$platform",
            "avg_net": {"$avg": "$net_amount"},
            "avg_gross": {"$avg": "$gross_amount"},
            "avg_deductions": {"$avg": "$deductions"},
            "avg_hourly": {"$avg": "$hourly_rate"},
            "worker_count": {"$addToSet": "$worker_id"},
            "entry_count": {"$sum": 1},
            "avg_deduction_ratio": {
                "$avg": {
                    "$cond": [
                        {"$gt": ["$gross_amount", 0]},
                        {"$multiply": [{"$divide": ["$deductions", "$gross_amount"]}, 100]},
                        0
                    ]
                }
            }
        }},
        {"$project": {
            "platform": "$_id",
            "avg_net": {"$round": ["$avg_net", 2]},
            "avg_gross": {"$round": ["$avg_gross", 2]},
            "avg_deductions": {"$round": ["$avg_deductions", 2]},
            "avg_hourly": {"$round": ["$avg_hourly", 2]},
            "worker_count": {"$size": "$worker_count"},
            "entry_count": 1,
            "avg_deduction_ratio": {"$round": ["$avg_deduction_ratio", 1]},
            "_id": 0
        }},
        {"$sort": {"avg_net": -1}}
    ]

    trends = await db.earnings.aggregate(pipeline).to_list(20)
    return {"trends": trends, "total_platforms": len(trends)}

@router.get("/income-distribution")
async def get_income_distribution(city: Optional[str] = Query(None)):
    db = get_db()
    match = {}
    if city:
        match["city"] = city

    pipeline = [
        {"$match": match},
        {"$bucket": {
            "groupBy": "$net_amount",
            "boundaries": [0, 5000, 10000, 20000, 35000, 50000, 75000, 100000],
            "default": "100000+",
            "output": {
                "count": {"$sum": 1},
                "avg_net": {"$avg": "$net_amount"}
            }
        }}
    ]

    distribution = await db.earnings.aggregate(pipeline).to_list(20)
    labels = ["0-5K", "5K-10K", "10K-20K", "20K-35K", "35K-50K", "50K-75K", "75K-100K", "100K+"]

    formatted = []
    for i, bucket in enumerate(distribution):
        formatted.append({
            "range": labels[i] if i < len(labels) else "100K+",
            "count": bucket["count"],
            "avg_net": round(bucket.get("avg_net", 0) or 0, 2)
        })

    return {"distribution": formatted, "city": city or "all"}

@router.get("/vulnerability-flags")
async def get_vulnerability_flags():
    db = get_db()

    pipeline = [
        {"$group": {
            "_id": "$worker_id",
            "avg_net": {"$avg": "$net_amount"},
            "avg_deduction_ratio": {
                "$avg": {
                    "$cond": [
                        {"$gt": ["$gross_amount", 0]},
                        {"$divide": ["$deductions", "$gross_amount"]},
                        0
                    ]
                }
            },
            "anomaly_count": {
                "$sum": {"$cond": [{"$eq": ["$anomaly.is_anomaly", True]}, 1, 0]}
            },
            "entry_count": {"$sum": 1},
            "city": {"$last": "$city"},
            "platform": {"$last": "$platform"}
        }},
        {"$match": {
            "$or": [
                {"avg_deduction_ratio": {"$gt": 0.30}},
                {"avg_net": {"$lt": 10000}},
                {"anomaly_count": {"$gte": 3}}
            ]
        }},
        {"$project": {
            "worker_id": "$_id",
            "avg_net": {"$round": ["$avg_net", 2]},
            "deduction_ratio_pct": {"$round": [{"$multiply": ["$avg_deduction_ratio", 100]}, 1]},
            "anomaly_count": 1,
            "entry_count": 1,
            "city": 1,
            "platform": 1,
            "_id": 0
        }},
        {"$sort": {"anomaly_count": -1}},
        {"$limit": 50}
    ]

    flagged = await db.earnings.aggregate(pipeline).to_list(50)
    return {"flagged_workers": flagged, "total_flagged": len(flagged)}

@router.get("/city-overview")
async def get_city_overview():
    db = get_db()
    pipeline = [
        {"$group": {
            "_id": "$city",
            "avg_net": {"$avg": "$net_amount"},
            "avg_hourly": {"$avg": "$hourly_rate"},
            "worker_count": {"$addToSet": "$worker_id"},
            "entry_count": {"$sum": 1},
            "avg_deduction_ratio": {
                "$avg": {
                    "$cond": [
                        {"$gt": ["$gross_amount", 0]},
                        {"$multiply": [{"$divide": ["$deductions", "$gross_amount"]}, 100]},
                        0
                    ]
                }
            }
        }},
        {"$project": {
            "city": "$_id",
            "avg_net": {"$round": ["$avg_net", 2]},
            "avg_hourly": {"$round": ["$avg_hourly", 2]},
            "worker_count": {"$size": "$worker_count"},
            "entry_count": 1,
            "avg_deduction_ratio": {"$round": ["$avg_deduction_ratio", 1]},
            "_id": 0
        }},
        {"$sort": {"avg_net": -1}}
    ]

    cities = await db.earnings.aggregate(pipeline).to_list(10)
    return {"cities": cities}

@router.get("/summary")
async def get_global_summary():
    db = get_db()

    total_workers = await db.earnings.distinct("worker_id")
    total_earnings = await db.earnings.count_documents({})

    pipeline = [
        {"$group": {
            "_id": None,
            "total_net": {"$sum": "$net_amount"},
            "avg_net": {"$avg": "$net_amount"},
            "total_hours": {"$sum": "$hours_worked"},
            "anomaly_count": {
                "$sum": {"$cond": [{"$eq": ["$anomaly.is_anomaly", True]}, 1, 0]}
            }
        }}
    ]

    agg = await db.earnings.aggregate(pipeline).to_list(1)
    stats = agg[0] if agg else {}

    return {
        "total_workers": len(total_workers),
        "total_entries": total_earnings,
        "total_net_paid": round(stats.get("total_net", 0), 2),
        "avg_net_per_entry": round(stats.get("avg_net", 0), 2),
        "total_hours_logged": round(stats.get("total_hours", 0), 2),
        "anomaly_rate": round(stats.get("anomaly_count", 0) / total_earnings * 100, 1) if total_earnings > 0 else 0
    }

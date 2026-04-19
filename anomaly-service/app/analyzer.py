import numpy as np
from typing import List, Dict, Any

def analyze_anomaly(current: Dict[str, Any], historical: List[Dict[str, Any]]) -> Dict[str, Any]:
    anomalies = []
    score = 0.0

    gross = current.get("gross_amount", 0)
    deductions = current.get("deductions", 0)
    net = current.get("net_amount", gross - deductions)
    hours = current.get("hours_worked", 1)
    hourly = current.get("hourly_rate", net / hours if hours > 0 else 0)

    # 1. Income drop detection (>20%)
    if historical and len(historical) >= 3:
        recent_nets = [h.get("net_amount", 0) for h in historical[:5] if h.get("net_amount", 0) > 0]
        if recent_nets:
            avg_recent = np.mean(recent_nets)
            if avg_recent > 0 and net < avg_recent * 0.80:
                drop_pct = ((avg_recent - net) / avg_recent) * 100
                score_contrib = min(0.6, drop_pct / 100)
                score += score_contrib
                anomalies.append({
                    "type": "income_drop",
                    "detail": f"Income dropped {round(drop_pct)}% below recent average (PKR {round(avg_recent, 0)})"
                })

    # 2. Abnormal deduction detection
    if gross > 0:
        deduction_ratio = deductions / gross
        if deduction_ratio > 0.30:
            score_contrib = min(0.4, (deduction_ratio - 0.30) * 2)
            score += score_contrib
            anomalies.append({
                "type": "high_deduction",
                "detail": f"Deductions are {round(deduction_ratio * 100)}% of gross earnings — threshold is 30%"
            })

        if historical and len(historical) >= 3:
            hist_ratios = [
                h.get("deductions", 0) / h.get("gross_amount", 1)
                for h in historical
                if h.get("gross_amount", 0) > 0
            ]
            if hist_ratios:
                avg_ratio = np.mean(hist_ratios)
                std_ratio = np.std(hist_ratios) or 0.01
                z_score = (deduction_ratio - avg_ratio) / std_ratio
                if z_score > 2.5:
                    score += min(0.3, z_score * 0.05)
                    anomalies.append({
                        "type": "abnormal_deduction",
                        "detail": f"Deduction ratio {round(deduction_ratio * 100)}% is {round(z_score, 1)} standard deviations above your norm"
                    })

    # 3. Hourly rate anomaly
    if historical and len(historical) >= 3:
        hist_hourly = [h.get("hourly_rate", 0) for h in historical if h.get("hourly_rate", 0) > 0]
        if hist_hourly:
            avg_hourly = np.mean(hist_hourly)
            std_hourly = np.std(hist_hourly) or 1
            if avg_hourly > 0 and hourly < avg_hourly * 0.70:
                drop_pct = ((avg_hourly - hourly) / avg_hourly) * 100
                score += min(0.25, drop_pct / 200)
                anomalies.append({
                    "type": "low_hourly_rate",
                    "detail": f"Hourly rate PKR {round(hourly)} is {round(drop_pct)}% below your average (PKR {round(avg_hourly)})"
                })

    score = min(1.0, score)
    is_anomaly = score > 0.25 or len(anomalies) > 0

    if not anomalies:
        return {
            "is_anomaly": False,
            "score": 0.0,
            "type": "none",
            "explanation": "No anomalies detected. Earnings are within expected range."
        }

    primary = anomalies[0]
    all_details = "; ".join(a["detail"] for a in anomalies)
    anomaly_type = primary["type"]

    if anomaly_type == "income_drop":
        explanation = f"⚠️ Income drop detected. {all_details}"
    elif anomaly_type == "high_deduction":
        explanation = f"⚠️ Abnormal deductions detected. {all_details}"
    elif anomaly_type == "low_hourly_rate":
        explanation = f"⚠️ Low hourly rate detected. {all_details}"
    else:
        explanation = f"⚠️ Anomaly detected: {all_details}"

    return {
        "is_anomaly": is_anomaly,
        "score": round(score, 3),
        "type": anomaly_type,
        "explanation": explanation
    }

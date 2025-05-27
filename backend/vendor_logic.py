
def score_vendors(vendors, request):
    weights = {"price": 0.3, "delivery_time": 0.2, "rating": 0.25, "location": 0.1, "response_time": 0.1, "certified": 0.05}
    scored = []
    for v in vendors:
        score = (
            (1 / v["price"]) * weights["price"] +
            (1 / v["delivery_days"]) * weights["delivery_time"] +
            v["rating"] * weights["rating"] +
            (1 if request["location"] in v["location"] else 0) * weights["location"] +
            (1 / v["response_hours"]) * weights["response_time"] +
            (1 if v["certified"] else 0) * weights["certified"]
        )
        scored.append({**v, "score": round(score, 3)})
    return sorted(scored, key=lambda x: x["score"], reverse=True)

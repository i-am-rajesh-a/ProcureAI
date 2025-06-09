# services/vendor_recommender.py

def recommend_vendors(vendors, product_type=None, budget_min=None, budget_max=None,
                      location=None, rating_min=None, lead_time_max=None,
                      compliance_min=None, reliability_min=None, sustainability_min=None,
                      top_n=5):
    """
    Recommend vendors based on multiple criteria.
    """
    filtered_vendors = []

    for vendor in vendors:
        # Apply filters
        if product_type and product_type.lower() not in vendor.get('category', '').lower():
            continue
        if budget_min is not None and vendor.get('price', 0) < budget_min:
            continue
        if budget_max is not None and vendor.get('price', 0) > budget_max:
            continue
        if location and location.lower() not in vendor.get('location', '').lower():
            continue
        if rating_min is not None and vendor.get('rating', 0) < rating_min:
            continue
        if lead_time_max is not None and vendor.get('lead_time', float('inf')) > lead_time_max:
            continue
        if compliance_min is not None and vendor.get('compliance_score', 0) < compliance_min:
            continue
        if reliability_min is not None and vendor.get('reliability_score', 0) < reliability_min:
            continue
        if sustainability_min is not None and vendor.get('sustainability_score', 0) < sustainability_min:
            continue

        # Calculate a composite score for ranking
        score = (
            vendor.get('rating', 0) * 0.3 +
            (1 / vendor.get('lead_time', 1)) * 0.2 +
            vendor.get('compliance_score', 0) * 0.15 +
            vendor.get('reliability_score', 0) * 0.2 +
            vendor.get('sustainability_score', 0) * 0.15
        )

        vendor['score'] = round(score, 2)
        filtered_vendors.append(vendor)

    # Sort vendors by score in descending order
    recommended = sorted(filtered_vendors, key=lambda x: x['score'], reverse=True)

    return recommended[:top_n]

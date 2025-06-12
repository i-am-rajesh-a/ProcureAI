import requests
import json
from typing import Dict, Any
import os
import dotenv

dotenv.load_dotenv()

# === Config ===
RAPIDAPI_BASE_URL = "https://real-time-amazon-data.p.rapidapi.com"
RAPIDAPI_HOST = os.getenv("RAPIDAPI_HOST", "real-time-amazon-data.p.rapidapi.com")
RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")

HEADERS = {
    "X-RapidAPI-Key": RAPIDAPI_KEY,
    "X-RapidAPI-Host": RAPIDAPI_HOST
}

# === Function ===
def get_seller_profile(seller_id: str, country: str = "US") -> Dict[str, Any]:
    """
    Get specific profile details for an Amazon seller using RapidAPI

    Args:
        seller_id (str): Amazon seller ID
        country (str, optional): Country code. Defaults to "US".

    Returns:
        Dict[str, Any]: Selected seller profile details or error
    """
    url = f"{RAPIDAPI_BASE_URL}/seller-profile"
    params = {
        "seller_id": seller_id,
        "country": country.upper()
    }

    try:
        print(f"Making request to {url} with params: {params}")
        response = requests.get(url, headers=HEADERS, params=params, timeout=15)
        print(f"Response status: {response.status_code}")

        if response.status_code != 200:
            return {
                "error": "API request failed",
                "status": response.status_code,
                "details": response.text
            }

        data = response.json()
        profile_data = data.get("data", {})

        if not profile_data:
            return {
                "success": False,
                "error": "Seller profile not found"
            }

        # Extract specific fields
        selected_data = {
            "seller_name": profile_data.get("name"),
            "seller_id": profile_data.get("seller_id"),
            "rating": profile_data.get("rating"),
            "total_reviews": profile_data.get("ratings_total"),
            "country": profile_data.get("country"),
            "business_name": profile_data.get("business_name"),
            "seller_link": profile_data.get("seller_link"),
            "store_link": profile_data.get("store_link")
        }

        print("\n=== Selected Seller Profile Details ===")
        for key, value in selected_data.items():
            print(f"{key}: {value}")

        return {
            "success": True,
            "data": selected_data
        }

    except Exception as e:
        return {
            "error": "Unexpected error",
            "details": str(e)
        }


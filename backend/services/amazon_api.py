import os
import requests
from typing import Dict, Any
import json

# RAPIDAPI constants
RAPIDAPI_BASE_URL = "https://realtime-amazon-data.p.rapidapi.com"
RAPIDAPI_HOST = os.getenv("RAPIDAPI_HOST", "realtime-amazon-data.p.rapidapi.com")
RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")

if not RAPIDAPI_KEY:
    raise Exception("RAPIDAPI_KEY is not set in environment variables")

if not RAPIDAPI_HOST:
    raise Exception("RAPIDAPI_HOST is not set in environment variables")

HEADERS = {
    "x-rapidapi-key": RAPIDAPI_KEY,
    "x-rapidapi-host": RAPIDAPI_HOST,
    "Content-Type": "application/json"
}

def search_products(query: str, page: int = 1, country: str = "US", sort_by: str = "RELEVANT") -> Dict[str, Any]:
    """
    Search for products on Amazon using RapidAPI
    """
    url = f"{RAPIDAPI_BASE_URL}/search"
    
    params = {
        "query": query,
        "page": str(page),
        "country": country.upper(),
        "sort_by": sort_by,
        "product_condition": "ALL",
        "is_prime": "false"
    }
    
    try:
        print(f"[AmazonAPI] Requesting: {url}")
        print(f"[AmazonAPI] Params: {params}")

        response = requests.get(url, headers=HEADERS, params=params, timeout=15)
        
        print(f"[AmazonAPI] Response status: {response.status_code}")

        if response.status_code != 200:
            print(f"[AmazonAPI] Error response: {response.text}")
            return {
                "error": "API request failed",
                "status": response.status_code,
                "details": response.text
            }

        data = response.json()
        
        products_list = data.get("data", {}).get("products", [])
        print(f"[AmazonAPI] Products returned: {len(products_list)}")

        if not isinstance(data, dict):
            return {
                "success": False,
                "error": "Invalid response format"
            }
            
        if not products_list:
            print(f"[AmazonAPI] No products found for params: {params}")
            return {
                "success": False,
                "error": "No products found"
            }
        
        products = []
        for item in products_list:
            if isinstance(item, dict):
                products.append({
                    "ProductTitle": item.get("product_title", ""),
                    "asin": item.get("asin", ""),
                    "price": item.get("product_price", "N/A"),
                    "discount": item.get("discount", ""),
                    "originalPrice": item.get("product_original_price", "N/A"),
                    "rating": item.get("product_star_rating", "N/A"),
                    "totalRatings": item.get("product_num_ratings", "N/A"),
                    "productUrl": item.get("product_url", ""),
                    "productImage": item.get("product_photo", ""),
                    "isPrime": item.get("is_prime", "false"),
                    "isBestSeller": item.get("is_best_seller", "false"),
                    "isAmazonChoice": item.get("is_amazon_choice", "false"),
                    "variantsAvailable": item.get("has_variants", "false")
                })
            
        return {
            "success": True,
            "data": {
                "totalResultsCount": data.get("data", {}).get("total_products", 0),
                "currency": data.get("request_info", {}).get("currency", "USD"),
                "language": data.get("request_info", {}).get("language", "en"),
                "origin": data.get("request_info", {}).get("amazon_domain", "US"),
                "domain": data.get("request_info", {}).get("amazon_url", "https://www.amazon.com"),
                "sortBy": sort_by,
                "status": data.get("request_info", {}).get("status", "success"),
                "details": 0,
                "products": products
            }
        }
        
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {str(e)}")
        return {"error": "Request failed", "details": str(e)}
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {str(e)}")
        return {"error": "Invalid JSON response", "details": str(e)}
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return {"error": "Unexpected error", "details": str(e)}

def get_product_details(asin: str, country: str = "US") -> Dict[str, Any]:
    """
    Get detailed information about a specific Amazon product using RapidAPI
    """
    url = f"{RAPIDAPI_BASE_URL}/product-details"
    
    params = {
        "asin": asin,
        "country": country.upper()
    }
    
    try:
        print(f"[AmazonAPI] Requesting: {url}")
        print(f"[AmazonAPI] Params: {params}")
        
        response = requests.get(url, headers=HEADERS, params=params, timeout=15)
        print(f"[AmazonAPI] Response status: {response.status_code}")
        
        if response.status_code != 200:
            return {
                "error": "API request failed",
                "status": response.status_code,
                "details": response.text
            }
        
        data = response.json()
        
        if not data.get("data"):
            return {
                "success": False,
                "error": "Product not found"
            }
        
        product_data = data.get("data", {})
        
        return {
            "success": True,
            "data": {
                "currency": data.get("request_info", {}).get("currency", "USD"),
                "language": data.get("request_info", {}).get("language", "en"),
                "origin": data.get("request_info", {}).get("amazon_domain", "US"),
                "status": data.get("request_info", {}).get("status", "success"),
                "title": product_data.get("product_title", ""),
                "category": product_data.get("category_path", ""),
                "price": product_data.get("product_price", "N/A"),
                "discountPercentage": product_data.get("discount_percentage", ""),
                "originalPrice": product_data.get("product_original_price", "N/A"),
                "rating": product_data.get("product_star_rating", "N/A"),
                "ratingNumber": product_data.get("product_num_ratings", "N/A"),
                "sellerName": product_data.get("seller_name", ""),
                "sellerId": product_data.get("seller_id", "NA"),
                "availability": product_data.get("availability_status", ""),
                "bestSeller": product_data.get("is_best_seller", False),
                "amazonFulfilled": product_data.get("is_amazon_fulfilled", False),
                "images": product_data.get("product_photos", []),
                "videos": product_data.get("product_videos", "No video"),
                "aboutThisItem": product_data.get("product_features", []),
                "details": product_data.get("product_information", {}),
                "variations": product_data.get("variant_data", {}),
                "customersSay": product_data.get("customer_reviews_summary", "")
            }
        }
        
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {str(e)}")
        return {"error": "Request failed", "details": str(e)}
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {str(e)}")
        return {"error": "Invalid JSON response", "details": str(e)}
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return {"error": "Unexpected error", "details": str(e)}

def get_seller_details(seller_id: str, country: str = "US") -> Dict[str, Any]:
    """
    Get profile information for a specific Amazon seller using RapidAPI
    """
    url = f"{RAPIDAPI_BASE_URL}/seller-details"
    
    params = {
        "sellerId": seller_id,
        "country": country.upper()
    }
    
    try:
        print(f"[AmazonAPI] Requesting: {url}")
        print(f"[AmazonAPI] Params: {params}")
        
        response = requests.get(url, headers=HEADERS, params=params, timeout=15)
        print(f"[AmazonAPI] Response status: {response.status_code}")
        
        if response.status_code != 200:
            return {
                "error": "API request failed",
                "status": response.status_code,
                "details": response.text
            }
        
        data = response.json()
        
        if not data.get("data"):
            return {
                "success": False,
                "error": "Seller profile not found"
            }
        
        profile_data = data.get("data", {})
        
        reviews = []
        for review in profile_data.get("seller_feedback", []):
            reviews.append({
                "rating": review.get("rating", ""),
                "reviewText": review.get("feedback_text", ""),
                "username": review.get("reviewer_name", ""),
                "date": review.get("feedback_date", ""),
                "suppressedMessage": review.get("suppressed_message", "Not Available")
            })
        
        return {
            "success": True,
            "data": {
                "sellerId": profile_data.get("seller_id", ""),
                "status": data.get("request_info", {}).get("status", "success"),
                "domain": data.get("request_info", {}).get("amazon_url", f"https://www.amazon.{country.lower()}"),
                "sellerName": profile_data.get("name", ""),
                "logo": profile_data.get("logo", "Not Available"),
                "rating": profile_data.get("rating", ""),
                "ratingNum": {
                    "oneMonth": profile_data.get("ratings_30_days", 0),
                    "threeMonth": profile_data.get("ratings_90_days", 0),
                    "twelveMonth": profile_data.get("ratings_12_months", 0),
                    "lifeTime": profile_data.get("ratings_lifetime", 0)
                },
                "storeLink": profile_data.get("storefront_url", ""),
                "reviews": reviews
            }
        }
        
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {str(e)}")
        return {"error": "Request failed", "details": str(e)}
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {str(e)}")
        return {"error": "Invalid JSON response", "details": str(e)}
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return {"error": "Unexpected error", "details": str(e)}
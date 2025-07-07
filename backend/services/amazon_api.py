import os
import requests
from typing import Dict, Any
import json

# RAPIDAPI constants
RAPIDAPI_BASE_URL = "https://real-time-amazon-data.p.rapidapi.com"
RAPIDAPI_HOST = os.getenv("RAPIDAPI_HOST", "real-time-amazon-data.p.rapidapi.com")
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

def product_search(query: str, page: int = 1, country: str = "US", sort_by: str = "RELEVANCE") -> Dict[str, Any]:
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
        "is_prime": "false",
        "deals_and_discounts": "NONE"
    }
    
    try:
        print(f"[AmazonAPI] Requesting product search: {url}")
        print(f"[AmazonAPI] Params: {params}")

        response = requests.get(url, headers=HEADERS, params=params, timeout=15)
        
        print(f"[AmazonAPI] Response status: {response.status_code}")

        if response.status_code != 200:
            print(f"[AmazonAPI] Error response: {response.text}")
            return {
                "success": False,
                "error": "API request failed",
                "status": response.status_code,
                "details": response.text
            }

        data = response.json()
        
        if data.get("status") != "OK":
            return {
                "success": False,
                "error": "API request failed",
                "details": data.get("message", "Unknown error")
            }
        
        products_list = data.get("data", {}).get("products", [])
        print(f"[AmazonAPI] Products returned: {len(products_list)}")

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
                    "productUrl": item.get("product_url", ""),
                    "productImage": item.get("product_photo", ""),
                    "rating": item.get("product_star_rating", "N/A"),
                    "totalRatings": item.get("product_num_ratings", 0),
                    "isPrime": item.get("is_prime", False),
                    "isBestSeller": item.get("is_best_seller", False),
                    "isAmazonChoice": item.get("is_amazon_choice", False)
                })
            
        return {
            "success": True,
            "data": {
                "totalResultsCount": data.get("data", {}).get("total_products", 0),
                "currency": data.get("data", {}).get("currency", "USD"),
                "products": products
            }
        }
        
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {str(e)}")
        return {"success": False, "error": "Request failed", "details": str(e)}
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {str(e)}")
        return {"success": False, "error": "Invalid JSON response", "details": str(e)}
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return {"success": False, "error": "Unexpected error", "details": str(e)}

def product_details(asin: str, country: str = "US") -> Dict[str, Any]:
    """
    Get detailed information about a specific Amazon product using RapidAPI
    """
    url = f"{RAPIDAPI_BASE_URL}/product-details"
    
    params = {
        "asin": asin,
        "country": country.upper()
    }
    
    try:
        print(f"[AmazonAPI] Requesting product details: {url}")
        print(f"[AmazonAPI] Params: {params}")
        
        response = requests.get(url, headers=HEADERS, params=params, timeout=15)
        print(f"[AmazonAPI] Response status: {response.status_code}")
        
        if response.status_code != 200:
            return {
                "success": False,
                "error": "API request failed",
                "status": response.status_code,
                "details": response.text
            }
        
        data = response.json()
        
        if data.get("status") != "OK" or not data.get("data"):
            return {
                "success": False,
                "error": "Product not found",
                "details": data.get("message", "No product data returned")
            }
        
        product_data = data.get("data", {})
        
        # Infer sellerName from product_byline if not provided
        seller_name = product_data.get("seller_name", "")
        if not seller_name:
            byline = product_data.get("product_byline", "")
            if "Amazon Renewed" in byline:
                seller_name = "Amazon Renewed"
            elif "Amazon" in byline:
                seller_name = "Amazon"
            else:
                seller_name = "Unknown Seller"
        
        # Set default sellerId for Amazon-fulfilled products
        seller_id = product_data.get("seller_id", "NA")
        if seller_name in ["Amazon Renewed", "Amazon"] and seller_id == "NA":
            seller_id = "NA"  # Keep as NA for Amazon-fulfilled products
        
        return {
            "success": True,
            "data": {
                "asin": product_data.get("asin", ""),
                "title": product_data.get("product_title", ""),
                "price": product_data.get("product_price", "N/A"),
                "originalPrice": product_data.get("product_original_price", "N/A"),
                "rating": product_data.get("product_star_rating", "N/A"),
                "ratingNumber": product_data.get("product_num_ratings", 0),
                "sellerName": seller_name,
                "sellerId": seller_id,
                "amazonFulfilled": product_data.get("is_amazon_fulfilled", False) or seller_name in ["Amazon Renewed", "Amazon"],
                "productUrl": product_data.get("product_url", ""),
                "productPhoto": product_data.get("product_photo", ""),
                "availability": product_data.get("product_availability", ""),
                "aboutProduct": product_data.get("about_product", []),
                "productDescription": product_data.get("product_description", ""),
                "productDetails": product_data.get("product_information", {})
            }
        }
        
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {str(e)}")
        return {"success": False, "error": "Request failed", "details": str(e)}
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {str(e)}")
        return {"success": False, "error": "Invalid JSON response", "details": str(e)}
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return {"success": False, "error": "Unexpected error", "details": str(e)}

def seller_profile(seller_id: str, country: str = "US") -> Dict[str, Any]:
    """
    Get profile information for a specific Amazon seller using RapidAPI
    """
    # Handle Amazon-fulfilled products with seller_id = "NA"
    if seller_id == "NA":
        return {
            "success": True,
            "data": {
                "sellerId": "NA",
                "sellerName": "Amazon",
                "rating": "N/A",
                "ratingNum": {
                    "lifeTime": 0
                },
                "storeLink": "https://www.amazon.com",
                "businessName": "Amazon.com Services LLC",
                "businessAddress": "410 Terry Ave N, Seattle, WA 98109, USA"
            }
        }
    
    url = f"{RAPIDAPI_BASE_URL}/seller-profile"
    
    params = {
        "seller_id": seller_id,
        "country": country.upper()
    }
    
    try:
        print(f"[AmazonAPI] Requesting seller profile: {url}")
        print(f"[AmazonAPI] Params: {params}")
        
        response = requests.get(url, headers=HEADERS, params=params, timeout=15)
        print(f"[AmazonAPI] Response status: {response.status_code}")
        
        if response.status_code != 200:
            return {
                "success": False,
                "error": "API request failed",
                "status": response.status_code,
                "details": response.text
            }
        
        data = response.json()
        
        if data.get("status") != "OK" or not data.get("data"):
            return {
                "success": False,
                "error": "Seller profile not found",
                "details": data.get("message", "No seller data returned")
            }
        
        profile_data = data.get("data", {})
        
        return {
            "success": True,
            "data": {
                "sellerId": profile_data.get("seller_id", ""),
                "sellerName": profile_data.get("name", ""),
                "rating": profile_data.get("rating", "N/A"),
                "ratingNum": {
                    "lifeTime": profile_data.get("ratings_total", 0)
                },
                "storeLink": profile_data.get("store_link", ""),
                "businessName": profile_data.get("business_name", ""),
                "businessAddress": profile_data.get("business_address", "")
            }
        }
        
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {str(e)}")
        return {"success": False, "error": "Request failed", "details": str(e)}
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {str(e)}")
        return {"success": False, "error": "Invalid JSON response", "details": str(e)}
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return {"success": False, "error": "Unexpected error", "details": str(e)}
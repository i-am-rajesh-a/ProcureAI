import os
import requests
from typing import Dict, Any
import json

# Update the RAPIDAPI constants
RAPIDAPI_BASE_URL = "https://real-time-amazon-data.p.rapidapi.com"
RAPIDAPI_HOST = os.getenv("RAPIDAPI_HOST", "real-time-amazon-data.p.rapidapi.com")
RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")

if not RAPIDAPI_KEY:
    raise Exception("RAPIDAPI_KEY is not set in environment variables")

if not RAPIDAPI_HOST:
    raise Exception("RAPIDAPI_HOST is not set in environment variables")

HEADERS = {
    "X-RapidAPI-Key": RAPIDAPI_KEY,
    "X-RapidAPI-Host": RAPIDAPI_HOST,
    "Content-Type": "application/json"
}

def search_products(keyword: str, page: int = 1, country: str = "us") -> Dict[str, Any]:
    """
    Search for products on Amazon using RapidAPI
    """
    url = f"{RAPIDAPI_BASE_URL}/search"
    
    params = {
        "query": keyword,
        "page": str(page),
        "country": country.upper(),
        "sort_by": "RELEVANCE",
        "product_condition": "ALL",
        "is_prime": "false",
        "deals_and_discounts": "NONE"
    }
    
    try:
        # Log the full request URL and params for debugging
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
        
        # Extract products from new response structure
        products_list = data.get("data", {}).get("products", [])
        print(f"[AmazonAPI] Products returned: {len(products_list)}")

        # Check if we have results
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
        
        # Format the response
        products = []
        for item in data.get("data", {}).get("products", []):
            if isinstance(item, dict):  # Ensure item is a dictionary
                products.append({
                    "title": item.get("product_title", ""),
                    "asin": item.get("asin", ""),
                    "price": item.get("product_price", 0),
                    "rating": item.get("product_star_rating", 0),
                    "url": item.get("product_url", ""),
                    "image": item.get("product_photo", "")
                })
            
        return {
            "success": True,
            "data": {
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

def get_products_by_category(category_id: str, page: int = 1, country: str = "us") -> Dict[str, Any]:
    """
    Get products by category from Amazon using RapidAPI
    """
    url = f"https://{RAPIDAPI_HOST}/products-by-category"
    
    params = {
        "category_id": category_id,
        "page": str(page),
        "country": country.upper(),
        "sort_by": "RELEVANCE",
        "product_condition": "ALL",
        "is_prime": "false",
        "deals_and_discounts": "NONE"
    }
    
    try:
        print(f"Making request to {url} with params: {params}")  # Debug log
        response = requests.get(url, headers=HEADERS, params=params, timeout=15)
        
        print(f"Response status: {response.status_code}")  # Debug log
        
        # Handle response directly instead of using validate_rapidapi_response
        if response.status_code != 200:
            print(f"[AmazonAPI] Error response: {response.text}")
            return {
                "error": "API request failed",
                "status": response.status_code,
                "details": response.text
            }
        
        try:
            data = response.json()
        except json.JSONDecodeError:
            return {
                "success": False,
                "error": "Invalid JSON response"
            }
        
        # Extract products from new response structure
        products_list = data.get("data", {}).get("products", [])
        
        # Check if we have results
        if not products_list:
            return {
                "success": False,
                "error": "No products found in category"
            }
        
        # Format the response
        products = []
        for item in data.get("data", {}).get("products", []):
            if isinstance(item, dict):
                products.append({
                    "title": item.get("product_title"),
                    "asin": item.get("asin"),
                    "price": item.get("product_price"),
                    "rating": item.get("product_star_rating"),
                    "url": item.get("product_url"),
                    "image": item.get("product_photo"),
                    "category": item.get("product_category")
                })
            
        return {
            "success": True,
            "data": {
                "products": products,
                "total_pages": data.get("total_pages", 1),
                "current_page": data.get("current_page", 1)
            }
        }
        
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {str(e)}")
        return {"error": "Request failed", "details": str(e)}
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return {"error": "Unexpected error", "details": str(e)}

def get_product_details(asin: str, country: str = "US") -> Dict[str, Any]:
    """
    Get detailed information about a specific Amazon product using RapidAPI
    
    Args:
        asin (str): Amazon Standard Identification Number
        country (str, optional): Country code for Amazon marketplace. Defaults to "US"
        
    Returns:
        Dict[str, Any]: Product details or error information
    """
    url = f"{RAPIDAPI_BASE_URL}/product-details"
    
    params = {
        "asin": asin,
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
        
        if not data.get("data"):
            return {
                "success": False,
                "error": "Product not found"
            }
        
        product_data = data.get("data", {})
        
        return {
            "success": True,
            "data": {
                "title": product_data.get("product_title"),
                "asin": product_data.get("asin"),
                "price": product_data.get("product_price"),
                "rating": product_data.get("product_star_rating"),
                "url": product_data.get("product_url"),
                "image": product_data.get("product_photo"),
                "description": product_data.get("product_description"),
                "features": product_data.get("product_features", []),
                "specifications": product_data.get("product_information", {}),
                "availability": product_data.get("availability_status"),
                "brand": product_data.get("product_brand"),
                "category": product_data.get("product_category")
            }
        }
        
    except Exception as e:
        return {"error": "Unexpected error", "details": str(e)}

def get_product_reviews(
    asin: str,
    page: int = 1,
    country: str = "US",
    sort_by: str = "TOP_REVIEWS",
    star_rating: str = "ALL",
    verified_only: bool = False,
    media_only: bool = False,
    current_format: bool = False
) -> Dict[str, Any]:
    """
    Get reviews for a specific Amazon product using RapidAPI
    
    Args:
        asin (str): Amazon Standard Identification Number
        page (int, optional): Page number for pagination. Defaults to 1
        country (str, optional): Country code for Amazon marketplace. Defaults to "US"
        sort_by (str, optional): Sort order for reviews. Defaults to "TOP_REVIEWS"
        star_rating (str, optional): Filter by star rating. Defaults to "ALL"
        verified_only (bool, optional): Show only verified purchases. Defaults to False
        media_only (bool, optional): Show only reviews with media. Defaults to False
        current_format (bool, optional): Show only current format reviews. Defaults to False
        
    Returns:
        Dict[str, Any]: Product reviews or error information
    """
    url = f"{RAPIDAPI_BASE_URL}/product-reviews"
    
    params = {
        "asin": asin,
        "country": country.upper(),
        "page": str(page),
        "sort_by": sort_by,
        "star_rating": star_rating,
        "verified_purchases_only": str(verified_only).lower(),
        "images_or_videos_only": str(media_only).lower(),
        "current_format_only": str(current_format).lower()
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
        
        if not data.get("data"):
            return {
                "success": False,
                "error": "No reviews found"
            }
        
        reviews_data = data.get("data", {})
        reviews = []
        
        for review in reviews_data.get("reviews", []):
            reviews.append({
                "id": review.get("review_id"),
                "title": review.get("review_title"),
                "text": review.get("review_text"),
                "rating": review.get("review_star_rating"),
                "date": review.get("review_date"),
                "verified": review.get("verified_purchase", False),
                "author": review.get("review_author"),
                "images": review.get("review_images", []),
                "helpful_votes": review.get("helpful_votes", 0)
            })
        
        return {
            "success": True,
            "data": {
                "reviews": reviews,
                "total_reviews": reviews_data.get("total_reviews", 0),
                "rating_summary": reviews_data.get("rating_summary", {}),
                "current_page": reviews_data.get("current_page", 1),
                "total_pages": reviews_data.get("total_pages", 1)
            }
        }
        
    except Exception as e:
        return {"error": "Unexpected error", "details": str(e)}

def get_product_offers(asin: str, page: int = 1, country: str = "US", limit: int = 100) -> Dict[str, Any]:
    """
    Get offers for a specific Amazon product using RapidAPI
    
    Args:
        asin (str): Amazon Standard Identification Number
        page (int, optional): Page number for pagination. Defaults to 1
        country (str, optional): Country code for Amazon marketplace. Defaults to "US"
        limit (int, optional): Maximum number of offers to return. Defaults to 100
        
    Returns:
        Dict[str, Any]: Product offers or error information
    """
    url = f"{RAPIDAPI_BASE_URL}/product-offers"
    
    params = {
        "asin": asin,
        "country": country.upper(),
        "limit": str(limit),
        "page": str(page)
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
        
        if not data.get("data"):
            return {
                "success": False,
                "error": "No offers found"
            }
        
        offers_data = data.get("data", {})
        offers = []
        
        for offer in offers_data.get("offers", []):
            offers.append({
                "seller_name": offer.get("seller_name"),
                "seller_id": offer.get("seller_id"),
                "price": offer.get("price"),
                "condition": offer.get("condition"),
                "availability": offer.get("availability"),
                "delivery_info": offer.get("delivery_information"),
                "is_prime": offer.get("is_prime", False),
                "is_amazon_fulfilled": offer.get("fulfilled_by_amazon", False),
                "shipping_cost": offer.get("shipping_cost"),
                "offer_link": offer.get("offer_link")
            })
        
        return {
            "success": True,
            "data": {
                "offers": offers,
                "total_offers": offers_data.get("total_offers", 0),
                "current_page": offers_data.get("current_page", 1),
                "total_pages": offers_data.get("total_pages", 1)
            }
        }
        
    except Exception as e:
        return {"error": "Unexpected error", "details": str(e)}

def get_best_sellers(category: str, page: int = 1, country: str = "US") -> Dict[str, Any]:
    """
    Get best-selling products for a specific category using RapidAPI
    
    Args:
        category (str): Category name (e.g., 'software', 'electronics')
        page (int, optional): Page number for pagination. Defaults to 1
        country (str, optional): Country code for Amazon marketplace. Defaults to "US"
        
    Returns:
        Dict[str, Any]: Best sellers data or error information
    """
    url = f"{RAPIDAPI_BASE_URL}/best-sellers"
    
    params = {
        "category": category.lower(),
        "type": "BEST_SELLERS",
        "page": str(page),
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
        
        if not data.get("data"):
            return {
                "success": False,
                "error": "No best sellers found"
            }
        
        products = []
        for item in data.get("data", []):
            products.append({
                "title": item.get("product_title"),
                "asin": item.get("asin"),
                "price": item.get("product_price"),
                "rating": item.get("product_star_rating"),
                "url": item.get("product_url"),
                "image": item.get("product_photo"),
                "rank": item.get("best_seller_rank"),
                "category": item.get("product_category")
            })
        
        return {
            "success": True,
            "data": {
                "products": products,
                "total_pages": data.get("total_pages", 1),
                "current_page": data.get("current_page", 1),
                "category": category
            }
        }
        
    except Exception as e:
        return {"error": "Unexpected error", "details": str(e)}

def get_seller_reviews(seller_id: str, page: int = 1, country: str = "US") -> Dict[str, Any]:
    """
    Get reviews for a specific Amazon seller using RapidAPI
    
    Args:
        seller_id (str): Amazon seller ID
        page (int, optional): Page number for pagination. Defaults to 1
        country (str, optional): Country code for Amazon marketplace. Defaults to "US"
        
    Returns:
        Dict[str, Any]: Seller reviews or error information
    """
    url = f"{RAPIDAPI_BASE_URL}/seller-reviews"
    
    params = {
        "seller_id": seller_id,
        "country": country.upper(),
        "page": str(page)
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
        
        if not data.get("data"):
            return {
                "success": False,
                "error": "No reviews found for seller"
            }
        
        reviews_data = data.get("data", {})
        reviews = []
        
        for review in reviews_data.get("reviews", []):
            reviews.append({
                "id": review.get("review_id"),
                "title": review.get("review_title"),
                "text": review.get("review_text"),
                "rating": review.get("review_star_rating"),
                "date": review.get("review_date"),
                "author": review.get("review_author"),
                "helpful_votes": review.get("helpful_votes", 0)
            })
        
        return {
            "success": True,
            "data": {
                "reviews": reviews,
                "total_reviews": reviews_data.get("total_reviews", 0),
                "current_page": reviews_data.get("current_page", 1),
                "total_pages": reviews_data.get("total_pages", 1)
            }
        }
        
    except Exception as e:
        return {"error": "Unexpected error", "details": str(e)}

def get_seller_profile(seller_id: str, country: str = "US") -> Dict[str, Any]:
    """
    Get profile information for a specific Amazon seller using RapidAPI
    
    Args:
        seller_id (str): Amazon seller ID
        country (str, optional): Country code for Amazon marketplace. Defaults to "US"
        
    Returns:
        Dict[str, Any]: Seller profile information or error details
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
        
        if not data.get("data"):
            return {
                "success": False,
                "error": "Seller profile not found"
            }
        
        profile_data = data.get("data", {})
        
        return {
            "success": True,
            "data": {
                "seller_name": profile_data.get("seller_name"),
                "seller_id": profile_data.get("seller_id"),
                "rating": profile_data.get("seller_rating"),
                "total_reviews": profile_data.get("total_reviews"),
                "location": profile_data.get("seller_location"),
                "business_name": profile_data.get("business_name"),
                "business_address": profile_data.get("business_address"),
                "business_phone": profile_data.get("business_phone"),
                "business_email": profile_data.get("business_email"),
                "business_website": profile_data.get("business_website"),
                "return_policy": profile_data.get("return_policy")
            }
        }
        
    except Exception as e:
        return {"error": "Unexpected error", "details": str(e)}

def get_product_categories(country: str = "US") -> Dict[str, Any]:
    """
    Get product categories available on Amazon using RapidAPI
    
    Args:
        country (str, optional): Country code for Amazon marketplace. Defaults to "US"
        
    Returns:
        Dict[str, Any]: Product categories or error information
    """
    url = f"{RAPIDAPI_BASE_URL}/product-categories"
    
    params = {
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
        
        if not data.get("data"):
            return {
                "success": False,
                "error": "No categories found"
            }
        
        categories = []
        for category in data.get("data", []):
            categories.append({
                "id": category.get("category_id"),
                "name": category.get("category_name"),
                "parent_id": category.get("parent_category_id"),
                "level": category.get("category_level")
            })
        
        return {
            "success": True,
            "data": {
                "categories": categories
            }
        }
        
    except Exception as e:
        return {"error": "Unexpected error", "details": str(e)}

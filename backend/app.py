from dotenv import load_dotenv
load_dotenv()

from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
import json
from datetime import datetime
from pymongo import MongoClient
from bson.objectid import ObjectId, InvalidId
from register import register
from login import login
from api.auth.google.auth_routes import google_auth

# Import amazon_api properly
from services.amazon_api import (
    search_products,
    get_products_by_category,
    get_product_details,
    get_product_reviews,
    get_product_offers,
    get_best_sellers,
    get_seller_reviews,
    get_seller_profile,
    get_product_categories
)

# MongoDB setup (adjust URI as needed)
client = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017/"))
db = client["procuredb"]

app = Flask(__name__)

# CORS configuration
CORS(app,
     origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "X-User-Id"],
     supports_credentials=True)

# Apply CORS to blueprints BEFORE registering them
CORS(register, origins=["http://localhost:5173"], supports_credentials=True)
CORS(login, origins=["http://localhost:5173"], supports_credentials=True)
CORS(google_auth, origins=["http://localhost:5173"], supports_credentials=True)

# Register blueprints
app.register_blueprint(register)
app.register_blueprint(login)
app.register_blueprint(google_auth)

# --- CHAT ROUTES ---

@app.route("/api/chat/start", methods=["POST"])
def start_chat_session():
    try:
        data = request.get_json()
        user_id = data.get("userId")
        product_type = data.get("productType", "General Chat")

        if not user_id:
            return jsonify({"error": "userId is required"}), 400

        try:
            user_obj_id = ObjectId(user_id)
        except InvalidId:
            return jsonify({"error": "Invalid userId format"}), 400

        session_id = str(ObjectId())
        session_doc = {
            "sessionId": session_id,
            "userId": user_obj_id,
            "productType": product_type,
            "title": f"Chat about {product_type}",
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
            "messages": [],
            "state": {
                "stage": "initial",
                "productType": "",
                "questions": [],
                "attributes": {},
                "currentQuestionIndex": 0,
                "quantity": 1,
                "location": "Unknown",
                "timeline": "",
                "procurementValue": "",
                "approach": "",
                "wocCriteria": "",
                "suppliers": "",
                "finalWocJustification": ""
            }
        }

        result = db.chatSessions.insert_one(session_doc)
        if result.inserted_id:
            return jsonify({"sessionId": session_id, "message": "Chat session started successfully"}), 201
        else:
            return jsonify({"error": "Failed to create chat session"}), 500

    except Exception as e:
        print(f"Error starting chat session: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/chat/save", methods=["POST"])
def save_chat():
    try:
        data = request.get_json()
        session_id = data.get("sessionId")
        user_id = data.get("userId")
        from_field = data.get("from")
        text = data.get("text")
        url = data.get("url")  # New field for URL
        timestamp = data.get("timestamp")
        state = data.get("state", {})

        if not all([session_id, user_id, from_field, text]):
            return jsonify({"error": "Missing required fields"}), 400

        try:
            user_obj_id = ObjectId(user_id)
        except InvalidId:
            return jsonify({"error": "Invalid userId format"}), 400

        message = {
            "role": from_field,
            "content": text,
            "url": url,  # Include URL in the message document
            "timestamp": datetime.fromisoformat(timestamp.replace('Z', '+00:00')) if timestamp else datetime.utcnow()
        }

        update_result = db.chatSessions.update_one(
            {"sessionId": session_id, "userId": user_obj_id},
            {"$push": {"messages": message}, "$set": {"state": state, "updatedAt": datetime.utcnow()}},
        )

        if update_result.modified_count > 0:
            return jsonify({"success": True, "message": "Chat saved successfully"}), 200
        else:
            return jsonify({"error": "Failed to save message or session not found"}), 404

    except Exception as e:
        print(f"Error saving chat: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/chat/sessions/<user_id>", methods=["GET"])
def get_chat_sessions(user_id):
    try:
        user_obj_id = ObjectId(user_id)
        sessions = db.chatSessions.find({"userId": user_obj_id}).sort("updatedAt", -1)
        result = [{
            "sessionId": session["sessionId"],
            "title": session.get("title", "General Chat"),
            "productType": session.get("productType", "General Chat"),
            "createdAt": session["createdAt"].isoformat(),
            "updatedAt": session["updatedAt"].isoformat(),
            "messageCount": len(session.get("messages", []))
        } for session in sessions]
        return jsonify(result), 200
    except InvalidId:
        return jsonify({"error": "Invalid userId format"}), 400
    except Exception as e:
        print(f"Error fetching chat sessions: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/chat/session/<session_id>", methods=["GET"])
def get_chat_session(session_id):
    try:
        user_id = request.args.get("userId")
        if not user_id:
            return jsonify({"error": "userId parameter is required"}), 400

        user_obj_id = ObjectId(user_id)
        session = db.chatSessions.find_one({"sessionId": session_id, "userId": user_obj_id})
        if not session:
            return jsonify({"error": "Session not found"}), 404

        messages = [{
            "from": msg["role"],
            "text": msg["content"],
            "url": msg.get("url"),  # Include URL in the response
            "timestamp": msg["timestamp"].isoformat()
        } for msg in session.get("messages", [])]

        return jsonify({
            "sessionId": session["sessionId"],
            "title": session.get("title", "General Chat"),
            "productType": session.get("productType", "General Chat"),
            "messages": messages,
            "state": session.get("state"),
            "createdAt": session["createdAt"].isoformat(),
            "updatedAt": session["updatedAt"].isoformat()
        }), 200
    except InvalidId:
        return jsonify({"error": "Invalid userId format"}), 400
    except Exception as e:
        print(f"Error fetching chat session: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/chat/delete/<session_id>", methods=["DELETE"])
def delete_chat_session(session_id):
    try:
        user_id = request.args.get("userId")
        if not user_id:
            return jsonify({"error": "userId parameter is required"}), 400

        user_obj_id = ObjectId(user_id)
        delete_result = db.chatSessions.delete_one({"sessionId": session_id, "userId": user_obj_id})

        if delete_result.deleted_count > 0:
            return jsonify({"message": "Session deleted successfully"}), 200
        else:
            return jsonify({"error": "Session not found"}), 404
    except InvalidId:
        return jsonify({"error": "Invalid userId format"}), 400
    except Exception as e:
        print(f"Error deleting chat session: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/chat/rename", methods=["PUT"])
def rename_chat_session():
    try:
        data = request.get_json()
        session_id = data.get("sessionId")
        user_id = data.get("userId")
        new_title = data.get("newTitle")

        if not all([session_id, user_id, new_title]):
            return jsonify({"error": "Missing required fields"}), 400

        user_obj_id = ObjectId(user_id)
        update_result = db.chatSessions.update_one(
            {"sessionId": session_id, "userId": user_obj_id},
            {"$set": {"title": new_title, "updatedAt": datetime.utcnow()}},
        )

        if update_result.modified_count > 0:
            return jsonify({"message": "Session renamed successfully"}), 200
        else:
            return jsonify({"error": "Session not found"}), 404
    except InvalidId:
        return jsonify({"error": "Invalid userId format"}), 400
    except Exception as e:
        print(f"Error renaming chat session: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

# --- AMAZON RAPIDAPI ROUTES ---

@app.route("/api/amazon/search", methods=["GET"])
def amazon_search():
    try:
        keyword = request.args.get("keyword") or request.args.get("query")
        if not keyword:
            return jsonify({"error": "Keyword parameter is required"}), 400

        page = request.args.get("page", 1, type=int)
        country = request.args.get("country", "us").upper()

        product_data = search_products(keyword, page, country)

        if "error" in product_data:
            print(f"Amazon API error: {product_data['error']}")
            return jsonify(product_data), 500

        if product_data.get("success") and product_data.get("data", {}).get("products"):
            try:
                top_product = product_data["data"]["products"][0]

                prompt = f"""Analyze this product for procurement:
                Product: {top_product['title']}
                Price: {top_product.get('price', 'N/A')}
                
                Provide a brief procurement recommendation including:
                1. Suggested quantity range
                2. Key specifications to verify
                3. Potential alternatives to consider
                
                Format response in a conversational tone."""

                gemini_response = requests.post(
                    "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
                    headers={"Content-Type": "application/json"},
                    params={"key": os.getenv("GEMINI_API_KEY")},
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {
                            "temperature": 0.7,
                            "maxOutputTokens": 1024
                        }
                    },
                    timeout=15
                )

                if gemini_response.status_code == 200:
                    ai_analysis = gemini_response.json()["candidates"][0]["content"]["parts"][0]["text"]
                    product_data["ai_analysis"] = ai_analysis

            except Exception as gemini_error:
                print(f"Gemini API error: {str(gemini_error)}")
                pass

        return jsonify(product_data), 200

    except Exception as e:
        print(f"Server error in amazon_search: {str(e)}")
        return jsonify({
            "error": "Internal server error",
            "details": str(e),
            "message": "Failed to search products"
        }), 500

@app.route("/api/amazon/category", methods=["GET"])
def amazon_category():
    category_id = request.args.get("category_id")
    page = request.args.get("page", 1, type=int)
    country = request.args.get("country", "us")
    if not category_id:
        return jsonify({"error": "Category ID is required"}), 400
    try:
        data = get_products_by_category(category_id, page, country)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/amazon/product-details", methods=["GET"])
def amazon_product_details():
    asin = request.args.get("asin")
    country = request.args.get("country", "us")
    if not asin:
        return jsonify({"error": "ASIN is required"}), 400
    try:
        data = get_product_details(asin, country)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/amazon/product-reviews", methods=["GET"])
def amazon_product_reviews():
    asin = request.args.get("asin")
    page = request.args.get("page", 1, type=int)
    country = request.args.get("country", "us")
    if not asin:
        return jsonify({"error": "ASIN is required"}), 400
    try:
        data = get_product_reviews(asin, page, country)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/amazon/product-offers", methods=["GET"])
def amazon_product_offers():
    asin = request.args.get("asin")
    page = request.args.get("page", 1, type=int)
    country = request.args.get("country", "us")
    if not asin:
        return jsonify({"error": "ASIN is required"}), 400
    try:
        data = get_product_offers(asin, page, country)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/amazon/best-sellers", methods=["GET"])
def amazon_best_sellers():
    category = request.args.get("category")
    page = request.args.get("page", 1, type=int)
    country = request.args.get("country", "us")
    if not category:
        return jsonify({"error": "Category is required"}), 400
    try:
        data = get_best_sellers(category, page, country)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/amazon/product-categories", methods=["GET"])
def amazon_product_categories():
    country = request.args.get("country", "US")
    try:
        data = get_product_categories(country)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- END AMAZON RAPIDAPI ROUTES ---

if __name__ == "__main__":
    app.run(debug=True)
from dotenv import load_dotenv
load_dotenv()
import os
import ssl
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, UTC
from pymongo import MongoClient, server_api
from bson.objectid import ObjectId, InvalidId
from register import register
from login import login
from api.auth.google.auth_routes import google_auth

# Import amazon_api functions
from services.amazon_api import product_search, product_details, seller_profile

# Import Gemini AI client
try:
    import google.generativeai as genai
except ImportError:
    genai = None

# MongoDB setup
client = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017/"))
db = client["procuredb"] # Specify the database name

# Send a ping to confirm a successful connection
try:
    client.admin.command('ping')
    print("Pinged your deployment. You successfully connected to MongoDB!")
except Exception as e:
    print(f"MongoDB connection error: {str(e)}")
    raise

# Configure Gemini AI
api_key = os.getenv("GEMINI_API_KEY")
if api_key and genai:
    try:
        genai.configure(api_key=api_key)
    except Exception as e:
        print(f"Failed to configure Gemini AI: {str(e)}")
else:
    print("Gemini AI not configured: Missing API key or SDK not installed")

app = Flask(__name__)

# CORS configuration
CORS(app,
     origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "X-User-Id"],
     supports_credentials=True)

# Apply CORS to blueprints
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
            "createdAt": datetime.now(UTC),
            "updatedAt": datetime.now(UTC),
            "messages": [],
            "state": {
                "stage": "initial",
                "procurementDetails": {
                    "requirements": {"productType": product_type},
                    "quantity": None,
                    "budget": None,
                    "currency": "USD",
                    "timeline": None
                },
                "currentQuestion": None,
                "confirmedProduct": None,
                "confirmedSeller": None,
                "products": [],
                "selectedProductDetails": None
            }
        }

        result = db.chatSessions.insert_one(session_doc)
        if result.inserted_id:
            return jsonify({"sessionId": session_id, "message": "Chat session started successfully"}), 201
        else:
            return jsonify({"error": "Failed to create chat session"}), 500

    except Exception as e:
        print(f"Error starting chat session: {str(e)}")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@app.route("/api/chat/save", methods=["POST"])
def save_chat():
    try:
        data = request.get_json()
        session_id = data.get("sessionId")
        user_id = data.get("userId")
        from_field = data.get("from")
        text = data.get("text")
        url = data.get("url")
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
            "url": url,
            "timestamp": datetime.fromisoformat(timestamp.replace('Z', '+00:00')) if timestamp else datetime.now(UTC)
        }

        update_result = db.chatSessions.update_one(
            {"sessionId": session_id, "userId": user_obj_id},
            {"$push": {"messages": message}, "$set": {"state": state, "updatedAt": datetime.now(UTC)}}
        )

        if update_result.modified_count > 0:
            return jsonify({"success": True, "message": "Chat saved successfully"}), 200
        else:
            return jsonify({"error": "Failed to save message or session not found"}), 404

    except Exception as e:
        print(f"Error saving chat: {str(e)}")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

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
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

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
            "url": msg.get("url"),
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
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

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
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

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
            {"$set": {"title": new_title, "updatedAt": datetime.now(UTC)}}
        )

        if update_result.modified_count > 0:
            return jsonify({"message": "Session renamed successfully"}), 200
        else:
            return jsonify({"error": "Session not found"}), 404
    except InvalidId:
        return jsonify({"error": "Invalid userId format"}), 400
    except Exception as e:
        print(f"Error renaming chat session: {str(e)}")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

# --- AMAZON RAPIDAPI ROUTES ---

@app.route("/api/amazon/search", methods=["GET"])
def amazon_search():
    try:
        query = request.args.get("query")
        if not query:
            return jsonify({"success": False, "error": "Query parameter is required"}), 400

        page = request.args.get("page", 1, type=int)
        country = request.args.get("country", "US").upper()
        sort_by = request.args.get("sort_by", "RELEVANCE")

        product_data = product_search(query, page, country, sort_by)
        return jsonify(product_data), 200

    except Exception as e:
        print(f"Server error in amazon_search: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Internal server error",
            "details": str(e)
        }), 500

@app.route("/api/amazon/product-details", methods=["GET"])
def amazon_product_details():
    try:
        asin = request.args.get("asin")
        country = request.args.get("country", "US").upper()
        if not asin:
            return jsonify({"success": False, "error": "ASIN is required"}), 400

        data = product_details(asin, country)
        return jsonify(data), 200

    except Exception as e:
        print(f"Server error in amazon_product_details: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Internal server error",
            "details": str(e)
        }), 500

@app.route("/api/amazon/seller-profile", methods=["GET"])
def amazon_seller_profile():
    try:
        seller_id = request.args.get("seller_id")
        country = request.args.get("country", "US").upper()
        if not seller_id:
            return jsonify({"success": False, "error": "seller_id is required"}), 400

        data = seller_profile(seller_id, country)
        return jsonify(data), 200

    except Exception as e:
        print(f"Server error in amazon_seller_profile: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Internal server error",
            "details": str(e)
        }), 500

# --- GEMINI AI ROUTE ---

@app.route("/api/gemini-ai", methods=["POST"])
def gemini_ai_query():
    try:
        if not genai:
            return jsonify({
                "error": "Gemini AI SDK not installed",
                "details": "Please install the google-generativeai package"
            }), 500
        if not api_key:
            return jsonify({
                "error": "Gemini AI API key not configured",
                "details": "Please set GEMINI_API_KEY in your .env file"
            }), 500

        data = request.get_json()
        product_data = data.get("productData")
        question = data.get("question")
        conversation_history = data.get("conversationHistory", [])

        if not product_data or not question:
            return jsonify({"error": "productData and question are required"}), 400

        # Format product data
        about_product = product_data.get("aboutProduct", [])
        if isinstance(about_product, list):
            about_product = "; ".join(about_product)
        product_info = product_data.get("productDetails", {})
        formatted_product_data = (
            f"Product: {product_data.get('title', 'Unknown')}\n"
            f"Price: {product_data.get('price', 'N/A')}\n"
            f"Original Price: {product_data.get('originalPrice', 'N/A')}\n"
            f"Rating: {product_data.get('rating', 'N/A')}\n"
            f"Number of Ratings: {product_data.get('ratingNumber', 'N/A')}\n"
            f"Availability: {product_data.get('availability', 'N/A')}\n"
            f"About: {about_product}\n"
            f"Package Dimensions: {product_info.get('Package Dimensions', product_info.get('Product Dimensions', 'N/A'))}\n"
            f"Item Model Number: {product_info.get('Item model number', 'N/A')}\n"
            f"Date First Available: {product_info.get('Date First Available', 'N/A')}\n"
            f"Material: {product_info.get('Material', 'N/A')}\n"
            f"Special Feature: {product_info.get('Special Feature', 'N/A')}\n"
            f"Product Care Instructions: {product_info.get('Product Care Instructions', 'N/A')}\n"
            f"Item Weight: {product_info.get('Item Weight', 'N/A')}\n"
            f"Manufacturer: {product_info.get('Manufacturer', 'N/A')}\n"
            f"Customer Feedback: {product_data.get('customersSay', 'No customer feedback available')}\n"
            f"Vendor: {product_data.get('sellerName', 'Unknown')}\n"
            f"Store Link: {product_data.get('productUrl', 'N/A')}"
        )

        # Format conversation history
        formatted_history = ""
        if conversation_history:
            formatted_history = "\n\nConversation History:\n" + "\n".join(
                [f"{msg['role'].capitalize()}: {msg['content']} (at {msg['timestamp']})" for msg in conversation_history]
            )

        # Truncate prompt if too long
        max_prompt_length = 10000
        combined_data = formatted_product_data + formatted_history
        if len(combined_data) > max_prompt_length - 2000:
            combined_data = combined_data[:max_prompt_length - 2000] + "..."

        # Construct prompt
        prompt = (
            f"You are a highly knowledgeable procurement assistant. Based on the following product details and conversation history, answer the user's question accurately, concisely, and logically. "
            f"If the question involves budget updates (e.g., 'add 200000 INR'), add the specified amount to the previous budget (if provided in the history) and recalculate affordability. "
            f"If the question involves calculations (e.g., price for multiple quantities), perform the arithmetic and explain the steps briefly. "
            f"For currency conversions (e.g., USD to INR), use an approximate exchange rate of 1 USD = 83 INR unless otherwise specified, and mention the rate used. "
            f"If the question requires logical reasoning (e.g., suitability, comparisons), provide a clear and reasoned response based on the product details and conversation context. "
            f"If the information is missing or unclear, state so and provide a reasonable assumption or suggest an alternative approach. "
            f"For user selecting the product from options, if the user said in the statement that they didn't like those products, proceed with the next three products. You need to analyze the statement that the user is providing and act dynamically. "
            f"Reference the conversation history to maintain continuity, especially for budget or quantity updates, and avoid redundancy. "
            f"Do not start a new chat by providing products until the user asks for a new chat or new products. "
            f"Please respond to assertive statements too, not only interrogative questions. "
            f"Don't take all assertive statements as product selections, analyze the statement and act accordingly. "
            f"Your name is BuySmart, remember that. "
            f"Analyze the user's previous response and answer the question based on the product details and conversation history. "
            f"Act as a more dynamic and flexible assistant. "
            f"Do not provide unsolicited product details unless directly asked. "
            f"Product Details:\n{formatted_product_data}\n"
            f"{formatted_history}\n\n"
            f"User Question: {question}\n\n"
            f"Provide a clear, direct, and complete answer to the question, using the product details and conversation history where relevant."
        )

        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content(prompt)
            if not response.text:
                print("Gemini AI response is empty")
                return jsonify({"answer": "Sorry, I couldn't generate a response. Please try again."}), 200
            answer = response.text.strip()
            return jsonify({"answer": answer}), 200
        except Exception as e:
            print(f"Gemini AI API error: {str(e)}")
            return jsonify({
                "error": "Failed to query Gemini AI",
                "details": str(e)
            }), 500

    except Exception as e:
        print(f"Error in gemini_ai_query: {str(e)}")
        return jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
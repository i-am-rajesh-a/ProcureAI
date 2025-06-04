from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson.objectid import ObjectId, InvalidId
from datetime import datetime
import os
import json
from register import register
from login import login
from api.auth.google.auth_routes import google_auth

app = Flask(__name__)

# Configure CORS to allow cross-origin requests
CORS(app, 
     origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "X-User-Id"],
     supports_credentials=True)

# MongoDB connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/procurement_db")
client = MongoClient(MONGO_URI)
db = client.procurement_db

# Load vendors data from JSON file
def load_vendors_data():
    try:
        vendors_file_path = os.path.join(os.path.dirname(__file__), "data", "vendors.json")
        if os.path.exists(vendors_file_path):
            with open(vendors_file_path, 'r', encoding='utf-8') as file:
                vendors_data = json.load(file)
                print(f"Successfully loaded {len(vendors_data)} vendors from vendors.json")
                return vendors_data
        else:
            print(f"Warning: Vendors file not found at {vendors_file_path}")
            return []
    except json.JSONDecodeError as e:
        print(f"Error parsing vendors.json: {e}")
        return []
    except Exception as e:
        print(f"Error loading vendors data: {e}")
        return []

VENDORS_DATA = load_vendors_data()

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
            "timestamp": datetime.fromisoformat(timestamp.replace('Z', '+00:00')) if timestamp else datetime.utcnow()
        }

        update_result = db.chatSessions.update_one(
            {"sessionId": session_id, "userId": user_obj_id},
            {"$push": {"messages": message}, "$set": {"state": state, "updatedAt": datetime.utcnow()}},
        )

        if update_result.modified_count > 0:
            return jsonify({"message": "Chat saved successfully"}), 200
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

@app.route("/generate_questions", methods=["POST"])
def generate_questions():
    try:
        data = request.get_json()
        product = data.get("product", "")
        questions = [
            {"key": "specifications", "question": f"What specific requirements do you have for the {product}?"},
            {"key": "quality", "question": "What quality level do you need? (e.g., premium, standard, budget)"},
            {"key": "features", "question": "Any specific features or characteristics required?"},
            {"key": "usage", "question": "How will these be used? (e.g., office use, industrial, personal)"},
            {"key": "budget_range", "question": "What's your budget range per unit?"}
        ]
        return jsonify({"questions": questions}), 200
    except Exception as e:
        print(f"Error generating questions: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/vendors", methods=["GET"])
def get_vendors():
    try:
        product_type = request.args.get('product_type')
        budget_min = request.args.get('budget_min', type=float)
        budget_max = request.args.get('budget_max', type=float)
        location = request.args.get('location')
        rating_min = request.args.get('rating_min', type=float)
        limit = request.args.get('limit', type=int, default=50)

        budget_range = None
        if budget_min is not None or budget_max is not None:
            budget_range = (budget_min or 0, budget_max or float('inf'))

        filtered_vendors = [v for v in VENDORS_DATA
                            if (not product_type or product_type.lower() in v.get('category', '').lower()
                                or any(product_type.lower() in item.lower() for item in v.get('items', [])))
                            and (not budget_range or budget_range[0] <= v.get('price', 0) <= budget_range[1])
                            and (not location or location.lower() in v.get('location', '').lower())
                            and (not rating_min or v.get('rating', 0) >= rating_min)]

        return jsonify({"vendors": filtered_vendors[:limit], "total": len(filtered_vendors)}), 200
    except Exception as e:
        print(f"Error fetching vendors: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

app.register_blueprint(register)
app.register_blueprint(login)
app.register_blueprint(google_auth)

if __name__ == "__main__":
    app.run(debug=True)
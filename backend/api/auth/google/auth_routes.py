from flask import Blueprint, request, jsonify
import os
import traceback
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from pymongo import MongoClient
from dotenv import load_dotenv
from flask_cors import CORS

load_dotenv()  # Load .env before getenv

google_auth = Blueprint("google_auth", __name__)
CORS(google_auth, origins=["http://localhost:5173", "http://127.0.0.1:5000"], supports_credentials=True)

mongo_uri = os.getenv("MONGO_URI")
if not mongo_uri:
    raise Exception("MONGO_URI not found in environment variables!")

mongo_client = MongoClient(mongo_uri)
db = mongo_client["procuredb"]
users_collection = db["users"]

@google_auth.route("/api/auth/google", methods=["POST"])
def handle_google_auth():
    try:
        token = request.json.get("token")
        if not token:
            return jsonify({"success": False, "error": "No token provided"}), 400

        google_client_id = os.getenv("GOOGLE_CLIENT_ID")
        if not google_client_id:
            return jsonify({"success": False, "error": "Missing GOOGLE_CLIENT_ID"}), 500

        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), google_client_id)
        google_id = idinfo.get("sub")

        email = idinfo.get("email")
        name = idinfo.get("name")
        picture = idinfo.get("picture")

        if not google_id or not email:
            return jsonify({"success": False, "error": "Invalid token payload"}), 400

        # Upsert user info (create or update)
        users_collection.update_one(
            {"google_id": google_id},
            {"$set": {
                "email": email,
                "name": name,
                "picture": picture,
                "auth_provider": "google"
            }},
            upsert=True
        )

        # Fetch the user to get the _id
        user = users_collection.find_one({"google_id": google_id})

        return jsonify({
            "success": True,
            "user": {
                "_id": str(user["_id"]),
                "email": email,
                "name": name,
                "picture": picture,
                "sub": google_id,
            }
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 400

# (Optional) Health check endpoint for debugging CORS
@google_auth.route("/api/auth/google", methods=["OPTIONS"])
def google_auth_options():
    return '', 204

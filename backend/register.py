from flask import Blueprint, request, jsonify
import bcrypt
from pymongo import MongoClient
import os
from dotenv import load_dotenv
from flask_cors import CORS

load_dotenv()
register = Blueprint("register", __name__)
CORS(register, origins=["http://localhost:5173", "http://127.0.0.1:5173"], supports_credentials=True)

mongo_uri = os.getenv("MONGO_URI")
mongo_client = MongoClient(mongo_uri)
db = mongo_client["procuredb"]
users_collection = db["users"]

@register.route("/api/register", methods=["POST"])
def register_user():
    try:
        data = request.json
        email = data.get("username")  # frontend sends username as email
        password = data.get("password")
        full_name = data.get("full_name", "")

        if not email or not password:
            return jsonify({"success": False, "message": "Email and password are required"}), 400

        if users_collection.find_one({"email": email}):
            return jsonify({"success": False, "message": "User already exists"}), 409

        hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        result = users_collection.insert_one({
            "email": email,
            "password": hashed_pw,
            "full_name": full_name,
            "auth_provider": "local"
        })

        # Fetch the inserted user and return it (excluding password)
        user = users_collection.find_one({"_id": result.inserted_id})
        user_obj = {
            "_id": str(user["_id"]),
            "email": user["email"],
            "full_name": user.get("full_name", ""),
            "auth_provider": user.get("auth_provider", "local")
        }

        return jsonify({"success": True, "message": "User registered successfully", "user": user_obj}), 201
    except Exception as e:
        print("Register Error:", e)
        return jsonify({"success": False, "message": "Registration failed"}), 500

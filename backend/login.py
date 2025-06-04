from flask import Blueprint, request, jsonify
from flask_cors import CORS
import bcrypt
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
login = Blueprint("login", __name__)

CORS(login, origins=["http://localhost:5173"], supports_credentials=True)

mongo_uri = os.getenv("MONGO_URI")
mongo_client = MongoClient(mongo_uri)
db = mongo_client["procuredb"]
users_collection = db["users"]

@login.route("/api/login", methods=["POST"])
def login_user():
    try:
        data = request.json
        email = data.get("username")
        password = data.get("password")
        user = users_collection.find_one({"email": email})
        if user and bcrypt.checkpw(password.encode('utf-8'), user["password"]):
            user_obj = {
                "_id": str(user["_id"]),
                "email": user["email"],
                "full_name": user.get("full_name", ""),
                "auth_provider": user.get("auth_provider", "local")
            }
            return jsonify({
                "success": True,
                "message": "Login successful",
                "user": user_obj
            }), 200
        else:
            return jsonify({"success": False, "message": "Invalid credentials"}), 401
    except Exception as e:
        print("Login Error:", e)
        return jsonify({"success": False, "message": "Login failed"}), 500

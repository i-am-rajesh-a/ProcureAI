from flask import Blueprint, request, jsonify
from flask_cors import CORS
import bcrypt
from pymongo import MongoClient
from bson.objectid import ObjectId
import os
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import secrets
from datetime import datetime, timedelta, UTC

load_dotenv()
login = Blueprint("login", __name__)

CORS(login, origins=["http://localhost:5173"], supports_credentials=True)

mongo_uri = os.getenv("MONGO_URI")
mongo_client = MongoClient(mongo_uri)
db = mongo_client["procuredb"]
users_collection = db["users"]

def send_reset_email(email, token, full_name):
    try:
        smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", 587))
        smtp_user = os.getenv("SMTP_USER")
        smtp_password = os.getenv("SMTP_PASSWORD")

        if not all([smtp_server, smtp_port, smtp_user, smtp_password]):
            raise ValueError("SMTP configuration missing in .env file")

        msg = MIMEMultipart()
        msg["From"] = smtp_user
        msg["To"] = email
        msg["Subject"] = "BuySmart Password Reset Request"

        reset_url = f"http://localhost:5173/reset-password?token={token}"
        body = f"""
        Hello {full_name or 'User'},

        You requested a password reset for your BuySmart account. Click the link below to reset your password:
        {reset_url}

        This link is valid for 1 hour. If you did not request this, please ignore this email.

        Best regards,
        BuySmart Team
        """
        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"Error sending reset email: {str(e)}")
        return False

@login.route("/api/login", methods=["POST"])
def login_user():
    try:
        data = request.json
        email = data.get("username")
        password = data.get("password")
        if not all([email, password]):
            return jsonify({"success": False, "message": "Email and password are required"}), 400

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
        print(f"Login Error: {str(e)}")
        return jsonify({"success": False, "message": "Login failed", "details": str(e)}), 500

@login.route("/api/forgot-password", methods=["POST"])
def forgot_password():
    try:
        data = request.get_json()
        email = data.get("email")
        if not email:
            return jsonify({"success": False, "message": "Email is required"}), 400

        user = users_collection.find_one({"email": email})
        if not user:
            return jsonify({"success": False, "message": "Email not found"}), 404

        token = secrets.token_urlsafe(32)
        expiry = datetime.now(UTC) + timedelta(hours=1)

        update_result = users_collection.update_one(
            {"email": email},
            {"$set": {"reset_token": token, "reset_token_expiry": expiry}}
        )

        if update_result.modified_count == 0:
            return jsonify({"success": False, "message": "Failed to generate reset token"}), 500

        success = send_reset_email(email, token, user.get("full_name", ""))
        if not success:
            return jsonify({"success": False, "message": "Failed to send reset email"}), 500

        return jsonify({"success": True, "message": "Password reset link sent to your email"}), 200
    except Exception as e:
        print(f"Forgot Password Error: {str(e)}")
        return jsonify({"success": False, "message": "Internal server error", "details": str(e)}), 500

@login.route("/api/reset-password", methods=["POST"])
def reset_password():
    try:
        data = request.get_json()
        token = data.get("token")
        new_password = data.get("newPassword")
        if not all([token, new_password]):
            return jsonify({"success": False, "message": "Token and new password are required"}), 400

        user = users_collection.find_one({
            "reset_token": token,
            "reset_token_expiry": {"$gt": datetime.now(UTC)}
        })

        if not user:
            return jsonify({"success": False, "message": "Invalid or expired reset token"}), 400

        hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
        update_result = users_collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {"password": hashed_password},
                "$unset": {"reset_token": "", "reset_token_expiry": ""}
            }
        )

        if update_result.modified_count == 0:
            return jsonify({"success": False, "message": "Failed to reset password"}), 500

        return jsonify({"success": True, "message": "Password reset successfully"}), 200
    except Exception as e:
        print(f"Reset Password Error: {str(e)}")
        return jsonify({"success": False, "message": "Internal server error", "details": str(e)}), 500

@login.route("/api/update-profile", methods=["PUT"])
def update_profile():
    try:
        data = request.get_json()
        user_id = data.get("userId")
        email = data.get("email")
        full_name = data.get("fullName")
        new_password = data.get("newPassword")
        current_password = data.get("currentPassword")

        if not user_id:
            return jsonify({"success": False, "message": "User ID is required"}), 400

        try:
            user_obj_id = ObjectId(user_id)
        except Exception:
            return jsonify({"success": False, "message": "Invalid user ID format"}), 400

        user = users_collection.find_one({"_id": user_obj_id})
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        if user.get("auth_provider", "local") != "local":
            return jsonify({"success": False, "message": "Profile update not allowed for non-local users"}), 403

        # Validate current password if updating password
        if new_password and not current_password:
            return jsonify({"success": False, "message": "Current password is required to update password"}), 400

        if new_password and not bcrypt.checkpw(current_password.encode('utf-8'), user["password"]):
            return jsonify({"success": False, "message": "Incorrect current password"}), 401

        # Check for duplicate email
        if email and email != user["email"]:
            existing_email = users_collection.find_one({"email": email, "_id": {"$ne": user_obj_id}})
            if existing_email:
                return jsonify({"success": False, "message": "Email is already in use"}), 409

        # Prepare update document
        update_fields = {}
        if email:
            update_fields["email"] = email
        if full_name:
            update_fields["full_name"] = full_name
        if new_password:
            update_fields["password"] = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())

        if not update_fields:
            return jsonify({"success": False, "message": "No fields provided for update"}), 400

        update_result = users_collection.update_one(
            {"_id": user_obj_id},
            {"$set": update_fields}
        )

        if update_result.modified_count == 0:
            return jsonify({"success": False, "message": "No changes made to profile"}), 400

        updated_user = users_collection.find_one({"_id": user_obj_id})
        user_obj = {
            "_id": str(updated_user["_id"]),
            "email": updated_user["email"],
            "full_name": updated_user.get("full_name", ""),
            "auth_provider": updated_user.get("auth_provider", "local")
        }

        return jsonify({
            "success": True,
            "message": "Profile updated successfully",
            "user": user_obj
        }), 200
    except Exception as e:
        print(f"Update Profile Error: {str(e)}")
        return jsonify({"success": False, "message": "Internal server error", "details": str(e)}), 500
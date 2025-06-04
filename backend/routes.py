# routes.py
from flask import Flask, request, jsonify
from models import chat_history
from bson import ObjectId

app = Flask(__name__)

@app.route("/api/chat", methods=["POST"])
def save_message():
    data = request.json
    chat_id = data.get("chat_id")
    message = {
        "user_id": data["user_id"],
        "role": data["role"],  # 'user' or 'bot'
        "message": data["message"],
        "timestamp": datetime.utcnow()
    }

    if chat_id:
        chat_history.update_one(
            {"_id": ObjectId(chat_id)},
            {"$push": {"messages": message}}
        )
    else:
        result = chat_history.insert_one({
            "user_id": data["user_id"],
            "created_at": datetime.utcnow(),
            "messages": [message],
            "title": data.get("title", "New Chat")
        })
        chat_id = str(result.inserted_id)

    return jsonify({"success": True, "chat_id": chat_id})

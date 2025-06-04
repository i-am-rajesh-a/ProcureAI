# -------------------- Chat History Save --------------------
@app.route("/api/chat/save", methods=["POST"])
def save_chat():
    ...
    return jsonify({"message": "Chat saved successfully"})

# -------------------- Chat History Fetch --------------------
@app.route("/api/chat/history/<user_id>", methods=["GET"])
def get_chat_history(user_id):
    try:
        user_obj_id = ObjectId(user_id)
    except InvalidId:
        return jsonify({"error": "Invalid userId"}), 400

    chats = db.chatHistory.find({"userId": user_obj_id}).sort("createdAt", -1)
    result = []
    for chat in chats:
        result.append({
            "id": chat["sessionId"],
            "userId": str(chat["userId"]),
            "productType": chat.get("productType", "General Chat"),
            "createdAt": chat["createdAt"].isoformat(),
            "messages": [
                {
                    "from": m["role"],
                    "text": m["content"],
                    "timestamp": m["timestamp"].isoformat()
                } for m in chat["messages"]
            ]
        })

    return jsonify(result)

from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from typing import List, Optional
from models import ChatSession, ChatMessage, ChatSessionList
import datetime
import os
from dotenv import load_dotenv

router = APIRouter(prefix="/api/chat", tags=["chat"])

# Load MongoDB URI from .env
load_dotenv()
MONGODB_URI = os.getenv("MONGO_URI")
if not MONGODB_URI:
    raise ValueError("MONGO_URI not found in environment variables")

client = AsyncIOMotorClient(MONGODB_URI)
db = client.get_database("procuredb")

# Use underscore everywhere
async def create_indexes():
    await db.chat_history.create_index([("userId", 1)])
    await db.chat_history.create_index([("sessionId", 1)])
    await db.chat_history.create_index([("userId", 1), ("createdAt", -1)])

# Get chat sessions list (for sidebar)
@router.get("/sessions/{user_id}", response_model=List[ChatSessionList])
async def get_chat_sessions(user_id: str, limit: int = 10, skip: int = 0):
    try:
        chats = await db.chat_history.find(
            {"userId": ObjectId(user_id), "isDeleted": {"$ne": True}}
        ).sort("createdAt", -1).skip(skip).limit(limit).to_list(None)
        
        return [
            {
                "id": chat["sessionId"],
                "userId": str(chat["userId"]),
                "title": chat.get("title", "New Chat"),
                "productType": chat.get("productType", "General Chat"),
                "createdAt": chat["createdAt"].isoformat(),
                "updatedAt": chat.get("updatedAt", chat["createdAt"]).isoformat(),
                "preview": chat["messages"][-1]["content"][:50] if chat["messages"] else ""
            }
            for chat in chats
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch chat sessions: {str(e)}")

# Get single chat session
@router.get("/session/{session_id}", response_model=ChatSession)
async def get_chat_session(session_id: str, user_id: str):
    try:
        chat = await db.chat_history.find_one({
            "sessionId": session_id,
            "userId": ObjectId(user_id),
            "isDeleted": {"$ne": True}
        })
        
        if not chat:
            raise HTTPException(status_code=404, detail="Chat session not found")
        
        return {
            "id": chat["sessionId"],
            "userId": str(chat["userId"]),
            "title": chat.get("title", "New Chat"),
            "productType": chat.get("productType", "General Chat"),
            "createdAt": chat["createdAt"].isoformat(),
            "messages": [
                {
                    "from": msg["role"],
                    "text": msg["content"],
                    "timestamp": msg["timestamp"].isoformat()
                }
                for msg in chat["messages"]
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch chat session: {str(e)}")

# Save or update chat session
@router.post("/save")
async def save_chat(chat: ChatSession):
    try:
        chat_data = chat.dict()
        chat_data["userId"] = ObjectId(chat_data["userId"])
        chat_data["createdAt"] = datetime.datetime.fromisoformat(chat_data["createdAt"])
        chat_data["updatedAt"] = datetime.datetime.utcnow()
        
        # Generate a title from the first message if not provided
        if not chat_data.get("title") and chat_data["messages"]:
            first_msg = chat_data["messages"][0]["text"]
            chat_data["title"] = first_msg[:30] + ("..." if len(first_msg) > 30 else "")
        
        chat_data["messages"] = [
            {
                "role": "user" or "bot",
                "content": "...",
                "timestamp": datetime
            }
            for msg in chat_data["messages"]
        ]

        await db.chat_history.update_one(
            {"userId": chat_data["userId"], "sessionId": chat_data["id"]},
            {"$set": chat_data},
            upsert=True
        )
        return {"message": "Chat saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save chat: {str(e)}")

# Delete chat session (soft delete)
@router.post("/delete/{session_id}")
async def delete_chat(session_id: str, user_id: str):
    try:
        result = await db.chat_history.update_one(
            {"userId": ObjectId(user_id), "sessionId": session_id},
            {"$set": {
                "isDeleted": True,
                "deletedAt": datetime.datetime.utcnow()
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Chat session not found")
        
        return {"message": "Chat deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete chat: {str(e)}")
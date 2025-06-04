# models.py
from pymongo import MongoClient
from datetime import datetime
from bson import ObjectId
from typing import List, Dict, Optional
from pydantic import BaseModel, Field, validator
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Message(BaseModel):
    role: str = Field(..., description="The role of the message sender (user/assistant)")
    content: str = Field(..., description="The content of the message")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="When the message was sent")

    @validator('role')
    def validate_role(cls, v):
        if v not in ['user', 'assistant']:
            raise ValueError("Role must be either 'user' or 'assistant'")
        return v

class ChatSession(BaseModel):
    session_id: str = Field(..., alias="sessionId", description="Unique session identifier")
    user_id: str = Field(..., alias="userId", description="User ID associated with this session")
    title: str = Field(default="New Chat", max_length=100, description="Title of the chat session")
    product_type: str = Field(default="General Chat", alias="productType", description="Type of product discussed")
    messages: List[Message] = Field(default_factory=list, description="List of messages in the session")
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    updated_at: datetime = Field(default_factory=datetime.utcnow, alias="updatedAt")
    is_deleted: bool = Field(default=False, alias="isDeleted")
    deleted_at: Optional[datetime] = Field(default=None, alias="deletedAt")

    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            ObjectId: lambda v: str(v)
        }

class ChatHistoryModel:
    def __init__(self):
        self.client = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017/"))
        self.db = self.client.get_database("procuredb")
        self.chat_history = self.db["chat_history"]
        self._create_indexes()

    def _create_indexes(self):
        """Ensure proper indexes exist for performance"""
        self.chat_history.create_index([("userId", 1)])
        self.chat_history.create_index([("sessionId", 1)], unique=True)
        self.chat_history.create_index([("userId", 1), ("createdAt", -1)])
        self.chat_history.create_index([("title", "text")])  # For text search

    def save_chat_session(self, chat_data: Dict):
        """
        Save or update a chat session
        Args:
            chat_data: Dictionary containing chat session data
        Returns:
            The inserted/updated chat session ID
        """
        try:
            # Auto-generate title from first message if not provided
            if not chat_data.get("title") and chat_data.get("messages"):
                first_msg = chat_data["messages"][0]["content"]
                chat_data["title"] = first_msg[:30] + ("..." if len(first_msg) > 30 else "")

            chat_data["updatedAt"] = datetime.utcnow()

            result = self.chat_history.update_one(
                {"userId": ObjectId(chat_data["userId"]), "sessionId": chat_data["sessionId"]},
                {"$set": chat_data},
                upsert=True
            )
            return result.upserted_id or chat_data["sessionId"]
        except Exception as e:
            raise ValueError(f"Failed to save chat session: {str(e)}")

    def get_user_sessions(self, user_id: str, limit: int = 10, skip: int = 0) -> List[Dict]:
        """
        Get list of chat sessions for a user
        Args:
            user_id: The user ID to fetch sessions for
            limit: Maximum number of sessions to return
            skip: Number of sessions to skip (for pagination)
        Returns:
            List of chat session dictionaries
        """
        try:
            sessions = self.chat_history.find({
                "userId": ObjectId(user_id),
                "isDeleted": {"$ne": True}
            }).sort("createdAt", -1).skip(skip).limit(limit)

            return [{
                "sessionId": session["sessionId"],
                "userId": str(session["userId"]),
                "title": session.get("title", "New Chat"),
                "productType": session.get("productType", "General Chat"),
                "createdAt": session["createdAt"],
                "updatedAt": session.get("updatedAt", session["createdAt"]),
                "preview": session["messages"][-1]["content"][:50] if session["messages"] else ""
            } for session in sessions]
        except Exception as e:
            raise ValueError(f"Failed to fetch user sessions: {str(e)}")

    def get_session(self, session_id: str, user_id: str) -> Optional[Dict]:
        """
        Get a specific chat session
        Args:
            session_id: The session ID to retrieve
            user_id: The user ID associated with the session
        Returns:
            The chat session dictionary or None if not found
        """
        try:
            session = self.chat_history.find_one({
                "sessionId": session_id,
                "userId": ObjectId(user_id),
                "isDeleted": {"$ne": True}
            })
            
            if not session:
                return None
                
            return {
                "sessionId": session["sessionId"],
                "userId": str(session["userId"]),
                "title": session.get("title", "New Chat"),
                "productType": session.get("productType", "General Chat"),
                "createdAt": session["createdAt"],
                "messages": session["messages"]
            }
        except Exception as e:
            raise ValueError(f"Failed to fetch session: {str(e)}")

    def delete_session(self, session_id: str, user_id: str) -> bool:
        """
        Soft delete a chat session
        Args:
            session_id: The session ID to delete
            user_id: The user ID associated with the session
        Returns:
            True if deletion was successful
        """
        try:
            result = self.chat_history.update_one(
                {
                    "sessionId": session_id,
                    "userId": ObjectId(user_id)
                },
                {
                    "$set": {
                        "isDeleted": True,
                        "deletedAt": datetime.utcnow()
                    }
                }
            )
            return result.modified_count > 0
        except Exception as e:
            raise ValueError(f"Failed to delete session: {str(e)}")

    def search_sessions(self, user_id: str, query: str, limit: int = 5) -> List[Dict]:
        """
        Search chat sessions by content
        Args:
            user_id: The user ID to search sessions for
            query: The search query string
            limit: Maximum number of results to return
        Returns:
            List of matching chat sessions
        """
        try:
            results = self.chat_history.find(
                {
                    "userId": ObjectId(user_id),
                    "isDeleted": {"$ne": True},
                    "$text": {"$search": query}
                },
                {"score": {"$meta": "textScore"}}
            ).sort([("score", {"$meta": "textScore"})]).limit(limit)
            
            return [{
                "sessionId": session["sessionId"],
                "title": session.get("title", "New Chat"),
                "productType": session.get("productType", "General Chat"),
                "preview": self._highlight_query(session["messages"], query),
                "score": session.get("score", 0)
            } for session in results]
        except Exception as e:
            raise ValueError(f"Search failed: {str(e)}")

    def _highlight_query(self, messages: List[Dict], query: str) -> str:
        """Helper method to find and highlight search terms in messages"""
        for msg in reversed(messages):
            if query.lower() in msg["content"].lower():
                content = msg["content"]
                start = content.lower().find(query.lower())
                if start >= 0:
                    end = start + len(query)
                    return f"...{content[max(0, start-10):start]}<b>{content[start:end]}</b>{content[end:end+20]}..."
        return messages[-1]["content"][:50] if messages else ""
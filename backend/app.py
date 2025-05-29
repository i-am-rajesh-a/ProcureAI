import os
import json
import traceback
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import google.generativeai as genai

from prompts import build_prompt
from vendor_logic import score_vendors

# --- Google Auth imports ---
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

load_dotenv()
app = Flask(__name__)
CORS(app)

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel(model_name="models/gemini-1.5-flash")  

with open("data/vendors.json") as f:
    vendors = json.load(f)

@app.route("/generate_questions", methods=["POST"])
def generate_questions():
    try:
        request_data = request.json
        product = request_data.get("product", "")
        quantity = request_data.get("quantity", 1)
        
        print(f"Generating questions for: {product} (quantity: {quantity})")
        
        question_prompt = f"""
You are a procurement assistant. A user wants to buy {quantity} {product}. 
Generate exactly 5 important questions to help determine the best specifications for this product.

Requirements:
- Each question should be specific and relevant to {product}
- Questions should help determine key specifications, quality, features, usage, and budget
- Avoid generic questions - make them product-specific
- Return ONLY a JSON array with this exact format:

[
  {{"key": "specification_name", "question": "What specifications do you need for the {product}?"}},
  {{"key": "quality", "question": "What quality level do you prefer?"}},
  {{"key": "features", "question": "Any specific features required?"}},
  {{"key": "usage", "question": "How will you use these {product}?"}},
  {{"key": "budget", "question": "What's your budget range per unit?"}}
]

Make each question specific to {product}. For example:
- For chairs: ask about material, ergonomics, size, mobility features
- For electronics: ask about specifications, brand preference, warranty
- For clothing: ask about sizes, materials, style, colors
- For tools: ask about power source, precision level, durability
- For food items: ask about ingredients, dietary restrictions, packaging

Generate 5 relevant questions for {product} now:
"""
        
        response = model.generate_content(question_prompt)
        response_text = response.text.strip()
        
        print(f"AI Response for questions: {response_text}")
        
        # Try to parse the JSON response
        try:
            # Clean the response - remove any markdown formatting
            if response_text.startswith("```json"):
                response_text = response_text.replace("```json", "").replace("```", "").strip()
            elif response_text.startswith("```"):
                response_text = response_text.replace("```", "").strip()
            
            questions = json.loads(response_text)
            
            # Validate the structure
            if not isinstance(questions, list) or len(questions) != 5:
                raise ValueError("Invalid question format")
            
            for q in questions:
                if not isinstance(q, dict) or "key" not in q or "question" not in q:
                    raise ValueError("Invalid question structure")
            
            print(f"Generated questions: {questions}")
            return jsonify({"questions": questions})
            
        except (json.JSONDecodeError, ValueError) as e:
            print(f"Error parsing AI response: {e}")
            # Fallback to generic questions
            fallback_questions = [
                {"key": "specifications", "question": f"What specific requirements do you have for the {product}?"},
                {"key": "quality", "question": "What quality level do you need? (e.g., premium, standard, budget)"},
                {"key": "features", "question": "Any specific features or characteristics required?"},
                {"key": "usage", "question": "How will these be used? (e.g., daily use, occasional, heavy duty)"},
                {"key": "budget_range", "question": "What's your budget range per unit?"}
            ]
            return jsonify({"questions": fallback_questions})
            
    except Exception as e:
        print(f"Error in generate_questions: {e}")
        traceback.print_exc()
        # Return fallback questions on any error
        fallback_questions = [
            {"key": "specifications", "question": "What specific requirements do you have for this product?"},
            {"key": "quality", "question": "What quality level do you need?"},
            {"key": "features", "question": "Any specific features required?"},
            {"key": "usage", "question": "How will you use this product?"},
            {"key": "budget_range", "question": "What's your budget range per unit?"}
        ]
        return jsonify({"questions": fallback_questions})

@app.route("/recommend", methods=["POST"])
def recommend():
    try:
        request_data = request.json
        print("Received request data:", request_data)

        # Handle enhanced request data with attributes
        if "attributes" in request_data and request_data["attributes"]:
            # Format the item description with attributes
            attributes_text = ", ".join([f"{k}: {v}" for k, v in request_data["attributes"].items()])
            enhanced_item = f"{request_data.get('product_type', request_data.get('item', ''))} ({attributes_text})"
            request_data["item"] = enhanced_item
            
            print("Enhanced item description:", enhanced_item)

        top_vendors = score_vendors(vendors, request_data)[:3]
        print("Top vendors:", top_vendors)

        # Use the existing build_prompt function
        prompt = build_prompt(request_data, top_vendors)
        print("Prompt:", prompt)

        response = model.generate_content(prompt)
        print("AI Response:", response.text)

        return jsonify({
            "recommendation": response.text,
            "vendors": top_vendors,
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# ---------------- GOOGLE AUTH ENDPOINT ----------------
@app.route("/api/auth/google", methods=["POST"])
def google_auth():
    try:
        token = request.json.get("token")
        if not token:
            return jsonify({"success": False, "error": "No token provided"}), 400

        # Use the backend's GOOGLE_CLIENT_ID (set in your backend .env)
        google_client_id = os.getenv("GOOGLE_CLIENT_ID")
        if not google_client_id:
            return jsonify({"success": False, "error": "Google client ID not set in backend"}), 500

        # Verify the token with Google
        idinfo = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            google_client_id
        )

        # idinfo now contains user info (email, name, etc.)
        # Here you would typically create or fetch the user in your DB

        # Example: return user info (never return the token itself)
        return jsonify({
            "success": True,
            "user": {
                "email": idinfo.get("email"),
                "name": idinfo.get("name"),
                "picture": idinfo.get("picture"),
                "sub": idinfo.get("sub"),
            }
        })

    except Exception as e:
        print("Google Auth Error:", e)
        return jsonify({"success": False, "error": str(e)}), 400

if __name__ == "__main__":
    app.run(debug=True)
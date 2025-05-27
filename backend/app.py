import os
import json
import traceback
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import google.generativeai as genai

from prompts import build_prompt
from vendor_logic import score_vendors

load_dotenv()
app = Flask(__name__)
CORS(app)

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel(model_name="models/gemini-1.5-flash")  

with open("data/vendors.json") as f:
    vendors = json.load(f)

@app.route("/recommend", methods=["POST"])
def recommend():
    try:
        request_data = request.json
        print("Received request data:", request_data)

        top_vendors = score_vendors(vendors, request_data)[:3]
        print("Top vendors:", top_vendors)

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

if __name__ == "__main__":
    app.run(debug=True)
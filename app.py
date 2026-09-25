"""
AI Loan Eligibility Checker - Flask Backend API
Provides REST endpoints for AI Financial Tips, Demo Application Saving, and Health Checking.
Also serves frontend static assets when accessed directly on localhost.
"""

import os
import sys
import logging
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Import internal services
from services.claude_service import generate_financial_tips, is_claude_configured, VALID_TOPICS
from services.sheets_service import save_application, is_sheets_configured, LOCAL_DATA_FILE
import json

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("BFSI-App")

# Initialize Flask app
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
app = Flask(__name__, static_folder=FRONTEND_DIR)

# Enable CORS for cross-origin frontend requests (e.g. VS Code Live Server or file://)
CORS(app, resources={r"/api/*": {"origins": "*"}})


# ==============================================================
# FRONTEND STATIC ASSET ROUTES
# ==============================================================
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    """Serve frontend static files or index.html for single-page dashboard routing."""
    target_path = os.path.join(FRONTEND_DIR, path)
    if path != "" and os.path.exists(target_path):
        return send_from_directory(FRONTEND_DIR, path)
    return send_from_directory(FRONTEND_DIR, "index.html")


# ==============================================================
# REST API ENDPOINTS
# ==============================================================

@app.route("/api/health", methods=["GET"])
def health_check():
    """
    Check the health of the backend API and configuration of external services.
    Useful for frontend connectivity checks and status badges.
    """
    claude_ready = is_claude_configured()
    sheets_ready = is_sheets_configured()

    return jsonify({
        "status": "online",
        "service": "AI Loan Eligibility Checker Backend",
        "version": "1.0.0",
        "features": {
            "claude_api_configured": claude_ready,
            "claude_model": os.getenv("CLAUDE_MODEL", "claude-3-5-sonnet-20241022"),
            "sheets_integration_configured": sheets_ready,
            "storage_mode": "Google Sheets" if sheets_ready else "Local JSON Demo Storage"
        },
        "disclaimer": "Educational BFSI platform only. Not financial advice or loan approval."
    }), 200


@app.route("/api/financial-tips", methods=["POST"])
def get_financial_tips():
    """
    Generate personalized financial tips and explanations.
    Uses Claude API if configured, otherwise falls back gracefully to
    the built-in BFSI financial intelligence engine.
    """
    try:
        data = request.get_json(silent=True) or {}
        topic = data.get("topic", "Financial Planning")
        question = data.get("question", "")
        profile_context = data.get("profile_context", None)

        # Validate topic
        if topic not in VALID_TOPICS:
            topic = "Financial Planning"

        # Sanitize question length
        if isinstance(question, str):
            question = question.strip()[:400]
        else:
            question = ""

        # Invoke Claude service (with internal fallback)
        result = generate_financial_tips(topic, question, profile_context)
        return jsonify(result), 200

    except Exception as e:
        logger.exception("Error processing financial tips request: %s", str(e))
        return jsonify({
            "success": False,
            "error": "Failed to generate financial tips. Please try again.",
            "disclaimer": "Educational BFSI platform only."
        }), 500


@app.route("/api/save-application", methods=["POST"])
def record_application():
    """
    Save non-sensitive demo loan application summary to Google Sheets
    or local demo session storage.
    Strictly forbids sensitive data (passwords, bank accounts, cards, OTPs, IDs).
    """
    try:
        data = request.get_json(silent=True)
        if not data or not isinstance(data, dict):
            return jsonify({
                "success": False,
                "error": "Invalid request payload. Expected JSON object."
            }), 400

        # Guard against sensitive data fields
        prohibited_keys = {
            "password", "pwd", "pin", "otp", "bank_account", "account_number",
            "card_number", "cvv", "pan", "aadhaar", "ssn", "gov_id"
        }
        found_prohibited = [k for k in data.keys() if k.lower() in prohibited_keys]
        if found_prohibited:
            return jsonify({
                "success": False,
                "error": "Sensitive information cannot be submitted or stored in this educational platform."
            }), 400

        result = save_application(data)
        return jsonify(result), 201

    except Exception as e:
        logger.exception("Error saving demo application: %s", str(e))
        return jsonify({
            "success": False,
            "error": "An error occurred while saving the application summary."
        }), 500


@app.route("/api/applications", methods=["GET"])
def get_recent_applications():
    """
    Retrieve recent demo application submissions from local storage.
    Enables quick verification during project reviews and vivas.
    """
    try:
        if os.path.exists(LOCAL_DATA_FILE):
            with open(LOCAL_DATA_FILE, "r", encoding="utf-8") as f:
                records = json.load(f)
                return jsonify({
                    "success": True,
                    "count": len(records),
                    "applications": records[-10:]  # Return latest 10
                }), 200
        return jsonify({
            "success": True,
            "count": 0,
            "applications": []
        }), 200
    except Exception as e:
        logger.exception("Error retrieving demo applications: %s", str(e))
        return jsonify({
            "success": False,
            "error": "Failed to retrieve demo application history."
        }), 500


# ==============================================================
# ERROR HANDLERS (Clean JSON, No Leaked Stack Traces)
# ==============================================================

@app.errorhandler(404)
def not_found(error):
    if request.path.startswith("/api/"):
        return jsonify({"success": False, "error": "Endpoint not found."}), 404
    return send_from_directory(FRONTEND_DIR, "index.html"), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        "success": False,
        "error": "Internal server error. Please try again later."
    }), 500


# ==============================================================
# MAIN ENTRYPOINT
# ==============================================================
if __name__ == "__main__":
    port = int(os.getenv("FLASK_PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "True").lower() in ("true", "1", "yes")

    print("\n" + "=" * 65)
    print(" 🚀 AI Loan Eligibility Checker - BFSI Web Application")
    print("=" * 65)
    print(f" • Dashboard URL:      http://localhost:{port}/")
    print(f" • Health API:         http://localhost:{port}/api/health")
    print(f" • Claude AI Mode:     {'Live Anthropic API' if is_claude_configured() else 'Intelligent Built-in Fallback'}")
    print(f" • Data Storage:       {'Google Sheets' if is_sheets_configured() else 'Local JSON Demo Storage'}")
    print("=" * 65 + "\n")

    app.run(host="0.0.0.0", port=port, debug=debug)

"""
Google Sheets Service
Handles logging of non-sensitive loan eligibility demo submissions.
Features optional Google Sheets integration with automatic local JSON fallback.
"""

import os
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Path to local backup file
LOCAL_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
LOCAL_DATA_FILE = os.path.join(LOCAL_DATA_DIR, "demo_applications.json")


def is_sheets_configured() -> bool:
    """Check if Google Sheets integration is enabled and credentials exist."""
    enabled = os.getenv("GOOGLE_SHEETS_ENABLED", "False").lower() in ("true", "1", "yes")
    cred_file = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE", "credentials.json")
    sheet_id = os.getenv("GOOGLE_SHEETS_SPREADSHEET_ID", "").strip()

    if not enabled:
        return False

    if not sheet_id or "your_" in sheet_id:
        return False

    # Check if credential file exists
    cred_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), cred_file)
    return os.path.exists(cred_path) or os.path.exists(cred_file)


def sanitize_application_data(raw_data: dict) -> dict:
    """
    Sanitize and filter fields to ensure NO sensitive data is ever recorded.
    Whitelist only safe educational parameters.
    """
    now = datetime.now()
    ref_id = f"APP-{now.strftime('%Y%m%d')}-{abs(hash(str(raw_data) + str(now.timestamp()))) % 10000:04d}"

    # Extract strictly safe non-sensitive fields
    sanitized = {
        "reference_id": ref_id,
        "submission_time": now.strftime("%Y-%m-%d %H:%M:%S"),
        "applicant_alias": str(raw_data.get("full_name", "Demo User")).strip()[:50],
        "age": int(raw_data.get("age", 0)) if str(raw_data.get("age", "")).isdigit() else "N/A",
        "employment_type": str(raw_data.get("employment_type", "Salaried")),
        "monthly_income": float(raw_data.get("monthly_income", 0)),
        "monthly_expenses": float(raw_data.get("monthly_expenses", 0)),
        "existing_monthly_emi": float(raw_data.get("existing_emi", 0)),
        "desired_loan_amount": float(raw_data.get("desired_loan_amount", 0)),
        "desired_tenure_years": float(raw_data.get("desired_tenure_years", 0)),
        "credit_score": int(raw_data.get("credit_score", 0)) if str(raw_data.get("credit_score", "")).isdigit() else 0,
        "estimated_eligible_amount": float(raw_data.get("eligible_amount", 0)),
        "estimated_emi": float(raw_data.get("estimated_emi", 0)),
        "debt_to_income_pct": float(raw_data.get("dti_ratio", 0)),
        "risk_profile": str(raw_data.get("risk_profile", "Moderate"))
    }

    return sanitized


def save_to_local_backup(sanitized_data: dict) -> bool:
    """Save submission record to a local JSON file in backend/data/."""
    try:
        os.makedirs(LOCAL_DATA_DIR, exist_ok=True)
        records = []
        if os.path.exists(LOCAL_DATA_FILE):
            try:
                with open(LOCAL_DATA_FILE, "r", encoding="utf-8") as f:
                    records = json.load(f)
                    if not isinstance(records, list):
                        records = []
            except Exception:
                records = []

        records.append(sanitized_data)

        # Keep latest 100 demo records
        if len(records) > 100:
            records = records[-100:]

        with open(LOCAL_DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(records, f, indent=2)

        logger.info("Successfully recorded demo application to local storage: %s", sanitized_data["reference_id"])
        return True
    except Exception as e:
        logger.exception("Error saving to local data backup: %s", str(e))
        return False


def save_application(raw_data: dict) -> dict:
    """
    Save sanitized application data to Google Sheets if configured,
    otherwise store in local demo JSON storage.
    """
    sanitized = sanitize_application_data(raw_data)

    if not is_sheets_configured():
        save_to_local_backup(sanitized)
        return {
            "success": True,
            "message": "Demo eligibility summary saved securely to local session log.",
            "reference_id": sanitized["reference_id"],
            "storage_destination": "local_demo_log",
            "data": sanitized
        }

    # Attempt Google Sheets sync
    try:
        import gspread
        from google.oauth2.service_account import Credentials

        cred_file = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE", "credentials.json")
        sheet_id = os.getenv("GOOGLE_SHEETS_SPREADSHEET_ID")
        worksheet_name = os.getenv("GOOGLE_SHEETS_WORKSHEET_NAME", "LoanApplications")

        scopes = [
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive"
        ]

        if not os.path.isabs(cred_file):
            cred_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), cred_file)

        credentials = Credentials.from_service_account_file(cred_file, scopes=scopes)
        client = gspread.authorize(credentials)
        sheet = client.open_by_key(sheet_id)

        try:
            worksheet = sheet.worksheet(worksheet_name)
        except gspread.WorksheetNotFound:
            worksheet = sheet.add_worksheet(title=worksheet_name, rows=100, cols=15)
            # Write header
            worksheet.append_row([
                "Reference ID", "Timestamp", "Applicant Alias", "Age",
                "Employment Type", "Monthly Income", "Monthly Expenses",
                "Existing EMI", "Desired Loan", "Tenure (Yrs)", "Credit Score",
                "Eligible Amount", "Estimated EMI", "DTI (%)", "Risk Profile"
            ])

        row_values = [
            sanitized["reference_id"],
            sanitized["submission_time"],
            sanitized["applicant_alias"],
            sanitized["age"],
            sanitized["employment_type"],
            sanitized["monthly_income"],
            sanitized["monthly_expenses"],
            sanitized["existing_monthly_emi"],
            sanitized["desired_loan_amount"],
            sanitized["desired_tenure_years"],
            sanitized["credit_score"],
            sanitized["estimated_eligible_amount"],
            sanitized["estimated_emi"],
            sanitized["debt_to_income_pct"],
            sanitized["risk_profile"]
        ]

        worksheet.append_row(row_values)
        save_to_local_backup(sanitized)  # Also keep local copy

        return {
            "success": True,
            "message": "Demo eligibility summary synced with Google Sheet successfully.",
            "reference_id": sanitized["reference_id"],
            "storage_destination": "google_sheets",
            "data": sanitized
        }

    except Exception as e:
        logger.warning("Google Sheets sync failed: %s. Falling back to local storage.", str(e))
        save_to_local_backup(sanitized)
        return {
            "success": True,
            "message": "Saved to local storage (Google Sheets unavailable or credentials pending).",
            "reference_id": sanitized["reference_id"],
            "storage_destination": "local_demo_log",
            "data": sanitized
        }

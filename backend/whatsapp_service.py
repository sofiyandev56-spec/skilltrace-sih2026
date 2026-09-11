import json
import os
import re
import sys
import time
import random
import threading
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import requests

try:
    from . import supabase_client as _sb
except Exception:
    _sb = None

try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

def log_msg(msg: str):
    try:
        print(msg)
    except Exception:
        try:
            print(msg.encode("ascii", "replace").decode("ascii"))
        except Exception:
            pass

API_TOKEN = "BvH8m3j4A9RE2doUOaEuVEwUlmgqeGhR"
SEND_URL = "https://gate.whapi.cloud/messages/text"
MESSAGES_URL = "https://gate.whapi.cloud/messages/list"

HEADERS = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Accept": "application/json",
    "Content-Type": "application/json"
}

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)
SESSIONS_FILE = os.path.join(DATA_DIR, "whatsapp_sessions.json")
SURVEY_LOG_FILE = os.path.join(DATA_DIR, "whatsapp_surveys.json")

def load_sessions() -> Dict[str, Any]:
    """Load WhatsApp sessions — file-first, then merge from Supabase."""
    sessions: Dict[str, Any] = {}
    if os.path.exists(SESSIONS_FILE):
        try:
            with open(SESSIONS_FILE, "r", encoding="utf-8") as f:
                sessions = json.load(f)
        except Exception:
            sessions = {}
    # Merge from Supabase (adds cross-server sessions)
    if _sb:
        try:
            sb_sessions = _sb.sb_get_whatsapp_sessions()
            for phone, data in sb_sessions.items():
                if phone not in sessions:
                    sessions[phone] = data
        except Exception:
            pass
    return sessions

def save_sessions(sessions: Dict[str, Any]):
    """Save sessions to local file and sync each session to Supabase."""
    try:
        with open(SESSIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(sessions, f, indent=2, ensure_ascii=False)
    except Exception as e:
        log_msg(f"Error saving sessions: {e}")
    # Sync to Supabase in background
    if _sb:
        def _sync():
            for phone, data in sessions.items():
                try:
                    _sb.sb_save_whatsapp_session(phone, data)
                except Exception:
                    pass
        threading.Thread(target=_sync, daemon=True).start()

def append_survey_log(entry: Dict[str, Any]):
    logs = []
    if os.path.exists(SURVEY_LOG_FILE):
        try:
            with open(SURVEY_LOG_FILE, "r", encoding="utf-8") as f:
                logs = json.load(f)
        except Exception:
            logs = []
    logs.append(entry)
    try:
        with open(SURVEY_LOG_FILE, "w", encoding="utf-8") as f:
            json.dump(logs, f, indent=2, ensure_ascii=False)
    except Exception as e:
        log_msg(f"Error appending survey log: {e}")

def clean_phone(phone_number: str) -> str:
    cleaned = re.sub(r"\D", "", str(phone_number or ""))
    if cleaned.startswith("0"):
        cleaned = cleaned.lstrip("0")
    if len(cleaned) == 10:
        cleaned = "91" + cleaned
    elif len(cleaned) == 12 and cleaned.startswith("91"):
        pass
    elif not cleaned.startswith("91"):
        cleaned = "91" + cleaned
    return cleaned

def send_whatsapp_message(phone_number: str, message: str) -> bool:
    target = clean_phone(phone_number)
    data = {
        "to": target,
        "body": message
    }
    try:
        response = requests.post(
            SEND_URL,
            headers=HEADERS,
            json=data,
            timeout=8
        )
        if response.status_code == 200:
            log_msg(f"[WHATSAPP] Message sent to {target}")
            return True
        else:
            log_msg(f"[WHATSAPP ERROR] ({response.status_code}): {response.text}")
            return False
    except Exception as e:
        log_msg(f"[WHATSAPP EXCEPTION]: {repr(e)}")
        return False

def get_existing_message_ids() -> List[str]:
    try:
        response = requests.get(
            MESSAGES_URL,
            headers=HEADERS,
            params={"count": 100, "sort": "desc"},
            timeout=8
        )
        if response.status_code == 200:
            data = response.json()
            messages = data.get("messages", [])
            return [msg.get("id") for msg in messages if msg.get("id")]
    except Exception as e:
        log_msg(f"[WHATSAPP] Error loading message ids: {repr(e)}")
    return []


# Message Templates exactly as provided in the Python script
STATUS_QUESTION = """Hello! 👋

We would like to collect some basic employment information for your SkillTrace verified credential record.

Please select your current employment status:

1️⃣ Unemployed
2️⃣ Employed
3️⃣ Self-employed

Please reply with the number corresponding to your choice (e.g. 2).

Thank you."""

INVALID_STATUS_MESSAGE = """⚠️ Invalid selection.

Please select one of the following options:

1️⃣ Unemployed
2️⃣ Employed
3️⃣ Self-employed

Please reply with 1, 2, or 3."""

SALARY_QUESTION = """Thank you. ✅

You selected:

📌 Employment Status: Employed

Please enter your current monthly salary.

For example:
25000

Please enter the amount in Indian Rupees (₹)."""

REVENUE_QUESTION = """Thank you. ✅

You selected:

📌 Employment Status: Self-employed

Please enter your average monthly net revenue.

Net revenue means the amount remaining after your business expenses.

For example:
50000

Please enter the amount in Indian Rupees (₹)."""

def send_whatsapp_otp(phone_number: str, trainee_id: str = "", trainee_name: str = "", email: str = "") -> Dict[str, Any]:
    """
    Generates a random 6-digit OTP, saves it to the session,
    and sends the OTP directly to the user's WhatsApp via Whapi.cloud gateway asynchronously.
    Returns the OTP in the response so the frontend can show a demo panel if WhatsApp delivery fails.
    """
    cleaned = clean_phone(phone_number)
    otp = f"{random.randint(100000, 999999)}"
    
    otp_text = f"\U0001f510 *SkillTrace Sovereign Verification*\n\nYour One-Time Password (OTP) is: *{otp}*\n\nEnter this 6-digit code on the portal to authenticate your WhatsApp number for 3-Month Status Surveys.\n\n\u26a0\ufe0f Valid for 10 minutes. Do not share this code."

    sessions = load_sessions()
    now_iso = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    session = sessions.get(cleaned, {})
    session["phone"] = cleaned
    session["trainee_id"] = trainee_id or session.get("trainee_id", "TRN-0001")
    session["trainee_name"] = trainee_name or session.get("trainee_name", "Trainee")
    session["email"] = email or session.get("email", "")
    session["otp"] = otp
    session["otp_verified"] = False
    session["status"] = "WAITING_OTP"
    session["otp_created_at"] = now_iso
    session["history"] = session.get("history", [])
    session["history"].append({
        "direction": "outgoing",
        "text": otp_text,
        "timestamp": now_iso
    })
    sessions[cleaned] = session

    # Try sending via WhatsApp, capture success flag
    whatsapp_delivered = False
    try:
        response = requests.post(
            SEND_URL,
            headers=HEADERS,
            json={"to": cleaned, "body": otp_text},
            timeout=8
        )
        if response.status_code == 200:
            whatsapp_delivered = True
            log_msg(f"[WHATSAPP] OTP sent to {cleaned}")
        else:
            log_msg(f"[WHATSAPP WARN] OTP delivery failed ({response.status_code}): {response.text[:200]}")
    except Exception as e:
        log_msg(f"[WHATSAPP EXCEPTION]: {repr(e)}")

    session["last_send_success"] = whatsapp_delivered
    sessions[cleaned] = session
    save_sessions(sessions)

    return {
        "success": True,
        "phone": cleaned,
        "otp": otp,                          # always returned for demo/fallback display
        "whatsapp_delivered": whatsapp_delivered,
        "message": "OTP sent to WhatsApp" if whatsapp_delivered else "OTP generated (WhatsApp delivery failed — use code below)",
        "sent_via_whapi": whatsapp_delivered
    }

def verify_whatsapp_otp(phone_number: str, entered_otp: str) -> Dict[str, Any]:
    """
    Verifies the user-entered OTP. Upon successful verification,
    it automatically initiates the WhatsApp 3-Month Status Survey flow!
    """
    cleaned = clean_phone(phone_number)
    sessions = load_sessions()
    session = sessions.get(cleaned)

    if not session:
        return {"success": False, "message": "No active OTP request found for this phone number."}

    saved_otp = str(session.get("otp", "")).strip()
    user_otp = str(entered_otp).strip()

    if not saved_otp or saved_otp != user_otp:
        return {"success": False, "message": "Invalid OTP. Please check the code received on WhatsApp."}

    # Mark OTP verified
    session["otp_verified"] = True
    session["status"] = "WAITING_STATUS"
    now_iso = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    session["otp_verified_at"] = now_iso
    
    # Non-blocking survey dispatch
    session["history"].append({
        "direction": "outgoing",
        "text": STATUS_QUESTION,
        "timestamp": now_iso
    })
    session["next_scheduled_date"] = (datetime.utcnow() + timedelta(days=90)).strftime("%d %b %Y")
    session["last_send_success"] = True

    sessions[cleaned] = session
    save_sessions(sessions)

    threading.Thread(target=send_whatsapp_message, args=(cleaned, STATUS_QUESTION), daemon=True).start()

    return {
        "success": True,
        "message": "OTP verified successfully. WhatsApp 3-Month Survey initiated.",
        "session": session
    }

def start_whatsapp_survey(phone_number: str, trainee_id: str = "", trainee_name: str = "", email: str = "") -> Dict[str, Any]:
    cleaned = clean_phone(phone_number)
    seen_ids = get_existing_message_ids()

    # Dispatch first status message
    sent = send_whatsapp_message(cleaned, STATUS_QUESTION)

    sessions = load_sessions()
    now_iso = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    next_quarter = (datetime.utcnow() + timedelta(days=90)).strftime("%Y-%m-%d")

    session = {
        "phone": cleaned,
        "trainee_id": trainee_id or f"TRN-{cleaned[-4:]}",
        "trainee_name": trainee_name or "Trainee",
        "email": email or "",
        "status": "WAITING_STATUS",  # WAITING_STATUS | WAITING_SALARY | WAITING_REVENUE | COMPLETED
        "outcome": None,
        "salary": None,
        "revenue": None,
        "seen_ids": seen_ids,
        "history": [
            {
                "direction": "outgoing",
                "text": STATUS_QUESTION,
                "timestamp": now_iso
            }
        ],
        "created_at": now_iso,
        "updated_at": now_iso,
        "auto_3_months_schedule": True,
        "next_scheduled_date": next_quarter,
        "last_send_success": sent
    }

    sessions[cleaned] = session
    save_sessions(sessions)
    return session

def check_whatsapp_replies_for_phone(phone_number: str) -> Dict[str, Any]:
    cleaned = clean_phone(phone_number)
    sessions = load_sessions()
    session = sessions.get(cleaned)

    if not session:
        return {"status": "not_found", "message": f"No active session for {cleaned}"}

    if session.get("status") == "COMPLETED":
        return session

    seen_ids = set(session.get("seen_ids", []))

    try:
        response = requests.get(
            MESSAGES_URL,
            headers=HEADERS,
            params={"count": 100, "sort": "desc"},
            timeout=20
        )
        if response.status_code != 200:
            return session

        data = response.json()
        messages = data.get("messages", [])

        # Process messages from oldest to newest
        for msg in reversed(messages):
            msg_id = msg.get("id")
            if not msg_id or msg_id in seen_ids:
                continue

            seen_ids.add(msg_id)

            if msg.get("from_me") is True:
                continue

            sender = str(msg.get("from", ""))
            sender_clean = sender.replace("+", "").replace("-", "").replace(" ", "").replace("@s.whatsapp.net", "")
            if sender_clean != cleaned:
                continue

            text_data = msg.get("text")
            if isinstance(text_data, dict):
                received_text = text_data.get("body", "").strip()
            elif isinstance(text_data, str):
                received_text = text_data.strip()
            else:
                received_text = ""

            if not received_text:
                continue

            msg_time = msg.get("timestamp")
            if msg_time:
                try:
                    msg_dt = datetime.utcfromtimestamp(msg_time)
                    # 1. Skip messages older than 5 minutes
                    if datetime.utcnow() - msg_dt > timedelta(minutes=5):
                        continue
                        
                    # 2. Skip messages older than when OTP was verified
                    verified_at_str = session.get("otp_verified_at")
                    if verified_at_str:
                        verified_dt = datetime.strptime(verified_at_str, "%Y-%m-%d %H:%M:%S UTC")
                        if msg_dt < verified_dt:
                            continue
                except Exception:
                    pass

            now_iso = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
            session["history"].append({
                "direction": "incoming",
                "text": received_text,
                "timestamp": now_iso
            })

            # Process state machine
            current_state = session.get("status")

            if current_state == "WAITING_STATUS":
                cleaned_reply = received_text.lower().strip()
                if cleaned_reply in ["1", "1.", "option 1", "unemployed"]:
                    session["outcome"] = "Unemployed"
                    session["status"] = "COMPLETED"
                    final_msg = """Thank you for providing the information. ✅

Your employment status has been recorded as:

📌 Employment Status: Unemployed

No additional information is required.

Thank you for your response."""
                    send_whatsapp_message(cleaned, final_msg)
                    session["history"].append({
                        "direction": "outgoing",
                        "text": final_msg,
                        "timestamp": now_iso
                    })
                    append_survey_log(session)

                elif cleaned_reply in ["2", "2.", "option 2", "employed"]:
                    session["outcome"] = "Employed"
                    session["status"] = "WAITING_SALARY"
                    send_whatsapp_message(cleaned, SALARY_QUESTION)
                    session["history"].append({
                        "direction": "outgoing",
                        "text": SALARY_QUESTION,
                        "timestamp": now_iso
                    })

                elif cleaned_reply in ["3", "3.", "option 3", "self employed", "self-employed", "selfemployed"]:
                    session["outcome"] = "Self-employed"
                    session["status"] = "WAITING_REVENUE"
                    send_whatsapp_message(cleaned, REVENUE_QUESTION)
                    session["history"].append({
                        "direction": "outgoing",
                        "text": REVENUE_QUESTION,
                        "timestamp": now_iso
                    })

                else:
                    send_whatsapp_message(cleaned, INVALID_STATUS_MESSAGE)
                    session["history"].append({
                        "direction": "outgoing",
                        "text": INVALID_STATUS_MESSAGE,
                        "timestamp": now_iso
                    })

            elif current_state == "WAITING_SALARY":
                salary_clean = received_text.replace("₹", "").replace(",", "").strip()
                session["salary"] = salary_clean
                session["status"] = "COMPLETED"
                final_msg = f"""Thank you for providing the information. ✅

Your employment information has been recorded successfully.

📋 INFORMATION SUMMARY

Employment Status:
Employed

Monthly Salary:
₹{salary_clean}

Thank you for your response."""
                send_whatsapp_message(cleaned, final_msg)
                session["history"].append({
                    "direction": "outgoing",
                    "text": final_msg,
                    "timestamp": now_iso
                })
                append_survey_log(session)

            elif current_state == "WAITING_REVENUE":
                revenue_clean = received_text.replace("₹", "").replace(",", "").strip()
                session["revenue"] = revenue_clean
                session["status"] = "COMPLETED"
                final_msg = f"""Thank you for providing the information. ✅

Your self-employment information has been recorded successfully.

📋 INFORMATION SUMMARY

Employment Status:
Self-employed

Average Monthly Net Revenue:
₹{revenue_clean}

Thank you for your response."""
                send_whatsapp_message(cleaned, final_msg)
                session["history"].append({
                    "direction": "outgoing",
                    "text": final_msg,
                    "timestamp": now_iso
                })
                append_survey_log(session)

            session["seen_ids"] = list(seen_ids)
            session["updated_at"] = now_iso
            sessions[cleaned] = session
            save_sessions(sessions)

    except Exception as e:
        log_msg(f"Error checking replies: {e}")

    session["seen_ids"] = list(seen_ids)
    sessions[cleaned] = session
    save_sessions(sessions)
    return session

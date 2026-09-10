"""
Supabase Python client — singleton used by all backend modules.
Uses the service role key so it bypasses RLS for server-side operations.
"""
import os
import logging

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://sykivvztgbwltzkifhqt.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv(
    "SUPABASE_SERVICE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5a2l2dnp0Z2J3bHR6a2lmaHF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTA1MjU3NSwiZXhwIjoyMTA0NjI4NTc1fQ.lwaSkPBg6fYFIslst7PKLvUZz9E7RQ7C4VThqlUhByc",
)

_sb = None


def get_supabase():
    """Return the singleton Supabase client, lazy-initialised."""
    global _sb
    if _sb is None:
        try:
            from supabase import create_client
            _sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        except Exception as e:
            logger.warning(f"Supabase client init failed: {e}")
            _sb = None
    return _sb


# ── Admin user helpers ─────────────────────────────────────────────────

def sb_get_admin_users():
    """Return list of all admin_users rows, or [] on error."""
    sb = get_supabase()
    if not sb:
        return []
    try:
        res = sb.table("admin_users").select("*").order("created_at", desc=True).execute()
        return res.data or []
    except Exception as e:
        logger.warning(f"sb_get_admin_users error: {e}")
        return []


def sb_upsert_admin_user(user: dict):
    """Upsert a user into admin_users (conflict on email). Returns row or None."""
    sb = get_supabase()
    if not sb or not user.get("email"):
        return None
    row = {
        "id":           user.get("id") or f"GGL-{int(__import__('time').time()*1000)%999999}",
        "name":         user.get("name"),
        "email":        user["email"].strip().lower(),
        "role":         user.get("role", "client"),
        "verified":     bool(user.get("verified", False)),
        "is_master":    bool(user.get("is_master", False)),
        "company_name": user.get("company_name"),
        "designation":  user.get("designation"),
        "last_login":   user.get("last_login"),
    }
    try:
        res = sb.table("admin_users").upsert(row, on_conflict="email").execute()
        return (res.data or [None])[0]
    except Exception as e:
        logger.warning(f"sb_upsert_admin_user error: {e}")
        return None


def sb_delete_admin_user(user_id: str):
    """Delete admin_users row by id. Returns True on success."""
    sb = get_supabase()
    if not sb:
        return False
    try:
        sb.table("admin_users").delete().eq("id", user_id).execute()
        return True
    except Exception as e:
        logger.warning(f"sb_delete_admin_user error: {e}")
        return False


def sb_get_user_by_email(email: str):
    """Look up a single admin_users row by email, or None."""
    sb = get_supabase()
    if not sb:
        return None
    try:
        res = sb.table("admin_users").select("*").eq("email", email.strip().lower()).maybe_single().execute()
        return res.data
    except Exception as e:
        logger.warning(f"sb_get_user_by_email error: {e}")
        return None


# ── WhatsApp session helpers ───────────────────────────────────────────

def sb_save_whatsapp_session(phone: str, session_data: dict):
    """Upsert a WhatsApp session keyed by phone."""
    sb = get_supabase()
    if not sb:
        return False
    try:
        import datetime
        sb.table("whatsapp_sessions").upsert(
            {
                "phone": phone,
                "session_data": session_data,
                "updated_at": datetime.datetime.utcnow().isoformat(),
            },
            on_conflict="phone",
        ).execute()
        return True
    except Exception as e:
        logger.warning(f"sb_save_whatsapp_session error: {e}")
        return False


def sb_get_whatsapp_sessions() -> dict:
    """Return all WhatsApp sessions as {phone: session_data}."""
    sb = get_supabase()
    if not sb:
        return {}
    try:
        res = sb.table("whatsapp_sessions").select("phone,session_data").execute()
        return {row["phone"]: row["session_data"] for row in (res.data or [])}
    except Exception as e:
        logger.warning(f"sb_get_whatsapp_sessions error: {e}")
        return {}


# ── Checkin helpers ────────────────────────────────────────────────────

def sb_post_checkin(trainee_id: str, source: str, payload: dict):
    """Insert a checkin record. Returns the inserted row or None."""
    sb = get_supabase()
    if not sb:
        return None
    import datetime
    try:
        res = sb.table("checkins").insert({
            "trainee_id": trainee_id,
            "date": datetime.date.today().isoformat(),
            "source": source,
            "payload": payload,
        }).execute()
        return (res.data or [None])[0]
    except Exception as e:
        logger.warning(f"sb_post_checkin error: {e}")
        return None


# ── Trainee helpers ────────────────────────────────────────────────────

def sb_upsert_trainee(trainee: dict):
    """Upsert a trainee record (conflict on id). Returns row or None."""
    sb = get_supabase()
    if not sb or not trainee.get("id"):
        return None
    try:
        res = sb.table("trainees").upsert(trainee, on_conflict="id").execute()
        return (res.data or [None])[0]
    except Exception as e:
        logger.warning(f"sb_upsert_trainee error: {e}")
        return None


def sb_upsert_event(event: dict):
    """Upsert an event record (conflict on id). Returns row or None."""
    sb = get_supabase()
    if not sb or not event.get("id"):
        return None
    try:
        res = sb.table("events").upsert(event, on_conflict="id").execute()
        return (res.data or [None])[0]
    except Exception as e:
        logger.warning(f"sb_upsert_event error: {e}")
        return None

import os
import json
import re
import secrets
from urllib.parse import urlencode
import requests
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, status, Query, Body
from fastapi import Response
from fastapi.responses import RedirectResponse

# Credentials live in backend/.env, which is gitignored. Loaded before any
# module-level os.getenv below runs.
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_

from .database import engine, get_db, Base, SessionLocal
from .models import (
    User, Trainee, Event, Provider, Dispute, Consent, Checkin, Review,
    Assessment, Enrolment, Employer, FollowupContact,
    SandboxUser, SandboxBank, SandboxAuditLog
)
from .auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, get_current_user_optional, require_role,
    SECRET_KEY, ALGORITHM
)
from .seed import seed_database
from .sandbox_service import (
    seed_sandbox_data,
    verify_sandbox_user,
    INITIAL_SANDBOX_USERS,
    INITIAL_SANDBOX_BANKS
)
from .whatsapp_service import (
    start_whatsapp_survey,
    send_whatsapp_otp,
    verify_whatsapp_otp,
    check_whatsapp_replies_for_phone,
    load_sessions,
    save_sessions,
    send_whatsapp_message,
    clean_phone,
    append_survey_log,
    STATUS_QUESTION,
    SALARY_QUESTION,
    REVENUE_QUESTION,
    INVALID_STATUS_MESSAGE,
    SURVEY_LOG_FILE
)
from .chat_service import analyze_and_respond
from . import supabase_client as sb

# Initialize DB tables
Base.metadata.create_all(bind=engine)
# Seed if empty
seed_database()
# Seed sandbox bank verification dataset if empty
with SessionLocal() as init_db:
    seed_sandbox_data(init_db, force_reset=False)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)
REGISTERED_USERS_FILE = os.path.join(DATA_DIR, "registered_users.json")

def backup_registered_user(user_data: Dict[str, Any]):
    users = []
    if os.path.exists(REGISTERED_USERS_FILE):
        try:
            with open(REGISTERED_USERS_FILE, "r", encoding="utf-8") as f:
                users = json.load(f)
        except Exception:
            users = []
    users.append(user_data)
    try:
        with open(REGISTERED_USERS_FILE, "w", encoding="utf-8") as f:
            json.dump(users, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error saving registered user backup: {e}")

app = FastAPI(
    title="SkillTrace Sovereign Traceability API",
    version="1.0.0",
    description="Backend for National Skill Traceability Authority with RBAC for Government, Trainee & Employer Portals"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------------
# Schemas
# -------------------------------------------------------------------
class LoginRequest(BaseModel):
    identifier: str  # email or phone or user id
    password: str
    role: Optional[str] = None

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None
    role: Optional[str] = "client"  # client | employer | government
    course: Optional[str] = "Healthcare Assistant"
    district: Optional[str] = "Nashik"
    employer: Optional[str] = "Sanjeevani Hospital"
    salary: Optional[int] = 14000
    outcome: Optional[str] = "employed"  # employed | self_employed | awaiting_confirmation | not_working
    gender: Optional[str] = "Female"
    category: Optional[str] = "General"
    age_group: Optional[str] = "25-34"

class GoogleAuthRequest(BaseModel):
    credential: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = "client"

class AssignRoleRequest(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None
    role: str = "client"  # "government" | "employer" | "client"
    verified: bool = True
    company_name: Optional[str] = None
    designation: Optional[str] = None

class WhitelistUserRequest(BaseModel):
    email: str
    role: str = "employer"
    name: Optional[str] = None
    company_name: Optional[str] = None
    verified: bool = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class MilestoneVerificationRequest(BaseModel):
    trainee_id: str
    employer: str
    is_working: bool
    salary: Optional[int] = None
    job_role: Optional[str] = None
    notes: Optional[str] = None

class WhatsAppSendRequest(BaseModel):
    phone: str
    trainee_id: Optional[str] = "TRN-0001"
    trainee_name: Optional[str] = "Aarti Patil"
    email: Optional[str] = ""

class WhatsAppSimulateRequest(BaseModel):
    phone: str
    reply_text: str  # "1", "2", "3", salary amount, revenue amount

class ChatRequest(BaseModel):
    query: str
    role: Optional[str] = "client"
    user_id: Optional[str] = None
    language: Optional[str] = "en"

class DirectRecordRequest(BaseModel):
    phone: str
    trainee_id: Optional[str] = "TRN-0001"
    outcome: str  # Employed | Self-employed | Unemployed
    salary: Optional[int] = None

class WhatsAppOtpRequest(BaseModel):
    phone: str
    trainee_id: Optional[str] = "TRN-0001"
    trainee_name: Optional[str] = "Aarti Patil"
    email: Optional[str] = ""

class WhatsAppVerifyOtpRequest(BaseModel):
    phone: str
    otp: str
    trainee_id: Optional[str] = "TRN-0001"




# -------------------------------------------------------------------
# Auth Endpoints
# -------------------------------------------------------------------
@app.post("/auth/login", response_model=TokenResponse)
def login(creds: LoginRequest, db: Session = Depends(get_db)):
    ident = creds.identifier.strip()
    user = db.query(User).filter(
        or_(
            User.email.ilike(ident),
            User.phone == ident,
            User.id == ident
        )
    ).first()

    if not user:
        # Check if requested role has a matching demo account
        if creds.role == "government" and ident in ["officer@msde.gov.in", "GOV-MSDE-042"]:
            user = db.query(User).filter(User.id == "GOV-MSDE-042").first()
        elif creds.role == "employer" and ident in ["hr@sanjeevani.org", "EMP-SANJ-01", "employer@tata.com"]:
            user = db.query(User).filter(User.email == ident).first()
        elif creds.role == "client" and ident in ["aarti.patil@email.com", "9125671886", "TRN-0001"]:
            user = db.query(User).filter(User.id == "TRN-0001").first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please verify your ID/Email/Phone."
        )

    # Password check
    # The password must be this account's own. A shared list of demo passwords
    # used to be accepted for ANY account here, which meant knowing any address
    # and the string "password123" was enough to open the Master Sovereign
    # Administrator session. The seeded accounts already carry these passwords
    # individually, so the demo logins are unaffected by requiring a real match.
    if not verify_password(creds.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials."
        )

    token = create_access_token({"sub": user.id, "role": user.role, "name": user.name})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
            "designation": user.designation,
            "ministry": user.ministry,
            "company_name": user.company_name,
            "verified": user.verified,
        }
    }

@app.post("/auth/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    email_clean = req.email.strip().lower()
    phone_clean = clean_phone(req.phone or "")

    # Check if user already exists with this email
    existing_user = db.query(User).filter(User.email.ilike(email_clean)).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with email '{email_clean}' is already registered. Please sign in instead."
        )

    # Generate unique ID based on role
    now_ts = datetime.utcnow().strftime('%M%S')
    if req.role == "client":
        base_id = f"TRN-{phone_clean[-4:] if len(phone_clean) >= 4 else now_ts}"
        user_id = base_id
        suffix = 1
        while db.query(User).filter(User.id == user_id).first() or db.query(Trainee).filter(Trainee.id == user_id).first():
            user_id = f"{base_id}-{suffix}"
            suffix += 1
    elif req.role == "employer":
        base_id = f"EMP-{now_ts}"
        user_id = base_id
        suffix = 1
        while db.query(User).filter(User.id == user_id).first():
            user_id = f"{base_id}-{suffix}"
            suffix += 1
    else:
        base_id = f"GOV-{now_ts}"
        user_id = base_id
        suffix = 1
        while db.query(User).filter(User.id == user_id).first():
            user_id = f"{base_id}-{suffix}"
            suffix += 1

    # Create User record
    new_user = User(
        id=user_id,
        name=req.name.strip(),
        email=email_clean,
        phone=req.phone or f"+{phone_clean}",
        role=req.role or "client",
        designation="Self-Registered Digital Trainee" if req.role == "client" else ("Corporate Hiring Officer" if req.role == "employer" else "Government Evaluation Officer"),
        ministry="Ministry of Skill Development and Entrepreneurship" if req.role == "government" else None,
        company_name=req.employer if req.role == "employer" else None,
        hashed_password=hash_password(req.password),
        verified=True,
        last_login=datetime.utcnow().strftime("%Y-%m-%d %H:%M IST")
    )
    db.add(new_user)

    # If Trainee, create corresponding isolated Trainee record, events and consent
    if req.role == "client":
        placed_date = (datetime.utcnow() - timedelta(days=95)).strftime("%Y-%m-%d")
        new_trainee = Trainee(
            id=user_id,
            name=req.name.strip(),
            course=req.course or "Healthcare Assistant",
            district=req.district or "Nashik",
            gender=req.gender or "Female",
            age_group=req.age_group or "25-34",
            category=req.category or "General",
            phone=req.phone or f"+{phone_clean}",
            cohort="2024-C",
            provider_id="PRV-002",
            employer=req.employer or "Sanjeevani Hospital",
            salary=req.salary or 14000,
            outcome=req.outcome or "employed",
            trust_level="high",
            certification_date=(datetime.utcnow() - timedelta(days=120)).strftime("%d %b %Y"),
            placement_date=placed_date
        )
        db.add(new_trainee)

        # Event 1: Placed
        db.add(Event(
            id=f"EVT-{user_id}-01",
            trainee_id=user_id,
            date=placed_date,
            what_happened="placed",
            job_role=req.course or "Healthcare Assistant",
            employer=req.employer or "Sanjeevani Hospital",
            salary=req.salary or 14000,
            source="user_registration",
            trust_level="high"
        ))

        # Event 2: 3-Month Retention Confirmed
        if req.outcome in ["employed", "still_working"]:
            db.add(Event(
                id=f"EVT-{user_id}-02",
                trainee_id=user_id,
                date=(datetime.utcnow() - timedelta(days=5)).strftime("%Y-%m-%d"),
                what_happened="still_working",
                job_role=req.course or "Healthcare Assistant",
                employer=req.employer or "Sanjeevani Hospital",
                salary=req.salary or 14000,
                source="user_registration_verified",
                trust_level="high"
            ))

        # DPDPA Consent
        db.add(Consent(
            id=f"CNS-{user_id}-01",
            trainee_id=user_id,
            purpose="National Employment Traceability & Verified Skill Passport",
            granted=True,
            date=datetime.utcnow().strftime("%Y-%m-%d")
        ))

        # Initial Review
        db.add(Review(
            id=f"REV-{user_id}-01",
            trainee_id=user_id,
            overall_quality=4.8,
            job_usefulness=4.6,
            trainer_score=4.9,
            skill_confidence=4.7,
            would_recommend=5.0,
            feedback="Registered account. Comprehensive curriculum with verified placement."
        ))

    db.commit()
    db.refresh(new_user)

    # Local backup on PC in JSON
    backup_registered_user({
        "id": new_user.id,
        "name": new_user.name,
        "email": new_user.email,
        "phone": new_user.phone,
        "role": new_user.role,
        "course": req.course if req.role == "client" else None,
        "district": req.district if req.role == "client" else None,
        "employer": req.employer,
        "salary": req.salary,
        "registered_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    })

    token = create_access_token({"sub": new_user.id, "role": new_user.role, "name": new_user.name})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email,
            "phone": new_user.phone,
            "role": new_user.role,
            "designation": new_user.designation,
            "ministry": new_user.ministry,
            "company_name": new_user.company_name,
            "verified": new_user.verified,
        }
    }

# Google OAuth credentials. These were committed as literals; they now come
# from the environment and the process refuses to start an OAuth flow without
# them. The secret must never reach the browser.
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback"
)
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
MASTER_GOV_EMAIL = "shlok.borad11@gmail.com"


# ---- shared analytics helpers ----------------------------------------
# These mirror the frontend's offline computation so the API and the fallback
# can never disagree about what a figure means.

AS_OF = "2026-09-10"

# Quick Review option values, scored as lib/review.js scores them (1-4).
_REVIEW_SCORES = {
    "excellent": 4, "good": 3, "average": 2, "poor": 1,
    "very_useful": 4, "useful": 3, "somewhat": 2, "not_useful": 1,
    "very_confident": 4, "confident": 3, "somewhat_confident": 2, "not_confident": 1,
    "definitely": 4, "probably": 3, "maybe": 2, "no": 1,
}
_REVIEW_QUESTIONS = [
    ("overall_quality", "overall_quality", ["excellent", "good", "average", "poor"]),
    ("job_usefulness", "job_usefulness", ["very_useful", "useful", "somewhat", "not_useful"]),
    ("trainer_rating", "trainer_score", ["excellent", "good", "average", "poor"]),
    ("confidence", "skill_confidence", ["very_confident", "confident", "somewhat_confident", "not_confident"]),
    ("recommend", "would_recommend", ["definitely", "probably", "maybe", "no"]),
]


def _days_between(a: str, b: str) -> int:
    try:
        return (datetime.fromisoformat(str(b)[:10]) - datetime.fromisoformat(str(a)[:10])).days
    except Exception:
        return 0


def _classify(evs):
    """A placement is employment only once a still_working confirmation at the
    same employer follows it 75+ days on. Returns (bucket, trust, last_event)."""
    if not evs:
        return "no_data", "stale", None
    last = evs[-1]
    if last.what_happened == "still_working":
        placement = next(
            (e for e in reversed(evs) if e.what_happened == "placed" and e.employer == last.employer),
            None,
        )
        if placement and _days_between(placement.date, last.date) >= 75:
            return "employed", last.trust_level, last
        return "awaiting_confirmation", last.trust_level, last
    if last.what_happened == "placed":
        return "awaiting_confirmation", last.trust_level, last
    if last.what_happened == "self_employed":
        return "self_employed", last.trust_level, last
    if last.what_happened == "apprentice":
        return "apprentice", last.trust_level, last
    return "not_working", last.trust_level, last


def _empty_tiers():
    return {"high": 0, "medium": 0, "low": 0, "stale": 0}


def _tier_pct(tiers):
    n = sum(tiers.values())
    if not n:
        return {"high": 0, "medium": 0, "low": 0, "stale": 0, "total": 0}
    return {k: round(v / n * 100) for k, v in tiers.items()} | {"total": n}


def _events_by_trainee(db: Session, ids):
    """
    Events per trainee, as plain rows rather than ORM objects.

    Hydrating ~32,000 Event instances took the whole-cohort dashboard to
    9.7 s cold and 1.1 s warm — past the client's 2.5 s timeout on first
    load, so the page fell back to the offline store and the badge read
    "Mock data". Selecting columns gives rows with the same attribute
    access at a fraction of the cost.
    """
    out = {}
    if not ids:
        return out
    cols = (Event.id, Event.trainee_id, Event.date, Event.what_happened,
            Event.job_role, Event.employer, Event.salary, Event.source, Event.trust_level)
    q = db.query(*cols).order_by(Event.date)
    # Skip the IN-list entirely for the whole cohort; SQLite's parameter cap
    # is well below 15,000 anyway.
    if len(ids) < 900:
        q = q.filter(Event.trainee_id.in_(ids))
        rows = q.all()
    else:
        wanted = set(ids)
        rows = [r for r in q.all() if r.trainee_id in wanted]
    for r in rows:
        out.setdefault(r.trainee_id, []).append(r)
    return out


def _retention_at(own, events_by, offset):
    """Share retained at a checkpoint, among those whose checkpoint has come."""
    eligible = retained = 0
    for t in own:
        evs = events_by.get(t.id, [])
        placement = next((e for e in evs if e.what_happened == "placed"), None)
        if not placement or _days_between(placement.date, AS_OF) < offset:
            continue
        eligible += 1
        if any(
            e.what_happened == "still_working"
            and e.employer == placement.employer
            and _days_between(placement.date, e.date) >= offset - 15
            for e in evs
        ):
            retained += 1
    return round(retained / eligible * 100) if eligible else None


# Course definitions and the district list, from the same dataset the seed
# loads, so the skill-gap chart names the roles the courses actually train for.
def _dataset_meta():
    try:
        with open(_FOLLOWUP_PATH, encoding="utf-8") as fh:
            d = json.load(fh)
        return d.get("courses", []), d.get("districts", [])
    except Exception:
        return [], []


_COURSES, _DISTRICTS = [], []


def _meta():
    global _COURSES, _DISTRICTS
    if not _COURSES:
        _COURSES, _DISTRICTS = _dataset_meta()
    return _COURSES, _DISTRICTS


def _filtered_trainees(db, cohort=None, course=None, provider=None, district=None, demographic=None):
    # Columns only: the analytics never write, and 13,000 ORM instances cost
    # more to build than the aggregation they feed.
    q = db.query(
        Trainee.id, Trainee.name, Trainee.course, Trainee.district, Trainee.gender,
        Trainee.age_group, Trainee.category, Trainee.cohort, Trainee.provider_id,
        Trainee.employer, Trainee.salary,
    )
    if cohort:
        q = q.filter(Trainee.cohort == cohort)
    if course:
        q = q.filter(Trainee.course == course)
    if provider:
        q = q.filter(Trainee.provider_id == provider)
    if district:
        q = q.filter(Trainee.district == district)
    if demographic and ":" in demographic:
        key, val = demographic.split(":", 1)
        col = {"gender": Trainee.gender, "age_group": Trainee.age_group, "category": Trainee.category}.get(key)
        if col is not None:
            q = q.filter(col == val)
    withdrawn = withdrawn_trainee_ids(db)
    return [t for t in q.all() if t.id not in withdrawn]


def withdrawn_trainee_ids(db: Session) -> set:
    """
    Trainees who have withdrawn consent under the DPDPA.

    The privacy strip on the dashboard promises that a withdrawal removes the
    person from every figure — "not anonymised, not retained in the
    denominator, removed". The frontend's offline store honoured that; the
    API counted them anyway. Every aggregate now subtracts this set first.
    """
    return {c.trainee_id for c in db.query(Consent.trainee_id).filter(Consent.granted == False).all()}


def require_admin(current_user: Optional[User]) -> User:
    """
    Gate for the Master Portal endpoints.

    These handlers previously wrapped their role check in `if current_user:`,
    so a request carrying no token skipped the check entirely and fell through
    to the privileged operation — the user registry was readable, and roles
    could be assigned and accounts deleted, with no credentials at all. An
    absent user is now rejected before anything else runs.
    """
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    is_master = (current_user.email or "").lower() == MASTER_GOV_EMAIL
    if not is_master and current_user.role != "government":
        raise HTTPException(status_code=403, detail="Access restricted to Master Sovereign Authority.")
    return current_user

def _google_upsert_user(db: Session, *, email: str, name: str, requested_role: Optional[str]):
    """
    Find or create the account behind a verified Google identity.

    A requested role is only ever a request: a new account that is not the
    master address lands unverified, and an officer role is granted from the
    Master Portal, never by asking for it at sign-in.
    """
    is_master = email == MASTER_GOV_EMAIL
    user = db.query(User).filter(User.email.ilike(email)).first()

    if not user:
        assigned_role = "government" if is_master else (requested_role or "client")
        if assigned_role == "government" and not is_master:
            assigned_role = "client"
        user = User(
            id=f"GGL-{secrets.token_hex(4).upper()}",
            name=name,
            email=email,
            role=assigned_role,
            designation=(
                "Master Government Officer & Sovereign Administrator"
                if is_master
                else "Pending Master Verification"
            ),
            ministry="Ministry of Skill Development and Entrepreneurship" if is_master else None,
            company_name=None,
            hashed_password=hash_password(secrets.token_urlsafe(32)),
            verified=bool(is_master),
            last_login=datetime.utcnow().strftime("%Y-%m-%d %H:%M IST"),
        )
        db.add(user)
    else:
        user.last_login = datetime.utcnow().strftime("%Y-%m-%d %H:%M IST")
        if is_master:
            user.role = "government"
            user.verified = True
            user.designation = "Master Government Officer & Sovereign Administrator"
            user.ministry = "Ministry of Skill Development and Entrepreneurship"

    db.commit()
    db.refresh(user)
    return user


# ---- Google OAuth 2.0, authorisation-code flow -----------------------
# The browser never sees the client secret: it is used only here, server to
# server, to exchange the one-time code for a verified identity.

_GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"

# Single-use state values, to bind the callback to the request that began it.
_oauth_states: Dict[str, datetime] = {}


def _prune_states() -> None:
    cutoff = datetime.utcnow() - timedelta(minutes=10)
    for k in [k for k, v in _oauth_states.items() if v < cutoff]:
        _oauth_states.pop(k, None)


def _verify_google_id_token(id_token: str) -> Dict[str, Any]:
    """
    Ask Google whether this token is real and was issued to us.

    Decoding the token locally without checking its signature would let anyone
    present a handwritten JWT claiming any address, so the check happens at
    Google and the audience is compared against our own client id.
    """
    try:
        res = requests.get(_GOOGLE_TOKENINFO_URL, params={"id_token": id_token}, timeout=10)
    except Exception:
        raise HTTPException(status_code=502, detail="Could not reach Google to verify sign-in.")
    if res.status_code != 200:
        raise HTTPException(status_code=401, detail="Google sign-in could not be verified.")
    claims = res.json()
    if claims.get("aud") != GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=401, detail="Google sign-in was issued for another application.")
    if claims.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        raise HTTPException(status_code=401, detail="Google sign-in has an unexpected issuer.")
    if str(claims.get("email_verified", "")).lower() not in ("true", "1"):
        raise HTTPException(status_code=401, detail="That Google account has no verified email address.")
    return claims


@app.get("/auth/google/start")
def google_start(role: Optional[str] = None):
    """Begin sign-in. Redirects to Google's consent screen."""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured on this server.")
    _prune_states()
    state = secrets.token_urlsafe(24)
    _oauth_states[state] = datetime.utcnow()
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }
    if role in ("client", "employer"):
        params["state"] = f"{state}.{role}"
        _oauth_states[params["state"]] = _oauth_states.pop(state)
    return RedirectResponse(f"{_GOOGLE_AUTH_URL}?{urlencode(params)}")


@app.get("/auth/google/callback")
def google_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Google's redirect back. Exchanges the code for a verified identity, seats
    the session using the application's existing JWT, and hands the browser
    back to the frontend.
    """
    def _fail(reason: str) -> RedirectResponse:
        return RedirectResponse(f"{FRONTEND_ORIGIN}/auth/google?error={reason}")

    if error or not code or not state:
        return _fail("cancelled")

    _prune_states()
    if _oauth_states.pop(state, None) is None:
        # Unknown or reused state: the callback did not come from a flow we began.
        return _fail("state")

    requested_role = state.split(".", 1)[1] if "." in state else None

    try:
        token_res = requests.post(
            _GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
            timeout=10,
        )
    except Exception:
        return _fail("network")

    if token_res.status_code != 200:
        return _fail("exchange")

    id_token = token_res.json().get("id_token")
    if not id_token:
        return _fail("exchange")

    try:
        claims = _verify_google_id_token(id_token)
    except HTTPException:
        return _fail("verify")

    email = str(claims.get("email", "")).strip().lower()
    if not email:
        return _fail("verify")
    name = str(claims.get("name") or email.split("@")[0].replace(".", " ").title())

    user = _google_upsert_user(db, email=email, name=name, requested_role=requested_role)
    token = create_access_token({"sub": user.id, "role": user.role, "name": user.name})
    return RedirectResponse(f"{FRONTEND_ORIGIN}/auth/google#token={token}")


@app.post("/auth/google", response_model=TokenResponse)
def google_auth(payload: GoogleAuthRequest, db: Session = Depends(get_db)):
    """
    Sign in with a Google Identity Services credential.

    This used to decode the credential with verify_signature disabled, and to
    accept a bare `email` with no credential at all — so a handwritten request
    naming any address was granted that account, the master administrator
    included. The credential is now required and checked with Google before
    anything is issued.
    """
    if not payload.credential:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A Google credential is required. Use /auth/google/start for the redirect flow.",
        )

    claims = _verify_google_id_token(payload.credential)
    email = str(claims.get("email", "")).strip().lower()
    if not email:
        raise HTTPException(status_code=401, detail="Google sign-in could not be verified.")
    name = str(claims.get("name") or email.split("@")[0].replace(".", " ").title())
    role = payload.role or "client"

    user = _google_upsert_user(db, email=email, name=name, requested_role=role)

    token = create_access_token({"sub": user.id, "role": user.role, "name": user.name})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
            "designation": user.designation,
            "ministry": user.ministry,
            "company_name": user.company_name,
            "verified": user.verified,
            "is_master": is_master,
        }
    }

@app.get("/auth/me")
def me(current_user: User = Depends(get_current_user)):
    is_master = (current_user.email or "").lower() == MASTER_GOV_EMAIL
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "phone": current_user.phone,
        "role": current_user.role,
        "designation": current_user.designation,
        "ministry": current_user.ministry,
        "company_name": current_user.company_name,
        "verified": current_user.verified,
        "is_master": is_master,
        "permissions": {
            "is_master_admin": is_master,
            "can_view_all_districts": current_user.role == "government",
            "can_audit_providers": current_user.role == "government",
            "can_resolve_disputes": current_user.role == "government",
            "can_view_candidates": current_user.role in ["government", "employer"],
            "can_verify_milestones": current_user.role in ["government", "employer"],
            "can_manage_consent": current_user.role == "client",
        }
    }

# -------------------------------------------------------------------
# Master Portal / Sovereign Access Management APIs
# -------------------------------------------------------------------
@app.get("/api/admin/users")
def get_all_users_admin(db: Session = Depends(get_db), current_user: Optional[User] = Depends(get_current_user_optional)):
    """List all users with roles and verification states (Accessible to shlok.borad11@gmail.com and Gov Officers)."""
    require_admin(current_user)

    users = db.query(User).all()
    res = []
    for u in users:
        u_is_master = (u.email or "").lower() == MASTER_GOV_EMAIL
        res.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "designation": u.designation,
            "company_name": u.company_name,
            "ministry": u.ministry,
            "verified": u.verified,
            "is_master": u_is_master,
            "last_login": u.last_login or "N/A"
        })
    return res

@app.post("/api/admin/users/assign-role")
def assign_user_role_admin(payload: AssignRoleRequest, db: Session = Depends(get_db), current_user: Optional[User] = Depends(get_current_user_optional)):
    """Grant, verify, or change a user's role from the Master Portal."""
    require_admin(current_user)

    # Find target user by ID, email, or user_id as email
    query_filters = []
    if payload.user_id:
        query_filters.append(User.id == payload.user_id)
        if "@" in payload.user_id:
            query_filters.append(User.email.ilike(payload.user_id.strip()))
    if payload.email:
        query_filters.append(User.email.ilike(payload.email.strip()))

    target = None
    if query_filters:
        target = db.query(User).filter(or_(*query_filters)).first()

    clean_email = ((payload.email or "") or (payload.user_id if payload.user_id and "@" in payload.user_id else "")).strip().lower()

    if not target:
        if not clean_email:
            raise HTTPException(status_code=400, detail="User ID or Email is required.")
        user_id = payload.user_id if (payload.user_id and "@" not in payload.user_id) else f"GGL-{datetime.utcnow().strftime('%M%S')}"
        target = User(
            id=user_id,
            name=clean_email.split("@")[0].replace(".", " ").title(),
            email=clean_email,
            role=payload.role,
            verified=payload.verified,
            hashed_password=hash_password("google_oauth_verified"),
            last_login=datetime.utcnow().strftime("%Y-%m-%d %H:%M IST")
        )
        db.add(target)

    if target.email and target.email.lower() == MASTER_GOV_EMAIL:
        raise HTTPException(status_code=400, detail="The Master Sovereign Officer's permissions cannot be modified.")

    target.role = payload.role
    target.verified = payload.verified
    if payload.company_name:
        target.company_name = payload.company_name
    elif payload.role != "employer":
        target.company_name = None

    if payload.designation:
        target.designation = payload.designation
    elif payload.role == "employer":
        target.designation = f"Corporate Representative ({target.company_name or 'Enterprise'})"
    elif payload.role == "client":
        target.designation = "Verified Trainee (Digital Skill Passport)"
    elif payload.role == "government":
        target.designation = "Accredited MSDE Field / District Officer"

    db.commit()
    db.refresh(target)

    # If role is client, ensure a trainee profile exists with the Google account name
    if target.role == "client":
        trainee = db.query(Trainee).filter(or_(Trainee.id == target.id, Trainee.name.ilike(target.name))).first()
        if not trainee:
            trainee_id = target.id if target.id.startswith("TRN") else f"TRN-{target.email.split('@')[0].replace('.', '').replace('_', '')[:4].upper() or '2026'}"
            trainee = Trainee(
                id=trainee_id,
                name=target.name,
                course="AI & Machine Learning",
                district="Thane / Mumbai",
                gender="Male",
                age_group="20-25",
                category="General",
                phone="+91 98765 43210",
                cohort="2026-Q1",
                provider_id="PRV-AI-01",
                employer="Tata Advanced Systems Ltd (AI Division)",
                salary=50000,
                outcome="employed",
                trust_level="high",
                certification_date="10 Feb 2026",
                placement_date="28 Feb 2026"
            )
            db.add(trainee)
            try:
                db.commit()
            except Exception:
                db.rollback()

    # Sync to Supabase asynchronously (before return)
    import threading
    def _sync():
        sb.sb_upsert_admin_user({
            "id": target.id,
            "name": target.name,
            "email": target.email,
            "role": target.role,
            "verified": target.verified,
            "company_name": target.company_name,
            "designation": target.designation,
            "last_login": datetime.utcnow().strftime("%Y-%m-%d %H:%M IST"),
        })
    threading.Thread(target=_sync, daemon=True).start()

    return {
        "success": True,
        "message": f"User {target.email} updated to '{target.role}' (verified: {target.verified}).",
        "user": {
            "id": target.id,
            "name": target.name,
            "email": target.email,
            "role": target.role,
            "verified": target.verified,
            "company_name": target.company_name,
            "designation": target.designation
        }
    }

@app.post("/api/admin/users/whitelist")
def whitelist_new_user(payload: WhitelistUserRequest, db: Session = Depends(get_db), current_user: Optional[User] = Depends(get_current_user_optional)):
    """Pre-authorizes an email address with a specific role so they have instant access upon Google login."""
    require_admin(current_user)

    clean_email = payload.email.strip().lower()
    existing = db.query(User).filter(User.email.ilike(clean_email)).first()
    if existing:
        existing.role = payload.role
        existing.verified = payload.verified
        if payload.company_name:
            existing.company_name = payload.company_name
        db.commit()
        db.refresh(existing)
        return {"success": True, "message": f"Pre-existing user {clean_email} updated.", "user_id": existing.id}

    user_id = f"GGL-{datetime.utcnow().strftime('%M%S')}"
    new_user = User(
        id=user_id,
        name=payload.name or clean_email.split("@")[0].replace(".", " ").title(),
        email=clean_email,
        role=payload.role,
        company_name=payload.company_name or ("Sanjeevani Hospital" if payload.role == "employer" else None),
        designation=f"Pre-authorized {payload.role.title()}",
        verified=payload.verified,
        hashed_password=hash_password("google_oauth_verified"),
        last_login="Pre-authorized"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Sync to Supabase asynchronously
    import threading
    def _sync_wl():
        sb.sb_upsert_admin_user({
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email,
            "role": new_user.role,
            "verified": new_user.verified,
            "company_name": new_user.company_name,
            "designation": new_user.designation,
            "last_login": "Pre-authorized",
        })
    threading.Thread(target=_sync_wl, daemon=True).start()

    return {"success": True, "message": f"User {clean_email} pre-authorized as '{payload.role}'.", "user_id": new_user.id}

@app.delete("/api/admin/users/{user_id}")
def delete_user_admin(user_id: str, db: Session = Depends(get_db), current_user: Optional[User] = Depends(get_current_user_optional)):
    """Delete or revoke a user account from the system."""
    require_admin(current_user)

    target = db.query(User).filter(or_(User.id == user_id, User.email == user_id)).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    if target.email and target.email.lower() == MASTER_GOV_EMAIL:
        raise HTTPException(status_code=400, detail="Cannot delete Master Sovereign Authority.")

    db.delete(target)
    db.commit()

    # Sync deletion to Supabase asynchronously
    import threading
    _tid = target.id
    threading.Thread(target=lambda: sb.sb_delete_admin_user(_tid), daemon=True).start()

    return {"success": True, "message": f"User {user_id} deleted."}

@app.get("/api/admin/audit-logs")
def get_audit_logs_admin(db: Session = Depends(get_db), current_user: Optional[User] = Depends(get_current_user_optional)):
    """Fetch recent activity from Supabase to provide an audit trail of data synchronization."""
    require_admin(current_user)

    # Call the new helper from supabase_client
    logs = sb.sb_get_audit_logs()
    return logs

# -------------------------------------------------------------------
# Dashboard Endpoints (With Role-Based Data Restriction)
# -------------------------------------------------------------------
@app.get("/dashboard")
def get_dashboard(
    cohort: Optional[str] = None,
    course: Optional[str] = None,
    provider: Optional[str] = None,
    district: Optional[str] = None,
    demographic: Optional[str] = None,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    query = db.query(Trainee)

    # DPDPA & Role-Based Data Restriction:
    if current_user and current_user.role == "client":
        # Trainees only see their own individual record in dashboard
        query = query.filter(Trainee.id == current_user.id)
    elif current_user and current_user.role == "employer":
        # Employers only see candidates hired or interviewed by their company
        company = current_user.company_name or "Sanjeevani Hospital"
        query = query.filter(Trainee.employer.ilike(f"%{company}%"))

    # Apply filters
    if cohort:
        query = query.filter(Trainee.cohort == cohort)
    if course:
        query = query.filter(Trainee.course == course)
    if provider:
        query = query.filter(Trainee.provider_id == provider)
    if district:
        query = query.filter(Trainee.district == district)
    if demographic:
        parts = demographic.split(":")
        if len(parts) == 2:
            key, val = parts
            if key == "gender":
                query = query.filter(Trainee.gender == val)
            elif key == "age_group":
                query = query.filter(Trainee.age_group == val)
            elif key == "category":
                query = query.filter(Trainee.category == val)

    withdrawn = withdrawn_trainee_ids(db)
    trainees = [t for t in query.all() if t.id not in withdrawn]
    total = len(trainees)

    # ------------------------------------------------------------------
    # Every figure below is computed from the rows that survived the filter.
    # This handler used to return constants for retention, wage progression
    # and every evidence tier — 79.4% retained, a wage table with invented
    # cohorts — regardless of what was selected. A dashboard whose charts do
    # not move when its filters do is not a dashboard.
    # ------------------------------------------------------------------
    ids = [t.id for t in trainees]
    events_by = {}
    if ids:
        for e in db.query(Event).filter(Event.trainee_id.in_(ids)).order_by(Event.date).all():
            events_by.setdefault(e.trainee_id, []).append(e)

    def days_between(a: str, b: str) -> int:
        try:
            return (datetime.fromisoformat(b[:10]) - datetime.fromisoformat(a[:10])).days
        except Exception:
            return 0

    def classify(evs):
        """Mirror of the frontend rule: a placement is employment only once a
        still_working confirmation at the same employer follows it 75+ days on."""
        if not evs:
            return "no_data", "stale", None
        last = evs[-1]
        if last.what_happened == "still_working":
            placement = next(
                (e for e in reversed(evs) if e.what_happened == "placed" and e.employer == last.employer),
                None,
            )
            if placement and days_between(placement.date, last.date) >= 75:
                return "employed", last.trust_level, last
            return "awaiting_confirmation", last.trust_level, last
        if last.what_happened == "placed":
            return "awaiting_confirmation", last.trust_level, last
        if last.what_happened == "self_employed":
            return "self_employed", last.trust_level, last
        if last.what_happened == "apprentice":
            return "apprentice", last.trust_level, last
        return "not_working", last.trust_level, last

    def empty_tiers():
        return {"high": 0, "medium": 0, "low": 0, "stale": 0}

    def tier_pct(tiers):
        n = sum(tiers.values())
        if not n:
            return {"high": 0, "medium": 0, "low": 0, "stale": 0, "total": 0}
        return {k: round(v / n * 100) for k, v in tiers.items()} | {"total": n}

    def pct(n, d):
        return round(n / d * 1000) / 10 if d else 0

    bucket_names = ["employed", "self_employed", "apprentice", "not_working", "awaiting_confirmation", "no_data"]
    counts = {b: 0 for b in bucket_names}
    tiers = {b: empty_tiers() for b in bucket_names}
    overall = empty_tiers()
    ever_placed = 0

    for t in trainees:
        evs = events_by.get(t.id, [])
        bucket, trust, ev = classify(evs)
        counts[bucket] += 1
        if trust in tiers[bucket]:
            tiers[bucket][trust] += 1
        if ev is not None and trust in overall:
            overall[trust] += 1
        if any(e.what_happened == "placed" for e in evs):
            ever_placed += 1

    outcomes_res = {
        b: {"count": counts[b], "pct": pct(counts[b], total), "evidence": tier_pct(tiers[b])}
        for b in bucket_names
    }

    # Retention at 3 / 6 / 12 months, among those whose checkpoint has come.
    as_of = "2026-09-10"
    retention_res = []
    for offset, label, months in ((90, "3 months", 3), (180, "6 months", 6), (365, "12 months", 12)):
        eligible = retained = 0
        rt = empty_tiers()
        for t in trainees:
            evs = events_by.get(t.id, [])
            placement = next((e for e in evs if e.what_happened == "placed"), None)
            if not placement or days_between(placement.date, as_of) < offset:
                continue
            eligible += 1
            hit = next(
                (e for e in evs
                 if e.what_happened == "still_working"
                 and e.employer == placement.employer
                 and days_between(placement.date, e.date) >= offset - 15),
                None,
            )
            if hit:
                retained += 1
                if hit.trust_level in rt:
                    rt[hit.trust_level] += 1
        retention_res.append({
            "checkpoint": label,
            "months": months,
            "pct": pct(retained, eligible) if eligible else None,
            "eligible": eligible,
            "retained": retained,
            "evidence": tier_pct(rt),
        })

    # Wage progression: mean salary per cohort at each checkpoint after placement.
    cohorts_present = sorted({t.cohort for t in trainees if t.cohort})
    windows = [(0, -999, 45), (3, 46, 135), (6, 136, 270), (12, 271, 9999)]
    wage_tiers = empty_tiers()
    wage_progression = []
    by_cohort = {}
    for t in trainees:
        by_cohort.setdefault(t.cohort, []).append(t)
    for months, lo, hi in windows:
        row = {"months": months, "label": "At placement" if months == 0 else f"{months} mo"}
        for c in cohorts_present:
            salaries = []
            for t in by_cohort.get(c, []):
                evs = events_by.get(t.id, [])
                placement = next((e for e in evs if e.what_happened == "placed"), None)
                if not placement:
                    continue
                for e in evs:
                    if not e.salary or e.what_happened not in ("placed", "still_working"):
                        continue
                    d = days_between(placement.date, e.date)
                    if lo <= d <= hi:
                        salaries.append(e.salary)
                        if e.trust_level in wage_tiers:
                            wage_tiers[e.trust_level] += 1
            row[c] = round(sum(salaries) / len(salaries)) if salaries else None
        wage_progression.append(row)

    # The drop-off funnel. "Contacted" counts only people who answered for
    # themselves — an employer or bank signal is evidence about someone, not
    # contact with them.
    course_role = {}
    for t in trainees:
        course_role.setdefault(t.course, t.course)
    contacted = retained3 = role_matched = 0
    for t in trainees:
        evs = events_by.get(t.id, [])
        if any(e.source in ("trainee", "field_officer", "whatsapp") for e in evs):
            contacted += 1
        bucket, _, ev = classify(evs)
        if bucket == "employed":
            retained3 += 1
            if ev is not None and ev.job_role and ev.job_role == t.course:
                role_matched += 1

    funnel = [
        {"stage": "Certified", "count": total, "note": "Completed training and assessed"},
        {"stage": "Contacted", "count": contacted, "note": "Responded to at least one check-in"},
        {"stage": "Employed", "count": ever_placed, "note": "Reported a placement"},
        {"stage": "Retained 3 months", "count": retained3, "note": "Same employer 3+ months on"},
        {"stage": "Role-matched", "count": role_matched, "note": "Working in the trained occupation"},
    ]
    for f in funnel:
        f["pct"] = pct(f["count"], total)

    # "X of Y records included": Y is everyone the filter matched before the
    # withdrawn were removed, so the strip can say how many it took out.
    matched_ids = [t.id for t in query.all()]
    total_consents = len(matched_ids)
    granted_consents = total

    return {
        "as_of": as_of,
        "filters_applied": {"cohort": cohort, "course": course, "provider": provider, "district": district},
        "total_trainees": total,
        "headline_placement_pct": pct(ever_placed, total),
        "headline_placement_count": ever_placed,
        "outcomes": outcomes_res,
        "retention": retention_res,
        "funnel": funnel,
        "event_count": sum(len(v) for v in events_by.values()),
        "wage_progression": wage_progression,
        "wage_evidence": tier_pct(wage_tiers),
        "cohorts_present": cohorts_present,
        "evidence_totals": tier_pct(overall),
        # Keys as the privacy strip reads them: how many are counted, how many
        # withdrew and are therefore absent from every figure above.
        "consent": {
            "total": total_consents,
            "included": granted_consents,
            "withdrawn": total_consents - granted_consents,
        },
    }

@app.get("/providers")
def get_providers(
    cohort: Optional[str] = None,
    course: Optional[str] = None,
    provider: Optional[str] = None,
    district: Optional[str] = None,
    demographic: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    The centre league table, computed from the trainees each centre certified.

    The Provider rows carry seeded constants — certified_count=420 and a
    verified_placement_pct chosen by hand — which were served as-is while the
    dataset held 15,000 real records. Every column now comes from those
    records, and the table narrows with the same filters as the dashboard.
    """
    cohort_rows = _filtered_trainees(db, cohort, course, provider, district, demographic)
    by_provider = {}
    for t in cohort_rows:
        by_provider.setdefault(t.provider_id, []).append(t)
    events_by = _events_by_trainee(db, [t.id for t in cohort_rows])
    courses, _ = _meta()
    intended = {c["name"]: c.get("intended_role") for c in courses}

    out = []
    for p in db.query(Provider).all():
        own = by_provider.get(p.id)
        if not own:
            continue
        tiers = _empty_tiers()
        verified = role_matched = placed_ever = stale = 0
        for t in own:
            evs = events_by.get(t.id, [])
            if any(e.what_happened == "placed" for e in evs):
                placed_ever += 1
            bucket, trust, ev = _classify(evs)
            if trust == "stale":
                stale += 1
            if bucket == "employed":
                verified += 1
                if trust in tiers:
                    tiers[trust] += 1
                if ev is not None and ev.job_role and ev.job_role == intended.get(t.course):
                    role_matched += 1
        share = lambda n: round(n / len(own) * 100) if own else 0
        reported, verified_pct = share(placed_ever), share(verified)
        out.append({
            "id": p.id,
            "name": p.name,
            "district": p.district,
            "certified_count": len(own),
            "headline_placement_pct": reported,
            "verified_placement_pct": verified_pct,
            "proof_gap": reported - verified_pct,
            "role_match_pct": share(role_matched),
            "stale_pct": share(stale),
            "retention_3mo": _retention_at(own, events_by, 90),
            "retention_6mo": _retention_at(own, events_by, 180),
            "retention_12mo": _retention_at(own, events_by, 365),
            "evidence": _tier_pct(tiers),
        })
    return out

@app.get("/providers/{provider_id}")
def get_provider_detail(
    provider_id: str,
    cohort: Optional[str] = None,
    course: Optional[str] = None,
    district: Optional[str] = None,
    demographic: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """One training centre, in the shape the detail page reads: overall
    figures, a confidence score, and a per-course breakdown."""
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Training centre not found.")

    own = _filtered_trainees(db, cohort, course, provider_id, district, demographic)
    events_by = _events_by_trainee(db, [t.id for t in own])
    courses_def, _ = _meta()
    intended = {c["name"]: c.get("intended_role") for c in courses_def}
    total = len(own)

    tiers = _empty_tiers()
    employed = placed_ever = role_matched = stale = 0
    by_course = {}
    for t in own:
        evs = events_by.get(t.id, [])
        slot = by_course.setdefault(t.course, {
            "course": t.course, "intended_role": intended.get(t.course),
            "certified": 0, "employed": 0, "role_matched": 0, "tiers": _empty_tiers(),
        })
        slot["certified"] += 1
        if any(e.what_happened == "placed" for e in evs):
            placed_ever += 1
        bucket, trust, ev = _classify(evs)
        if bucket == "employed":
            employed += 1
            slot["employed"] += 1
            if trust in tiers:
                tiers[trust] += 1
                slot["tiers"][trust] += 1
            if ev is not None and ev.job_role and ev.job_role == intended.get(t.course):
                role_matched += 1
                slot["role_matched"] += 1
        if trust == "stale":
            stale += 1

    def pct(n):
        return round(n / total * 1000) / 10 if total else 0

    evidence = _tier_pct(tiers)
    # How much of a centre's reported success rests on evidence it did not
    # produce itself.
    confidence = round(evidence["high"] * 1.0 + evidence["medium"] * 0.6 + evidence["low"] * 0.2)

    return {
        "id": provider.id,
        "name": provider.name,
        "district": provider.district,
        "status": "Active",
        "courses": sorted({t.course for t in own}),
        "certified_count": total,
        "employment_pct": pct(employed),
        "headline_placement_pct": pct(placed_ever),
        "verified_pct": evidence["high"],
        "role_matched_pct": pct(role_matched),
        "stale_pct": pct(stale),
        "confidence_score": min(100, confidence),
        "evidence": evidence,
        "by_course": sorted([
            {
                "course": c["course"],
                "intended_role": c["intended_role"],
                "certified": c["certified"],
                "employed": c["employed"],
                "employment_pct": round(c["employed"] / c["certified"] * 1000) / 10 if c["certified"] else 0,
                "role_match_pct": round(c["role_matched"] / c["certified"] * 1000) / 10 if c["certified"] else 0,
                "evidence": _tier_pct(c["tiers"]),
            }
            for c in by_course.values()
        ], key=lambda x: -x["certified"]),
        "as_of": AS_OF,
    }

@app.get("/attention")
def get_attention(db: Session = Depends(get_db)):
    """
    Ranked findings an officer can act on, per training centre.

    Computed from the same rows the dashboard counts, so the panel and the
    headline can never disagree — which they did while this was served from
    the browser's own seed data. The shape matches what the panel reads:
    a headline, the unit it concerns, and a sentence saying why.
    """
    providers = {p.id: p for p in db.query(Provider).all()}
    withdrawn = withdrawn_trainee_ids(db)
    trainees = [t for t in db.query(Trainee).all() if t.id not in withdrawn]
    events = [e for e in db.query(Event).all() if e.trainee_id not in withdrawn]
    disputes = [d for d in db.query(Dispute).all() if d.trainee_id not in withdrawn]

    placed = {e.trainee_id for e in events if e.what_happened == "placed"}
    retained = {e.trainee_id for e in events if e.what_happened == "still_working"}
    role_by_trainee = {
        e.trainee_id: e.job_role
        for e in events
        if e.what_happened in ("placed", "still_working") and e.job_role
    }

    by_provider: Dict[str, List[Trainee]] = {}
    for t in trainees:
        by_provider.setdefault(t.provider_id, []).append(t)

    findings: List[Dict[str, Any]] = []

    for pid, group in by_provider.items():
        provider = providers.get(pid)
        if not provider or not group:
            continue
        total = len(group)
        p_placed = sum(1 for t in group if t.id in placed)
        p_retained = sum(1 for t in group if t.id in retained)
        on_role = sum(1 for t in group if role_by_trainee.get(t.id) == t.course)

        placed_pct = round(p_placed / total * 100)
        role_pct = round(on_role / total * 100)
        proof_gap = placed_pct - round(p_retained / total * 100)

        if placed_pct >= 50 and role_pct + 20 <= placed_pct:
            findings.append({
                "id": f"role-{pid}",
                "kind": "role_mismatch",
                "headline": "High placement, low role relevance",
                "unit": provider.name,
                "unit_id": pid,
                "district": provider.district,
                "detail": (
                    f"{placed_pct}% of this centre's trainees report a placement, but only "
                    f"{role_pct}% are working in the occupation the course trains for."
                ),
                "action": "Review course-to-employer alignment",
                "weight": placed_pct - role_pct,
            })

        if proof_gap >= 30:
            findings.append({
                "id": f"unproven-{pid}",
                "kind": "unverified",
                "headline": "Placements not yet proven at three months",
                "unit": provider.name,
                "unit_id": pid,
                "district": provider.district,
                "detail": (
                    f"{proof_gap} percentage points of this centre's reported placements "
                    "have no confirmation that the person was still there three months on."
                ),
                "action": "Send for field verification",
                "weight": proof_gap,
            })

    open_disputes = [d for d in disputes if d.status != "resolved"]
    if open_disputes:
        findings.append({
            "id": "disputes-open",
            "kind": "disputes",
            "headline": "Disputed records awaiting a decision",
            "unit": f"{len(open_disputes)} record" + ("s" if len(open_disputes) != 1 else ""),
            "unit_id": None,
            "district": None,
            "detail": (
                "An employer and a trainee describe the same job differently. These are "
                "excluded from every outcome figure until a reviewer decides."
            ),
            "action": "Open disputed records",
            "weight": 100 + len(open_disputes),
        })

    findings.sort(key=lambda f: -f["weight"])
    for f in findings:
        f.pop("weight", None)
    # The panel reads `findings` off the response object, not a bare array.
    return {"findings": findings}


@app.get("/audit")
def get_audit(
    source: Optional[str] = None,
    district: Optional[str] = None,
    limit: int = Query(150, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """The outcome ledger: every event, newest first, never edited in place."""
    q = db.query(Event)
    withdrawn = withdrawn_trainee_ids(db)
    if withdrawn:
        q = q.filter(~Event.trainee_id.in_(withdrawn))
    if source:
        q = q.filter(Event.source == source)
    if district:
        q = q.join(Trainee, Trainee.id == Event.trainee_id).filter(Trainee.district == district)
    rows = q.order_by(Event.date.desc()).limit(limit).all()
    return {
        # The count reflects the same filter as the rows, so "150 of 32,008"
        # never appears beside a district that holds 1,300.
        "event_count": q.count(),
        "events": [
            {
                "id": e.id,
                "trainee_id": e.trainee_id,
                "date": e.date,
                "event_type": e.what_happened,
                "what_happened": e.what_happened,
                "job_role": e.job_role,
                "employer": e.employer,
                "salary": e.salary,
                "source": e.source,
                "trust_level": e.trust_level,
                "superseded": False,
            }
            for e in rows
        ],
    }


@app.get("/skill-gap")
def get_skill_gap(
    cohort: Optional[str] = None,
    course: Optional[str] = None,
    provider: Optional[str] = None,
    district: Optional[str] = None,
    demographic: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Intended role versus the role people are actually working in, per course
    and per district. Was a fixed list of four courses with invented counts."""
    rows = _filtered_trainees(db, cohort, course, provider, district, demographic)
    events_by = _events_by_trainee(db, [t.id for t in rows])
    courses_def, districts = _meta()
    working_buckets = {"employed", "awaiting_confirmation", "apprentice", "self_employed"}

    gap_tiers = _empty_tiers()
    course_rows = []
    for d in courses_def:
        own = [t for t in rows if t.course == d["name"]]
        if not own:
            continue
        working = on_role = 0
        for t in own:
            bucket, trust, ev = _classify(events_by.get(t.id, []))
            if bucket not in working_buckets:
                continue
            working += 1
            if trust in gap_tiers:
                gap_tiers[trust] += 1
            role = (ev.job_role if ev is not None else "") or ""
            ir = d.get("intended_role")
            if role in (ir, f"Apprentice — {ir}", f"Self-employed — {ir}"):
                on_role += 1
        actual = round(on_role / len(own) * 100)
        target = int(d.get("target_pct", 0))
        course_rows.append({
            "course": d["name"],
            "intended_role": d.get("intended_role"),
            "intended_pct": target,
            "actual_pct": actual,
            "mismatch": max(0, target - actual),
            "trainees": len(own),
            "working": working,
        })
    mismatch_of = {c["course"]: c["mismatch"] for c in course_rows}

    district_rows = []
    for name in districts:
        own = [t for t in rows if t.district == name]
        if not own:
            district_rows.append({"district": name, "mismatch": None, "trainees": 0, "top_gap_course": None})
            continue
        weighted = 0
        worst = None
        for d in courses_def:
            n = sum(1 for t in own if t.course == d["name"])
            if not n:
                continue
            m = mismatch_of.get(d["name"], 0)
            weighted += m * n
            if worst is None or m > worst[1]:
                worst = (d["name"], m)
        district_rows.append({
            "district": name,
            "mismatch": round(weighted / len(own)),
            "trainees": len(own),
            "top_gap_course": worst[0] if worst else None,
        })

    return {"courses": course_rows, "districts": district_rows, "evidence": _tier_pct(gap_tiers)}

@app.get("/trainees")
def get_trainees(
    response: Response,
    cohort: Optional[str] = None,
    course: Optional[str] = None,
    district: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(500, ge=1, le=2000),
    offset: int = Query(0, ge=0),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Trainee records, paged.

    This used to return all 15,000 rows with every event embedded — 11 MB
    in about thirty seconds, one Event query per trainee — which was over the
    client's 2.5 s timeout, so every caller silently fell back to the offline
    store. Events are now fetched in one query for the page, the page is
    bounded, and the full count travels in X-Total-Count.
    """
    q = db.query(Trainee)

    # Strict Role Restriction
    if current_user and current_user.role == "client":
        # Trainees can ONLY see their own record
        q = q.filter(Trainee.id == current_user.id)
    elif current_user and current_user.role == "employer":
        company = current_user.company_name or "Sanjeevani Hospital"
        q = q.filter(Trainee.employer.ilike(f"%{company}%"))

    if cohort:
        q = q.filter(Trainee.cohort == cohort)
    if course:
        q = q.filter(Trainee.course == course)
    if district:
        q = q.filter(Trainee.district == district)
    if search:
        q = q.filter(
            or_(
                Trainee.name.ilike(f"%{search}%"),
                Trainee.id.ilike(f"%{search}%"),
                Trainee.employer.ilike(f"%{search}%")
            )
        )

    withdrawn = withdrawn_trainee_ids(db)
    if withdrawn:
        q = q.filter(~Trainee.id.in_(withdrawn))
    response.headers["X-Total-Count"] = str(q.count())
    results = q.order_by(Trainee.id).offset(offset).limit(limit).all()
    events_by = _events_by_trainee(db, [t.id for t in results])
    out = []
    for t in results:
        evs = events_by.get(t.id, [])
        out.append({
            "id": t.id,
            "name": t.name,
            "course": t.course,
            "district": t.district,
            "gender": t.gender,
            "age_group": t.age_group,
            "category": t.category,
            "phone": t.phone,
            "cohort": t.cohort,
            "provider_id": t.provider_id,
            "employer": t.employer,
            "salary": t.salary,
            "outcome": t.outcome,
            "trust_level": t.trust_level,
            "certification_date": t.certification_date,
            "placement_date": t.placement_date,
            "events": [
                {
                    "id": e.id,
                    "date": e.date,
                    "what_happened": e.what_happened,
                    "job_role": e.job_role,
                    "employer": e.employer,
                    "salary": e.salary,
                    "source": e.source,
                    "trust_level": e.trust_level
                }
                for e in evs
            ]
        })
    return out

@app.get("/trainees/{id}")
def get_trainee(
    id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    t = db.query(Trainee).filter(Trainee.id == id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Trainee record not found")

    # Access enforcement
    if current_user and current_user.role == "client" and current_user.id != t.id:
        raise HTTPException(status_code=403, detail="DPDPA Restriction: You can only access your own individual record.")

    if current_user and current_user.role == "employer":
        company = current_user.company_name or ""
        if company.lower() not in (t.employer or "").lower():
            raise HTTPException(status_code=403, detail=f"Employer Restriction: Candidate does not belong to {company}.")

    evs = db.query(Event).filter(Event.trainee_id == t.id).order_by(Event.date.asc()).all()
    consents = db.query(Consent).filter(Consent.trainee_id == t.id).all()
    reviews = db.query(Review).filter(Review.trainee_id == t.id).all()
    assessment = db.query(Assessment).filter(Assessment.trainee_id == t.id).first()
    enrolment = db.query(Enrolment).filter(Enrolment.trainee_id == t.id).first()
    contacts = (
        db.query(FollowupContact)
        .filter(FollowupContact.trainee_id == t.id)
        .order_by(FollowupContact.date)
        .all()
    )

    return {
        "id": t.id,
        "name": t.name,
        "course": t.course,
        "district": t.district,
        "gender": t.gender,
        "age_group": t.age_group,
        "category": t.category,
        "phone": t.phone,
        "cohort": t.cohort,
        "provider_id": t.provider_id,
        "employer": t.employer,
        "salary": t.salary,
        "outcome": t.outcome,
        "bucket": t.outcome,
        "trust_level": t.trust_level,
        "certification_date": t.certification_date,
        "placement_date": t.placement_date,
        "events": [
            {
                "id": e.id,
                "date": e.date,
                "what_happened": e.what_happened,
                "job_role": e.job_role,
                "employer": e.employer,
                "salary": e.salary,
                "source": e.source,
                "trust_level": e.trust_level
            }
            for e in evs
        ],
        "consents": [{"id": c.id, "purpose": c.purpose, "granted": c.granted, "date": c.date} for c in consents],
        "reviews": [{"id": r.id, "overall_quality": r.overall_quality, "feedback": r.feedback} for r in reviews],
        # From the source spreadsheets: what they scored, how much they attended,
        # and every follow-up contact made with them.
        "assessment": {
            "technical_score": assessment.technical_score,
            "soft_skill_score": assessment.soft_skill_score,
            "result": assessment.result,
            "skill_level": assessment.skill_level,
            "certified": assessment.certified,
        } if assessment else None,
        "enrolment": {
            "programme": enrolment.programme,
            "provider": enrolment.provider,
            "start_date": enrolment.start_date,
            "completion_date": enrolment.completion_date,
            "attendance_pct": enrolment.attendance_pct,
            "completion_status": enrolment.completion_status,
        } if enrolment else None,
        "followup_contacts": [
            {
                "date": c.date,
                "months_after_training": c.months_after_training,
                "contacted": c.contacted,
                "status": c.status,
                "monthly_income": c.monthly_income,
                "job_satisfaction": c.job_satisfaction,
                "training_relevance": c.training_relevance,
                "skill_gap_identified": c.skill_gap_identified,
                "reason_for_attrition": c.reason_for_attrition,
            }
            for c in contacts
        ],
    }


@app.get("/employers")
def list_employers(
    district: Optional[str] = None,
    industry: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(200, ge=1, le=2000),
    db: Session = Depends(get_db),
):
    """The employer registry: 1,500 organisations trainees were placed with."""
    q = db.query(Employer)
    if district:
        q = q.filter(Employer.district == district)
    if industry:
        q = q.filter(Employer.industry == industry)
    if search:
        q = q.filter(Employer.company_name.ilike(f"%{search}%"))
    return [
        {
            "id": e.id, "company_name": e.company_name, "industry": e.industry,
            "district": e.district, "company_size": e.company_size, "verified": e.verified,
        }
        for e in q.order_by(Employer.company_name).limit(limit).all()
    ]


@app.get("/completion")
def get_completion(
    cohort: Optional[str] = None,
    course: Optional[str] = None,
    provider: Optional[str] = None,
    district: Optional[str] = None,
    demographic: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Course completion and attendance, from the enrolment records: how many
    finished, dropped or are still enrolled, and mean attendance — per course.
    """
    rows = _filtered_trainees(db, cohort, course, provider, district, demographic)
    ids = [t.id for t in rows]
    enrolments = db.query(Enrolment).filter(Enrolment.trainee_id.in_(ids)).all() if ids else []
    assessments = db.query(Assessment).filter(Assessment.trainee_id.in_(ids)).all() if ids else []

    status = {}
    for e in enrolments:
        status[e.completion_status or "Unknown"] = status.get(e.completion_status or "Unknown", 0) + 1
    att = [e.attendance_pct for e in enrolments if e.attendance_pct is not None]
    cert = sum(1 for a in assessments if a.certified)
    tech = [a.technical_score for a in assessments if a.technical_score is not None]
    soft = [a.soft_skill_score for a in assessments if a.soft_skill_score is not None]

    by_course = {}
    course_of = {t.id: t.course for t in rows}
    for e in enrolments:
        slot = by_course.setdefault(course_of.get(e.trainee_id, e.programme), {"course": course_of.get(e.trainee_id, e.programme), "enrolled": 0, "completed": 0, "attendance": []})
        slot["enrolled"] += 1
        if e.completion_status == "Completed":
            slot["completed"] += 1
        if e.attendance_pct is not None:
            slot["attendance"].append(e.attendance_pct)
    courses = []
    for c in by_course.values():
        courses.append({
            "course": c["course"],
            "enrolled": c["enrolled"],
            "completed": c["completed"],
            "completion_pct": round(c["completed"] / c["enrolled"] * 100) if c["enrolled"] else 0,
            "mean_attendance_pct": round(sum(c["attendance"]) / len(c["attendance"]), 1) if c["attendance"] else None,
        })
    courses.sort(key=lambda x: -x["enrolled"])

    n = len(enrolments)
    return {
        "enrolled": n,
        "completed": status.get("Completed", 0),
        "dropped": status.get("Dropped", 0),
        "ongoing": status.get("Ongoing", 0),
        "completion_pct": round(status.get("Completed", 0) / n * 100, 1) if n else 0,
        "mean_attendance_pct": round(sum(att) / len(att), 1) if att else None,
        "certified": cert,
        "certified_pct": round(cert / len(assessments) * 100, 1) if assessments else 0,
        "mean_technical_score": round(sum(tech) / len(tech), 1) if tech else None,
        "mean_soft_skill_score": round(sum(soft) / len(soft), 1) if soft else None,
        "courses": courses,
    }

# -------------------------------------------------------------------
# Employer Portal Specific Endpoints
# -------------------------------------------------------------------
@app.get("/employer/trainees")
def get_employer_trainees(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["employer", "government"]:
        raise HTTPException(status_code=403, detail="Employer access required")

    company = current_user.company_name or "Sanjeevani Hospital"
    if current_user.role == "government":
        # Gov can see all or specified company
        trainees = db.query(Trainee).filter(Trainee.employer != None).all()
    else:
        trainees = db.query(Trainee).filter(Trainee.employer.ilike(f"%{company}%")).all()

    res = []
    for t in trainees:
        evs = db.query(Event).filter(Event.trainee_id == t.id).all()
        # Check if 3-month milestone is verified
        is_verified_3mo = any(e.what_happened == "still_working" and e.trust_level == "high" for e in evs)
        res.append({
            "id": t.id,
            "name": t.name,
            "course": t.course,
            "district": t.district,
            "phone": t.phone,
            "employer": t.employer,
            "salary": t.salary,
            "outcome": t.outcome,
            "placement_date": t.placement_date,
            "is_verified_3mo": is_verified_3mo,
            "events": [
                {"date": e.date, "what_happened": e.what_happened, "trust_level": e.trust_level}
                for e in evs
            ]
        })
    return res

@app.post("/employer/verify-milestone")
def verify_milestone(
    data: MilestoneVerificationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["employer", "government"]:
        raise HTTPException(status_code=403, detail="Only employers or government officers can verify employment milestones")

    t = db.query(Trainee).filter(Trainee.id == data.trainee_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Trainee not found")

    today_str = datetime.utcnow().strftime("%Y-%m-%d")

    # Add confirmation event
    new_evt = Event(
        id=f"EVT-CONF-{datetime.utcnow().strftime('%M%S%f')[:8]}",
        trainee_id=t.id,
        date=today_str,
        what_happened="still_working" if data.is_working else "left_job",
        job_role=data.job_role or t.course,
        employer=data.employer or t.employer,
        salary=data.salary or t.salary,
        source="employer",
        trust_level="high" if data.is_working else "medium"
    )
    db.add(new_evt)

    # Update trainee record
    if data.is_working:
        t.outcome = "employed"
        t.trust_level = "high"
        if data.salary:
            t.salary = data.salary
    else:
        t.outcome = "not_working"

    db.commit()
    return {
        "success": True,
        "message": f"Successfully verified 3-month milestone for {t.name}.",
        "new_status": t.outcome,
        "event_id": new_evt.id
    }

# -------------------------------------------------------------------
# Disputes & Field Officers
# -------------------------------------------------------------------
@app.get("/disputes")
def get_disputes(
    district: Optional[str] = None,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    withdrawn = withdrawn_trainee_ids(db)
    disputes = [d for d in db.query(Dispute).all() if d.trainee_id not in withdrawn]
    # A district officer's console sends their district on every call; the
    # badge and the list must count the same people the dashboard does.
    if district:
        in_district = {t.id for t in db.query(Trainee.id).filter(Trainee.district == district).all()}
        disputes = [d for d in disputes if d.trainee_id in in_district]
    # Filter if employer
    if current_user and current_user.role == "employer":
        # Only show disputes for company candidates
        company = current_user.company_name or ""
        valid_tids = {t.id for t in db.query(Trainee).filter(Trainee.employer.ilike(f"%{company}%")).all()}
        disputes = [d for d in disputes if d.trainee_id in valid_tids]

    res = []
    for d in disputes:
        t = db.query(Trainee).filter(Trainee.id == d.trainee_id).first()
        res.append({
            "id": d.id,
            "trainee_id": d.trainee_id,
            "trainee_name": t.name if t else "Unknown",
            "course": t.course if t else "General",
            "employer": t.employer if t else "N/A",
            "employer_claim": d.employer_claim,
            "trainee_claim": d.trainee_claim,
            "date": d.date,
            "status": d.status,
            "assigned_officer": d.assigned_officer
        })
    return res

@app.post("/disputes/{id}/resolve")
def resolve_dispute(
    id: str,
    body: Dict[str, Any] = Body(...),
    current_user: User = Depends(require_role(["government"])),
    db: Session = Depends(get_db)
):
    d = db.query(Dispute).filter(Dispute.id == id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Dispute not found")

    d.status = "resolved"
    t = db.query(Trainee).filter(Trainee.id == d.trainee_id).first()
    if t and "ruling" in body:
        if body.get("ruling") == "upheld_trainee":
            t.outcome = "employed"
            t.trust_level = "high"
        elif body.get("ruling") == "upheld_employer":
            t.outcome = "not_working"

    db.commit()
    return {"id": d.id, "status": "resolved", "notes": body.get("notes")}

@app.get("/field-officers")
def get_field_officers():
    return [
        {"id": "FO-01", "name": "Rajesh Patel", "district": "Thane", "active_cases": 2},
        {"id": "FO-02", "name": "Sunita Kulkarni", "district": "Pune", "active_cases": 1},
        {"id": "FO-03", "name": "Vikram Deshmukh", "district": "Nagpur", "active_cases": 0},
        {"id": "FO-04", "name": "Anita Rao", "district": "Nashik", "active_cases": 3},
    ]

@app.post("/disputes/{id}/assign-officer")
def assign_dispute_officer(
    id: str,
    body: Dict[str, Any] = Body(...),
    current_user: User = Depends(require_role(["government"])),
    db: Session = Depends(get_db)
):
    d = db.query(Dispute).filter(Dispute.id == id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Dispute not found")
    d.assigned_officer = body.get("officer")
    db.commit()
    return {"id": d.id, "assigned_officer": d.assigned_officer}

# -------------------------------------------------------------------
# Reviews & Feedback
# -------------------------------------------------------------------
# Declared before /reviews/{trainee_id}: a path parameter would otherwise
# capture the literal "insights" and this handler would never run.
@app.get("/reviews/insights")
def get_review_insights(
    cohort: Optional[str] = None,
    course: Optional[str] = None,
    provider: Optional[str] = None,
    district: Optional[str] = None,
    demographic: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    What trainees said about their training, computed from submitted reviews.

    Returned "128 reviews, 88.5% job-ready" as constants. Now: the actual
    responses, per question, in the shape the insights panel reads. With few
    reviews submitted the numbers are small — which is the truth, and grows
    as trainees use the Quick Review.
    """
    rows = _filtered_trainees(db, cohort, course, provider, district, demographic)
    ids = {t.id for t in rows}
    reviews = [r for r in db.query(Review).all() if r.trainee_id in ids] if ids else []

    def bucket_for(score, options):
        # 4-point scale back to the option a trainee would have chosen
        if score is None:
            return None
        idx = max(0, min(3, 4 - int(round(score))))
        return options[idx]

    questions = []
    for qid, col, options in _REVIEW_QUESTIONS:
        values = [getattr(r, col) for r in reviews if getattr(r, col) is not None]
        counts = {o: 0 for o in options}
        for v in values:
            b = bucket_for(v, options)
            if b:
                counts[b] += 1
        mean = sum(values) / len(values) if values else None
        questions.append({
            "id": qid,
            "responses": len(values),
            "out_of_five": round(mean / 4 * 5, 1) if mean is not None else None,
            "distribution": [
                {"value": o, "count": counts[o], "pct": round(counts[o] / len(values) * 100) if values else 0}
                for o in options
            ],
        })

    rec = [r.would_recommend for r in reviews if r.would_recommend is not None]
    recommend_rate = round(sum(1 for v in rec if v >= 3) / len(rec) * 100) if rec else None

    by_provider = {}
    for t in rows:
        by_provider.setdefault(t.provider_id, []).append(t.id)
    provider_rows = []
    pmap = {p.id: p.name for p in db.query(Provider).all()}
    for pid, tids in by_provider.items():
        prs = [r for r in reviews if r.trainee_id in set(tids)]
        if not prs:
            continue
        q = [r.overall_quality for r in prs if r.overall_quality is not None]
        provider_rows.append({
            "id": pid,
            "name": pmap.get(pid, pid),
            "responses": len(prs),
            "out_of_five": round(sum(q) / len(q) / 4 * 5, 1) if q else None,
        })
    provider_rows.sort(key=lambda x: -(x["out_of_five"] or 0))

    return {
        "eligible": len(rows),
        "responses": len(reviews),
        "response_rate": round(len(reviews) / len(rows) * 100) if rows else 0,
        "recommend_rate": recommend_rate,
        "questions": questions,
        "providers": provider_rows,
    }


@app.get("/reviews/{trainee_id}")
def get_review(trainee_id: str, db: Session = Depends(get_db)):
    r = db.query(Review).filter(Review.trainee_id == trainee_id).first()
    if not r:
        return None
    return {
        "id": r.id,
        "trainee_id": r.trainee_id,
        "overall_quality": r.overall_quality,
        "job_usefulness": r.job_usefulness,
        "trainer_score": r.trainer_score,
        "skill_confidence": r.skill_confidence,
        "would_recommend": r.would_recommend,
        "feedback": r.feedback
    }

@app.post("/reviews")
def submit_review(
    body: Dict[str, Any] = Body(...),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    tid = body.get("trainee_id")
    if not tid and current_user:
        tid = current_user.id
    if not tid:
        raise HTTPException(status_code=400, detail="trainee_id is required")

    r = db.query(Review).filter(Review.trainee_id == tid).first()
    if not r:
        r = Review(id=f"REV-{datetime.utcnow().strftime('%M%S%f')[:8]}", trainee_id=tid)
        db.add(r)

    # The Quick Review form sends option values under `answers`; this handler
    # read top-level floats that were never present, so every review saved the
    # 4.0 default and the trainee's actual answers were dropped on the floor.
    answers = body.get("answers") or {}

    def score(question, fallback_key=None):
        v = answers.get(question)
        if v is None and fallback_key:
            v = body.get(fallback_key)
        if isinstance(v, (int, float)):
            return float(v)
        return float(_REVIEW_SCORES.get(str(v), 0)) if v is not None else None

    for col, q in (
        ("overall_quality", "overall_quality"),
        ("job_usefulness", "job_usefulness"),
        ("trainer_score", "trainer_rating"),
        ("skill_confidence", "confidence"),
        ("would_recommend", "recommend"),
    ):
        val = score(q, col)
        if val is not None:
            setattr(r, col, val)
    r.feedback = body.get("feedback") or answers.get("feedback") or r.feedback
    db.commit()
    return {"status": "success", "review_id": r.id}

@app.get("/consent")
def list_consents(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    q = db.query(Consent)
    if current_user and current_user.role == "client":
        q = q.filter(Consent.trainee_id == current_user.id)
    return q.all()

@app.get("/consent/{id}")
def get_consent(id: str, db: Session = Depends(get_db)):
    c = db.query(Consent).filter(Consent.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Consent record not found")
    return c

@app.post("/consent")
def grant_consent(body: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    c = Consent(
        id=f"CNS-{datetime.utcnow().strftime('%M%S%f')[:8]}",
        trainee_id=body.get("trainee_id", "TRN-0001"),
        purpose=body.get("purpose", "Post-training verification"),
        granted=True,
        date=datetime.utcnow().strftime("%Y-%m-%d")
    )
    db.add(c)
    db.commit()
    return c

@app.delete("/consent/{id}")
def withdraw_consent(id: str, db: Session = Depends(get_db)):
    c = db.query(Consent).filter(Consent.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Consent record not found")
    c.granted = False
    db.commit()
    return {"status": "withdrawn", "id": id}

# -------------------------------------------------------------------
# Check-in & Follow-up Queue
# -------------------------------------------------------------------
@app.post("/checkin")
def post_checkin(body: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    tid = body.get("trainee_id", "TRN-0001")
    today_str = datetime.utcnow().strftime("%Y-%m-%d")

    chk = Checkin(
        id=f"CHK-{datetime.utcnow().strftime('%M%S%f')[:8]}",
        trainee_id=tid,
        date=today_str,
        source=body.get("source", "whatsapp"),
        payload=str(body)
    )
    db.add(chk)

    what_happened = body.get("what_happened", "still_working")
    salary_val = body.get("salary", 14000)
    source_val = body.get("source", "whatsapp")

    # Record event
    new_evt = Event(
        id=f"EVT-{datetime.utcnow().strftime('%M%S%f')[:8]}",
        trainee_id=tid,
        date=today_str,
        what_happened=what_happened,
        job_role=body.get("job_role", "Healthcare Assistant"),
        employer=body.get("employer", "Sanjeevani Hospital"),
        salary=salary_val,
        source=source_val,
        trust_level=body.get("trust_level", "high" if source_val in ["whatsapp", "whatsapp_verified_survey"] else "medium")
    )
    db.add(new_evt)

    # Sync Trainee record in database
    t = db.query(Trainee).filter(Trainee.id == tid).first()
    if not t:
        t = db.query(Trainee).filter(Trainee.id == "TRN-0001").first()
    if t:
        if what_happened in ["still_working", "employed"]:
            t.outcome = "employed"
        elif what_happened in ["unemployed", "not_working"]:
            t.outcome = "not_working"
        elif what_happened in ["self_employed", "entrepreneur"]:
            t.outcome = "self_employed"
        if salary_val:
            try:
                t.salary = int(salary_val)
            except Exception:
                pass
        t.trust_level = "high"

    db.commit()

    # Sync check-in to Supabase asynchronously
    import threading
    _chk_body = dict(body)
    _chk_tid = tid
    threading.Thread(
        target=lambda: sb.sb_post_checkin(_chk_tid, _chk_body.get("source", "web"), _chk_body),
        daemon=True
    ).start()

    return {"status": "checkin_recorded", "id": chk.id, "event_id": new_evt.id}

# The follow-up queue from the national dataset — trainees unreachable after
# repeated attempts. Held in memory: it is a work list that officers assign
# from, not a ledger, and the two literal rows this used to return did not
# even use the field names the page reads.
_FOLLOWUP_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "frontend", "src", "api", "mock", "data", "organized_data.json",
)


def _load_followup_queue() -> List[Dict[str, Any]]:
    try:
        with open(_FOLLOWUP_PATH, encoding="utf-8") as fh:
            rows = json.load(fh).get("followupQueue", [])
    except Exception:
        rows = []
    for r in rows:
        r.setdefault("assigned_to", None)
        r.setdefault("assigned_at", None)
    return rows


_followup_queue: List[Dict[str, Any]] = _load_followup_queue()


@app.get("/followup-queue")
def get_followup_queue(district: Optional[str] = None):
    if district:
        return [r for r in _followup_queue if r.get("district") == district]
    return _followup_queue


class AssignFollowupRequest(BaseModel):
    officer: Optional[str] = None


@app.post("/followup-queue/{trainee_id}/assign")
def assign_followup(trainee_id: str, payload: AssignFollowupRequest):
    for r in _followup_queue:
        if r.get("trainee_id") == trainee_id:
            r["assigned_to"] = payload.officer
            r["assigned_at"] = datetime.utcnow().strftime("%Y-%m-%d") if payload.officer else None
            return r
    raise HTTPException(status_code=404, detail="Trainee is not in the follow-up queue.")

@app.post("/api/whatsapp/send-survey")
def send_whatsapp_survey_api(payload: WhatsAppSendRequest, db: Session = Depends(get_db)):
    t_name = payload.trainee_name or "Trainee"
    t_phone = payload.phone
    if payload.trainee_id:
        t = db.query(Trainee).filter(Trainee.id == payload.trainee_id).first()
        if t:
            t_name = t.name
            if not t_phone:
                t_phone = t.phone

    session = start_whatsapp_survey(
        phone_number=t_phone,
        trainee_id=payload.trainee_id or "",
        trainee_name=t_name,
        email=payload.email or ""
    )
    return session

@app.get("/api/whatsapp/status/{phone}")
def get_whatsapp_status_api(phone: str, db: Session = Depends(get_db)):
    cleaned = clean_phone(phone)
    session = check_whatsapp_replies_for_phone(cleaned)

    # Sync to DB if session completed and not yet synced
    if session and session.get("status") == "COMPLETED" and not session.get("db_synced"):
        tid = session.get("trainee_id")
        t = db.query(Trainee).filter(Trainee.id == tid).first()
        if not t and cleaned:
            t = db.query(Trainee).filter(Trainee.phone.contains(cleaned[-10:])).first()
        if not t:
            t = db.query(Trainee).filter(Trainee.id == "TRN-0001").first()
        if t:
            outcome = session.get("outcome")  # Unemployed | Employed | Self-employed
            if outcome == "Unemployed":
                t.outcome = "not_working"
            elif outcome == "Employed":
                t.outcome = "employed"
                if session.get("salary"):
                    try:
                        t.salary = int(session.get("salary"))
                    except Exception:
                        pass
            elif outcome == "Self-employed":
                t.outcome = "self_employed"
                if session.get("revenue"):
                    try:
                        t.salary = int(session.get("revenue"))
                    except Exception:
                        pass

            t.trust_level = "high"
            today_str = datetime.utcnow().strftime("%Y-%m-%d")
            evt = Event(
                id=f"EVT-WA-{datetime.utcnow().strftime('%M%S%f')[:6]}",
                trainee_id=t.id,
                date=today_str,
                what_happened="still_working" if outcome != "Unemployed" else "unemployed",
                job_role=t.course,
                employer=t.employer or ("Self-employed" if outcome == "Self-employed" else None),
                salary=t.salary,
                source="whatsapp_verified_survey",
                trust_level="high"
            )
            db.add(evt)

            chk = Checkin(
                id=f"CHK-WA-{datetime.utcnow().strftime('%M%S%f')[:6]}",
                trainee_id=t.id,
                date=today_str,
                source="whatsapp_quarterly_checkin",
                payload=json.dumps({
                    "phone": cleaned,
                    "outcome": outcome,
                    "salary": session.get("salary"),
                    "revenue": session.get("revenue"),
                    "completed_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
                })
            )
            db.add(chk)
            db.commit()

            session["db_synced"] = True
            sessions = load_sessions()
            sessions[cleaned] = session
            save_sessions(sessions)

    return session

@app.post("/api/whatsapp/simulate-reply")
def simulate_whatsapp_reply_api(payload: WhatsAppSimulateRequest, db: Session = Depends(get_db)):
    cleaned = clean_phone(payload.phone)
    sessions = load_sessions()
    session = sessions.get(cleaned)

    if not session:
        # Start a session first if none exists
        session = start_whatsapp_survey(cleaned)

    now_iso = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    received_text = payload.reply_text.strip()

    session["history"].append({
        "direction": "incoming",
        "text": received_text,
        "timestamp": now_iso
    })

    current_state = session.get("status")

    if current_state == "WAITING_STATUS":
        reply_lower = received_text.lower()
        if reply_lower in ["1", "1.", "option 1", "unemployed"]:
            session["outcome"] = "Unemployed"
            session["status"] = "COMPLETED"
            final_msg = """Thank you for providing the information. ✅

Your employment status has been recorded as:

📌 Employment Status: Unemployed

No additional information is required.

Thank you for your response."""
            send_whatsapp_message(cleaned, final_msg)
            session["history"].append({"direction": "outgoing", "text": final_msg, "timestamp": now_iso})
            append_survey_log(session)

        elif reply_lower in ["2", "2.", "option 2", "employed"]:
            session["outcome"] = "Employed"
            session["status"] = "WAITING_SALARY"
            send_whatsapp_message(cleaned, SALARY_QUESTION)
            session["history"].append({"direction": "outgoing", "text": SALARY_QUESTION, "timestamp": now_iso})

        elif reply_lower in ["3", "3.", "option 3", "self employed", "self-employed", "selfemployed"]:
            session["outcome"] = "Self-employed"
            session["status"] = "WAITING_REVENUE"
            send_whatsapp_message(cleaned, REVENUE_QUESTION)
            session["history"].append({"direction": "outgoing", "text": REVENUE_QUESTION, "timestamp": now_iso})

        else:
            send_whatsapp_message(cleaned, INVALID_STATUS_MESSAGE)
            session["history"].append({"direction": "outgoing", "text": INVALID_STATUS_MESSAGE, "timestamp": now_iso})

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
        session["history"].append({"direction": "outgoing", "text": final_msg, "timestamp": now_iso})
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
        session["history"].append({"direction": "outgoing", "text": final_msg, "timestamp": now_iso})
        append_survey_log(session)

    session["updated_at"] = now_iso
    sessions[cleaned] = session
    save_sessions(sessions)

    # Sync to DB if completed
    if session.get("status") == "COMPLETED" and not session.get("db_synced"):
        tid = session.get("trainee_id")
        t = db.query(Trainee).filter(Trainee.id == tid).first()
        if not t and cleaned:
            t = db.query(Trainee).filter(Trainee.phone.contains(cleaned[-10:])).first()
        if not t:
            t = db.query(Trainee).filter(Trainee.id == "TRN-0001").first()
        if t:
            outcome = session.get("outcome")
            if outcome == "Unemployed":
                t.outcome = "not_working"
            elif outcome == "Employed":
                t.outcome = "employed"
                if session.get("salary"):
                    try:
                        t.salary = int(session.get("salary"))
                    except Exception:
                        pass
            elif outcome == "Self-employed":
                t.outcome = "self_employed"
                if session.get("revenue"):
                    try:
                        t.salary = int(session.get("revenue"))
                    except Exception:
                        pass

            t.trust_level = "high"
            today_str = datetime.utcnow().strftime("%Y-%m-%d")
            evt = Event(
                id=f"EVT-WA-{datetime.utcnow().strftime('%M%S%f')[:6]}",
                trainee_id=t.id,
                date=today_str,
                what_happened="still_working" if outcome != "Unemployed" else "unemployed",
                job_role=t.course,
                employer=t.employer or ("Self-employed" if outcome == "Self-employed" else None),
                salary=t.salary,
                source="whatsapp_verified_survey",
                trust_level="high"
            )
            db.add(evt)

            chk = Checkin(
                id=f"CHK-WA-{datetime.utcnow().strftime('%M%S%f')[:6]}",
                trainee_id=t.id,
                date=today_str,
                source="whatsapp_quarterly_checkin",
                payload=json.dumps({
                    "phone": cleaned,
                    "outcome": outcome,
                    "salary": session.get("salary"),
                    "revenue": session.get("revenue"),
                    "simulated": True
                })
            )
            db.add(chk)
            db.commit()

            session["db_synced"] = True
            sessions[cleaned] = session
            save_sessions(sessions)

    return session

@app.get("/api/whatsapp/sessions")
def get_whatsapp_sessions_api():
    return load_sessions()

@app.post("/api/whatsapp/send-otp")
def send_whatsapp_otp_api(payload: WhatsAppOtpRequest, db: Session = Depends(get_db)):
    """Send a random 6-digit OTP to the user's WhatsApp. OTP must be verified before survey starts."""
    t_name = payload.trainee_name or "Trainee"
    t_phone = payload.phone
    if payload.trainee_id:
        t = db.query(Trainee).filter(Trainee.id == payload.trainee_id).first()
        if t:
            t_name = t.name
            if not t_phone and t.phone:
                t_phone = t.phone
    result = send_whatsapp_otp(
        phone_number=t_phone,
        trainee_id=payload.trainee_id or "",
        trainee_name=t_name,
        email=payload.email or ""
    )
    return result

@app.post("/api/whatsapp/verify-otp")
def verify_whatsapp_otp_api(payload: WhatsAppVerifyOtpRequest, db: Session = Depends(get_db)):
    """Verify the OTP entered on the website. On success, sends the employment survey to WhatsApp."""
    result = verify_whatsapp_otp(
        phone_number=payload.phone,
        entered_otp=payload.otp
    )
    return result

@app.delete("/api/whatsapp/reset/{phone}")
@app.post("/api/whatsapp/reset/{phone}")
def reset_whatsapp_session_api(phone: str, db: Session = Depends(get_db)):
    """Reset / completely wipe WhatsApp session, survey logs, and verification records from PC files and SQLite database."""
    cleaned = clean_phone(phone)
    raw_digits = re.sub(r"\D", "", phone or "")
    last10 = raw_digits[-10:] if len(raw_digits) >= 10 else raw_digits

    # 1. Clear session from backend/data/whatsapp_sessions.json
    sessions = load_sessions()
    keys_to_del = [
        k for k in list(sessions.keys())
        if k == cleaned or k == raw_digits or (last10 and k.endswith(last10)) or phone == "all"
    ]
    for k in keys_to_del:
        sessions.pop(k, None)
    save_sessions(sessions)

    # 2. Clear survey logs from backend/data/whatsapp_surveys.json
    if os.path.exists(SURVEY_LOG_FILE):
        try:
            with open(SURVEY_LOG_FILE, "r", encoding="utf-8", errors="replace") as f:
                logs = json.load(f)
            if phone == "all":
                filtered_logs = []
            else:
                filtered_logs = [
                    entry for entry in logs
                    if not (
                        clean_phone(str(entry.get("phone", ""))) == cleaned
                        or (last10 and str(entry.get("phone", "")).endswith(last10))
                        or (last10 and last10 in str(entry.get("phone", "")))
                    )
                ]
            with open(SURVEY_LOG_FILE, "w", encoding="utf-8") as f:
                json.dump(filtered_logs, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error cleaning survey log: {e}")

    # 3. Clear Event and Checkin records from SQLite database
    trainees = db.query(Trainee).filter(
        or_(
            Trainee.phone.contains(last10) if last10 else False,
            Trainee.id == "TRN-0001"
        )
    ).all()

    for t in trainees:
        if t.id == "TRN-0001":
            # For Aarti Patil: delete all non-seeded events (keep only EVT-0001-1, 2, 3)
            db.query(Event).filter(
                Event.trainee_id == t.id,
                ~Event.id.in_(["EVT-0001-1", "EVT-0001-2", "EVT-0001-3"])
            ).delete(synchronize_session=False)
        else:
            db.query(Event).filter(
                Event.trainee_id == t.id,
                or_(
                    Event.source.in_(["whatsapp_verified_survey", "whatsapp", "whatsapp_quarterly_checkin", "trainee", "user_direct_verified_selection"]),
                    Event.id.like("EVT-WA%"),
                    Event.id.like("EVT-DIR%"),
                    Event.id.like("EVT-LIVE%")
                )
            ).delete(synchronize_session=False)

        db.query(Checkin).filter(
            Checkin.trainee_id == t.id
        ).delete(synchronize_session=False)

        # Reset trainee outcome back to initial seeded state
        if t.id == "TRN-0001":
            t.outcome = "employed"
            t.salary = 14000
            t.trust_level = "high"
            t.employer = "Sanjeevani Hospital"
        else:
            t.outcome = "awaiting_confirmation"
            t.salary = 14000
            t.trust_level = "medium"

    db.commit()

    return {
        "success": True,
        "message": f"All data and records wiped from PC files and database for {phone}",
        "keys_cleared": keys_to_del
    }

@app.post("/api/reset-all")
def reset_all_data_api(db: Session = Depends(get_db)):
    """Reset all sessions and reseed database to fresh default state."""
    # 1. Clear whatsapp_sessions.json
    save_sessions({})

    # 2. Clear whatsapp_surveys.json
    try:
        with open(SURVEY_LOG_FILE, "w", encoding="utf-8") as f:
            json.dump([], f, indent=2)
    except Exception:
        pass

    # 3. Clear non-seeded Events and Checkins, reset trainees
    db.query(Event).filter(
        or_(
            Event.source.in_(["whatsapp_verified_survey", "whatsapp", "whatsapp_quarterly_checkin", "trainee", "user_direct_verified_selection"]),
            Event.id.like("EVT-WA%"),
            Event.id.like("EVT-DIR%"),
            Event.id.like("EVT-LIVE%"),
            ~Event.id.in_(["EVT-0001-1", "EVT-0001-2", "EVT-0001-3"])
        )
    ).delete(synchronize_session=False)

    db.query(Checkin).delete(synchronize_session=False)

    for t in db.query(Trainee).all():
        if t.id == "TRN-0001":
            t.outcome = "employed"
            t.salary = 14000
            t.trust_level = "high"
            t.employer = "Sanjeevani Hospital"
        else:
            t.outcome = "awaiting_confirmation"
            t.salary = 14000
            t.trust_level = "medium"

    db.commit()
    return {"success": True, "message": "All data on PC files and database reset"}

@app.post("/api/whatsapp/save-status")
def save_whatsapp_status_endpoint(payload: DirectRecordRequest, db: Session = Depends(get_db)):
    cleaned = clean_phone(payload.phone)
    sessions = load_sessions()
    now_iso = datetime.utcnow().isoformat()

    session = sessions.get(cleaned, {
        "phone": cleaned,
        "trainee_id": payload.trainee_id,
        "created_at": now_iso,
        "history": []
    })

    session["outcome"] = payload.outcome
    session["status"] = "COMPLETED"
    if payload.salary is not None:
        session["salary"] = str(payload.salary)
    session["updated_at"] = now_iso
    session["next_scheduled_date"] = (datetime.utcnow() + timedelta(days=90)).strftime("%d %b %Y")
    session["db_synced"] = True

    # Update Trainee in DB
    t = db.query(Trainee).filter(Trainee.id == payload.trainee_id).first()
    if t:
        if payload.outcome == "Unemployed":
            t.outcome = "not_working"
        elif payload.outcome == "Employed":
            t.outcome = "employed"
            if payload.salary:
                t.salary = int(payload.salary)
        elif payload.outcome == "Self-employed":
            t.outcome = "self_employed"
            if payload.salary:
                t.salary = int(payload.salary)

        t.trust_level = "high"
        today_str = datetime.utcnow().strftime("%Y-%m-%d")

        evt = Event(
            id=f"EVT-DIR-{datetime.utcnow().strftime('%M%S%f')[:6]}",
            trainee_id=t.id,
            date=today_str,
            what_happened="still_working" if payload.outcome != "Unemployed" else "unemployed",
            job_role=t.course,
            employer=t.employer or ("Self-employed" if payload.outcome == "Self-employed" else None),
            salary=t.salary,
            source="user_direct_verified_selection",
            trust_level="high"
        )
        db.add(evt)

        chk = Checkin(
            id=f"CHK-DIR-{datetime.utcnow().strftime('%M%S%f')[:6]}",
            trainee_id=t.id,
            date=today_str,
            source="user_direct_portal_selection",
            payload=json.dumps({
                "phone": cleaned,
                "outcome": payload.outcome,
                "salary": payload.salary,
                "direct_saved": True
            })
        )
        db.add(chk)
        db.commit()

    sessions[cleaned] = session
    save_sessions(sessions)
    append_survey_log(session)
    return session

# -------------------------------------------------------------------
# Sovereign AI Assistant with Auto-Analysis Engine
# -------------------------------------------------------------------
@app.post("/api/chat/ask")
def chat_ask_endpoint(payload: ChatRequest, db: Session = Depends(get_db)):
    result = analyze_and_respond(
        query=payload.query,
        role=payload.role or "client",
        user_id=payload.user_id,
        language=payload.language or "en",
        db=db
    )
    return result

# -------------------------------------------------------------------
# SANDBOX BANK VERIFICATION SYSTEM API (HACKATHON DEMO ONLY)
# -------------------------------------------------------------------

@app.get("/api/sandbox/users")
def get_sandbox_users_api(db: Session = Depends(get_db)):
    """Returns list of all synthetic users in the sandbox database."""
    users = db.query(SandboxUser).all()
    res = []
    for u in users:
        res.append({
            "user_id": u.user_id,
            "username": u.username,
            "name": u.name,
            "mobile": u.mobile,
            "course": u.course,
            "employment_status": u.employment_status,
            "bank_id": u.bank_id,
            "verification_status": u.verification_status,
            "created_at": u.created_at
        })
    return res

@app.get("/api/users/{user_id}")
def get_sandbox_user_api(user_id: str, db: Session = Depends(get_db)):
    """Retrieves a sandbox user profile along with linked bank reference."""
    user = db.query(SandboxUser).filter(SandboxUser.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found in Sandbox Database.")
    
    bank = None
    if user.bank_id:
        bank = db.query(SandboxBank).filter(SandboxBank.bank_id == user.bank_id).first()

    return {
        "user_id": user.user_id,
        "username": user.username,
        "name": user.name,
        "mobile": user.mobile,
        "course": user.course,
        "employment_status": user.employment_status,
        "bank_id": user.bank_id,
        "verification_status": user.verification_status,
        "bank_record": {
            "bank_id": bank.bank_id,
            "account_ref": bank.account_ref,
            "account_holder": bank.account_holder,
            "bank_name": bank.bank_name,
            "registered_mobile": bank.registered_mobile,
            "income_signal": bank.income_signal,
            "verification_state": bank.verification_state
        } if bank else None
    }

@app.get("/api/sandbox/banks")
def get_sandbox_banks_api(db: Session = Depends(get_db)):
    """Returns list of synthetic bank database records (masked references)."""
    banks = db.query(SandboxBank).all()
    res = []
    for b in banks:
        credits_dict = {}
        try:
            credits_dict = json.loads(b.monthly_credits or "{}")
        except Exception:
            pass
        res.append({
            "bank_id": b.bank_id,
            "account_ref": b.account_ref,
            "account_holder": b.account_holder,
            "registered_mobile": b.registered_mobile,
            "bank_name": b.bank_name,
            "monthly_credits": credits_dict,
            "income_signal": b.income_signal,
            "verification_state": b.verification_state,
            "updated_at": b.updated_at
        })
    return res

@app.get("/api/bank/{bank_id}")
def get_sandbox_bank_api(bank_id: str, db: Session = Depends(get_db)):
    """Retrieves specific synthetic bank record including transaction ledger."""
    bank = db.query(SandboxBank).filter(SandboxBank.bank_id == bank_id).first()
    if not bank:
        raise HTTPException(status_code=404, detail=f"Bank record '{bank_id}' not found in Sandbox Database.")
    
    credits_dict = {}
    transactions_list = []
    try:
        credits_dict = json.loads(bank.monthly_credits or "{}")
    except Exception:
        pass
    try:
        transactions_list = json.loads(bank.transactions or "[]")
    except Exception:
        pass

    return {
        "bank_id": bank.bank_id,
        "account_ref": bank.account_ref,
        "account_holder": bank.account_holder,
        "registered_mobile": bank.registered_mobile,
        "bank_name": bank.bank_name,
        "monthly_credits": credits_dict,
        "transactions": transactions_list,
        "income_signal": bank.income_signal,
        "verification_state": bank.verification_state,
        "updated_at": bank.updated_at,
        "is_synthetic": True,
        "disclaimer": "SYNTHETIC SANDBOX DATA — NOT REAL BANK DATA"
    }

@app.post("/api/verify/{user_id}")
def verify_sandbox_user_api(user_id: str, db: Session = Depends(get_db)):
    """
    Main Verification Sequence:
    Compares user profile with sandbox bank database, detects income pattern,
    enforces anti-mismatch & duplicate protection, appends to audit ledger,
    and returns authoritative verification status.
    """
    result = verify_sandbox_user(user_id=user_id, db=db)
    if not result.get("success", True):
        raise HTTPException(status_code=404, detail=result.get("error", "Verification failed."))
    return result

@app.get("/api/verification/{user_id}")
def get_user_verification_api(user_id: str, db: Session = Depends(get_db)):
    """Gets latest verification result or runs it automatically if not yet verified."""
    user = db.query(SandboxUser).filter(SandboxUser.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found.")
    
    # Check latest audit log
    latest_audit = db.query(SandboxAuditLog).filter(
        SandboxAuditLog.user_id == user_id
    ).order_by(SandboxAuditLog.id.desc()).first()

    if not latest_audit or user.verification_status == "UNVERIFIED":
        return verify_sandbox_user(user_id=user_id, db=db)

    bank = None
    if user.bank_id:
        bank = db.query(SandboxBank).filter(SandboxBank.bank_id == user.bank_id).first()

    from .sandbox_service import format_verification_response, analyze_income_pattern
    pattern = None
    if bank:
        try:
            pattern = analyze_income_pattern(json.loads(bank.monthly_credits or "{}"))
        except Exception:
            pass

    return format_verification_response(user, bank, pattern, latest_audit)

@app.get("/api/sandbox/audit-logs")
def get_sandbox_audit_logs_api(db: Session = Depends(get_db)):
    """Returns append-only audit events from the verification ledger."""
    logs = db.query(SandboxAuditLog).order_by(SandboxAuditLog.id.desc()).all()
    res = []
    for l in logs:
        details_obj = {}
        try:
            details_obj = json.loads(l.details or "{}")
        except Exception:
            pass
        res.append({
            "id": l.id,
            "user_id": l.user_id,
            "bank_id": l.bank_id,
            "timestamp": l.timestamp,
            "identity_match": l.identity_match,
            "mobile_match": l.mobile_match,
            "bank_owner_match": l.bank_owner_match,
            "income_signal": l.income_signal,
            "final_status": l.final_status,
            "details": details_obj
        })
    return res

@app.post("/api/sandbox/reset")
def reset_sandbox_api(db: Session = Depends(get_db)):
    """Restores the initial synthetic sandbox user & bank databases to pristine state."""
    seed_sandbox_data(db, force_reset=True)
    return {
        "success": True,
        "message": "Sandbox databases reset to initial synthetic dataset.",
        "user_count": db.query(SandboxUser).count(),
        "bank_count": db.query(SandboxBank).count()
    }

@app.post("/api/sandbox/seed")
def seed_sandbox_api(db: Session = Depends(get_db)):
    """Seeds synthetic demo data if not already present."""
    seed_sandbox_data(db, force_reset=False)
    return {
        "success": True,
        "message": "Sandbox demo data seeded.",
        "user_count": db.query(SandboxUser).count(),
        "bank_count": db.query(SandboxBank).count()
    }

@app.post("/api/sandbox/verify-all")
def verify_all_sandbox_users_api(db: Session = Depends(get_db)):
    """Executes verification for every synthetic user in the sandbox database."""
    users = db.query(SandboxUser).all()
    results = []
    for u in users:
        res = verify_sandbox_user(u.user_id, db)
        results.append(res)
    return {
        "success": True,
        "total_verified": len(results),
        "results": results
    }

@app.delete("/api/sandbox/audit-logs")
def clear_sandbox_audit_logs_api(db: Session = Depends(get_db)):
    """Clears verification audit logs."""
    db.query(SandboxAuditLog).delete()
    db.commit()
    return {"success": True, "message": "Sandbox verification logs cleared."}

@app.get("/")
def root():
    return {
        "service": "SkillTrace Sovereign Registry API",
        "status": "operational",
        "version": "v4.2.8-LTS",
        "portals": {
            "government": "National Analytics & Dispute Resolution",
            "employer": "Candidate Verification & 3-Month Retention Tracking",
            "client": "Digital Skill Passport & DPDPA Consent Control"
        }
    }

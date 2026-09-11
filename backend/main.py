import os
import json
import re
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, Depends, HTTPException, status, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_

from .database import engine, get_db, Base, SessionLocal
from .models import (
    User, Trainee, Event, Provider, Dispute, Consent, Checkin, Review,
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

GOOGLE_CLIENT_ID = "998932758436-8a4l4j9klve2n874gff2cpe621t16grd.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET = "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"
MASTER_GOV_EMAIL = "shlok.borad11@gmail.com"


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

@app.post("/auth/google", response_model=TokenResponse)
def google_auth(payload: GoogleAuthRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower() if payload.email else None
    name = payload.name.strip() if payload.name else None
    role = payload.role or "client"

    # If Google Identity Services JWT credential provided, parse payload claims
    if payload.credential:
        try:
            token_claims = jwt.decode(payload.credential, options={"verify_signature": False})
            if token_claims.get("email"):
                email = str(token_claims["email"]).strip().lower()
            if token_claims.get("name"):
                name = str(token_claims["name"]).strip()
        except Exception:
            pass

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid Google account email or credential is required for Google Sign-In."
        )

    if not name:
        name = email.split("@")[0].replace(".", " ").title()

    is_master = email == MASTER_GOV_EMAIL

    # Lookup or create user
    user = db.query(User).filter(User.email.ilike(email)).first()
    if not user:
        user_id = f"GGL-{datetime.utcnow().strftime('%M%S')}"
        assigned_role = "government" if is_master else role
        is_verified = True if is_master else False  # Direct logins for non-master are unverified
        designation = (
            "Master Government Officer & Sovereign Administrator"
            if is_master
            else "Pending Master Verification"
        )
        ministry = (
            "Ministry of Skill Development and Entrepreneurship"
            if is_master
            else None
        )
        company = "Sanjeevani Hospital" if (assigned_role == "employer" and is_verified) else None

        user = User(
            id=user_id,
            name=name,
            email=email,
            role=assigned_role,
            designation=designation,
            ministry=ministry,
            company_name=company,
            hashed_password=hash_password("google_oauth_verified"),
            verified=is_verified,
            last_login=datetime.utcnow().strftime("%Y-%m-%d %H:%M IST")
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.last_login = datetime.utcnow().strftime("%Y-%m-%d %H:%M IST")
        if is_master:
            user.role = "government"
            user.verified = True
            user.designation = "Master Government Officer & Sovereign Administrator"
            user.ministry = "Ministry of Skill Development and Entrepreneurship"
        db.commit()
        db.refresh(user)

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

    trainees = query.all()
    total = len(trainees)

    # Buckets
    buckets = {
        "employed": 0,
        "self_employed": 0,
        "apprentice": 0,
        "not_working": 0,
        "awaiting_confirmation": 0,
        "no_data": 0
    }
    tier_counts = {
        "high": 0,
        "medium": 0,
        "low": 0,
        "stale": 0
    }

    ever_placed = 0
    for t in trainees:
        outc = t.outcome or "awaiting_confirmation"
        if outc in buckets:
            buckets[outc] += 1
        else:
            buckets["awaiting_confirmation"] += 1

        t_lvl = t.trust_level or "medium"
        if t_lvl in tier_counts:
            tier_counts[t_lvl] += 1

        if t.placement_date or outc == "employed":
            ever_placed += 1

    headline_placement_pct = round((ever_placed / total * 100), 1) if total else 0.0

    outcomes_res = {}
    for b_key, b_count in buckets.items():
        pct = round((b_count / total * 100), 1) if total else 0.0
        outcomes_res[b_key] = {
            "count": b_count,
            "pct": pct,
            "evidence": {
                "high": 60 if b_key == "employed" else 20,
                "medium": 30 if b_key == "employed" else 50,
                "low": 10 if b_key == "employed" else 30,
                "stale": 0,
                "total": b_count
            }
        }

    # Retention
    retention_res = [
        {
            "checkpoint": "3 months",
            "months": 3,
            "pct": 79.4 if total else 0,
            "eligible": total,
            "retained": int(total * 0.794) if total else 0,
            "evidence": {"high": 65, "medium": 25, "low": 10, "stale": 0, "total": total}
        },
        {
            "checkpoint": "6 months",
            "months": 6,
            "pct": 72.1 if total else 0,
            "eligible": total,
            "retained": int(total * 0.721) if total else 0,
            "evidence": {"high": 58, "medium": 30, "low": 12, "stale": 0, "total": total}
        },
        {
            "checkpoint": "12 months",
            "months": 12,
            "pct": 66.8 if total else 0,
            "eligible": total,
            "retained": int(total * 0.668) if total else 0,
            "evidence": {"high": 50, "medium": 35, "low": 15, "stale": 0, "total": total}
        },
    ]

    wage_progression = [
        {"months": 0, "label": "At placement", "2025-Q1": 14500, "2025-Q2": 15200, "2025-Q3": 15800},
        {"months": 3, "label": "3 mo", "2025-Q1": 15600, "2025-Q2": 16100, "2025-Q3": 16700},
        {"months": 6, "label": "6 mo", "2025-Q1": 17200, "2025-Q2": 17800, "2025-Q3": None},
        {"months": 12, "label": "12 mo", "2025-Q1": 19400, "2025-Q2": None, "2025-Q3": None},
    ]

    total_consents = db.query(Consent).count()
    granted_consents = db.query(Consent).filter(Consent.granted == True).count()

    return {
        "as_of": "2026-09-10",
        "filters_applied": {"cohort": cohort, "course": course, "provider": provider, "district": district},
        "total_trainees": total,
        "headline_placement_pct": headline_placement_pct,
        "headline_placement_count": ever_placed,
        "outcomes": outcomes_res,
        "retention": retention_res,
        "wage_progression": wage_progression,
        "wage_evidence": {"high": 60, "medium": 30, "low": 10, "stale": 0, "total": total},
        "cohorts_present": ["2025-Q1", "2025-Q2", "2025-Q3", "2025-Q4"],
        "evidence_totals": {
            "high": 55, "medium": 32, "low": 13, "stale": 0, "total": total
        },
        "consent": {
            "total": total_consents,
            "active": granted_consents,
            "withdrawn": total_consents - granted_consents
        }
    }

# -------------------------------------------------------------------
# Providers & Skill Gap
# -------------------------------------------------------------------
@app.get("/providers")
def get_providers(
    district: Optional[str] = None,
    db: Session = Depends(get_db)
):
    q = db.query(Provider)
    if district:
        q = q.filter(Provider.district == district)
    return q.all()

@app.get("/providers/{provider_id}")
def get_provider_detail(provider_id: str, db: Session = Depends(get_db)):
    """One training centre, with the per-course breakdown the detail page shows."""
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Training centre not found.")

    trainees = db.query(Trainee).filter(Trainee.provider_id == provider_id).all()
    ids = [t.id for t in trainees]
    events = db.query(Event).filter(Event.trainee_id.in_(ids)).all() if ids else []

    placed = {e.trainee_id for e in events if e.what_happened == "placed"}
    retained = {e.trainee_id for e in events if e.what_happened == "still_working"}
    high = {e.trainee_id for e in events if e.trust_level == "high"}

    by_course: Dict[str, Dict[str, Any]] = {}
    for t in trainees:
        slot = by_course.setdefault(t.course, {"course": t.course, "certified": 0, "employed": 0})
        slot["certified"] += 1
        if t.id in retained:
            slot["employed"] += 1

    total = len(trainees) or 1
    return {
        "id": provider.id,
        "name": provider.name,
        "district": provider.district,
        "certified_count": len(trainees),
        "headline_placement_pct": round(len(placed) / total * 100, 1),
        "verified_employment_pct": round(len(retained) / total * 100, 1),
        "proof_gap": round((len(placed) - len(retained)) / total * 100, 1),
        "independently_verified_pct": round(len(high) / total * 100, 1),
        "courses": list(by_course.values()),
    }


@app.get("/attention")
def get_attention(db: Session = Depends(get_db)):
    """
    Ranked findings an officer can act on.

    Computed from the same rows the dashboard counts, so the panel and the
    headline can never disagree — which they did while this was served from
    the browser's own seed data.
    """
    trainees = db.query(Trainee).all()
    events = db.query(Event).all()
    disputes = db.query(Dispute).all()

    retained = {e.trainee_id for e in events if e.what_happened == "still_working"}
    placed = {e.trainee_id for e in events if e.what_happened == "placed"}
    self_reported = {e.trainee_id for e in events if e.trust_level == "low"}

    findings: List[Dict[str, Any]] = []

    unproven = placed - retained
    if unproven:
        findings.append({
            "kind": "unverified_outcomes",
            "count": len(unproven),
            "severity": "high" if len(unproven) > len(placed) / 2 else "medium",
        })

    if self_reported:
        findings.append({
            "kind": "self_reported",
            "count": len(self_reported),
            "severity": "medium",
        })

    unassigned = [d for d in disputes if d.status != "resolved"]
    if unassigned:
        findings.append({
            "kind": "open_disputes",
            "count": len(unassigned),
            "severity": "high",
        })

    mismatched = [
        e for e in events
        if e.what_happened in ("placed", "still_working")
        and e.job_role
        and next((t.course for t in trainees if t.id == e.trainee_id), None)
        not in (None, e.job_role)
    ]
    if mismatched:
        findings.append({
            "kind": "role_mismatch",
            "count": len({e.trainee_id for e in mismatched}),
            "severity": "medium",
        })

    order = {"high": 0, "medium": 1, "low": 2}
    findings.sort(key=lambda f: (order.get(f["severity"], 3), -f["count"]))
    return findings


@app.get("/audit")
def get_audit(
    source: Optional[str] = None,
    limit: int = Query(150, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """The outcome ledger: every event, newest first, never edited in place."""
    q = db.query(Event)
    if source:
        q = q.filter(Event.source == source)
    rows = q.order_by(Event.date.desc()).limit(limit).all()
    return {
        "event_count": db.query(Event).count(),
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
    district: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return [
        {
            "course": "Healthcare Assistant",
            "trained": 420,
            "aligned_placements": 330,
            "drift_placements": 45,
            "alignment_rate": 78.5,
            "unmet_demand": 120,
            "primary_drift_role": "Hospital Front Desk Receptionist",
            "status": "high_demand"
        },
        {
            "course": "CNC Operator",
            "trained": 380,
            "aligned_placements": 290,
            "drift_placements": 50,
            "alignment_rate": 76.3,
            "unmet_demand": 85,
            "primary_drift_role": "Assembly Line Helper",
            "status": "balanced"
        },
        {
            "course": "Solar Technician",
            "trained": 290,
            "aligned_placements": 210,
            "drift_placements": 40,
            "alignment_rate": 72.4,
            "unmet_demand": 95,
            "primary_drift_role": "Domestic Electrician",
            "status": "growing"
        },
        {
            "course": "Python Development",
            "trained": 240,
            "aligned_placements": 195,
            "drift_placements": 25,
            "alignment_rate": 81.2,
            "unmet_demand": 60,
            "primary_drift_role": "IT Support Executive",
            "status": "high_demand"
        },
    ]

# -------------------------------------------------------------------
# Trainees (Role-Restricted DPDPA 2023 Compliant)
# -------------------------------------------------------------------
@app.get("/trainees")
def get_trainees(
    cohort: Optional[str] = None,
    course: Optional[str] = None,
    district: Optional[str] = None,
    search: Optional[str] = None,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
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

    results = q.all()
    out = []
    for t in results:
        evs = db.query(Event).filter(Event.trainee_id == t.id).all()
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
        "reviews": [{"id": r.id, "overall_quality": r.overall_quality, "feedback": r.feedback} for r in reviews]
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
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    disputes = db.query(Dispute).all()
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

    r.overall_quality = body.get("overall_quality", 4.0)
    r.job_usefulness = body.get("job_usefulness", 4.0)
    r.trainer_score = body.get("trainer_score", 4.0)
    r.skill_confidence = body.get("skill_confidence", 4.0)
    r.would_recommend = body.get("would_recommend", 4.0)
    r.feedback = body.get("feedback", "")
    db.commit()
    return {"status": "success", "review_id": r.id}

@app.get("/reviews/insights")
def get_review_insights(
    provider: Optional[str] = None,
    course: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return {
        "average_rating": 4.4,
        "total_reviews": 128,
        "job_readiness_score": 88.5,
        "curriculum_relevance": 91.2,
        "recommend_rate": 86.0,
        "top_rated_skills": ["Surgical tray preparation", "Biomedical sanitation", "Patient triage"],
        "areas_for_improvement": ["Advanced EHR software hands-on time"]
    }

# -------------------------------------------------------------------
# Consent Management (DPDPA 2023)
# -------------------------------------------------------------------
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

@app.get("/followup-queue")
def get_followup_queue(db: Session = Depends(get_db)):
    return [
        {
            "trainee_id": "TRN-0004",
            "name": "Suresh Shinde",
            "phone": "+91 98111 22334",
            "course": "Solar Technician",
            "district": "Thane",
            "provider_id": "PRV-001",
            "reason": "Milestone due (day 88) — awaiting second verification",
            "due_date": "2026-09-12",
            "priority": "high",
            "assigned_officer": "Rajesh Patel"
        },
        {
            "trainee_id": "TRN-0006",
            "name": "Amit Jadhav",
            "phone": "+91 98777 88990",
            "course": "Automobile Technician",
            "district": "Pune",
            "provider_id": "PRV-003",
            "reason": "Wage mismatch flagged during employer checkin",
            "due_date": "2026-09-15",
            "priority": "medium",
            "assigned_officer": "Sunita Kulkarni"
        }
    ]

# -------------------------------------------------------------------
# WhatsApp Automated 3-Month Status Surveys (Whapi.cloud)
# -------------------------------------------------------------------
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

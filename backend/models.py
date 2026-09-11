from sqlalchemy import Column, String, Integer, Float, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    phone = Column(String, unique=True, index=True, nullable=True)
    role = Column(String, nullable=False)  # 'government' | 'client' | 'employer'
    designation = Column(String, nullable=True)
    ministry = Column(String, nullable=True)
    company_name = Column(String, nullable=True)  # For employers
    hashed_password = Column(String, nullable=True)
    verified = Column(Boolean, default=True)
    last_login = Column(String, nullable=True)

class Trainee(Base):
    __tablename__ = "trainees"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    course = Column(String, nullable=False)
    district = Column(String, nullable=False)
    gender = Column(String, nullable=False)
    age_group = Column(String, nullable=False)
    category = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    cohort = Column(String, nullable=False)
    provider_id = Column(String, nullable=False)
    employer = Column(String, nullable=True)
    salary = Column(Integer, nullable=True)
    outcome = Column(String, default="awaiting_confirmation")
    trust_level = Column(String, default="low")
    certification_date = Column(String, nullable=True)
    placement_date = Column(String, nullable=True)

    events = relationship("Event", back_populates="trainee", cascade="all, delete-orphan")

class Event(Base):
    __tablename__ = "events"

    id = Column(String, primary_key=True, index=True)
    trainee_id = Column(String, ForeignKey("trainees.id"), nullable=False)
    date = Column(String, nullable=False)
    what_happened = Column(String, nullable=False)
    job_role = Column(String, nullable=True)
    employer = Column(String, nullable=True)
    salary = Column(Integer, nullable=True)
    source = Column(String, nullable=False)
    trust_level = Column(String, nullable=False)

    trainee = relationship("Trainee", back_populates="events")

class Provider(Base):
    __tablename__ = "providers"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    district = Column(String, nullable=False)
    certified_count = Column(Integer, default=0)
    verified_placement_pct = Column(Float, default=0.0)
    retention_3mo = Column(Float, default=0.0)
    retention_6mo = Column(Float, default=0.0)
    retention_12mo = Column(Float, default=0.0)

class Dispute(Base):
    __tablename__ = "disputes"

    id = Column(String, primary_key=True, index=True)
    trainee_id = Column(String, nullable=False)
    employer_claim = Column(String, nullable=False)
    trainee_claim = Column(String, nullable=False)
    date = Column(String, nullable=False)
    status = Column(String, default="open")  # 'open' | 'resolved' | 'escalated'
    assigned_officer = Column(String, nullable=True)

class Consent(Base):
    __tablename__ = "consents"

    id = Column(String, primary_key=True, index=True)
    trainee_id = Column(String, nullable=False)
    purpose = Column(String, nullable=False)
    granted = Column(Boolean, default=True)
    date = Column(String, nullable=False)

class Checkin(Base):
    __tablename__ = "checkins"

    id = Column(String, primary_key=True, index=True)
    trainee_id = Column(String, nullable=False)
    date = Column(String, nullable=False)
    source = Column(String, nullable=False)
    payload = Column(Text, nullable=True)

class Review(Base):
    __tablename__ = "reviews"

    id = Column(String, primary_key=True, index=True)
    trainee_id = Column(String, nullable=False)
    overall_quality = Column(Float, default=3.0)
    job_usefulness = Column(Float, default=3.0)
    trainer_score = Column(Float, default=3.0)
    skill_confidence = Column(Float, default=3.0)
    would_recommend = Column(Float, default=3.0)
    feedback = Column(Text, nullable=True)
    submitted_at = Column(String, nullable=True)
    district = Column(String, nullable=True)
    provider_id = Column(String, nullable=True)
    course = Column(String, nullable=True)

# -------------------------------------------------------------
# SYNTHETIC SANDBOX BANK VERIFICATION MODELS (DEMO ONLY)
# -------------------------------------------------------------

class SandboxUser(Base):
    __tablename__ = "sandbox_users"

    user_id = Column(String, primary_key=True, index=True)  # e.g. USER-10001
    username = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    mobile = Column(String, nullable=False)
    course = Column(String, nullable=False)
    employment_status = Column(String, default="Employed")  # Employed | Self-employed | Unemployed
    bank_id = Column(String, index=True, nullable=True)     # e.g. BANK-50001
    verification_status = Column(String, default="UNVERIFIED")  # VERIFIED | PARTIALLY VERIFIED | VERIFICATION FAILED | UNVERIFIED
    created_at = Column(String, nullable=True)

class SandboxBank(Base):
    __tablename__ = "sandbox_banks"

    bank_id = Column(String, primary_key=True, index=True)  # e.g. BANK-50001
    account_ref = Column(String, nullable=False)            # Masked account e.g. HDFC-XXXX-7821
    account_holder = Column(String, nullable=False)         # e.g. Rahul Sharma
    registered_mobile = Column(String, nullable=False)      # e.g. +91-9000000001
    bank_name = Column(String, default="State Bank of India")
    monthly_credits = Column(Text, nullable=True)           # JSON e.g. {"June": 6000, "July": 6000, "August": 6000}
    transactions = Column(Text, nullable=True)              # JSON array of transaction objects
    income_signal = Column(String, default="NONE")          # POSITIVE | INSUFFICIENT | STABLE_MONTHLY | INCREASING | DECREASING | STOPPED | NONE
    verification_state = Column(String, default="UNVERIFIED") # VERIFIED | UNVERIFIED | FLAGGED
    updated_at = Column(String, nullable=True)

class SandboxAuditLog(Base):
    __tablename__ = "sandbox_audit_logs"

    id = Column(String, primary_key=True, index=True)       # e.g. VER-900001
    user_id = Column(String, index=True, nullable=False)
    bank_id = Column(String, index=True, nullable=True)
    timestamp = Column(String, nullable=False)
    identity_match = Column(String, default="FAIL")         # PASS | FAIL
    mobile_match = Column(String, default="FAIL")           # PASS | FAIL
    bank_owner_match = Column(String, default="FAIL")       # PASS | FAIL
    income_signal = Column(String, default="NONE")          # PASS | FAIL | INSUFFICIENT
    final_status = Column(String, nullable=False)           # VERIFIED | PARTIALLY VERIFIED | VERIFICATION FAILED | UNVERIFIED
    details = Column(Text, nullable=True)                   # JSON summary of all validation checks & reasons



# ---- Entities from the source spreadsheets ---------------------------
# organized_data.json was derived from these and dropped them. They are
# loaded alongside it so a trainee's record carries what they scored, how
# much of the course they attended, and every follow-up contact made.

class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(String, primary_key=True, index=True)
    trainee_id = Column(String, ForeignKey("trainees.id"), nullable=False, index=True)
    technical_score = Column(Integer, nullable=True)
    soft_skill_score = Column(Integer, nullable=True)
    result = Column(String, nullable=True)        # Excellent | Good | Average | Poor
    skill_level = Column(String, nullable=True)   # Beginner | Intermediate | Advanced
    certified = Column(Boolean, default=False)


class Enrolment(Base):
    __tablename__ = "enrolments"

    id = Column(String, primary_key=True, index=True)
    trainee_id = Column(String, ForeignKey("trainees.id"), nullable=False, index=True)
    programme = Column(String, nullable=True)
    provider = Column(String, nullable=True)
    start_date = Column(String, nullable=True)
    completion_date = Column(String, nullable=True)
    attendance_pct = Column(Float, nullable=True)
    completion_status = Column(String, nullable=True)  # Completed | Dropped | Ongoing


class Employer(Base):
    __tablename__ = "employers"

    id = Column(String, primary_key=True, index=True)
    company_name = Column(String, nullable=False)
    industry = Column(String, nullable=True)
    district = Column(String, nullable=True)
    company_size = Column(String, nullable=True)
    verified = Column(Boolean, default=False)


class FollowupContact(Base):
    """One contact made with a trainee after training — the outreach history
    behind the follow-up queue, 43,405 rows across the cohort."""
    __tablename__ = "followup_contacts"

    id = Column(String, primary_key=True, index=True)
    trainee_id = Column(String, ForeignKey("trainees.id"), nullable=False, index=True)
    date = Column(String, nullable=True)
    months_after_training = Column(Integer, nullable=True)
    contacted = Column(Boolean, default=False)
    status = Column(String, nullable=True)
    monthly_income = Column(Integer, nullable=True)
    job_satisfaction = Column(Integer, nullable=True)     # 1-5
    training_relevance = Column(Integer, nullable=True)   # 1-5
    skill_gap_identified = Column(String, nullable=True)
    reason_for_attrition = Column(String, nullable=True)


class ClientRequest(Base):
    __tablename__ = "client_requests"

    id = Column(String, primary_key=True, index=True)
    trainee_id = Column(String, nullable=False, index=True)
    name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    course = Column(String, nullable=True)
    district = Column(String, nullable=True)
    provider_id = Column(String, nullable=True)
    cohort = Column(String, nullable=True)
    request_type = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    channel = Column(String, default="Trainee Portal Request")
    created_at = Column(String, nullable=True)
    assigned_to = Column(String, nullable=True)
    assigned_at = Column(String, nullable=True)
    status = Column(String, default="pending")


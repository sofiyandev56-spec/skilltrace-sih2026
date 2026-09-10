"""
SkillTrace - Sandbox Bank Verification System (Service Engine)
HACKATHON DEMONSTRATION ONLY: Uses exclusively synthetic sandbox data.
No real bank accounts, real passwords, or live financial networks are accessed.
"""

import json
import re
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from .models import SandboxUser, SandboxBank, SandboxAuditLog
from .whatsapp_service import clean_phone

# -------------------------------------------------------------
# SYNTHETIC BASE DATASET (16 DIVERSE TEST CASES)
# -------------------------------------------------------------

INITIAL_SANDBOX_USERS = [
    {
        "user_id": "USER-10001",
        "username": "Rahul_01",
        "name": "Rahul Sharma",
        "mobile": "+91-9000000001",
        "course": "Healthcare Assistant",
        "employment_status": "Employed",
        "bank_id": "BANK-50001",
        "verification_status": "UNVERIFIED"
    },
    {
        "user_id": "USER-10002",
        "username": "Priya_02",
        "name": "Priya Patel",
        "mobile": "+91-9000000002",
        "course": "Solar Technician",
        "employment_status": "Employed",
        "bank_id": "BANK-50002",
        "verification_status": "UNVERIFIED"
    },
    {
        "user_id": "USER-10003",
        "username": "Amit_03",
        "name": "Amit Kumar",
        "mobile": "+91-9000000003",
        "course": "Data Entry Operator",
        "employment_status": "Employed",
        "bank_id": "BANK-50099",  # Deliberate test: Bank Not Found
        "verification_status": "UNVERIFIED"
    },
    {
        "user_id": "USER-10004",
        "username": "Sneha_04",
        "name": "Sneha Deshmukh",
        "mobile": "+91-9000000004",
        "course": "General Duty Assistant",
        "employment_status": "Employed",
        "bank_id": "BANK-50002",  # Deliberate test: Duplicate Bank ID & Owner Mismatch (belongs to Priya Patel)
        "verification_status": "UNVERIFIED"
    },
    {
        "user_id": "USER-10005",
        "username": "Vikas_05",
        "name": "Vikas Jadhav",
        "mobile": "+91-9000000005",
        "course": "Automobile Technician",
        "employment_status": "Employed",
        "bank_id": "BANK-50005",
        "verification_status": "UNVERIFIED"
    },
    {
        "user_id": "USER-10006",
        "username": "Pooja_06",
        "name": "Pooja Kulkarni",
        "mobile": "+91-9000000006",
        "course": "Drone Operator",
        "employment_status": "Employed",
        "bank_id": "BANK-50006",  # Deliberate test: Single isolated transaction -> INSUFFICIENT
        "verification_status": "UNVERIFIED"
    },
    {
        "user_id": "USER-10007",
        "username": "Anand_07",
        "name": "Anand Shinde",
        "mobile": "+91-9000000007",
        "course": "Healthcare Assistant",
        "employment_status": "Employed",
        "bank_id": "BANK-50007",  # Deliberate test: Increasing income pattern
        "verification_status": "UNVERIFIED"
    },
    {
        "user_id": "USER-10008",
        "username": "Meera_08",
        "name": "Meera Rane",
        "mobile": "+91-9000000008",
        "course": "Data Entry Operator",
        "employment_status": "Employed",
        "bank_id": "BANK-50008",  # Deliberate test: Income stopped
        "verification_status": "UNVERIFIED"
    },
    {
        "user_id": "USER-10009",
        "username": "Kavita_09",
        "name": "Kavita Joshi",
        "mobile": "+91-9000000009",
        "course": "Solar Technician",
        "employment_status": "Employed",
        "bank_id": "BANK-50009",  # Deliberate test: Mobile mismatch
        "verification_status": "UNVERIFIED"
    },
    {
        "user_id": "USER-10010",
        "username": "Deepak_10",
        "name": "Deepak Gaikwad",
        "mobile": "+91-9000000010",
        "course": "Automobile Technician",
        "employment_status": "Unemployed",
        "bank_id": "BANK-50010",  # Deliberate test: Zero credits / No pattern
        "verification_status": "UNVERIFIED"
    },
    {
        "user_id": "USER-10011",
        "username": "Rohan_11",
        "name": "Rohan Verma",
        "mobile": "+91-9000000011",
        "course": "Solar Technician",
        "employment_status": "Employed",
        "bank_id": "BANK-50011",
        "verification_status": "UNVERIFIED"
    },
    {
        "user_id": "USER-10012",
        "username": "Aarti_12",
        "name": "Aarti Patil",
        "mobile": "+91-9000000012",
        "course": "Healthcare Assistant",
        "employment_status": "Employed",
        "bank_id": "BANK-50012",
        "verification_status": "UNVERIFIED"
    },
    {
        "user_id": "USER-10013",
        "username": "Suresh_13",
        "name": "Suresh Mane",
        "mobile": "+91-9000000013",
        "course": "Drone Operator",
        "employment_status": "Self-employed",
        "bank_id": "BANK-50013",
        "verification_status": "UNVERIFIED"
    },
    {
        "user_id": "USER-10014",
        "username": "Divya_14",
        "name": "Divya Nair",
        "mobile": "+91-9000000014",
        "course": "General Duty Assistant",
        "employment_status": "Employed",
        "bank_id": "BANK-50014",
        "verification_status": "UNVERIFIED"
    },
    {
        "user_id": "USER-10015",
        "username": "Manish_15",
        "name": "Manish Chouhan",
        "mobile": "+91-9000000015",
        "course": "Automobile Technician",
        "employment_status": "Employed",
        "bank_id": "BANK-50015",
        "verification_status": "UNVERIFIED"
    },
    {
        "user_id": "USER-10016",
        "username": "Swati_16",
        "name": "Swati Bhosale",
        "mobile": "+91-9000000016",
        "course": "Data Entry Operator",
        "employment_status": "Employed",
        "bank_id": "BANK-50016",
        "verification_status": "UNVERIFIED"
    }
]

INITIAL_SANDBOX_BANKS = [
    {
        "bank_id": "BANK-50001",
        "account_ref": "SBI-XXXX-4412",
        "account_holder": "Rahul Sharma",
        "registered_mobile": "+91-9000000001",
        "bank_name": "State Bank of India",
        "monthly_credits": {"June": 6000, "July": 6000, "August": 6000},
        "transactions": [
            {"date": "2026-06-30", "amount": 6000, "type": "CREDIT", "narration": "NEFT: Sanjeevani Healthcare Salary Jun"},
            {"date": "2026-07-31", "amount": 6000, "type": "CREDIT", "narration": "NEFT: Sanjeevani Healthcare Salary Jul"},
            {"date": "2026-08-31", "amount": 6000, "type": "CREDIT", "narration": "NEFT: Sanjeevani Healthcare Salary Aug"}
        ],
        "income_signal": "POSITIVE",
        "verification_state": "VERIFIED"
    },
    {
        "bank_id": "BANK-50002",
        "account_ref": "HDFC-XXXX-7821",
        "account_holder": "Priya Patel",
        "registered_mobile": "+91-9000000002",
        "bank_name": "HDFC Bank",
        "monthly_credits": {"June": 8500, "July": 8500, "August": 9000},
        "transactions": [
            {"date": "2026-06-30", "amount": 8500, "type": "CREDIT", "narration": "ACH: Surya Solar Corp Monthly Payroll"},
            {"date": "2026-07-31", "amount": 8500, "type": "CREDIT", "narration": "ACH: Surya Solar Corp Monthly Payroll"},
            {"date": "2026-08-31", "amount": 9000, "type": "CREDIT", "narration": "ACH: Surya Solar Corp Monthly Payroll"}
        ],
        "income_signal": "POSITIVE",
        "verification_state": "VERIFIED"
    },
    {
        "bank_id": "BANK-50005",
        "account_ref": "ICICI-XXXX-9901",
        "account_holder": "Vikas Jadhav",
        "registered_mobile": "+91-9000000005",
        "bank_name": "ICICI Bank",
        "monthly_credits": {"June": 15000, "July": 15000, "August": 15000},
        "transactions": [
            {"date": "2026-06-29", "amount": 15000, "type": "CREDIT", "narration": "SALARY: Tata Motors Auto Service Center"},
            {"date": "2026-07-30", "amount": 15000, "type": "CREDIT", "narration": "SALARY: Tata Motors Auto Service Center"},
            {"date": "2026-08-30", "amount": 15000, "type": "CREDIT", "narration": "SALARY: Tata Motors Auto Service Center"}
        ],
        "income_signal": "POSITIVE",
        "verification_state": "VERIFIED"
    },
    {
        "bank_id": "BANK-50006",
        "account_ref": "PNB-XXXX-1123",
        "account_holder": "Pooja Kulkarni",
        "registered_mobile": "+91-9000000006",
        "bank_name": "Punjab National Bank",
        "monthly_credits": {"June": 10000, "July": 0, "August": 0},
        "transactions": [
            {"date": "2026-06-15", "amount": 10000, "type": "CREDIT", "narration": "UPI: Isolated Personal Transfer - Not Salary"}
        ],
        "income_signal": "INSUFFICIENT",
        "verification_state": "FLAGGED"
    },
    {
        "bank_id": "BANK-50007",
        "account_ref": "AXIS-XXXX-3342",
        "account_holder": "Anand Shinde",
        "registered_mobile": "+91-9000000007",
        "bank_name": "Axis Bank",
        "monthly_credits": {"June": 8000, "July": 10000, "August": 12500},
        "transactions": [
            {"date": "2026-06-30", "amount": 8000, "type": "CREDIT", "narration": "PAYROLL: Metro Care Clinic"},
            {"date": "2026-07-31", "amount": 10000, "type": "CREDIT", "narration": "PAYROLL: Metro Care Clinic + Incentive"},
            {"date": "2026-08-31", "amount": 12500, "type": "CREDIT", "narration": "PAYROLL: Metro Care Clinic Full Time"}
        ],
        "income_signal": "POSITIVE",
        "verification_state": "VERIFIED"
    },
    {
        "bank_id": "BANK-50008",
        "account_ref": "BOB-XXXX-5561",
        "account_holder": "Meera Rane",
        "registered_mobile": "+91-9000000008",
        "bank_name": "Bank of Baroda",
        "monthly_credits": {"June": 7500, "July": 7500, "August": 0},
        "transactions": [
            {"date": "2026-06-30", "amount": 7500, "type": "CREDIT", "narration": "NEFT: Infotech BPO Data Operations"},
            {"date": "2026-07-31", "amount": 7500, "type": "CREDIT", "narration": "NEFT: Infotech BPO Data Operations"}
        ],
        "income_signal": "STOPPED",
        "verification_state": "FLAGGED"
    },
    {
        "bank_id": "BANK-50009",
        "account_ref": "CAN-XXXX-8829",
        "account_holder": "Kavita Joshi",
        "registered_mobile": "+91-9000000099",  # Deliberate test: Registered mobile differs from user's
        "bank_name": "Canara Bank",
        "monthly_credits": {"June": 11000, "July": 11000, "August": 11000},
        "transactions": [
            {"date": "2026-06-30", "amount": 11000, "type": "CREDIT", "narration": "DIRECT CREDIT: Urja Green Solutions"},
            {"date": "2026-07-31", "amount": 11000, "type": "CREDIT", "narration": "DIRECT CREDIT: Urja Green Solutions"},
            {"date": "2026-08-31", "amount": 11000, "type": "CREDIT", "narration": "DIRECT CREDIT: Urja Green Solutions"}
        ],
        "income_signal": "POSITIVE",
        "verification_state": "FLAGGED"
    },
    {
        "bank_id": "BANK-50010",
        "account_ref": "KOTAK-XXXX-0012",
        "account_holder": "Deepak Gaikwad",
        "registered_mobile": "+91-9000000010",
        "bank_name": "Kotak Mahindra Bank",
        "monthly_credits": {"June": 0, "July": 0, "August": 0},
        "transactions": [],
        "income_signal": "NONE",
        "verification_state": "UNVERIFIED"
    },
    {
        "bank_id": "BANK-50011",
        "account_ref": "SBI-XXXX-6677",
        "account_holder": "Rohan Verma",
        "registered_mobile": "+91-9000000011",
        "bank_name": "State Bank of India",
        "monthly_credits": {"June": 18000, "July": 18000, "August": 18000},
        "transactions": [
            {"date": "2026-06-30", "amount": 18000, "type": "CREDIT", "narration": "SALARY: Solar Infra Power Tech"},
            {"date": "2026-07-31", "amount": 18000, "type": "CREDIT", "narration": "SALARY: Solar Infra Power Tech"},
            {"date": "2026-08-31", "amount": 18000, "type": "CREDIT", "narration": "SALARY: Solar Infra Power Tech"}
        ],
        "income_signal": "POSITIVE",
        "verification_state": "VERIFIED"
    },
    {
        "bank_id": "BANK-50012",
        "account_ref": "HDFC-XXXX-2234",
        "account_holder": "Aarti Patil",
        "registered_mobile": "+91-9000000012",
        "bank_name": "HDFC Bank",
        "monthly_credits": {"June": 28500, "July": 28500, "August": 28500},
        "transactions": [
            {"date": "2026-06-30", "amount": 28500, "type": "CREDIT", "narration": "PAYROLL CREDIT: Sanjeevani Hospital Nashik"},
            {"date": "2026-07-31", "amount": 28500, "type": "CREDIT", "narration": "PAYROLL CREDIT: Sanjeevani Hospital Nashik"},
            {"date": "2026-08-31", "amount": 28500, "type": "CREDIT", "narration": "PAYROLL CREDIT: Sanjeevani Hospital Nashik"}
        ],
        "income_signal": "POSITIVE",
        "verification_state": "VERIFIED"
    },
    {
        "bank_id": "BANK-50013",
        "account_ref": "ICICI-XXXX-7788",
        "account_holder": "Suresh Mane",
        "registered_mobile": "+91-9000000013",
        "bank_name": "ICICI Bank",
        "monthly_credits": {"June": 21000, "July": 23500, "August": 22000},
        "transactions": [
            {"date": "2026-06-28", "amount": 21000, "type": "CREDIT", "narration": "UPI: Drone Survey Enterprise Receipts"},
            {"date": "2026-07-29", "amount": 23500, "type": "CREDIT", "narration": "UPI: Drone Survey Enterprise Receipts"},
            {"date": "2026-08-28", "amount": 22000, "type": "CREDIT", "narration": "UPI: Drone Survey Enterprise Receipts"}
        ],
        "income_signal": "POSITIVE",
        "verification_state": "VERIFIED"
    },
    {
        "bank_id": "BANK-50014",
        "account_ref": "AXIS-XXXX-9933",
        "account_holder": "Divya Nair",
        "registered_mobile": "+91-9000000014",
        "bank_name": "Axis Bank",
        "monthly_credits": {"June": 13500, "July": 13500, "August": 13500},
        "transactions": [
            {"date": "2026-06-30", "amount": 13500, "type": "CREDIT", "narration": "ACH: LifeCare Health Foundation"},
            {"date": "2026-07-31", "amount": 13500, "type": "CREDIT", "narration": "ACH: LifeCare Health Foundation"},
            {"date": "2026-08-31", "amount": 13500, "type": "CREDIT", "narration": "ACH: LifeCare Health Foundation"}
        ],
        "income_signal": "POSITIVE",
        "verification_state": "VERIFIED"
    },
    {
        "bank_id": "BANK-50015",
        "account_ref": "SBI-XXXX-5544",
        "account_holder": "Manish Chouhan",
        "registered_mobile": "+91-9000000015",
        "bank_name": "State Bank of India",
        "monthly_credits": {"June": 16000, "July": 16000, "August": 16000},
        "transactions": [
            {"date": "2026-06-30", "amount": 16000, "type": "CREDIT", "narration": "NEFT: AutoTech Workshop Pune"},
            {"date": "2026-07-31", "amount": 16000, "type": "CREDIT", "narration": "NEFT: AutoTech Workshop Pune"},
            {"date": "2026-08-31", "amount": 16000, "type": "CREDIT", "narration": "NEFT: AutoTech Workshop Pune"}
        ],
        "income_signal": "POSITIVE",
        "verification_state": "VERIFIED"
    },
    {
        "bank_id": "BANK-50016",
        "account_ref": "BOB-XXXX-8811",
        "account_holder": "Swati Bhosale",
        "registered_mobile": "+91-9000000016",
        "bank_name": "Bank of Baroda",
        "monthly_credits": {"June": 14500, "July": 14500, "August": 14500},
        "transactions": [
            {"date": "2026-06-30", "amount": 14500, "type": "CREDIT", "narration": "SALARY: DigiServices Corp"},
            {"date": "2026-07-31", "amount": 14500, "type": "CREDIT", "narration": "SALARY: DigiServices Corp"},
            {"date": "2026-08-31", "amount": 14500, "type": "CREDIT", "narration": "SALARY: DigiServices Corp"}
        ],
        "income_signal": "POSITIVE",
        "verification_state": "VERIFIED"
    }
]

# -------------------------------------------------------------
# SEED & RESET MANAGEMENT
# -------------------------------------------------------------

def seed_sandbox_data(db: Session, force_reset: bool = False):
    """
    Populates the database with initial synthetic sandbox users and bank records.
    If force_reset is True, deletes existing sandbox records and re-creates them cleanly.
    """
    if force_reset:
        db.query(SandboxAuditLog).delete()
        db.query(SandboxUser).delete()
        db.query(SandboxBank).delete()
        db.commit()

    # Seed Banks
    existing_banks = {b.bank_id for b in db.query(SandboxBank.bank_id).all()}
    for b_data in INITIAL_SANDBOX_BANKS:
        if b_data["bank_id"] not in existing_banks:
            db.add(SandboxBank(
                bank_id=b_data["bank_id"],
                account_ref=b_data["account_ref"],
                account_holder=b_data["account_holder"],
                registered_mobile=b_data["registered_mobile"],
                bank_name=b_data["bank_name"],
                monthly_credits=json.dumps(b_data["monthly_credits"]),
                transactions=json.dumps(b_data["transactions"]),
                income_signal=b_data["income_signal"],
                verification_state=b_data["verification_state"],
                updated_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
            ))

    # Seed Users
    existing_users = {u.user_id for u in db.query(SandboxUser.user_id).all()}
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    for u_data in INITIAL_SANDBOX_USERS:
        if u_data["user_id"] not in existing_users:
            db.add(SandboxUser(
                user_id=u_data["user_id"],
                username=u_data["username"],
                name=u_data["name"],
                mobile=u_data["mobile"],
                course=u_data["course"],
                employment_status=u_data["employment_status"],
                bank_id=u_data["bank_id"],
                verification_status=u_data["verification_status"],
                created_at=now_str
            ))

    db.commit()


# -------------------------------------------------------------
# INCOME PATTERN DETECTION ENGINE
# -------------------------------------------------------------

def analyze_income_pattern(monthly_credits: Dict[str, float]) -> Dict[str, Any]:
    """
    Analyzes monthly deposit history to distinguish genuine employment income from
    isolated or stopped transactions.
    
    Returns:
      {
        "pattern": "REPEATING_MONTHLY" | "INCREASING" | "DECREASING" | "STOPPED" | "ISOLATED_TRANSACTION" | "NO_PATTERN",
        "signal": "POSITIVE" | "INSUFFICIENT" | "STOPPED" | "NONE",
        "summary": "₹6,000 × 3 months",
        "months_detected": 3,
        "average_monthly": 6000.0
      }
    """
    if not monthly_credits:
        return {
            "pattern": "NO_PATTERN",
            "signal": "NONE",
            "summary": "No credits recorded",
            "months_detected": 0,
            "average_monthly": 0
        }

    amounts = [float(v) for v in monthly_credits.values()]
    non_zero = [a for a in amounts if a > 0]

    if not non_zero:
        return {
            "pattern": "NO_PATTERN",
            "signal": "NONE",
            "summary": "₹0 credits recorded",
            "months_detected": 0,
            "average_monthly": 0
        }

    # Isolated transaction: only 1 non-zero credit in a 3+ month history
    if len(non_zero) == 1 and len(amounts) >= 2:
        return {
            "pattern": "ISOLATED_TRANSACTION",
            "signal": "INSUFFICIENT",
            "summary": f"Single isolated credit of ₹{int(non_zero[0]):,} (insufficient for employment verification)",
            "months_detected": 1,
            "average_monthly": non_zero[0]
        }

    # Stopped income: last month is 0 while previous months had credits
    if amounts and amounts[-1] == 0 and any(a > 0 for a in amounts[:-1]):
        return {
            "pattern": "INCOME_STOPPED",
            "signal": "STOPPED",
            "summary": f"Income stopped in recent cycle (was ₹{int(amounts[0]):,})",
            "months_detected": len(non_zero),
            "average_monthly": sum(amounts) / len(amounts)
        }

    avg = sum(non_zero) / len(non_zero)
    # Check stable monthly: all non-zero amounts within 15% of average
    is_stable = all(abs(a - avg) <= (avg * 0.18) for a in non_zero) and len(non_zero) >= 2

    # Check increasing
    is_increasing = len(non_zero) >= 3 and all(amounts[i] <= amounts[i+1] for i in range(len(amounts)-1)) and amounts[0] < amounts[-1]
    
    # Check decreasing
    is_decreasing = len(non_zero) >= 3 and all(amounts[i] >= amounts[i+1] for i in range(len(amounts)-1)) and amounts[0] > amounts[-1]

    if is_stable:
        return {
            "pattern": "REPEATING_MONTHLY",
            "signal": "POSITIVE",
            "summary": f"₹{int(avg):,} × {len(non_zero)} months (Stable Payroll Deposit)",
            "months_detected": len(non_zero),
            "average_monthly": round(avg, 2)
        }
    elif is_increasing:
        return {
            "pattern": "INCREASING",
            "signal": "POSITIVE",
            "summary": f"Increasing: ₹{int(amounts[0]):,} → ₹{int(amounts[-1]):,} over {len(amounts)} months",
            "months_detected": len(non_zero),
            "average_monthly": round(avg, 2)
        }
    elif is_decreasing:
        return {
            "pattern": "DECREASING",
            "signal": "INSUFFICIENT",
            "summary": f"Decreasing monthly trend ({len(non_zero)} months)",
            "months_detected": len(non_zero),
            "average_monthly": round(avg, 2)
        }

    return {
        "pattern": "IRREGULAR",
        "signal": "INSUFFICIENT" if len(non_zero) < 3 else "POSITIVE",
        "summary": f"Irregular deposits averaging ₹{int(avg):,}/mo",
        "months_detected": len(non_zero),
        "average_monthly": round(avg, 2)
    }


# -------------------------------------------------------------
# STRING & IDENTITY NORMALIZATION
# -------------------------------------------------------------

def normalize_name(name: str) -> str:
    """Cleans names for reliable case/space-insensitive comparison."""
    if not name:
        return ""
    cleaned = re.sub(r"[^a-zA-Z\s]", "", name).strip().lower()
    return " ".join(cleaned.split())


# -------------------------------------------------------------
# AUTOMATIC VERIFICATION ENGINE
# -------------------------------------------------------------

def verify_sandbox_user(user_id: str, db: Session) -> Dict[str, Any]:
    """
    Executes the complete automatic verification sequence:
    1. Retrieve user profile
    2. Check Bank ID existence and unique mapping (anti-duplicate check)
    3. Retrieve synthetic bank database record
    4. Validate account holder name
    5. Validate registered mobile number
    6. Analyze income transaction signals
    7. Calculate final status (VERIFIED | PARTIALLY VERIFIED | VERIFICATION FAILED | UNVERIFIED)
    8. Record immutable append-only audit event in SandboxAuditLog
    9. Persist verified state
    """
    user = db.query(SandboxUser).filter(SandboxUser.user_id == user_id).first()
    if not user:
        return {
            "success": False,
            "error": f"User '{user_id}' not found in Sandbox User Database."
        }

    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    bank_id = (user.bank_id or "").strip()

    # Step 1: Check if bank ID is assigned
    if not bank_id:
        final_status = "UNVERIFIED"
        audit = record_audit(
            db=db,
            user_id=user_id,
            bank_id="",
            timestamp=timestamp,
            id_match="FAIL",
            mobile_match="FAIL",
            owner_match="FAIL",
            income_sig="NONE",
            final_status=final_status,
            details={"reason": "No Bank ID associated with user profile."}
        )
        user.verification_status = final_status
        db.commit()
        return format_verification_response(user, None, None, audit)

    # Step 2: DUPLICATE BANK-ID PROTECTION
    # Check if another user in the sandbox has claimed this exact Bank ID
    duplicate_users = db.query(SandboxUser).filter(
        SandboxUser.bank_id == bank_id,
        SandboxUser.user_id != user_id
    ).all()

    if duplicate_users:
        conflict_ids = [u.user_id for u in duplicate_users]
        final_status = "VERIFICATION FAILED"
        details = {
            "reason": f"DUPLICATE BANK ID CONFLICT: Bank ID '{bank_id}' is also registered to {', '.join(conflict_ids)}.",
            "conflicting_users": conflict_ids,
            "anti_mismatch_flag": True
        }
        audit = record_audit(
            db=db,
            user_id=user_id,
            bank_id=bank_id,
            timestamp=timestamp,
            id_match="FAIL",
            mobile_match="FAIL",
            owner_match="FAIL",
            income_sig="NONE",
            final_status=final_status,
            details=details
        )
        user.verification_status = final_status
        db.commit()
        return format_verification_response(user, None, None, audit)

    # Step 3: Find Bank Record in Sandbox Bank Database
    bank = db.query(SandboxBank).filter(SandboxBank.bank_id == bank_id).first()
    if not bank:
        final_status = "VERIFICATION FAILED"
        details = {
            "reason": f"BANK RECORD NOT FOUND: Bank ID '{bank_id}' does not exist in Sandbox Bank Database.",
            "anti_mismatch_flag": True
        }
        audit = record_audit(
            db=db,
            user_id=user_id,
            bank_id=bank_id,
            timestamp=timestamp,
            id_match="FAIL",
            mobile_match="FAIL",
            owner_match="FAIL",
            income_sig="NONE",
            final_status=final_status,
            details=details
        )
        user.verification_status = final_status
        db.commit()
        return format_verification_response(user, None, None, audit)

    # Step 4: Compare Account Holder Name
    norm_user_name = normalize_name(user.name)
    norm_bank_owner = normalize_name(bank.account_holder)
    owner_match = (norm_user_name == norm_bank_owner) or (norm_user_name in norm_bank_owner) or (norm_bank_owner in norm_user_name)
    owner_status = "PASS" if owner_match else "FAIL"

    # Anti-mismatch check: if owner does not match, immediately FAIL
    if not owner_match:
        final_status = "VERIFICATION FAILED"
        details = {
            "reason": f"OWNER MISMATCH: Profile name '{user.name}' does not match bank account holder '{bank.account_holder}'.",
            "account_holder": bank.account_holder,
            "profile_name": user.name,
            "anti_mismatch_flag": True
        }
        audit = record_audit(
            db=db,
            user_id=user_id,
            bank_id=bank_id,
            timestamp=timestamp,
            id_match="FAIL",
            mobile_match="FAIL",
            owner_match=owner_status,
            income_sig="NONE",
            final_status=final_status,
            details=details
        )
        user.verification_status = final_status
        db.commit()
        return format_verification_response(user, bank, None, audit)

    # Step 5: Compare Registered Mobile
    user_phone_clean = clean_phone(user.mobile)
    bank_phone_clean = clean_phone(bank.registered_mobile)
    mobile_match = (user_phone_clean == bank_phone_clean) or (user_phone_clean[-10:] == bank_phone_clean[-10:])
    mobile_status = "PASS" if mobile_match else "FAIL"

    # Step 6: Income Pattern Detection
    monthly_data = {}
    try:
        monthly_data = json.loads(bank.monthly_credits or "{}")
    except Exception:
        monthly_data = {}

    pattern_result = analyze_income_pattern(monthly_data)
    income_signal_str = pattern_result["signal"]
    income_status = "PASS" if income_signal_str == "POSITIVE" else "INSUFFICIENT" if income_signal_str in ["INSUFFICIENT", "STOPPED"] else "FAIL"

    # Step 7: Calculate Overall Verification Status
    if owner_match and mobile_match and income_signal_str == "POSITIVE":
        final_status = "VERIFIED"
    elif owner_match and (not mobile_match or income_signal_str in ["INSUFFICIENT", "STOPPED"]):
        final_status = "PARTIALLY VERIFIED"
    elif not owner_match:
        final_status = "VERIFICATION FAILED"
    else:
        final_status = "UNVERIFIED"

    details = {
        "owner_check": {
            "status": owner_status,
            "profile_name": user.name,
            "bank_owner": bank.account_holder
        },
        "mobile_check": {
            "status": mobile_status,
            "profile_mobile": user.mobile,
            "bank_mobile": bank.registered_mobile
        },
        "income_check": pattern_result,
        "bank_ref": bank.account_ref,
        "bank_name": bank.bank_name
    }

    # Step 8: Create Immutable Append-Only Audit Log
    audit = record_audit(
        db=db,
        user_id=user_id,
        bank_id=bank_id,
        timestamp=timestamp,
        id_match="PASS",
        mobile_match=mobile_status,
        owner_match=owner_status,
        income_sig=income_status,
        final_status=final_status,
        details=details
    )

    # Step 9: Update User's Status
    user.verification_status = final_status
    db.commit()

    return format_verification_response(user, bank, pattern_result, audit)


def record_audit(
    db: Session,
    user_id: str,
    bank_id: str,
    timestamp: str,
    id_match: str,
    mobile_match: str,
    owner_match: str,
    income_sig: str,
    final_status: str,
    details: Dict[str, Any]
) -> SandboxAuditLog:
    """Generates an append-only audit event with unique VER-ID."""
    # Count existing logs to generate sequential ID
    count = db.query(SandboxAuditLog).count()
    audit_id = f"VER-{900001 + count}"
    log = SandboxAuditLog(
        id=audit_id,
        user_id=user_id,
        bank_id=bank_id,
        timestamp=timestamp,
        identity_match=id_match,
        mobile_match=mobile_match,
        bank_owner_match=owner_match,
        income_signal=income_sig,
        final_status=final_status,
        details=json.dumps(details)
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def format_verification_response(
    user: SandboxUser,
    bank: Optional[SandboxBank],
    pattern: Optional[Dict[str, Any]],
    audit: SandboxAuditLog
) -> Dict[str, Any]:
    """Formats standard JSON response expected by specification."""
    details = {}
    try:
        details = json.loads(audit.details or "{}")
    except Exception:
        pass

    return {
        "success": True,
        "verification_id": audit.id,
        "user_id": user.user_id,
        "username": user.username,
        "name": user.name,
        "course": user.course,
        "employment_status": user.employment_status,
        "bank_id": user.bank_id or "NONE",
        "bank_owner": bank.account_holder if bank else "—",
        "bank_name": bank.bank_name if bank else "—",
        "account_ref": bank.account_ref if bank else "—",
        "registered_mobile": bank.registered_mobile if bank else "—",
        "identity_match": audit.identity_match == "PASS",
        "mobile_match": audit.mobile_match == "PASS",
        "bank_owner_match": audit.bank_owner_match == "PASS",
        "income_pattern": pattern["pattern"] if pattern else (details.get("reason") or "NONE"),
        "income_pattern_summary": pattern["summary"] if pattern else (details.get("reason") or "No Pattern"),
        "income_signal": pattern["signal"] if pattern else audit.income_signal,
        "verification_status": audit.final_status,
        "evidence_level": audit.final_status,
        "timestamp": audit.timestamp,
        "details": details,
        "is_synthetic": True,
        "disclaimer": "SYNTHETIC SANDBOX DATA — NOT REAL BANK DATA"
    }

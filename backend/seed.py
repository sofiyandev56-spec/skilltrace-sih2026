import json
import re
import os
from .database import SessionLocal, engine, Base
from .models import User, Trainee, Event, Provider, Dispute, Consent, Checkin, Review
from .auth import hash_password

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Ensure Master Sovereign Government Officer is always present
    master_user = db.query(User).filter(User.email.ilike("shlok.borad11@gmail.com")).first()
    if not master_user:
        master_user = User(
            id="GOV-MASTER-SHLOK",
            name="Shlok Borad",
            email="shlok.borad11@gmail.com",
            phone="+91 99999 00001",
            role="government",
            designation="Master Government Officer & Sovereign Administrator",
            ministry="Ministry of Skill Development and Entrepreneurship",
            hashed_password=hash_password("google_oauth_verified"),
            verified=True,
            last_login="2026-09-11 00:00 IST",
        )
        db.add(master_user)
        db.commit()
    else:
        master_user.role = "government"
        master_user.verified = True
        master_user.designation = "Master Government Officer & Sovereign Administrator"
        master_user.ministry = "Ministry of Skill Development and Entrepreneurship"
        db.commit()

    # Ensure Trainee Shlok (shlok0562@gmail.com) exists with genuine Google profile record
    trainee_shlok_user = db.query(User).filter(User.email.ilike("shlok0562@gmail.com")).first()
    if not trainee_shlok_user:
        trainee_shlok_user = User(
            id="TRN-0562",
            name="Shlok",
            email="shlok0562@gmail.com",
            phone="+91 98765 43210",
            role="client",
            designation="Verified Trainee (Digital Skill Passport)",
            hashed_password=hash_password("google_oauth_verified"),
            verified=True,
            last_login="2026-09-11 02:00 IST",
        )
        db.add(trainee_shlok_user)
        db.commit()

    trainee_rec = db.query(Trainee).filter(Trainee.id == "TRN-0562").first()
    if not trainee_rec:
        trainee_rec = Trainee(
            id="TRN-0562",
            name="Shlok",
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
        db.add(trainee_rec)
        db.commit()

        # Seed events for TRN-0562
        events = [
            Event(id="EVT-0562-1", trainee_id="TRN-0562", date="2026-01-15", what_happened="enrolled", job_role="AI & Machine Learning", source="training_center", trust_level="high"),
            Event(id="EVT-0562-2", trainee_id="TRN-0562", date="2026-02-10", what_happened="certified", job_role="AI & Machine Learning", source="assessment_agency", trust_level="high"),
            Event(id="EVT-0562-3", trainee_id="TRN-0562", date="2026-02-28", what_happened="placed", employer="Tata Advanced Systems Ltd (AI Division)", salary=50000, job_role="AI Engineer", source="employer_portal", trust_level="high"),
            Event(id="EVT-0562-4", trainee_id="TRN-0562", date="2026-05-30", what_happened="still_working", employer="Tata Advanced Systems Ltd (AI Division)", salary=50000, job_role="AI Engineer", source="bank_statement_verified", trust_level="high")
        ]
        for ev in events:
            db.add(ev)
        db.commit()

    # Ensure Officer Shlok Borad 33 (shlok.borad33@gmail.com) exists
    officer_shlok33 = db.query(User).filter(User.email.ilike("shlok.borad33@gmail.com")).first()
    if not officer_shlok33:
        officer_shlok33 = User(
            id="GOV-SHLOK-33",
            name="Shlok Borad",
            email="shlok.borad33@gmail.com",
            phone="+91 98765 33001",
            role="government",
            designation="Accredited MSDE Field / District Officer",
            ministry="Ministry of Skill Development and Entrepreneurship",
            hashed_password=hash_password("google_oauth_verified"),
            verified=True,
            last_login="2026-09-11 02:00 IST",
        )
        db.add(officer_shlok33)
        db.commit()

    # Check if already seeded general tables
    if db.query(User).filter(User.id == "GOV-MSDE-042").first():
        db.close()
        return

    print("Seeding SkillTrace database...")

    # 1. Seed Pre-Configured Users for all 3 Portals:
    users_data = [
        # Government Officer (Full Access)
        User(
            id="GOV-MSDE-042",
            name="Dr. S. K. Sharma, IES",
            email="officer@msde.gov.in",
            phone="+91 98100 12345",
            role="government",
            designation="Director (Monitoring & Evaluation)",
            ministry="Ministry of Skill Development and Entrepreneurship",
            hashed_password=hash_password("Gov@2026Password"),
            verified=True,
            last_login="2026-09-10 09:30 IST",
        ),
        # Citizen / Trainee (Restricted to own record)
        User(
            id="TRN-0001",
            name="Aarti Patil",
            email="aarti.patil@email.com",
            phone="9125671886",
            role="client",
            designation="Certified Healthcare Assistant",
            company_name="Sanjeevani Hospital",
            hashed_password=hash_password("User@2026Password"),
            verified=True,
            last_login="2026-09-10 10:15 IST",
        ),
        # Employer (Restricted to their company's trainees)
        User(
            id="EMP-SANJ-01",
            name="Dr. Rajiv Mehta",
            email="hr@sanjeevani.org",
            phone="+91 98220 54321",
            role="employer",
            designation="Head of Human Resources",
            company_name="Sanjeevani Hospital",
            hashed_password=hash_password("Employer@2026Password"),
            verified=True,
            last_login="2026-09-10 11:00 IST",
        ),
        # Additional Employer (Tata Advanced Systems)
        User(
            id="EMP-TATA-02",
            name="Vikramaditya Rao",
            email="employer@tata.com",
            phone="+91 98330 98765",
            role="employer",
            designation="VP Talent Acquisition",
            company_name="Tata Advanced Systems Ltd",
            hashed_password=hash_password("Employer@2026Password"),
            verified=True,
            last_login="2026-09-10 11:45 IST",
        ),
    ]
    for u in users_data:
        db.add(u)

    # 2. Seed Providers
    providers_data = [
        Provider(id="PRV-001", name="Digital India Academy", district="Thane", certified_count=420, verified_placement_pct=82.5, retention_3mo=79.2, retention_6mo=72.0, retention_12mo=68.5),
        Provider(id="PRV-002", name="Future Skills Institute", district="Nagpur", certified_count=380, verified_placement_pct=78.0, retention_3mo=74.5, retention_6mo=68.2, retention_12mo=63.0),
        Provider(id="PRV-003", name="Gujarat Skill Development Centre", district="Pune", certified_count=510, verified_placement_pct=85.0, retention_3mo=81.0, retention_6mo=76.4, retention_12mo=71.2),
        Provider(id="PRV-004", name="Pragati Skill Centre", district="Satara", certified_count=290, verified_placement_pct=72.4, retention_3mo=68.0, retention_6mo=62.5, retention_12mo=58.0),
        Provider(id="PRV-005", name="Skill India Training Centre", district="Mumbai Suburban", certified_count=650, verified_placement_pct=88.2, retention_3mo=84.0, retention_6mo=79.5, retention_12mo=75.0),
        Provider(id="PRV-006", name="TechSkills Academy", district="Nashik", certified_count=440, verified_placement_pct=80.1, retention_3mo=76.5, retention_6mo=71.0, retention_12mo=66.5),
        Provider(id="PRV-007", name="Udaan Training Foundation", district="Nanded", certified_count=310, verified_placement_pct=75.0, retention_3mo=70.5, retention_6mo=65.0, retention_12mo=60.0),
    ]
    for p in providers_data:
        db.add(p)

    # 3. Seed Aarti Patil (The demo Trainee)
    aarti = Trainee(
        id="TRN-0001",
        name="Aarti Patil",
        course="Healthcare Assistant",
        district="Nashik",
        gender="Female",
        age_group="25-34",
        category="General",
        phone="+91 91256 71886",
        cohort="2025-Q1",
        provider_id="PRV-006",
        employer="Sanjeevani Hospital",
        salary=14000,
        outcome="employed",
        trust_level="high",
        certification_date="2025-01-15",
        placement_date="2025-01-28",
    )
    db.add(aarti)

    # Aarti's Events demonstrating 3-month rule
    events_aarti = [
        Event(id="EVT-0001-1", trainee_id="TRN-0001", date="2025-01-28", what_happened="placed", job_role="Healthcare Assistant", employer="Sanjeevani Hospital", salary=14000, source="employer", trust_level="high"),
        Event(id="EVT-0001-2", trainee_id="TRN-0001", date="2025-04-30", what_happened="still_working", job_role="Healthcare Assistant", employer="Sanjeevani Hospital", salary=14000, source="bank", trust_level="high"),
        Event(id="EVT-0001-3", trainee_id="TRN-0001", date="2025-07-31", what_happened="still_working", job_role="Senior Healthcare Assistant", employer="Sanjeevani Hospital", salary=16500, source="employer", trust_level="high"),
    ]
    for e in events_aarti:
        db.add(e)

    # 4. Seed other trainees across employers
    sample_trainees = [
        ("TRN-0002", "Rahul Deshmukh", "CNC Operator", "Pune", "Male", "18-24", "OBC", "+91 98231 44551", "2025-Q2", "PRV-003", "Tata Advanced Systems Ltd", 18000, "employed", "high", "2025-04-10", "2025-05-02"),
        ("TRN-0003", "Priya Kulkarni", "Python Development", "Nagpur", "Female", "25-34", "General", "+91 98450 11223", "2025-Q1", "PRV-002", "Datawing Services", 22000, "employed", "high", "2025-01-20", "2025-02-15"),
        ("TRN-0004", "Suresh Shinde", "Solar Technician", "Thane", "Male", "25-34", "SC", "+91 98111 22334", "2025-Q3", "PRV-001", "GreenVolt Solar Solutions", 15000, "awaiting_confirmation", "medium", "2025-08-15", "2025-09-01"),
        ("TRN-0005", "Kavita Pawar", "Healthcare Assistant", "Nashik", "Female", "18-24", "ST", "+91 98666 77889", "2025-Q2", "PRV-006", "Sanjeevani Hospital", 13500, "employed", "high", "2025-05-15", "2025-06-01"),
        ("TRN-0006", "Amit Jadhav", "Automobile Technician", "Pune", "Male", "25-34", "OBC", "+91 98777 88990", "2025-Q1", "PRV-003", "Tata Advanced Systems Ltd", 17500, "awaiting_confirmation", "medium", "2025-02-10", "2025-03-01"),
        ("TRN-0007", "Sunita Bhosale", "General Duty Assistant", "Nashik", "Female", "35-44", "General", "+91 98999 00112", "2025-Q3", "PRV-006", "Sanjeevani Hospital", 14000, "employed", "high", "2025-07-20", "2025-08-05"),
        ("TRN-0008", "Ganesh Gaikwad", "Electrician", "Mumbai Suburban", "Male", "18-24", "SC", "+91 98333 44556", "2025-Q2", "PRV-005", "Bharat Electricals Pvt Ltd", 16000, "employed", "high", "2025-04-20", "2025-05-10"),
        ("TRN-0009", "Sneha Chavan", "Digital Marketing", "Thane", "Female", "25-34", "General", "+91 98222 33445", "2025-Q4", "PRV-001", "Metro Retail Mart", 18500, "self_employed", "low", "2025-10-10", "2025-11-01"),
        ("TRN-0010", "Vikram More", "Cybersecurity", "Nagpur", "Male", "25-34", "General", "+91 98101 23456", "2025-Q2", "PRV-002", "Datawing Services", 26000, "employed", "high", "2025-05-01", "2025-05-20"),
    ]

    for tid, name, course, dist, gender, age, cat, phone, cohort, prv, emp, sal, outc, trust, cdate, pdate in sample_trainees:
        t = Trainee(
            id=tid, name=name, course=course, district=dist, gender=gender,
            age_group=age, category=cat, phone=phone, cohort=cohort,
            provider_id=prv, employer=emp, salary=sal, outcome=outc,
            trust_level=trust, certification_date=cdate, placement_date=pdate
        )
        db.add(t)

        # Add corresponding events
        db.add(Event(
            id=f"EVT-{tid}-1", trainee_id=tid, date=pdate,
            what_happened="placed", job_role=course, employer=emp, salary=sal,
            source="employer", trust_level=trust
        ))
        if outc == "employed":
            db.add(Event(
                id=f"EVT-{tid}-2", trainee_id=tid, date="2025-09-05",
                what_happened="still_working", job_role=course, employer=emp, salary=sal,
                source="employer", trust_level="high"
            ))

    # 5. Seed Disputes
    disputes_data = [
        Dispute(
            id="DSP-001",
            trainee_id="TRN-0004",
            employer_claim="Trainee left organization on 2025-09-20 after 2 weeks",
            trainee_claim="Still actively working as Solar Panel Technician; salary delayed by employer",
            date="2025-10-02",
            status="open",
            assigned_officer="Rajesh Patel",
        ),
        Dispute(
            id="DSP-002",
            trainee_id="TRN-0006",
            employer_claim="Reported monthly salary ₹14,000 (apprentice stipend)",
            trainee_claim="Promoted to junior machinist with ₹17,500 salary as per offer letter",
            date="2025-08-14",
            status="open",
            assigned_officer="Sunita Kulkarni",
        ),
    ]
    for d in disputes_data:
        db.add(d)

    # 6. Seed Consents
    consents_data = [
        Consent(id="CNS-001", trainee_id="TRN-0001", purpose="3-month post-training employment verification and employer checks", granted=True, date="2025-01-15"),
        Consent(id="CNS-002", trainee_id="TRN-0001", purpose="Aadhaar-based cryptographic verification and NSQF registry inclusion", granted=True, date="2025-01-15"),
        Consent(id="CNS-003", trainee_id="TRN-0002", purpose="3-month post-training employment verification", granted=True, date="2025-04-10"),
    ]
    for c in consents_data:
        db.add(c)

    # 7. Seed Reviews
    reviews_data = [
        Review(id="REV-001", trainee_id="TRN-0001", overall_quality=4.5, job_usefulness=4.8, trainer_score=4.6, skill_confidence=4.7, would_recommend=5.0, feedback="The healthcare practicals at TechSkills Academy gave me direct hospital confidence."),
        Review(id="REV-002", trainee_id="TRN-0002", overall_quality=4.2, job_usefulness=4.5, trainer_score=4.0, skill_confidence=4.3, would_recommend=4.5, feedback="Good hands-on CNC programming equipment."),
    ]
    for r in reviews_data:
        db.add(r)

    db.commit()
    db.close()
    print("SkillTrace database successfully seeded with multi-role accounts and national registry records!")

if __name__ == "__main__":
    seed_database()

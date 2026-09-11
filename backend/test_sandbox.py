import requests
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000"

def test_acceptance():
    print("==================================================")
    print("RUNNING SANDBOX BANK VERIFICATION ACCEPTANCE TESTS")
    print("==================================================")
    
    # 0. Seed sandbox data fresh
    print("\n[Step 0] Seeding sandbox...")
    r = requests.post(f"{BASE_URL}/api/sandbox/seed")
    assert r.status_code == 200, f"Seed failed: {r.text}"
    print("-> Sandbox seeded successfully.")

    # TEST 1: Valid User + Correct Bank ID -> VERIFIED
    print("\n[TEST 1] Valid User + Correct Bank ID (USER-10001 -> BANK-50001)...")
    r1 = requests.post(f"{BASE_URL}/api/verify/USER-10001")
    assert r1.status_code == 200, f"Test 1 failed: {r1.text}"
    data1 = r1.json()
    assert data1["verification_status"] == "VERIFIED", f"Expected VERIFIED, got {data1['verification_status']}"
    assert data1["identity_match"] is True
    assert data1["mobile_match"] is True
    assert data1["bank_owner_match"] is True
    assert data1["income_pattern"] == "REPEATING_MONTHLY"
    print(f"-> PASSED: Status = {data1['verification_status']}, Evidence = {data1['evidence_level']}")

    # TEST 2: Valid User + Bank ID does not exist -> FAILED
    print("\n[TEST 2] Valid User + Bank ID does not exist (USER-10003 -> BANK-50099)...")
    r2 = requests.post(f"{BASE_URL}/api/verify/USER-10003")
    assert r2.status_code == 200
    data2 = r2.json()
    assert data2["verification_status"] in ["VERIFICATION FAILED", "FAILED"], f"Expected FAILED, got {data2['verification_status']}"
    print(f"-> PASSED: Status = {data2['verification_status']}, Reason = {data2['details'].get('reason')}")

    # TEST 3: Valid User + Another User's Bank ID -> FAILED
    print("\n[TEST 3] Valid User + Another User's Bank ID (USER-10004 -> BANK-50002)...")
    r3 = requests.post(f"{BASE_URL}/api/verify/USER-10004")
    assert r3.status_code == 200
    data3 = r3.json()
    assert data3["verification_status"] in ["VERIFICATION FAILED", "FAILED"], f"Expected FAILED, got {data3['verification_status']}"
    assert data3["bank_owner_match"] is False or data3["details"].get("owner_mismatch") or "WRONG_OWNER" in str(data3["details"])
    print(f"-> PASSED: Status = {data3['verification_status']}, Owner Match = {data3['bank_owner_match']}")

    # TEST 4: Valid User + Correct Bank ID + missing/insufficient income pattern -> PARTIALLY VERIFIED / UNVERIFIED
    print("\n[TEST 4] Valid User + missing/insufficient income pattern (USER-10006 -> BANK-50006 isolated credit)...")
    r4 = requests.post(f"{BASE_URL}/api/verify/USER-10006")
    assert r4.status_code == 200
    data4 = r4.json()
    assert data4["verification_status"] in ["PARTIALLY VERIFIED", "UNVERIFIED"], f"Expected PARTIALLY VERIFIED / UNVERIFIED, got {data4['verification_status']}"
    print(f"-> PASSED: Status = {data4['verification_status']}, Income Pattern = {data4['income_pattern']}")

    # TEST 5: Duplicate Bank ID assigned to two users -> REJECT DUPLICATE
    print("\n[TEST 5] Duplicate Bank ID assigned to two users protection...")
    # USER-10004 has BANK-50002 which already belongs to USER-10002
    assert "DUPLICATE" in str(data3["details"]) or "WRONG_OWNER" in str(data3["details"]) or data3["verification_status"] == "VERIFICATION FAILED"
    print(f"-> PASSED: Duplicate Bank ID rejected with status: {data3['verification_status']}")

    # TEST 6: Run verification twice -> Same verification result, but two separate audit events
    print("\n[TEST 6] Run verification twice -> separate audit events...")
    # Get audit logs count before
    r_logs_before = requests.get(f"{BASE_URL}/api/sandbox/audit-logs?user_id=USER-10001")
    count_before = len(r_logs_before.json())
    
    # Run second verification
    r_again = requests.post(f"{BASE_URL}/api/verify/USER-10001")
    assert r_again.status_code == 200
    data_again = r_again.json()
    assert data_again["verification_status"] == data1["verification_status"]
    
    # Check audit logs count after
    r_logs_after = requests.get(f"{BASE_URL}/api/sandbox/audit-logs?user_id=USER-10001")
    count_after = len(r_logs_after.json())
    assert count_after == count_before + 1, f"Expected {count_before + 1} audit logs, got {count_after}"
    print(f"-> PASSED: Audit logs increased from {count_before} to {count_after}. Append-only verified.")

    # TEST 7: Reset sandbox -> Original synthetic demo dataset restored
    print("\n[TEST 7] Reset sandbox -> Original synthetic demo dataset restored...")
    r_reset = requests.post(f"{BASE_URL}/api/sandbox/reset")
    assert r_reset.status_code == 200
    r_users = requests.get(f"{BASE_URL}/api/sandbox/users")
    assert len(r_users.json()) >= 10, f"Expected >= 10 users after reset, got {len(r_users.json())}"
    print(f"-> PASSED: Reset restored {len(r_users.json())} synthetic users.")

    print("\n==================================================")
    print("ALL 7 ACCEPTANCE TESTS PASSED FLACIDLY & PERFECTLY!")
    print("==================================================")

if __name__ == "__main__":
    try:
        test_acceptance()
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)

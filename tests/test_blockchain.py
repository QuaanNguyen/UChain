import pytest
import json
import os
from web3 import Web3
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv('MONGO_URI')
if not MONGO_URI:
    raise ValueError("MONGO_URI environment variable is required. Please set it in your .env file.")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEPLOYMENT_PATH = os.path.join(BASE_DIR, 'deployment.json')

@pytest.fixture(scope="module")
def web3_conn():
    w3 = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))
    assert w3.is_connected(), "Failed to connect to Ganache"
    return w3

@pytest.fixture(scope="module")
def contract(web3_conn):
    with open(DEPLOYMENT_PATH, 'r') as f:
        info = json.load(f)
    return web3_conn.eth.contract(address=info['address'], abi=info['abi'])

@pytest.fixture(scope="module")
def mongo_client():
    client = MongoClient(MONGO_URI)
    yield client
    client.close()

@pytest.fixture(scope="module")
def db(mongo_client):
    return mongo_client['universityDB']

@pytest.fixture(scope="module")
def students_data(db):
    return list(db.students.find())

@pytest.fixture(scope="module")
def enrollments_data(db):
    return list(db.enrollments.find())

def test_connection(web3_conn):
    assert web3_conn.is_connected()
    print(f"Connected to block number: {web3_conn.eth.block_number}")

def test_student_current_hash(contract, students_data):
    for student in students_data[:5]:
        current_hash = student.get('currentHash')
        if not current_hash:
            continue
        data = contract.functions.enrollments(current_hash).call()
        sid, cid, grade, status = data
        assert sid != 0, f"Student {student['stid']} currentHash returned empty data"
        assert cid != 0
        print(f"Verified Student {student['stid']} currentHash: {current_hash} -> CID: {cid}")

def test_enrollment_history(contract, students_data):
    student = next((s for s in students_data if len(s.get('enrollments', [])) > 1), None)
    assert student is not None, "No student with multiple enrollments found"
    print(f"Testing history for Student {student['stid']}")
    for tx_hash in student['enrollments']:
        data = contract.functions.enrollments(tx_hash).call()
        sid, cid, grade, status = data
        assert sid == student['stid'], f"Enrollment hash {tx_hash} has mismatching SID"
        assert cid != 0

def test_data_consistency(contract, students_data, enrollments_data):
    student = students_data[0]
    current_hash = student.get('currentHash')
    if not current_hash:
        pytest.skip("Student has no currentHash")
    on_chain_data = contract.functions.enrollments(current_hash).call()
    oc_sid, oc_cid, oc_grade, oc_status = on_chain_data
    found = False
    for enr in enrollments_data:
        if enr['sid'] == oc_sid and enr['cid'] == oc_cid and enr['grade'] == oc_grade and enr['status'] == oc_status:
            found = True
            break
    assert found, f"On-chain data for hash {current_hash} not found in MongoDB enrollments"
    print(f"Data consistency verified for student {student['stid']}")

def test_mongodb_blockchain_integrity(contract, students_data, enrollments_data):
    tested_count = 0
    for student in students_data[:10]:
        for enr_hash in student.get('enrollments', []):
            on_chain_data = contract.functions.enrollments(enr_hash).call()
            oc_sid, oc_cid, oc_grade, oc_status = on_chain_data
            assert oc_sid == student['stid'], f"SID mismatch for hash {enr_hash}"
            mongo_enr = next((e for e in enrollments_data if e['sid'] == oc_sid and e['cid'] == oc_cid), None)
            if mongo_enr:
                assert mongo_enr['grade'] == oc_grade, f"Grade mismatch for enrollment"
                assert mongo_enr['status'] == oc_status, f"Status mismatch for enrollment"
                tested_count += 1
    print(f"Verified {tested_count} enrollment hashes between MongoDB and blockchain")
    assert tested_count > 0, "No enrollments were tested"

if __name__ == "__main__":
    pytest.main([__file__])

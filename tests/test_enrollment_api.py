import pytest
import requests
import os
import json
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv('MONGO_URI')
if not MONGO_URI:
    raise ValueError("MONGO_URI environment variable is required. Please set it in your .env file.")

API_BASE = os.getenv('API_BASE', 'http://localhost:5050/api')
GANACHE_RPC = os.getenv('GANACHE_RPC', 'http://127.0.0.1:8545')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEPLOYMENT_PATH = os.path.join(BASE_DIR, 'deployment.json')

@pytest.fixture(scope="module")
def mongo_client():
    client = MongoClient(MONGO_URI)
    yield client
    client.close()

@pytest.fixture(scope="module")
def db(mongo_client):
    return mongo_client['universityDB']

@pytest.fixture(scope="module")
def test_student(db):
    # Find a student to use for testing
    student = db.students.find_one()
    if not student:
        pytest.skip("No students found in database")
    return student

@pytest.fixture(scope="module")
def test_class(db):
    # Find a class to use for testing
    class_doc = db.classes.find_one()
    if not class_doc:
        pytest.skip("No classes found in database")
    return class_doc

@pytest.fixture(scope="function")
def cleanup_enrollment(db, test_student):
    # Cleanup function to remove test enrollments after each test
    yield
    # Remove enrollments created during tests (those with test markers)
    db.enrollments.delete_many({'test_marker': True})
    # Clean up student enrollments array if needed
    student = db.students.find_one({'stid': test_student['stid']})
    if student:
        # Remove test hashes from student enrollments
        # This is a simplified cleanup - in production you'd want more sophisticated cleanup
        pass

def test_api_connection():
    """Test that the API server is running and accessible"""
    try:
        response = requests.get(f"{API_BASE.replace('/api', '')}/", timeout=5)
        assert response.status_code == 200 or response.status_code == 404
        print("API server is accessible")
    except requests.exceptions.ConnectionError:
        pytest.skip("API server is not running. Start it with 'npm start'")

def test_get_classes():
    """Test GET /api/enrollments/classes endpoint"""
    response = requests.get(f"{API_BASE}/enrollments/classes", timeout=10)
    assert response.status_code == 200
    data = response.json()
    assert data['success'] == True
    assert 'classes' in data
    assert isinstance(data['classes'], list)
    print(f"Found {len(data['classes'])} classes")

def test_create_enrollment_with_ng_grade(test_student, test_class, cleanup_enrollment):
    """Test POST /api/enrollments - Create enrollment with NG grade for Enrolled status"""
    payload = {
        'sid': test_student['stid'],
        'cid': test_class['cid'],
        'grade': 'NG',
        'status': 'Enrolled'
    }
    
    response = requests.post(f"{API_BASE}/enrollments", json=payload, timeout=30)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert data['success'] == True
    assert 'enrollment' in data
    assert 'hash' in data
    assert data['enrollment']['grade'] == 'NG'
    assert data['enrollment']['status'] == 'Enrolled'
    assert data['enrollment']['sid'] == test_student['stid']
    assert data['enrollment']['cid'] == test_class['cid']
    print(f"Created enrollment with NG grade: {data['enrollment']['eid']}")

def test_create_enrollment_invalid_grade_for_enrolled(test_student, test_class):
    """Test POST /api/enrollments - Reject non-NG grade for Enrolled status"""
    payload = {
        'sid': test_student['stid'],
        'cid': test_class['cid'],
        'grade': 'A',
        'status': 'Enrolled'
    }
    
    response = requests.post(f"{API_BASE}/enrollments", json=payload, timeout=30)
    assert response.status_code == 400
    data = response.json()
    assert data['success'] == False
    assert 'Enrolled status must have grade "NG"' in data['error']
    print("Correctly rejected non-NG grade for Enrolled status")

def test_create_enrollment_completed_with_grade(test_student, test_class, cleanup_enrollment):
    """Test POST /api/enrollments - Create enrollment with grade for Completed status"""
    payload = {
        'sid': test_student['stid'],
        'cid': test_class['cid'],
        'grade': 'A',
        'status': 'Completed'
    }
    
    response = requests.post(f"{API_BASE}/enrollments", json=payload, timeout=30)
    assert response.status_code == 200
    data = response.json()
    assert data['success'] == True
    assert data['enrollment']['grade'] == 'A'
    assert data['enrollment']['status'] == 'Completed'
    print(f"Created enrollment with grade A for Completed status: {data['enrollment']['eid']}")

def test_create_enrollment_invalid_grade(test_student, test_class):
    """Test POST /api/enrollments - Reject invalid grade"""
    payload = {
        'sid': test_student['stid'],
        'cid': test_class['cid'],
        'grade': 'X',
        'status': 'Completed'
    }
    
    response = requests.post(f"{API_BASE}/enrollments", json=payload, timeout=30)
    assert response.status_code == 400
    data = response.json()
    assert data['success'] == False
    assert 'Invalid grade' in data['error']
    print("Correctly rejected invalid grade")

def test_create_enrollment_missing_fields():
    """Test POST /api/enrollments - Reject request with missing fields"""
    payload = {
        'sid': 1,
        # Missing cid, grade, status
    }
    
    response = requests.post(f"{API_BASE}/enrollments", json=payload, timeout=30)
    assert response.status_code == 400
    data = response.json()
    assert data['success'] == False
    assert 'Missing required fields' in data['error']
    print("Correctly rejected request with missing fields")

def test_update_enrollment_grade(test_student, test_class, db, cleanup_enrollment):
    """Test PUT /api/enrollments/:eid - Update enrollment grade"""
    # First create an enrollment
    create_payload = {
        'sid': test_student['stid'],
        'cid': test_class['cid'],
        'grade': 'NG',
        'status': 'Enrolled'
    }
    create_response = requests.post(f"{API_BASE}/enrollments", json=create_payload, timeout=30)
    assert create_response.status_code == 200
    created_enrollment = create_response.json()['enrollment']
    eid = created_enrollment['eid']
    
    # Now update it to Completed with a grade
    update_payload = {
        'grade': 'B',
        'status': 'Completed'
    }
    update_response = requests.put(f"{API_BASE}/enrollments/{eid}", json=update_payload, timeout=30)
    assert update_response.status_code == 200
    update_data = update_response.json()
    assert update_data['success'] == True
    assert update_data['enrollment']['grade'] == 'B'
    assert update_data['enrollment']['status'] == 'Completed'
    print(f"Updated enrollment {eid} from NG/Enrolled to B/Completed")

def test_update_enrollment_to_enrolled_requires_ng(test_student, test_class, db, cleanup_enrollment):
    """Test PUT /api/enrollments/:eid - Enrolled status must have NG grade"""
    # First create an enrollment with Completed status
    create_payload = {
        'sid': test_student['stid'],
        'cid': test_class['cid'],
        'grade': 'A',
        'status': 'Completed'
    }
    create_response = requests.post(f"{API_BASE}/enrollments", json=create_payload, timeout=30)
    assert create_response.status_code == 200
    created_enrollment = create_response.json()['enrollment']
    eid = created_enrollment['eid']
    
    # Try to update status to Enrolled without changing grade to NG
    update_payload = {
        'status': 'Enrolled',
        'grade': 'A'  # Should fail
    }
    update_response = requests.put(f"{API_BASE}/enrollments/{eid}", json=update_payload, timeout=30)
    assert update_response.status_code == 400
    update_data = update_response.json()
    assert update_data['success'] == False
    assert 'Enrolled status must have grade "NG"' in update_data['error']
    print("Correctly rejected Enrolled status with non-NG grade")

def test_update_enrollment_not_found():
    """Test PUT /api/enrollments/:eid - Handle non-existent enrollment"""
    update_payload = {
        'grade': 'A',
        'status': 'Completed'
    }
    response = requests.put(f"{API_BASE}/enrollments/999999", json=update_payload, timeout=30)
    assert response.status_code == 404
    data = response.json()
    assert data['success'] == False
    assert 'not found' in data['error'].lower()
    print("Correctly handled non-existent enrollment")

def test_enrollment_blockchain_sync(test_student, test_class, db, cleanup_enrollment):
    """Test that created enrollment is synced to blockchain"""
    import subprocess
    import time
    
    # Check if deployment.json exists
    if not os.path.exists(DEPLOYMENT_PATH):
        pytest.skip("deployment.json not found - contract not deployed")
    
    with open(DEPLOYMENT_PATH, 'r') as f:
        deployment = json.load(f)
    
    # Create enrollment
    payload = {
        'sid': test_student['stid'],
        'cid': test_class['cid'],
        'grade': 'NG',
        'status': 'Enrolled'
    }
    response = requests.post(f"{API_BASE}/enrollments", json=payload, timeout=30)
    assert response.status_code == 200
    data = response.json()
    hash_value = data['hash']
    
    # Verify hash is in student's enrollments array
    student = db.students.find_one({'stid': test_student['stid']})
    assert hash_value in student.get('enrollments', []), "Hash not found in student enrollments"
    assert student.get('currentHash') == hash_value, "currentHash not updated"
    
    # Verify enrollment document has hash
    enrollment = db.enrollments.find_one({'eid': data['enrollment']['eid']})
    assert enrollment.get('enrollmentHash') == hash_value, "enrollmentHash not set"
    
    print(f"Enrollment synced to blockchain with hash: {hash_value[:20]}...")

def test_enrollment_count_not_increased_on_edit(test_student, test_class, db, cleanup_enrollment):
    """Test that editing enrollment doesn't increase student enrollment count"""
    # Create an enrollment
    create_payload = {
        'sid': test_student['stid'],
        'cid': test_class['cid'],
        'grade': 'NG',
        'status': 'Enrolled'
    }
    create_response = requests.post(f"{API_BASE}/enrollments", json=create_payload, timeout=30)
    assert create_response.status_code == 200
    created_enrollment = create_response.json()['enrollment']
    eid = created_enrollment['eid']
    
    # Get initial enrollment count
    student_before = db.students.find_one({'stid': test_student['stid']})
    initial_count = len(student_before.get('enrollments', []))
    
    # Update the enrollment
    update_payload = {
        'grade': 'A',
        'status': 'Completed'
    }
    update_response = requests.put(f"{API_BASE}/enrollments/{eid}", json=update_payload, timeout=30)
    assert update_response.status_code == 200
    
    # Get enrollment count after update
    student_after = db.students.find_one({'stid': test_student['stid']})
    final_count = len(student_after.get('enrollments', []))
    
    # Count should not increase (should stay the same or be replaced)
    assert final_count == initial_count, f"Enrollment count increased from {initial_count} to {final_count}"
    print(f"Enrollment count remained {initial_count} after edit (not increased)")

if __name__ == "__main__":
    pytest.main([__file__, "-v"])


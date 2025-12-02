import pytest
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv('MONGO_URI')
if not MONGO_URI:
    raise ValueError("MONGO_URI environment variable is required. Please set it in your .env file.")

@pytest.fixture(scope="module")
def mongo_client():
    client = MongoClient(MONGO_URI)
    yield client
    client.close()

@pytest.fixture(scope="module")
def db(mongo_client):
    return mongo_client['universityDB']

def test_mongodb_connection(mongo_client):
    try:
        mongo_client.admin.command('ping')
        print("✅ Successfully connected to MongoDB Atlas")
        assert True
    except Exception as e:
        pytest.fail(f"Failed to connect to MongoDB: {e}")

def test_collections_exist(db):
    required_collections = [
        'students', 'enrollments', 'classes', 'professors',
        'departments', 'schools', 'universities', 'advisors'
    ]
    collection_names = db.list_collection_names()
    for collection in required_collections:
        assert collection in collection_names, f"Collection '{collection}' not found"
        print(f"✅ Collection '{collection}' exists")

def test_students_data(db):
    students = db.students
    count = students.count_documents({})
    assert count > 0, "Students collection is empty"
    print(f"✅ Found {count} students in database")
    sample = students.find_one()
    assert 'stid' in sample, "Student record missing 'stid' field"
    assert 'firstName' in sample
    assert 'lastName' in sample
    assert 'email' in sample
    assert 'enrollments' in sample
    assert 'currentHash' in sample
    print(f"✅ Student record structure verified")

def test_enrollments_data(db):
    enrollments = db.enrollments
    count = enrollments.count_documents({})
    assert count > 0, "Enrollments collection is empty"
    print(f"✅ Found {count} enrollments in database")
    sample = enrollments.find_one()
    assert 'eid' in sample
    assert 'sid' in sample
    assert 'cid' in sample
    assert 'grade' in sample
    assert 'status' in sample
    print(f"✅ Enrollment record structure verified")

def test_data_integrity(db):
    students = db.students
    enrollments = db.enrollments
    student = students.find_one({'enrollments': {'$exists': True, '$ne': []}})
    if student:
        current_hash = student.get('currentHash')
        enrollment_hashes = student.get('enrollments', [])
        if current_hash:
            assert current_hash in enrollment_hashes, "currentHash not found in enrollments array"
            print(f"✅ Data integrity verified for student {student.get('stid')}")
    else:
        print("⚠️  No students with enrollments found for integrity test")

def test_classes_data(db):
    classes = db.classes
    count = classes.count_documents({})
    assert count > 0, "Classes collection is empty"
    print(f"✅ Found {count} classes in database")

def test_professors_data(db):
    professors = db.professors
    count = professors.count_documents({})
    assert count > 0, "Professors collection is empty"
    print(f"✅ Found {count} professors in database")

def test_departments_data(db):
    departments = db.departments
    count = departments.count_documents({})
    assert count > 0, "Departments collection is empty"
    print(f"✅ Found {count} departments in database")

if __name__ == "__main__":
    pytest.main([__file__, "-v"])

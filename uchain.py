import json
from pymongo import MongoClient, errors
from cryptography.fernet import Fernet
import base64
import os

CONNECTION_STRING = ""
DB_NAME = "university_db"
DATA_MAP = {
    "Universities.json": "universities",
    "Schools.json": "schools",
    "Departments.json": "departments",
    "Advisors.json": "advisors",
    "Students.json": "students",
    "Professors.json": "professors",
    "Classes.json": "classes",
    "Enrollments.json": "enrollments"
}

def connect_to_mongo():
    try:
        client = MongoClient(CONNECTION_STRING)
        client.admin.command('ping')
        print("Connected successfully!")
        return client
    except errors.ServerSelectionTimeoutError as err:
        print("Connection failed.")
        raise err

def create_database_and_collections(client):
    db = client[DB_NAME]
    for collection_name in DATA_MAP.values():
        if collection_name not in db.list_collection_names():
            db.create_collection(collection_name)
    return db

def clear_database(db):
    for collection_name in DATA_MAP.values():
        db[collection_name].delete_many({})
    print("All collections cleared.")

def load_and_insert_data(db):
    clear_database(db)
    for file_name, collection_name in DATA_MAP.items():
        try:
            with open(file_name, 'r') as f:
                data = json.load(f)
            if data:
                if collection_name == "enrollments":
                    processed = []
                    for e in data:
                        processed.append(toBlock(e))
                    db[collection_name].insert_many(processed)
                else:
                    db[collection_name].insert_many(data)
                print(f"Inserted {len(data)} documents into {collection_name}")
        except FileNotFoundError:
            print(f"File {file_name} not found. Skipping.")
        except json.JSONDecodeError:
            print(f"Invalid JSON in {file_name}. Skipping.")

# We can't do this for free.
def setup_sharding(db):
    try:
        db.admin.command({'enableSharding': DB_NAME})
        print("Sharding enabled on database.")
    except errors.OperationFailure:
        print("Failed to enable sharding.")
    shard_configs = {
        "universities": {"uid": 1},
        "schools": {"sid": 1},
        "departments": {"did": 1},
        "advisors": {"aid": 1},
        "students": {"stid": 1},
        "professors": {"pid": 1},
        "classes": {"cid": 1},
        "enrollments": {"eid": 1}
    }
    for collection, key in shard_configs.items():
        try:
            db.admin.command({'shardCollection': f"{DB_NAME}.{collection}", 'key': key})
            print(f"Sharded {collection} with key {key}")
        except errors.OperationFailure:
            print(f"Failed to shard {collection}.")

def setup_vertical_fragmentation(db):
    students_coll = db["students"]
    enrollments_coll = db["students_enrollments"]
    for student in students_coll.find():
        enrollments = student.pop("enrollments", [])
        if enrollments:
            enrollments_coll.insert_one({"stid": student["stid"], "enrollments": enrollments})
        students_coll.replace_one({"_id": student["_id"]}, student)
    print("Vertical fragmentation applied to students.")

# -------------------------------------------------------------------------
def generate_key_for_enrollment(eid):
    raw = f"{eid}-{os.urandom(16)}".encode()
    return base64.urlsafe_b64encode(raw.ljust(32, b'_')[:32])

def encrypt_grade(grade, key):
    return Fernet(key).encrypt(grade.encode()).decode()

def decrypt_grade(token, key):
    return Fernet(key).decrypt(token.encode()).decode()

# Integrate with the blockchain.
# -------------------------------------------------------------------------
# This is dummy code. What toBlock must do is send off the grade to the blockchain, and instead replace it with the hash of the blockchain.
def toBlock(enrollment):
    eid = enrollment["eid"]
    key = generate_key_for_enrollment(eid)
    encrypted_grade = encrypt_grade(enrollment["grade"], key)
    enrollment["grade_key"] = key.decode()
    enrollment["grade"] = encrypted_grade
    return enrollment

# Getblock must use the hash for grade to send off to get the blockchain value of that hash. Keep it in memory fr. 
def getBlock(db, eid):
    e = db.enrollments.find_one({"eid": eid})
    if not e:
        return None
    key = e["grade_key"].encode()
    decrypted = decrypt_grade(e["grade"], key)
    e["grade"] = decrypted
    return e
# -------------------------------------------------------------------------

def query_grade_distribution(db):
    pipeline = [
        {"$project": {"eid": 1, "grade": 1, "grade_key": 1}}
    ]
    counts = {}
    for e in db.enrollments.aggregate(pipeline):
        try:
            grade = decrypt_grade(e["grade"], e["grade_key"].encode())
            counts[grade] = counts.get(grade, 0) + 1
        except:
            pass
    print("="*70)
    print("GRADE DISTRIBUTION (DECRYPTED ON THE FLY)")
    print("="*70)
    for g, c in counts.items():
        print(f"{g}: {c}")

def query_1_students_per_university():
    print("="*70)
    print("1. Students per University.")
    print("="*70)

    pipeline = [
        {"$lookup": {
            "from": "departments",
            "localField": "did",
            "foreignField": "did",
            "as": "department"
        }},
        {"$unwind": "$department"},
        {"$lookup": {
            "from": "schools",
            "localField": "did",
            "foreignField": "departments",
            "as": "school"
        }},
        {"$unwind": "$school"},
        {"$lookup": {
            "from": "universities",
            "localField": "school.sid",
            "foreignField": "schools",
            "as": "university"
        }},
        {"$unwind": "$university"},
        {"$group": {
            "_id": "$university.name",
            "student_count": {"$sum": 1}
        }},
        {"$sort": {"student_count": -1}}
    ]

    results = list(db.students.aggregate(pipeline))
    for r in results:
        print(f"{r['_id']}: {r['student_count']:,} students")
    print()

def query_2_students_sharing_professors():
    print("="*70)
    print("2. Students who share 1...2...3...Profs.")
    print("="*70)
    
    pipeline = [
        {"$lookup": {
            "from": "classes",
            "localField": "cid",
            "foreignField": "cid",
            "as": "class"
        }},
        {"$unwind": "$class"},
        
        {"$group": {
            "_id": "$sid",
            "professors": {"$addToSet": "$class.pid"}
        }},
        
        {"$bucket": {
            "groupBy": {"$size": "$professors"},
            "boundaries": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 50],
            "default": "50+",
            "output": {
                "students": {"$sum": 1}
            }
        }},
        {"$sort": {"_id": 1}}
    ]
    
    results = list(db.enrollments.aggregate(pipeline, maxTimeMS=6000000))
    for r in results:
        bucket = r["_id"]
        if bucket == "50+":
            print(f"50 or more professors: {r['students']:,} students")
        else:
            print(f"{bucket} unique professor(s): {r['students']:,} students")
    print()

def query_3_rida_classes():
    print("="*70)
    print("3. ALL CLASSES TAUGHT BY PROFESSOR RIDA")
    print("="*70)

    rida = db.professors.find_one({"firstName": "Rida"})
    if not rida:
        print("Professor Rida not found!")
        return

    pid = rida["pid"]
    full_name = f"{rida['firstName']} {rida['lastName']}"
    print(f"Found: {full_name} (pid: {pid})\n")

    classes = db.classes.find({"pid": pid}).sort("semester", 1)

    if db.classes.count_documents({"pid": pid}) == 0:
        print("Rida is not teaching any classes yet.")
    else:
        print("Classes taught by Rida:")
        for cls in classes:
            print(f" • {cls['name']} | {cls['semester']} | {cls['time']} {cls['days']} | Room: {cls['room']}")
    print()


if __name__ == "__main__":
    client = connect_to_mongo()
    db = create_database_and_collections(client)

    #load_and_insert_data(db)

    # We cannot do this for free.
    #setup_sharding(db)
    #setup_vertical_fragmentation(db)

    query_1_students_per_university()
    query_2_students_sharing_professors()
    query_3_rida_classes()
    query_grade_distribution(db)

    client.close()

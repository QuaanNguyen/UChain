import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error("MONGO_URI environment variable is required. Please set it in your .env file.");
    process.exit(1);
}

// MongoDB schemas
const studentSchema = new mongoose.Schema({
    stid: Number,
    firstName: String,
    lastName: String,
    did: Number,
    email: String,
    enrollments: [String],
    currentHash: String
}, { collection: 'students' });

const enrollmentSchema = new mongoose.Schema({
    eid: Number,
    sid: Number,
    cid: Number,
    grade: String,
    status: String,
    eidHash: String
}, { collection: 'enrollments' });

const classSchema = new mongoose.Schema({
    cid: Number,
    name: String,
    pid: Number,
    time: String,
    days: String,
    room: String,
    semester: String
}, { collection: 'classes' });

const professorSchema = new mongoose.Schema({
    pid: Number,
    firstName: String,
    lastName: String,
    did: Number,
    email: String,
    classes: [Number],
    title: String
}, { collection: 'professors' });

const departmentSchema = new mongoose.Schema({
    did: Number,
    name: String
}, { collection: 'departments' });

const schoolSchema = new mongoose.Schema({
    sid: Number,
    name: String,
    departments: [Number]
}, { collection: 'schools' });

const universitySchema = new mongoose.Schema({
    uid: Number,
    name: String,
    schools: [Number]
}, { collection: 'universities' });

const advisorSchema = new mongoose.Schema({
    aid: Number,
    name: String,
    did: Number,
    students: [Number]
}, { collection: 'advisors' });

const Student = mongoose.model('Student', studentSchema);
const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
const Class = mongoose.model('Class', classSchema);
const Professor = mongoose.model('Professor', professorSchema);
const Department = mongoose.model('Department', departmentSchema);
const School = mongoose.model('School', schoolSchema);
const University = mongoose.model('University', universitySchema);
const Advisor = mongoose.model('Advisor', advisorSchema);

async function migrateData() {
    try {
        console.log("Connecting to MongoDB Atlas...");
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB Atlas");

        const dataPath = path.resolve(__dirname, '../data-generator');

        const students = JSON.parse(fs.readFileSync(path.join(dataPath, 'Students.json'), 'utf8'));
        const enrollments = JSON.parse(fs.readFileSync(path.join(dataPath, 'Enrollments.json'), 'utf8'));
        const classes = JSON.parse(fs.readFileSync(path.join(dataPath, 'Classes.json'), 'utf8'));
        const professors = JSON.parse(fs.readFileSync(path.join(dataPath, 'Professors.json'), 'utf8'));
        const departments = JSON.parse(fs.readFileSync(path.join(dataPath, 'Departments.json'), 'utf8'));
        const schools = JSON.parse(fs.readFileSync(path.join(dataPath, 'Schools.json'), 'utf8'));
        const universities = JSON.parse(fs.readFileSync(path.join(dataPath, 'Universities.json'), 'utf8'));
        const advisors = JSON.parse(fs.readFileSync(path.join(dataPath, 'Advisors.json'), 'utf8'));

        console.log("Read all JSON files");

        console.log("Clearing existing collections...");
        await Student.deleteMany({});
        await Enrollment.deleteMany({});
        await Class.deleteMany({});
        await Professor.deleteMany({});
        await Department.deleteMany({});
        await School.deleteMany({});
        await University.deleteMany({});
        await Advisor.deleteMany({});

        console.log("Uploading data to MongoDB Atlas...");

        await University.insertMany(universities);
        console.log(`Uploaded ${universities.length} universities`);

        await School.insertMany(schools);
        console.log(`Uploaded ${schools.length} schools`);

        await Department.insertMany(departments);
        console.log(`Uploaded ${departments.length} departments`);

        await Advisor.insertMany(advisors);
        console.log(`Uploaded ${advisors.length} advisors`);

        await Professor.insertMany(professors);
        console.log(`Uploaded ${professors.length} professors`);

        await Class.insertMany(classes);
        console.log(`Uploaded ${classes.length} classes`);

        await Enrollment.insertMany(enrollments);
        console.log(`Uploaded ${enrollments.length} enrollments`);

        await Student.insertMany(students);
        console.log(`Uploaded ${students.length} students`);

        console.log("\nMigration complete!");
        console.log(`Total documents uploaded: ${universities.length + schools.length + departments.length +
            advisors.length + professors.length + classes.length +
            enrollments.length + students.length
            }`);

    } catch (error) {
        console.error("Migration error:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");
    }
}

migrateData();

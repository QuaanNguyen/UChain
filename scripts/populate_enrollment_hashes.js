import mongoose from 'mongoose';
import Web3 from 'web3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGO_URI = process.env.MONGO_URI;
const web3 = new Web3('http://127.0.0.1:8545');

// Load deployment info
const deploymentPath = path.resolve(__dirname, '../deployment.json');
const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
const contract = new web3.eth.Contract(deployment.abi, deployment.address);

// MongoDB schemas
const enrollmentSchema = new mongoose.Schema({
    eid: Number,
    sid: Number,
    cid: Number,
    grade: String,
    status: String,
    enrollmentHash: String
}, { collection: 'enrollments' });

const studentSchema = new mongoose.Schema({
    stid: Number,
    enrollments: [String]
}, { collection: 'students' });

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
const Student = mongoose.model('Student', studentSchema);

async function populateEnrollmentHashes() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected');

        const students = await Student.find();
        console.log(`Found ${students.length} students`);

        for (const student of students) {
            console.log(`\nProcessing student ${student.stid}...`);
            const enrollments = await Enrollment.find({ sid: student.stid });

            if (!student.enrollments || student.enrollments.length === 0) {
                console.log(`  No enrollment hashes for student ${student.stid}`);
                continue;
            }

            // For each hash in student.enrollments, find which enrollment it belongs to
            for (const hash of student.enrollments) {
                try {
                    // Query blockchain to get sid, cid for this hash
                    const onChainData = await contract.methods.enrollments(hash).call();

                    // Web3 returns struct as object with properties
                    const oc_sid = parseInt(onChainData.sid);
                    const oc_cid = parseInt(onChainData.cid);

                    if (oc_sid === 0) {
                        console.log(`  Hash ${hash} not found on blockchain`);
                        continue;
                    }

                    // Find enrollment in MongoDB that matches this sid/cid
                    const enrollment = enrollments.find(e =>
                        e.sid === oc_sid &&
                        e.cid === oc_cid
                    );

                    if (enrollment && !enrollment.enrollmentHash) {
                        enrollment.enrollmentHash = hash;
                        await enrollment.save();
                        console.log(`  Set hash for enrollment eid:${enrollment.eid} sid:${enrollment.sid} cid:${enrollment.cid}`);
                    }
                } catch (err) {
                    console.log(`  Error processing hash ${hash}:`, err.message);
                }
            }
        }

        console.log('\nDone populating enrollmentHash fields');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
    }
}

populateEnrollmentHashes();

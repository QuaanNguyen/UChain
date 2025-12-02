import express from 'express';
import mongoose from 'mongoose';
import Web3 from 'web3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

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
    status: String
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

const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);
const Enrollment = mongoose.models.Enrollment || mongoose.model('Enrollment', enrollmentSchema);
const Class = mongoose.models.Class || mongoose.model('Class', classSchema);
const Department = mongoose.models.Department || mongoose.model('Department', departmentSchema);
const School = mongoose.models.School || mongoose.model('School', schoolSchema);
const University = mongoose.models.University || mongoose.model('University', universitySchema);
const Advisor = mongoose.models.Advisor || mongoose.model('Advisor', advisorSchema);

// Web3 blockchain connection
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.GANACHE_RPC || 'http://127.0.0.1:8545'));

// Load contract deployment info
let contract = null;
try {
    const deploymentPath = path.resolve(__dirname, '../../deployment.json');
    if (fs.existsSync(deploymentPath)) {
        const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
        contract = new web3.eth.Contract(deployment.abi, deployment.address);
    }
} catch (err) {
    console.warn('⚠️  Deployment.json not found, blockchain verification disabled');
}

// GET /api/student/:stid - Get student information with transcripts
router.get('/:stid', async (req, res) => {
    try {
        const stid = parseInt(req.params.stid);
        const student = await Student.findOne({ stid });
        if (!student) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }

        const enrollments = await Enrollment.find({ sid: stid });
        const transcripts = await Promise.all(
            enrollments.map(async (enr) => {
                const classInfo = await Class.findOne({ cid: enr.cid });
                return {
                    eid: enr.eid,
                    className: classInfo?.name || 'Unknown',
                    semester: classInfo?.semester || 'N/A',
                    grade: enr.grade,
                    status: enr.status,
                    cid: enr.cid
                };
            })
        );

        const department = await Department.findOne({ did: student.did });
        const school = await School.findOne({ departments: student.did });
        const university = school ? await University.findOne({ schools: school.sid }) : null;
        const advisor = await Advisor.findOne({ students: stid });

        res.json({
            success: true,
            student: {
                stid: student.stid,
                firstName: student.firstName,
                lastName: student.lastName,
                email: student.email,
                currentHash: student.currentHash,
                enrollmentHashes: student.enrollments || [] // MongoDB field is 'enrollments'
            },
            university: university ? { uid: university.uid, name: university.name } : null,
            school: school ? { sid: school.sid, name: school.name } : null,
            department: department ? { did: department.did, name: department.name } : null,
            advisor: advisor ? { aid: advisor.aid, name: advisor.name } : null,
            transcripts
        });
    } catch (err) {
        console.error('❌ Error fetching student:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/student/verify-transcript - Verify student transcript hashes against blockchain
router.post('/verify-transcript', async (req, res) => {
    try {
        const { stid } = req.body;
        const studentId = parseInt(stid);

        if (!contract) {
            return res.status(503).json({
                success: false,
                error: 'Blockchain contract not available'
            });
        }

        const student = await Student.findOne({ stid: studentId });
        if (!student) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }

        if (!student.enrollments || student.enrollments.length === 0) {
            return res.json({
                success: true,
                verified: false,
                studentId: studentId,
                totalEnrollments: 0,
                validEnrollments: 0,
                results: [],
                message: 'Student has no enrollments to verify'
            });
        }

        const verificationResults = [];
        let allValid = true;

        for (const hash of student.enrollments) {
            try {
                // Normalize hash to bytes32 format (0x + 64 hex chars)
                let normalizedHash = hash;
                if (typeof hash === 'string') {
                    normalizedHash = hash.trim();
                    if (!normalizedHash.startsWith('0x') && normalizedHash.length > 0) {
                        normalizedHash = '0x' + normalizedHash;
                    }
                }

                // Validate hash format
                if (normalizedHash.length !== 66 || !/^0x[0-9a-fA-F]{64}$/.test(normalizedHash)) {
                    verificationResults.push({
                        hash: normalizedHash,
                        valid: false,
                        reason: `Invalid hash format: expected bytes32 (66 chars), got ${normalizedHash.length} chars`
                    });
                    allValid = false;
                    continue;
                }

                let onChainData;
                try {
                    onChainData = await contract.methods.enrollments(normalizedHash).call();
                } catch (callError) {
                    const errorMsg = callError.message || String(callError);
                    if (errorMsg.includes('decoding') || 
                        errorMsg.includes('Out of Gas') ||
                        errorMsg.includes('invalid') ||
                        errorMsg.includes('revert')) {
                        verificationResults.push({
                            hash: normalizedHash,
                            valid: false,
                            reason: `Hash not found on blockchain: ${errorMsg.substring(0, 100)}`
                        });
                        allValid = false;
                        continue;
                    }
                    throw callError;
                }

                // Handle both array and object return formats from Web3.js
                let oc_sid, oc_cid, oc_grade, oc_status;
                if (Array.isArray(onChainData)) {
                    [oc_sid, oc_cid, oc_grade, oc_status] = onChainData;
                } else if (typeof onChainData === 'object' && onChainData !== null) {
                    oc_sid = onChainData.sid;
                    oc_cid = onChainData.cid;
                    oc_grade = onChainData.grade;
                    oc_status = onChainData.status;
                } else {
                    throw new Error(`Unexpected data format from blockchain: ${typeof onChainData}`);
                }

                // Check if hash exists (sid != 0 indicates empty/default values)
                const sidValue = typeof oc_sid === 'bigint' ? oc_sid.toString() : oc_sid.toString();
                if (sidValue === '0' || oc_sid === 0 || oc_sid === '0') {
                    verificationResults.push({
                        hash: normalizedHash,
                        valid: false,
                        reason: 'Hash not found on blockchain (returns default/empty values)'
                    });
                    allValid = false;
                    continue;
                }

                // Verify SID matches (handle BigInt conversion)
                let oc_sid_num;
                if (typeof oc_sid === 'bigint') {
                    oc_sid_num = Number(oc_sid);
                } else {
                    oc_sid_num = parseInt(oc_sid.toString());
                }
                
                if (oc_sid_num !== studentId) {
                    verificationResults.push({
                        hash: normalizedHash,
                        valid: false,
                        reason: `SID mismatch: expected ${studentId}, got ${oc_sid_num}`
                    });
                    allValid = false;
                    continue;
                }

                // Find enrollment in MongoDB (handle Number/String type variations)
                let oc_cid_num;
                if (typeof oc_cid === 'bigint') {
                    oc_cid_num = Number(oc_cid);
                } else {
                    oc_cid_num = parseInt(oc_cid.toString());
                }
                
                let mongoEnr = await Enrollment.findOne({ 
                    $or: [
                        { sid: studentId, cid: oc_cid_num },
                        { sid: studentId.toString(), cid: oc_cid_num.toString() },
                        { sid: studentId, cid: oc_cid_num.toString() },
                        { sid: studentId.toString(), cid: oc_cid_num }
                    ]
                });

                if (!mongoEnr) {
                    verificationResults.push({
                        hash: normalizedHash,
                        valid: false,
                        reason: `Enrollment not found in database (SID: ${studentId}, CID: ${oc_cid_num})`
                    });
                    allValid = false;
                    continue;
                }

                // Verify data matches MongoDB
                const gradeMatch = String(mongoEnr.grade || '').trim() === String(oc_grade || '').trim();
                const statusMatch = String(mongoEnr.status || '').trim() === String(oc_status || '').trim();
                const dataMatches = gradeMatch && statusMatch;

                verificationResults.push({
                    hash: normalizedHash,
                    valid: dataMatches,
                    cid: oc_cid_num,
                    grade: oc_grade,
                    status: oc_status,
                    mongoGrade: mongoEnr.grade,
                    mongoStatus: mongoEnr.status,
                    mongoMatch: dataMatches,
                    reason: dataMatches 
                        ? 'Verified successfully' 
                        : `Data mismatch: grade ${gradeMatch ? '✓' : '✗'} status ${statusMatch ? '✓' : '✗'}`
                });

                if (!dataMatches) allValid = false;

            } catch (error) {
                console.error(`❌ Error verifying hash ${hash}:`, error.message);
                verificationResults.push({
                    hash: hash,
                    valid: false,
                    reason: `Blockchain query error: ${error.message}`
                });
                allValid = false;
            }
        }

        const validCount = verificationResults.filter(r => r.valid).length;
        console.log(`✅ Verification complete for student ${studentId}: ${validCount}/${student.enrollments.length} verified`);

        res.json({
            success: true,
            verified: allValid,
            studentId: studentId,
            totalEnrollments: student.enrollments.length,
            validEnrollments: validCount,
            results: verificationResults
        });

    } catch (err) {
        console.error('❌ Error verifying transcript:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;

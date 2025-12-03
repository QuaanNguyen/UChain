import express from 'express';
import mongoose from 'mongoose';
import Web3 from 'web3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// MongoDB Models
const enrollmentSchema = new mongoose.Schema({
  eid: Number,
  sid: Number,
  cid: Number,
  grade: String,
  status: String,
  enrollmentHash: String  // Track the blockchain hash for this enrollment
}, { collection: 'enrollments' });

const studentSchema = new mongoose.Schema({
  stid: Number,
  firstName: String,
  lastName: String,
  did: Number,
  email: String,
  enrollments: [String],
  currentHash: String
}, { collection: 'students' });

const classSchema = new mongoose.Schema({
  cid: Number,
  name: String,
  semester: String,
  pid: Number
}, { collection: 'classes' });

// Delete cached model to ensure we use the correct schema with enrollmentHash
if (mongoose.models.Enrollment) {
  delete mongoose.models.Enrollment;
}
const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);
const Class = mongoose.models.Class || mongoose.model('Class', classSchema);

// Web3 and Contract Setup
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.GANACHE_RPC || 'http://127.0.0.1:8545'));

let contract = null;
let accounts = [];

async function loadContract() {
  try {
    const deploymentPath = path.resolve(__dirname, '../../deployment.json');
    if (fs.existsSync(deploymentPath)) {
      const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
      contract = new web3.eth.Contract(deployment.abi, deployment.address);
      accounts = await web3.eth.getAccounts();
    }
  } catch (err) {
    console.warn('Deployment.json not found');
  }
}

loadContract();

/**
 * POST /api/enrollments
 * Create a new enrollment and sync with blockchain
 */
router.post('/', async (req, res) => {
  try {
    const { sid, cid, grade, status } = req.body;

    if (!contract) {
      return res.status(503).json({
        success: false,
        error: 'Blockchain contract not available'
      });
    }

    // Validate inputs
    if (!sid || !cid || !grade || !status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sid, cid, grade, status'
      });
    }

    // Validate grade options first
    const validGrades = ['A', 'B', 'C', 'D', 'F', 'NG'];
    if (!validGrades.includes(grade)) {
      return res.status(400).json({
        success: false,
        error: `Invalid grade. Must be one of: ${validGrades.join(', ')}`
      });
    }

    // Validate grade for Enrolled status
    if (status === 'Enrolled' && grade !== 'NG') {
      return res.status(400).json({
        success: false,
        error: 'Enrolled status must have grade "NG" (No Grade)'
      });
    }

    // Get next EID
    const lastEnrollment = await Enrollment.findOne().sort({ eid: -1 });
    const eid = lastEnrollment ? lastEnrollment.eid + 1 : 1;

    // Step 1: Store on blockchain and get hash
    const receipt = await contract.methods.storeEnrollment(
      sid, cid, grade, status
    ).send({
      from: accounts[0],
      gas: 3000000
    });

    const hash = receipt.events.EnrollmentStored.returnValues.id;

    // Step 2: Save to MongoDB with hash
    const newEnrollment = new Enrollment({ eid, sid, cid, grade, status, enrollmentHash: hash });
    await newEnrollment.save();

    // Step 3: Update student's enrollment array and currentHash
    const student = await Student.findOne({ stid: sid });
    if (student) {
      student.enrollments = student.enrollments || [];
      student.enrollments.push(hash);
      student.currentHash = hash;
      await student.save();
    }

    res.json({
      success: true,
      enrollment: { eid, sid, cid, grade, status },
      hash,
      message: 'Enrollment created and synced with blockchain'
    });

  } catch (err) {
    console.error('Error creating enrollment:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/enrollments/:eid
 * Update an existing enrollment and sync with blockchain
 */
router.put('/:eid', async (req, res) => {
  try {
    const eid = parseInt(req.params.eid);
    const { grade, status } = req.body;

    if (!contract) {
      return res.status(503).json({
        success: false,
        error: 'Blockchain contract not available'
      });
    }

    // Find existing enrollment
    const enrollment = await Enrollment.findOne({ eid });
    if (!enrollment) {
      return res.status(404).json({ success: false, error: 'Enrollment not found' });
    }

    // IMPORTANT: Store old hash BEFORE updating
    const oldHash = enrollment.enrollmentHash;

    // Validate grade options first (if grade is being updated)
    if (grade) {
      const validGrades = ['A', 'B', 'C', 'D', 'F', 'NG'];
      if (!validGrades.includes(grade)) {
        return res.status(400).json({
          success: false,
          error: `Invalid grade. Must be one of: ${validGrades.join(', ')}`
        });
      }
    }

    // Validate grade for Enrolled status
    const finalGrade = grade || enrollment.grade;
    const finalStatus = status || enrollment.status;
    
    if (finalStatus === 'Enrolled' && finalGrade !== 'NG') {
      return res.status(400).json({
        success: false,
        error: 'Enrolled status must have grade "NG" (No Grade)'
      });
    }

    // Update enrollment data
    if (grade) enrollment.grade = grade;
    if (status) enrollment.status = status;

    // Step 1: Store updated data on blockchain (creates new hash)
    const receipt = await contract.methods.storeEnrollment(
      enrollment.sid,
      enrollment.cid,
      enrollment.grade,
      enrollment.status
    ).send({
      from: accounts[0],
      gas: 3000000
    });

    const newHash = receipt.events.EnrollmentStored.returnValues.id;

    // Step 2: Update enrollment's hash field and save to MongoDB
    enrollment.enrollmentHash = newHash;
    await enrollment.save();

    // Step 3: Replace old hash with new hash (not add - this is an edit)
    const student = await Student.findOne({ stid: enrollment.sid });
    if (student) {
      student.enrollments = student.enrollments || [];

      if (oldHash) {
        // Find and replace the old hash directly by index
        const hashIndex = student.enrollments.indexOf(oldHash);
        if (hashIndex !== -1) {
          // Replace existing hash - this is an edit, so we replace, not add
          student.enrollments[hashIndex] = newHash;
        } else {
          // Old hash not in array - try to find by querying blockchain for matching sid/cid
          let found = false;
          for (let i = 0; i < student.enrollments.length; i++) {
            try {
              const hash = student.enrollments[i];
              const onChainData = await contract.methods.enrollments(hash).call();
              let oc_sid, oc_cid;
              if (Array.isArray(onChainData)) {
                [oc_sid, oc_cid] = onChainData;
              } else if (typeof onChainData === 'object' && onChainData !== null) {
                oc_sid = onChainData.sid;
                oc_cid = onChainData.cid;
              } else {
                continue;
              }
              const oc_sid_num = typeof oc_sid === 'bigint' ? Number(oc_sid) : parseInt(oc_sid);
              const oc_cid_num = typeof oc_cid === 'bigint' ? Number(oc_cid) : parseInt(oc_cid);
              if (oc_sid_num === enrollment.sid && oc_cid_num === enrollment.cid) {
                student.enrollments[i] = newHash;
                found = true;
                break;
              }
            } catch (err) {
              continue;
            }
          }
          if (!found) {
            console.warn(`Could not find old hash for enrollment eid:${eid} in student ${enrollment.sid} enrollments`);
          }
        }
      } else {
        // No old hash stored - check if hash for this enrollment already exists
        let hashExists = false;
        for (let i = 0; i < student.enrollments.length; i++) {
          try {
            const hash = student.enrollments[i];
            const onChainData = await contract.methods.enrollments(hash).call();
            let oc_sid, oc_cid;
            if (Array.isArray(onChainData)) {
              [oc_sid, oc_cid] = onChainData;
            } else if (typeof onChainData === 'object' && onChainData !== null) {
              oc_sid = onChainData.sid;
              oc_cid = onChainData.cid;
            } else {
              continue;
            }
            const oc_sid_num = typeof oc_sid === 'bigint' ? Number(oc_sid) : parseInt(oc_sid);
            const oc_cid_num = typeof oc_cid === 'bigint' ? Number(oc_cid) : parseInt(oc_cid);
            if (oc_sid_num === enrollment.sid && oc_cid_num === enrollment.cid) {
              student.enrollments[i] = newHash;
              hashExists = true;
              break;
            }
          } catch (err) {
            continue;
          }
        }
        // Only add if this enrollment's hash truly doesn't exist (shouldn't happen for edits)
        if (!hashExists) {
          console.warn(`No existing hash found for enrollment eid:${eid} - treating as new`);
          student.enrollments.push(newHash);
        }
      }

      student.currentHash = newHash;
      await student.save();
    }

    res.json({
      success: true,
      enrollment: enrollment.toObject(),
      newHash,
      message: 'Enrollment updated and synced with blockchain'
    });

  } catch (err) {
    console.error('Error updating enrollment:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/enrollments/classes
 * Get all available classes for dropdown
 */
router.get('/classes', async (req, res) => {
  try {
    const classes = await Class.find().select('cid name semester').limit(100);
    res.json({ success: true, classes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

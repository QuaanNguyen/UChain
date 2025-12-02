import express from "express";
import mongoose from "mongoose";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { toBlock } = require("../../blockchain/blockchain-tools/block-utils.js");

const router = express.Router();

// Enrollment schema
const enrollmentSchema = new mongoose.Schema(
  {
    sid: { type: String, required: true },
    cid: { type: String, required: true },
    grade: { type: String, default: null },
    status: { type: String, default: null },
    eidHash: { type: String, default: null },
  },
  {
    collection: "enrollments",
    timestamps: false,
  }
);

const Enrollment = mongoose.models.Enrollment || mongoose.model("Enrollment", enrollmentSchema);

// GET /api/enrollments - Get all enrollments
router.get("/", async (req, res) => {
  try {
    const enrollments = await Enrollment.find();

    res.json({
      success: true,
      count: enrollments.length,
      data: enrollments,
    });
  } catch (err) {
    console.error("❌ Error fetching enrollments:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/enrollments/push-to-blockchain - Push enrollments to blockchain
router.post("/push-to-blockchain", async (req, res) => {
  try {
    let enrollments = await Enrollment.find();
    if (enrollments.length === 0) {
      return res.json({
        success: false,
        message: "No enrollments available to push",
      });
    }

    const updated = [];
    for (let enr of enrollments) {
      const result = toBlock([enr]);
      const hash = result[0].hash;
      enr.eidHash = hash;
      await enr.save();

      updated.push({
        sid: enr.sid,
        cid: enr.cid,
        grade: enr.grade,
        status: enr.status,
        eidHash: hash,
      });
    }

    res.json({
      success: true,
      count: updated.length,
      message: "All enrollments successfully pushed to blockchain",
      data: updated,
    });
  } catch (err) {
    console.error("❌ Error pushing enrollments to blockchain:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

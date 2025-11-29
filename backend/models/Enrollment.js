// backend/routes/enrollmentRoutes.js
import express from "express";
import mongoose from "mongoose";
import { createRequire } from "module";

// Import blockchain utilities (CommonJS)
const require = createRequire(import.meta.url);
const { toBlock } = require("../../blockchain/blockchain-tools/block-utils.js");

const router = express.Router();

/**
 * Enrollment schema
 * Matches MongoDB UChainDataGen imported dataset
 */
const enrollmentSchema = new mongoose.Schema(
  {
    sid: { type: String, required: true },   // student ID
    cid: { type: String, required: true },   // class ID
    grade: { type: String, default: null },
    status: { type: String, default: null },

    // 🟢 IMPORTANT: field must exist in schema
    eidHash: { type: String, default: null },
  },
  {
    collection: "enrollments",
    timestamps: false,
  }
);

// Avoid overwrite error on hot reload
const Enrollment =
  mongoose.models.Enrollment ||
  mongoose.model("Enrollment", enrollmentSchema);

/**
 * ================================================
 * GET /api/enrollments
 * Fetch ALL enrollment records (no limit)
 * ================================================
 */
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

/**
 * ============================================================
 * POST /api/enrollments/push-to-blockchain
 *
 * Push every enrollment record to blockchain.
 * - DOES NOT ALTER `eid`
 * - ONLY writes `eidHash`
 * - Uses new toBlock() API → returns array [{ hash }]
 * ============================================================
 */
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
      // Generate blockchain hash (safe mode)
      const result = toBlock([enr]);
      const hash = result[0].hash;  // new API format

      // Save hash in MongoDB
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

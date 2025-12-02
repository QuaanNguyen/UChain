import express from "express";
import Enrollment from "../models/Enrollment.js";
import { toBlock, fromBlock } from "../blockchain-tools/block-utils.js";

const router = express.Router();

// GET /api/enrollments - Get all enrollments
router.get("/", async (req, res) => {
  try {
    const data = await Enrollment.find();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/enrollments/:hash - Get block by hash
router.get("/:hash", (req, res) => {
  const block = fromBlock(req.params.hash);
  if (!block) return res.status(404).json({ error: "Block not found" });
  res.json({ success: true, block });
});

// POST /api/enrollments/to-block - Push all enrollments to blockchain
router.post("/to-block", async (req, res) => {
  try {
    const enrollments = await Enrollment.find();
    if (enrollments.length === 0) {
      return res.json({
        success: false,
        message: "No enrollments found",
      });
    }

    const updatedBlocks = toBlock(enrollments);
    for (let enr of updatedBlocks) {
      await Enrollment.updateOne(
        { _id: enr._id },
        { $set: { eidHash: enr.eidHash } }
      );
    }

    res.json({
      success: true,
      message: "All enrollments successfully pushed to blockchain",
      count: updatedBlocks.length,
      data: updatedBlocks,
    });

  } catch (err) {
    console.error("❌ Error pushing enrollments:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

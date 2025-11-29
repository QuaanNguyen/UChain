import crypto from "crypto";

let blockchain = new Map();

/**
 * Convert enrollment objects into blockchain blocks.
 * - Creates a SHA256 hash based ONLY on relevant fields
 *   (sid, cid, grade, status)
 * - Stores clean enrollment data in blockchain memory
 * - Writes blockchain hash into enrollment.eidHash
 * - Does NOT modify enrollment.eid
 */
export function toBlock(enrollments) {
  const updated = [];

  for (const enr of enrollments) {
    // Create clean data for hashing (avoid mongoose internals)
    const cleanData = {
      sid: enr.sid,
      cid: enr.cid,
      grade: enr.grade,
      status: enr.status,
    };

    // Create raw JSON for hashing
    const raw = JSON.stringify(cleanData);

    // Generate SHA-256 hash
    const hash = crypto.createHash("sha256").update(raw).digest("hex");

    // Save clean copy into our in-memory blockchain
    blockchain.set(hash, cleanData);

    // Update enrollment object safely
    enr.eidHash = hash;     // <-- This is the ONLY write operation

    // Push output structure
    updated.push({
      _id: enr._id,
      ...cleanData,
      eidHash: hash,
      hash,
    });
  }

  return updated;
}

/**
 * Retrieve a block by its hash
 */
export function fromBlock(hash) {
  if (!blockchain.has(hash)) return null;

  return JSON.parse(JSON.stringify(blockchain.get(hash)));
}

/**
 * Export blockchain in-memory database
 */
export { blockchain };

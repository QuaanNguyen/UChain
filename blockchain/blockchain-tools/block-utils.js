import crypto from "crypto";

let blockchain = new Map();

// Convert enrollment objects to blockchain blocks with SHA256 hash
export function toBlock(enrollments) {
  const updated = [];

  for (const enr of enrollments) {
    const cleanData = {
      sid: enr.sid,
      cid: enr.cid,
      grade: enr.grade,
      status: enr.status,
    };

    const raw = JSON.stringify(cleanData);
    const hash = crypto.createHash("sha256").update(raw).digest("hex");

    blockchain.set(hash, cleanData);
    enr.eidHash = hash;

    updated.push({
      _id: enr._id,
      ...cleanData,
      eidHash: hash,
      hash,
    });
  }

  return updated;
}

// Retrieve a block by its hash
export function fromBlock(hash) {
  if (!blockchain.has(hash)) return null;
  return JSON.parse(JSON.stringify(blockchain.get(hash)));
}

export { blockchain };

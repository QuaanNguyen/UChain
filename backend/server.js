// backend/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Web3 from "web3";
import fs from "fs";
import path from "path";
import multer from "multer";
import csv from "csvtojson";
import { fileURLToPath } from "url";
import { createRequire } from "module";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Express App
const app = express();
app.use(cors());
app.use(express.json());

// Serve Frontend (so /enrollments.html etc. work)
app.use(express.static(path.join(__dirname, "../frontend")));

// ---------------------------------------------
// MongoDB Connection
// ---------------------------------------------
const mongoURI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/universityDB";

mongoose
  .connect(mongoURI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err.message));

// ---------------------------------------------
// Mongoose Models
// ---------------------------------------------

// Fees (existing)
const feeSchema = new mongoose.Schema({
  studentId: String,
  amount: Number,
  txnHash: String,
  timestamp: { type: Date, default: Date.now },
});
const Fee = mongoose.model("Fee", feeSchema);

// 👉 Enrollment model defined here so Enrollment.find() works
const enrollmentSchema = new mongoose.Schema(
  {
    eid: Number,       // enrollment id from generator
    sid: Number,       // student id
    cid: Number,       // class id
    grade: String,
    status: String,
    eidHash: String,   // optional: hash stored on-chain / block-utils
  },
  {
    collection: "enrollments", // use existing collection name
  }
);

const Enrollment = mongoose.model("Enrollment", enrollmentSchema);

// ---------------------------------------------
// Blockchain (Ganache) Connection
// ---------------------------------------------
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.GANACHE_RPC));

// Load ABI
const abiPath = path.join(__dirname, "../blockchain/FeesContractABI.json");
const feesABI = JSON.parse(fs.readFileSync(abiPath, "utf-8"));

// Smart Contract
const contractAddress = process.env.FEES_CONTRACT_ADDRESS;
const feesContract = new web3.eth.Contract(feesABI, contractAddress);

// ---------------------------------------------
// Multer for CSV upload
// ---------------------------------------------
const upload = multer({ dest: "uploads/" });

// ---------------------------------------------
// Blockchain Tools (CommonJS via createRequire)
// ---------------------------------------------
const require = createRequire(import.meta.url);
const { toBlock, fromBlock } = require(
  "../blockchain/blockchain-tools/block-utils.js"
);

// -------------------------------
// ROUTES
// -------------------------------

// Health Check
app.get("/", (req, res) => {
  res.send("Server is running ✅");
});

// ==============================
//  ENROLLMENTS API
// ==============================
app.get("/api/enrollments", async (req, res) => {
  try {
    const data = await Enrollment.find().limit(1000);
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    console.error("❌ Enrollment fetch error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// ==========================================
// PUSH ALL ENROLLMENTS TO BLOCKCHAIN  ⭐ ADDED HERE
// ==========================================
app.post("/api/enrollments/push-to-blockchain", async (req, res) => {
  try {
    let enrollments = await Enrollment.find();

    if (enrollments.length === 0) {
      return res.json({ success: false, message: "No enrollments to process" });
    }

    const updatedEnrollments = [];

    for (let enr of enrollments) {
      const hash = toBlock([enr], [])[0].eid;

      enr.eidHash = hash;
      await enr.save();

      updatedEnrollments.push({ eid: enr.eid, hash });
    }

    res.json({
      success: true,
      count: updatedEnrollments.length,
      message: "All enrollments pushed to blockchain",
      data: updatedEnrollments,
    });
  } catch (err) {
    console.error("❌ Enrollment blockchain upload error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// ==============================
// FEES API
// ==============================
app.post("/api/pay-fee", async (req, res) => {
  try {
    const { studentId, amount } = req.body;
    if (!studentId || !amount) {
      return res
        .status(400)
        .json({ success: false, error: "Missing fields" });
    }

    const accounts = await web3.eth.getAccounts();
    const from = accounts[0];

    const receipt = await feesContract.methods
      .payFee(studentId, parseInt(amount))
      .send({ from, gas: 3000000 });

    const feeDoc = await Fee.create({
      studentId,
      amount,
      txnHash: receipt.transactionHash,
    });

    res.json({
      success: true,
      message: "Fee stored on blockchain",
      txnHash: receipt.transactionHash,
      mongoId: feeDoc._id,
    });
  } catch (err) {
    console.error("❌ Pay fee error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================
// FEES LIST
// ==============================
app.get("/api/fees", async (req, res) => {
  try {
    const fees = await Fee.find().sort({ timestamp: -1 });
    res.json({ success: true, count: fees.length, data: fees });
  } catch (err) {
    console.error("❌ Fees fetch error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================
// IMPORT CSV → fees collection
// ==============================
app.post("/api/import-csv", upload.single("file"), async (req, res) => {
  try {
    const jsonArray = await csv().fromFile(req.file.path);
    await Fee.insertMany(jsonArray);
    res.json({ success: true, message: "CSV imported" });
  } catch (err) {
    console.error("❌ CSV error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================
// CREATE TABLE
// ==============================
app.post("/api/create-table", async (req, res) => {
  try {
    const { name } = req.body;
    await mongoose.connection.createCollection(name);
    res.json({ success: true, message: `${name} table created` });
  } catch (err) {
    console.error("❌ Create table error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================
// LIST TABLES
// ==============================
app.get("/api/tables", async (req, res) => {
  try {
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    res.json({ success: true, data: collections });
  } catch (err) {
    console.error("❌ List tables error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================
// BLOCKCHAIN BLOCKS
// ==============================
app.get("/api/blockchain-data", async (req, res) => {
  try {
    const latest = await web3.eth.getBlockNumber();
    const blocks = [];

    for (let i = latest; i > latest - 10 && i >= 0; i--) {
      const block = await web3.eth.getBlock(i);
      blocks.push({
        number: block.number,
        hash: block.hash,
        txCount: block.transactions.length,
        timestamp: new Date(block.timestamp * 1000).toLocaleString(),
      });
    }
    res.json({ success: true, data: blocks });
  } catch (err) {
    console.error("❌ Blockchain error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------
// START SERVER
// -------------------------------
const PORT = process.env.PORT || 5050;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

// MongoDB connection
const mongoURI = process.env.MONGO_URI;
mongoose
  .connect(mongoURI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err.message));

// Mongoose models
const feeSchema = new mongoose.Schema({
  studentId: String,
  amount: Number,
  txnHash: String,
  timestamp: { type: Date, default: Date.now },
});
const Fee = mongoose.model("Fee", feeSchema);

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

const Enrollment = mongoose.models.Enrollment || mongoose.model("Enrollment", enrollmentSchema);

// Blockchain connection
let web3, feesContract;
try {
  web3 = new Web3(new Web3.providers.HttpProvider(process.env.GANACHE_RPC));
  const abiPath = path.join(__dirname, "../blockchain/FeesContractABI.json");
  if (fs.existsSync(abiPath)) {
    const feesABI = JSON.parse(fs.readFileSync(abiPath, "utf-8"));
    const contractAddress = process.env.FEES_CONTRACT_ADDRESS;
    if (contractAddress) {
      feesContract = new web3.eth.Contract(feesABI, contractAddress);
    }
  }
} catch (err) {
  console.warn("⚠️  Blockchain setup incomplete:", err.message);
}

const upload = multer({ dest: "uploads/" });
const require = createRequire(import.meta.url);
const { toBlock, fromBlock } = require("../blockchain/blockchain-tools/block-utils.js");

import studentRoutes from "./routes/studentRoutes.js";

app.use("/api/student", studentRoutes);

// GET / - Health check
app.get("/", (req, res) => {
  res.send("Server is running ✅");
});

// GET /api/enrollments - Get all enrollments
app.get("/api/enrollments", async (req, res) => {
  try {
    const data = await Enrollment.find().limit(1000);
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    console.error("❌ Enrollment fetch error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/enrollments/push-to-blockchain - Push enrollments to blockchain
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

// POST /api/pay-fee - Pay fee and store on blockchain
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

// GET /api/fees - Get all fees
app.get("/api/fees", async (req, res) => {
  try {
    const fees = await Fee.find().sort({ timestamp: -1 });
    res.json({ success: true, count: fees.length, data: fees });
  } catch (err) {
    console.error("❌ Fees fetch error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/import-csv - Import CSV to fees collection
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

// POST /api/create-table - Create MongoDB collection
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

// GET /api/tables - List all MongoDB collections
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

// GET /api/blockchain-data - Get latest blockchain blocks
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

const PORT = process.env.PORT || 5050;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);

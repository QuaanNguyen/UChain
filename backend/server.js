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

// Setup for ES module path handling
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// ✅ MongoDB Connection
const mongoURI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/universityDB";

mongoose
  .connect(mongoURI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) =>
    console.error("❌ MongoDB Connection Error:", err.message)
  );

// ✅ Blockchain (Ganache) Connection
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.GANACHE_RPC));

// Load ABI
const abiPath = path.join(__dirname, "../blockchain/FeesContractABI.json");
const feesABI = JSON.parse(fs.readFileSync(abiPath, "utf-8"));

// Connect to deployed smart contract
const contractAddress = process.env.FEES_CONTRACT_ADDRESS;
const feesContract = new web3.eth.Contract(feesABI, contractAddress);

// ✅ MongoDB Schema for Fees
const feeSchema = new mongoose.Schema({
  studentId: String,
  amount: Number,
  txnHash: String,
  timestamp: { type: Date, default: Date.now },
});
const Fee = mongoose.model("Fee", feeSchema);

// ✅ Multer for CSV uploads
const upload = multer({ dest: "uploads/" });

// -----------------------------------------
// 🌐 ROUTES
// -----------------------------------------

// ✅ Health check route
app.get("/", (req, res) => {
  res.status(200).send("Server is running ✅");
});

// ✅ API: Pay Fee (Blockchain + DB)
app.post("/api/pay-fee", async (req, res) => {
  try {
    const { studentId, amount } = req.body;
    if (!studentId || !amount) {
      return res
        .status(400)
        .json({ success: false, error: "Missing studentId or amount" });
    }

    const accounts = await web3.eth.getAccounts();
    const from = accounts[0];

    // Send fee payment to blockchain
    const receipt = await feesContract.methods
      .payFee(studentId, parseInt(amount))
      .send({ from, gas: 3000000 });

    // Save transaction to MongoDB
    const newFee = await Fee.create({
      studentId,
      amount,
      txnHash: receipt.transactionHash,
    });

    res.json({
      success: true,
      message: "✅ Fee recorded successfully on blockchain",
      txnHash: receipt.transactionHash,
      mongoId: newFee._id,
    });
  } catch (err) {
    console.error("❌ Error processing /api/pay-fee:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ API: View all fee records
app.get("/api/fees", async (req, res) => {
  try {
    const fees = await Fee.find().sort({ timestamp: -1 });
    res.json({ success: true, count: fees.length, data: fees });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ API: Import CSV into MongoDB
app.post("/api/import-csv", upload.single("file"), async (req, res) => {
  try {
    const jsonArray = await csv().fromFile(req.file.path);
    await Fee.insertMany(jsonArray);
    res.json({ success: true, message: "📦 CSV imported successfully!" });
  } catch (err) {
    console.error("❌ Error importing CSV:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ API: Create new MongoDB collection
app.post("/api/create-table", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name)
      return res
        .status(400)
        .json({ success: false, error: "Table name is required" });

    await mongoose.connection.createCollection(name);
    res.json({ success: true, message: `🆕 Table '${name}' created successfully!` });
  } catch (err) {
    console.error("❌ Error creating table:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ API: List all collections (tables)
app.get("/api/tables", async (req, res) => {
  try {
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();

    // Mark which one is blockchain-related
    const tableList = collections.map((c) => ({
      name: c.name,
      onBlockchain: c.name.toLowerCase().includes("fee"),
    }));

    res.json({ success: true, data: tableList });
  } catch (err) {
    console.error("❌ Error listing tables:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ API: Fetch blockchain data (last 10 blocks)
app.get("/api/blockchain-data", async (req, res) => {
  try {
    const latestBlock = await web3.eth.getBlockNumber();
    const blocks = [];

    for (let i = latestBlock; i > Math.max(latestBlock - 10, 0); i--) {
      const block = await web3.eth.getBlock(i);
      blocks.push({
        number: block.number,
        hash: block.hash,
        transactions: block.transactions.length,
        miner: block.miner,
        timestamp: new Date(block.timestamp * 1000).toLocaleString(),
      });
    }

    res.json({ success: true, data: blocks });
  } catch (err) {
    console.error("❌ Error fetching blockchain data:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -----------------------------------------
// ✅ Start the server
// -----------------------------------------
const PORT = process.env.PORT || 5050;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

import mongoose from "mongoose";
import fs from "fs";
import Enrollment from "../models/Enrollment.js";

const mongoURI = "mongodb://127.0.0.1:27017/universityDB";

async function runImport() {
  try {
    console.log("⏳ Connecting to MongoDB...");
    await mongoose.connect(mongoURI);

    console.log("📂 Loading generated enrollment data...");
    const enrollments = JSON.parse(
      fs.readFileSync("./data-generator/Enrollments.json")
    );

    console.log("📉 Total enrollments generated: " + enrollments.length);

    // ---- LIMIT TO 100,000 DATA ----
    const LIMITED = enrollments.slice(0, 100000);
    console.log("📉 Limiting enrollments to: " + LIMITED.length);

    console.log("🗑️ Clearing old Enrollment records...");
    await Enrollment.deleteMany();

    console.log("📥 Inserting 100,000 Enrollment records in chunks...");

    // Chunk insert (safe for large data)
    const chunkSize = 5000;
    for (let i = 0; i < LIMITED.length; i += chunkSize) {
      const chunk = LIMITED.slice(i, i + chunkSize);
      await Enrollment.insertMany(chunk, { ordered: false });

      console.log(`   ✔️ Inserted ${i + chunk.length}/${LIMITED.length}`);
    }

    console.log("🎉 Done! 100,000 records imported successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Import failed:", err);
    process.exit(1);
  }
}

runImport();

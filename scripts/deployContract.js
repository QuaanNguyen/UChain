import Web3 from "web3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Verify Ganache is running and deployment.json is set up correctly
async function checkSetup() {
  try {
    const web3 = new Web3(
      new Web3.providers.HttpProvider(
        process.env.GANACHE_RPC || "http://127.0.0.1:8545"
      )
    );

    const isConnected = await web3.eth.net.isListening();
    if (!isConnected) {
      console.error("Cannot connect to Ganache at", process.env.GANACHE_RPC);
      console.error("\nMake sure Ganache is running:");
      console.error(
        "   npx ganache --port 8545 --quiet --miner.blockGasLimit 100000000"
      );
      process.exit(1);
    }

    console.log("Ganache is running");

    const deploymentPath = path.resolve(__dirname, "../deployment.json");
    if (fs.existsSync(deploymentPath)) {
      const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
      console.log("deployment.json exists");
      console.log("Contract address:", deployment.address);

      // Verify contract can be instantiated
      const contract = new web3.eth.Contract(
        deployment.abi,
        deployment.address
      );
      console.log("Contract ABI loaded successfully");
    } else {
      console.warn("deployment.json not found");
      console.log("\nTo deploy the contract and migrate enrollments, run:");
      console.log("   npm run migrate");
    }
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

checkSetup();

# UChain

**Hybrid Blockchain for Higher Education**

UChain is a blockchain-based record management system for universities that combines MongoDB for efficient data storage with Ethereum blockchain for immutable verification of student transcripts and enrollments.

## Features

- 🔐 **Blockchain Verification**: Verify student transcripts against on-chain data
- 📚 **Student Transcript Management**: View and manage academic records
- 🔗 **Hybrid Architecture**: MongoDB for fast queries, blockchain for verification
- 🎨 **Modern UI**: ASU-themed (Maroon & Gold) responsive interface

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express
- **Database**: MongoDB
- **Blockchain**: Ethereum (Ganache) + Solidity
- **Testing**: Python + pytest

## Prerequisites

- Node.js (v16 or higher)
- Python 3.8+
- MongoDB (local or Atlas)
- Ganache (for local blockchain)

## Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd UChain
```

### 2. Install Dependencies

**Backend:**
```bash
npm install
```

**Frontend:**
```bash
cd frontend
npm install
cd ..
```

**Python (for tests):**
```bash
pip install -r requirements.txt  # Create this if needed
# Or install manually:
pip install pytest pymongo web3 python-dotenv
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# MongoDB Connection
MONGO_URI=mongodb://127.0.0.1:27017/universityDB
# Or for MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# Ganache/Blockchain RPC URL
GANACHE_RPC=http://127.0.0.1:8545

# Server Port (optional, defaults to 5050)
PORT=5050
```

### 4. Setup Blockchain (Local Development)

**Step 1: Start Ganache**

Open a terminal and run (keep it running):
```bash
npx ganache --port 8545 --quiet --miner.blockGasLimit 100000000
```

**Step 2: Deploy Contract and Migrate Enrollments**

In a **new terminal**, run:
```bash
npm run migrate
# Or: node scripts/migrate_enrollments.js
```

This will:
- Compile and deploy the `EnrollmentRegistry` contract
- Store enrollments on the blockchain
- Update `deployment.json` with contract address and ABI
- Update student enrollment hashes

**Step 3: (Optional) Populate Enrollment Hashes**

If you need to sync existing enrollment hashes:
```bash
node scripts/populate_enrollment_hashes.js
```

**Note:** Ganache must be running before running migration scripts or starting the backend.

### 5. Setup Database

1. Ensure MongoDB is running (local or Atlas)
2. Migrate data to MongoDB:
   ```bash
   node scripts/migrate_to_mongodb.js
   ```

### 6. Run the Application

**Backend:**
```bash
npm start
# Or: node backend/server.js
```

**Frontend:**
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: `http://localhost:5173` (or Vite's default port)
- Backend API: `http://localhost:5050`

## Testing

Run the test suite:

```bash
# MongoDB tests
pytest tests/test_mongodb.py -v

# Blockchain tests
pytest tests/test_blockchain.py -v
```

**Note**: Ensure Ganache is running and MongoDB is accessible before running tests.

## Project Structure

```
UChain/
├── backend/
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API routes
│   └── server.js        # Express server
├── blockchain/
│   └── blockchain-tools/ # Blockchain utilities
├── contracts/           # Solidity smart contracts
├── data-generator/      # Sample data (JSON files)
├── frontend/            # React frontend
├── scripts/             # Migration and setup scripts
└── tests/               # Test files
```

## API Endpoints

- `GET /api/student/:stid` - Get student information
- `POST /api/student/verify-transcript` - Verify student transcript against blockchain
- `GET /api/enrollments` - Get all enrollments

## Security Notes

- Never commit `.env` files with real credentials
- Use environment variables for all sensitive data
- The `deployment.json` file contains contract address and ABI (safe to commit)

## License

See LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

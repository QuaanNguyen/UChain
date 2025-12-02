import fs from 'fs';
import path from 'path';
import solc from 'solc';
import Ganache from 'ganache';
import { Web3 } from 'web3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTRACT_PATH = path.resolve(__dirname, '../contracts/EnrollmentRegistry.sol');
const ENROLLMENTS_PATH = path.resolve(__dirname, '../data-generator/Enrollments.json');
const STUDENTS_PATH = path.resolve(__dirname, '../data-generator/Students.json');

// Migrate enrollments to blockchain
async function main() {
    console.log("Starting migration...");

    const web3 = new Web3("http://127.0.0.1:8545");
    const accounts = await web3.eth.getAccounts();
    const deployer = accounts[0];
    console.log(`Using account: ${deployer}`);

    console.log("Compiling contract...");
    const source = fs.readFileSync(CONTRACT_PATH, 'utf8');
    const input = {
        language: 'Solidity',
        sources: {
            'EnrollmentRegistry.sol': {
                content: source,
            },
        },
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            },
            evmVersion: 'paris',
            outputSelection: {
                '*': {
                    '*': ['*'],
                },
            },
        },
    };

    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        output.errors.forEach(err => {
            console.error(err.formattedMessage);
        });
        if (output.errors.some(err => err.severity === 'error')) {
            throw new Error("Compilation failed");
        }
    }

    const contractFile = output.contracts['EnrollmentRegistry.sol']['EnrollmentRegistry'];
    const abi = contractFile.abi;
    const bytecode = contractFile.evm.bytecode.object;

    console.log("Deploying contract...");
    const contract = new web3.eth.Contract(abi);
    const deployTx = contract.deploy({
        data: bytecode,
        arguments: []
    });

    const deployedContract = await deployTx.send({
        from: deployer,
        gas: 3000000,
    });

    console.log(`Contract deployed at: ${deployedContract.options.address}`);

    console.log("Reading data...");
    const enrollments = JSON.parse(fs.readFileSync(ENROLLMENTS_PATH, 'utf8'));
    let students = JSON.parse(fs.readFileSync(STUDENTS_PATH, 'utf8'));

    const eidToHash = new Map();
    const sidToHashes = new Map();

    console.log(`Migrating ${enrollments.length} enrollments...`);

    for (const enr of enrollments) {
        try {
            const gasEstimate = await deployedContract.methods.storeEnrollment(
                enr.sid,
                enr.cid,
                enr.grade,
                enr.status
            ).estimateGas({ from: deployer });

            const receipt = await deployedContract.methods.storeEnrollment(
                enr.sid,
                enr.cid,
                enr.grade,
                enr.status
            ).send({
                from: deployer,
                gas: Math.floor(Number(gasEstimate) * 1.5)
            });

            const event = receipt.events.EnrollmentStored;
            const hash = event.returnValues.id;

            eidToHash.set(enr.eid, hash);
            if (!sidToHashes.has(enr.sid)) {
                sidToHashes.set(enr.sid, []);
            }
            sidToHashes.get(enr.sid).push(hash);

            if (enr.eid % 100 === 0) process.stdout.write('.');
        } catch (error) {
            console.error(`Failed to migrate enrollment eid: ${enr.eid}`, enr);
            console.error(error);
            throw error;
        }
    }
    console.log("\nEnrollments migrated.");

    console.log("Updating Students.json...");
    for (const student of students) {
        const newEnrollments = sidToHashes.get(student.stid) || [];
        student.enrollments = newEnrollments;
        student.currentHash = newEnrollments.length > 0 ? newEnrollments[newEnrollments.length - 1] : "";
    }

    fs.writeFileSync(STUDENTS_PATH, JSON.stringify(students, null, 2));
    console.log("Students.json updated.");

    const deploymentInfo = {
        address: deployedContract.options.address,
        abi: abi
    };
    fs.writeFileSync(path.resolve(__dirname, '../deployment.json'), JSON.stringify(deploymentInfo, null, 2));
    console.log("deployment.json saved.");
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});

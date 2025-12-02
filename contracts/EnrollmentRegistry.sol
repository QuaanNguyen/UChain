// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EnrollmentRegistry {
    struct EnrollmentData {
        uint256 sid;
        uint256 cid;
        string grade;
        string status;
    }

    mapping(bytes32 => EnrollmentData) public enrollments;

    event EnrollmentStored(bytes32 indexed id, uint256 sid, uint256 cid);

    // Store enrollment and return unique hash
    function storeEnrollment(uint256 sid, uint256 cid, string memory grade, string memory status) public returns (bytes32) {
        bytes32 hash = keccak256(abi.encodePacked(sid, cid, grade, status, block.timestamp));
        enrollments[hash] = EnrollmentData(sid, cid, grade, status);
        emit EnrollmentStored(hash, sid, cid);
        return hash;
    }
}

export interface Student {
    stid: number;
    firstName: string;
    lastName: string;
    email: string;
    currentHash: string;
    enrollmentHashes: string[];
}

export interface University {
    uid: number;
    name: string;
}

export interface School {
    sid: number;
    name: string;
}

export interface Department {
    did: number;
    name: string;
}

export interface Advisor {
    aid: number;
    name: string;
}

export interface Transcript {
    eid: number;
    className: string;
    semester: string;
    grade: string;
    status: string;
    cid: number;
}

export interface StudentData {
    success: boolean;
    student: Student;
    university: University | null;
    school: School | null;
    department: Department | null;
    advisor: Advisor | null;
    transcripts: Transcript[];
}

export interface VerificationResult {
    success: boolean;
    verified: boolean;
    studentId: number;
    totalEnrollments: number;
    validEnrollments: number;
    results: any[];
}

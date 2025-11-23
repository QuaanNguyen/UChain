let numUniversities = 5;
let averageNumSchools = 5;
let averageNumDepartments = 4;
let averageNumAdvisors = 5;
let averageNumStudents = 2000;
let averageNumProfessors = 20;
let averageNumClasses = 5;
let averageEnrollments = 5;

let currentSemester = "F25";
let classStart = "F25";
let classEnd = "SP26";

const classNames = [
  "Data Structures", "Algorithms", "Operating Systems", "Databases",
  "Networks", "Artificial Intelligence", "Machine Learning", "Cybersecurity",
  "Quantum Computing", "Software Engineering", "Computer Graphics",
  "Compiler Design", "Distributed Systems", "Cloud Computing", "Web Development"
];
const timeSlots = [
  "8:00-9:15", "9:30-10:45", "11:00-12:15", "12:30-1:45",
  "2:00-3:15", "3:30-4:45", "5:00-6:15", "6:30-7:45"
];
const dayPairs = ["M/W", "T/Th"];
const semesterOrder = ["SP", "SU", "F"];

const validSemesters = generateSemesterList(classStart, classEnd);

//------------------------------------------------------------------------------------------------

class University {
  constructor(name, uid, schools) {
    this.name = name;
    this.uid = uid;
    this.schools = schools;
  }
}

class School {
  constructor(name, sid, departments) {
    this.name = name;
    this.sid = sid;
    this.departments = departments;
  }
}

class Department {
  constructor(name, did) {
    this.name = name;
    this.did = did;
  }
}

class Advisor {
  constructor(name, aid, did, students) {
    this.name = name;
    this.aid = aid;
    this.did = did;
    this.students = students;
  }
}

class Student {
  constructor(firstName, lastName, stid, did, email, enrollments) {
    this.firstName = firstName;
    this.lastName = lastName;
    this.stid = stid;
    this.did = did;
    this.email = email;
    this.enrollments = enrollments;
  }
}

class Professor {
  constructor(firstName, lastName, pid, did, email, classes, title) {
    this.firstName = firstName;
    this.lastName = lastName;
    this.pid = pid;
    this.did = did;
    this.email = email;
    this.classes = classes;
    this.title = title;
  }
}

class Class {
  constructor(cid, name, pid, time, days, room, semester) {
    this.cid = cid;
    this.name = name;
    this.pid = pid;
    this.time = time;
    this.days = days;
    this.room = room;
    this.semester = semester;
  }
}

class Enrollment {
  constructor(eid, sid, cid, grade, status) {
    this.eid = eid;
    this.sid = sid;
    this.cid = cid;
    this.grade = grade;
    this.status = status;
  }
}

let departments = [new Department("SCAI", 1)];
let schools = [new School("FSE", 1, [departments[0].did])];
let universities = [
  new University("ASU", 1, [schools[0].sid]),
  new University("SU", 2, []),
  new University("MIT", 3, [])
];
let students = [new Student("Jett", "Bauman", 1, 1, "jettbauman@asu.edu", [])];
let advisors = [new Advisor("Wendy", 1, 1, [students[0].stid])];
let professors = [new Professor("Rida", "Bazzi", 1, 1, "rb@asu.edu", [], "Professor BasedHD")];
let classes = [];
let enrollments = [];

//------------------------------------------------------------------------------------------------

function randomName(prefix) {
  const suffixes = ["Tech", "Institute", "College", "University", "Academy"];
  return `${prefix} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
}

function generateAroundAverage(avg) {
  let deviation = Math.floor(Math.random() * 3) - 1;
  return Math.max(1, avg + deviation);
}

function randomFirstName() {
  const firstNames = ["Alex", "Jordan", "Taylor", "Morgan", "Jamie", "Chris", "Casey", "Riley", "Drew", "Skyler"];
  return firstNames[Math.floor(Math.random() * firstNames.length)];
}

function randomLastName() {
  const lastNames = ["Smith", "Johnson", "Lee", "Brown", "Garcia", "Martinez", "Miller", "Davis", "Wilson", "Anderson"];
  return lastNames[Math.floor(Math.random() * lastNames.length)];
}

function randomProfFirstName() {
  const firstNames = ["Albert", "Beatrice", "Charles", "Dorothy", "Edward", "Florence", "George", "Helen", "Isaac", "Julia"];
  return firstNames[Math.floor(Math.random() * firstNames.length)];
}

function randomProfLastName() {
  const lastNames = ["Blackwell", "Cartwright", "Donovan", "Ellington", "Fairchild", "Grayson", "Harrington", "Ingram", "Jefferson", "Kingsley"];
  return lastNames[Math.floor(Math.random() * lastNames.length)];
}

function randomPosition() {
  const positions = ["Associate Professor", "Tenured Professor", "Junior Professor", "Senior Professor", "Professor"];
  return positions[Math.floor(Math.random() * positions.length)];
}

function randomDegree() {
  const degrees = ["PhD", "MS", "EdD", "ScD"];
  return degrees[Math.floor(Math.random() * degrees.length)];
}

function getUniversityForDepartment(did) {
  for (let uni of universities) {
    for (let sid of uni.schools) {
      let school = schools.find(s => s.sid === sid);
      if (!school) continue;
      if (school.departments.includes(did)) {
        return uni;
      }
    }
  }
  return null;
}

function randomRoom() {
  const buildings = ["ENG", "PSA", "GWC", "BYAC", "CTR", "ECG", "CDL"];
  const num = Math.floor(Math.random() * 400) + 100;
  return `${buildings[Math.floor(Math.random() * buildings.length)]} ${num}`;
}

function parseSemester(sem) {
  for (let prefix of semesterOrder) {
    if (sem.startsWith(prefix)) {
      const yearStr = sem.slice(prefix.length);
      const year = parseInt(yearStr);
      if (!isNaN(year)) {
        return { prefix, year, yearStr };
      }
    }
  }
  throw new Error(`Invalid semester format: ${sem}`);
}

function generateSemesterList(start, end) {
  const startParsed = parseSemester(start);
  const endParsed = parseSemester(end);
  const semesters = [];
  const startYear = startParsed.year;
  const endYear = endParsed.year;
  const startIndex = semesterOrder.indexOf(startParsed.prefix);
  const endIndex = semesterOrder.indexOf(endParsed.prefix);

  for (let y = startYear; y <= endYear; y++) {
    for (let s of semesterOrder) {
      const sIndex = semesterOrder.indexOf(s);
      if (y === startYear && sIndex < startIndex) continue;
      if (y === endYear && sIndex > endIndex) continue;
      const yearFormatted = y.toString().padStart(2, '0');
      semesters.push(`${s}${yearFormatted}`);
    }
  }
  return semesters;
}

function randomGrade() {
  const grades = ["A", "B", "C", "D", "F"];
  return grades[Math.floor(Math.random() * grades.length)];
}

function randomStatus(statusList) {
  return statusList[Math.floor(Math.random() * statusList.length)];
}

function parseSemesterForCompare(sem) {
  for (let prefix of semesterOrder) {
    if (sem.startsWith(prefix)) {
      const yearStr = sem.slice(prefix.length);
      const year = parseInt(yearStr);
      if (!isNaN(year)) {
        return { index: semesterOrder.indexOf(prefix), year };
      }
    }
  }
  throw new Error(`Invalid semester format: ${sem}`);
}

function compareSemesters(a, b) {
  const parsedA = parseSemesterForCompare(a);
  const parsedB = parseSemesterForCompare(b);
  const semA = parsedA.index + parsedA.year * 10;
  const semB = parsedB.index + parsedB.year * 10;
  if (semA < semB) return -1;
  if (semA > semB) return 1;
  return 0;
}

//------------------------------------------------------------------------------------------------

let deptIdToUniversity = new Map();
let classesBySemester = new Map();

function buildDeptToUniversityMap() {
  deptIdToUniversity = new Map();
  const schoolBySid = new Map();
  for (const s of schools) schoolBySid.set(s.sid, s);

  for (const uni of universities) {
    for (const sid of uni.schools) {
      const school = schoolBySid.get(sid);
      if (!school) continue;
      for (const did of school.departments) {
        if (!deptIdToUniversity.has(did)) deptIdToUniversity.set(did, uni);
      }
    }
  }
}

function fastGetUniversityForDepartment(did) {
  return deptIdToUniversity.get(did) || null;
}

function buildClassesBySemesterMap() {
  classesBySemester = new Map();
  for (const c of classes) {
    const arr = classesBySemester.get(c.semester);
    if (!arr) classesBySemester.set(c.semester, [c]);
    else arr.push(c);
  }
}

function sampleWithoutReplacement(arr, k) {
  const n = arr.length;
  if (k >= n) return arr.slice(0);
  const res = new Array(k);
  const used = new Set();
  let i = 0;
  while (i < k) {
    const idx = Math.floor(Math.random() * n);
    if (!used.has(idx)) {
      used.add(idx);
      res[i++] = arr[idx];
    }
  }
  return res;
}

//------------------------------------------------------------------------------------------------

function generateUniversities() {
  let currentCount = universities.length;

  for (let i = currentCount + 1; i <= numUniversities; i++) {
    const uniName = randomName(`University ${i}`);
    const newUni = new University(uniName, i, []);
    universities.push(newUni);
  }
}

function generateSchools() {
  let nextSID = Math.max(...schools.map(s => s.sid), 0) + 1;

  universities.forEach(university => {
    let needed = generateAroundAverage(averageNumSchools);
    let existingCount = university.schools.length;
    let toGenerate = needed - existingCount;

    for (let i = university.schools.length; i < toGenerate; i++) {
      const schoolName = randomName(`(${university.name}) School ${i+1}`);
      const newSchool = new School(schoolName, nextSID, []);
      schools.push(newSchool);
      university.schools.push(nextSID);
      nextSID++;
    }
  });
}

function generateDepartments() {
  let nextDID = Math.max(...departments.map(d => d.did), 0) + 1;

  schools.forEach(school => {
    let needed = generateAroundAverage(averageNumDepartments);
    let existingCount = school.departments.length;
    let toGenerate = needed - existingCount;

    for (let i = school.departments.length; i < toGenerate; i++) {
      const deptName = randomName(`(${school.name}) Dept ${i+1}`);
      const newDept = new Department(deptName, nextDID);
      departments.push(newDept);
      school.departments.push(nextDID);
      nextDID++;
    }
  });
}

function generateAdvisors() {
  let nextAID = Math.max(...advisors.map(a => a.aid), 0) + 1;

  departments.forEach(department => {
    let neededAdvisors = generateAroundAverage(averageNumAdvisors);

    for (let i = 0; i < neededAdvisors; i++) {
      const advisorName = `${department.name} Advisor ${i + 1}`;
      const newAdvisor = new Advisor(advisorName, nextAID, department.did, []);
      advisors.push(newAdvisor);
      nextAID++;
    }
  });
}

function generateProfessors() {
  let nextPID = Math.max(0, ...professors.map(p => p.pid)) + 1;

  for (const dept of departments) {
    const numProfs = generateAroundAverage(averageNumProfessors);

    for (let i = 0; i < numProfs; i++) {
      const firstName = randomProfFirstName();
      const lastName = randomProfLastName();
      const pid = nextPID++;

      const university = fastGetUniversityForDepartment(dept.did) || getUniversityForDepartment(dept.did);
      const emailDomain = university ? university.name.replace(/\s+/g, '').toLowerCase() + ".edu" : "unknown.edu";
      const email = `${firstName.toLowerCase()}${lastName.toLowerCase()}${pid}@${emailDomain}`;

      const title = `${randomPosition()}, ${randomDegree()}`;

      const newProf = new Professor(firstName, lastName, pid, dept.did, email, [], title);
      professors.push(newProf);
    }
  }
}

function generateStudents() {
  let nextSTID = Math.max(0, ...students.map(s => s.stid)) + 1;

  const advisorsByDept = new Map();
  for (const a of advisors) {
    if (!advisorsByDept.has(a.did)) advisorsByDept.set(a.did, []);
    advisorsByDept.get(a.did).push(a);
  }

  for (const dept of departments) {
    const numStudents = generateAroundAverage(averageNumStudents);
    const deptAdvisors = advisorsByDept.get(dept.did) || [];

    if (deptAdvisors.length === 0) continue;

    let advisorIndex = 0;

    for (let i = 0; i < numStudents; i++) {
      const firstName = randomFirstName();
      const lastName = randomLastName();
      const stid = nextSTID++;

      const university = fastGetUniversityForDepartment(dept.did) || getUniversityForDepartment(dept.did);
      const emailDomain = university ? university.name.replace(/\s+/g, '').toLowerCase() + ".edu" : "unknown.edu";
      const email = `${firstName.toLowerCase()}${lastName.toLowerCase()}${stid}@${emailDomain}`;

      const newStudent = new Student(firstName, lastName, stid, dept.did, email, []);
      students.push(newStudent);

      const advisor = deptAdvisors[advisorIndex];
      advisor.students.push(stid);

      advisorIndex = (advisorIndex + 1) % deptAdvisors.length;
    }
  }
}

function generateClasses() {
  let nextCID = Math.max(0, ...classes.map(c => c.cid)) + 1;
  const totalClasses = [];
  const assignedSlotsMap = new Map();

  for (const prof of professors) {
    for (const semester of validSemesters) {
      const key = `${prof.pid}::${semester}`;
      const assignedSlots = new Set();
      assignedSlotsMap.set(key, assignedSlots);

      const numClasses = generateAroundAverage(averageNumClasses);

      for (let i = 0; i < numClasses; i++) {
        let className = classNames[Math.floor(Math.random() * classNames.length)];
        let time, days;
        let tries = 0;

        do {
          time = timeSlots[Math.floor(Math.random() * timeSlots.length)];
          days = dayPairs[Math.floor(Math.random() * dayPairs.length)];
          tries++;
        } while (assignedSlots.has(`${time}-${days}`) && tries < 20);

        if (assignedSlots.has(`${time}-${days}`)) {
          continue;
        }

        assignedSlots.add(`${time}-${days}`);
        const room = randomRoom();
        const newClass = new Class(nextCID++, className, prof.pid, time, days, room, semester);
        classes.push(newClass);
        prof.classes.push(newClass.cid);
        totalClasses.push(newClass);
      }
    }
  }

  return totalClasses;
}

function generateEnrollments() {
  let nextEID = 1;
  buildClassesBySemesterMap();
  const localStudents = students;

  for (const student of localStudents) {
    for (const semester of validSemesters) {
      const semesterClasses = classesBySemester.get(semester);
      if (!semesterClasses || semesterClasses.length === 0) continue;

      const numEnroll = Math.min(generateAroundAverage(averageEnrollments), semesterClasses.length);

      const selectedClasses = sampleWithoutReplacement(semesterClasses, numEnroll);

      for (const cls of selectedClasses) {
        let status, grade;

        if (compareSemesters(cls.semester, currentSemester) > 0) {
          status = "Enrolled";
          grade = "NG";
        } else if (cls.semester === currentSemester) {
          status = randomStatus(["Attending", "Withdrawn", "Dropped"]);
          grade = randomGrade();
        } else {
          status = randomStatus(["Completed-Passed", "Completed-Withdrawn", "Completed-Dropped"]);
          grade = randomGrade();
        }

        const newEnroll = new Enrollment(nextEID++, student.stid, cls.cid, grade, status);
        enrollments.push(newEnroll);
        student.enrollments.push(newEnroll.eid);
      }
    }
  }
}

//------------------------------------------------------------------------------------------------

function generateData() {
  generateUniversities();
  console.log("Universities Done");

  generateSchools();
  console.log("Schools Done");

  generateDepartments();
  console.log("Departments Done");

  buildDeptToUniversityMap();

  generateAdvisors();
  console.log("Advisors Done");

  generateProfessors();
  console.log("Professors Done");

  generateStudents();
  console.log("Students Done");

  generateClasses();
  console.log("Classes Done");

  generateEnrollments();
  console.log("Enrollments Done");

  console.log("All data generation complete.");
}


generateData();


/*console.log("Universities:", universities);
console.log("-----------------------------");
console.log("Schools:", schools);
console.log("-----------------------------");
console.log("Departments:", departments);
console.log("-----------------------------");
console.log("Advisors:", advisors);
console.log("-----------------------------");
console.log("Students:", students);
console.log("-----------------------------");
console.log("Professors:", professors);
console.log("-----------------------------");
console.log("Classes:", classes);
console.log("-----------------------------");
console.log("Enrollments:", enrollments);*/


const arrays = {
    Universities: universities,
    Schools: schools,
    Departments: departments,
    Advisors: advisors,
    Students: students,
    Professors: professors,
    Classes: classes,
    Enrollments: enrollments
};

console.log("Array Sizes:");
console.log("-----------------------------");
for (const [name, arr] of Object.entries(arrays)) {
    console.log(`${name}: ${arr.length}`);
}
console.log("-----------------------------");


const fs = require('fs');

for (const [name, arr] of Object.entries(arrays)) {
    const filename = `${name}.json`;
    fs.writeFileSync(filename, JSON.stringify(arr, null, 2), 'utf8');
    console.log(`Saved ${filename}`);
}

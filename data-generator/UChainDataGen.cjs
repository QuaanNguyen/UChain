let numUniversities = 3;
let averageNumSchools = 5;
let averageNumDepartments = 3;
let averageNumAdvisors = 2;
let averageNumStudents = 4000;
let averageNumProfessors = 30;
let averageNumClasses = 8;
let averageEnrollments = 5;

let currentSemester = "F25";
let classStart = "F22";
let classEnd = "F26";

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

function generateSemesterList(start, end) {
  const semesters = [];
  const startYear = parseInt(start.slice(2));
  const endYear = parseInt(end.slice(2));
  const startIndex = semesterOrder.indexOf(start.slice(0, 2));
  const endIndex = semesterOrder.indexOf(end.slice(0, 2));

  for (let y = startYear; y <= endYear; y++) {
    for (let s of semesterOrder) {
      if (y === startYear && semesterOrder.indexOf(s) < startIndex) continue;
      if (y === endYear && semesterOrder.indexOf(s) > endIndex) continue;
      semesters.push(`${s}${y}`);
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

function compareSemesters(a, b) {
  const semA = semesterOrder.indexOf(a.slice(0, 2)) + parseInt(a.slice(2)) * 10;
  const semB = semesterOrder.indexOf(b.slice(0, 2)) + parseInt(b.slice(2)) * 10;
  if (semA < semB) return -1;
  if (semA > semB) return 1;
  return 0;
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

  departments.forEach(dept => {
    const numProfs = generateAroundAverage(averageNumProfessors);

    for (let i = 0; i < numProfs; i++) {
      const firstName = randomProfFirstName();
      const lastName = randomProfLastName();
      const pid = nextPID++;

      const university = getUniversityForDepartment(dept.did);
      const emailDomain = university ? university.name.replace(/\s+/g, '').toLowerCase() + ".edu" : "unknown.edu";
      const email = `${firstName.toLowerCase()}${lastName.toLowerCase()}${pid}@${emailDomain}`;

      const title = `${randomPosition()}, ${randomDegree()}`;

      const newProf = new Professor(firstName, lastName, pid, dept.did, email, [], title);
      professors.push(newProf);
    }
  });
}

function generateStudents() {
  let nextSTID = Math.max(0, ...students.map(s => s.stid)) + 1;

  departments.forEach(dept => {
    const numStudents = generateAroundAverage(averageNumStudents);
    const deptAdvisors = advisors.filter(a => a.did === dept.did);

    if (deptAdvisors.length === 0) return;

    let advisorIndex = 0;

    for (let i = 0; i < numStudents; i++) {
      const firstName = randomFirstName();
      const lastName = randomLastName();
      const stid = nextSTID++;

      const university = getUniversityForDepartment(dept.did);
      const emailDomain = university ? university.name.replace(/\s+/g, '').toLowerCase() + ".edu" : "unknown.edu";
      const email = `${firstName.toLowerCase()}${lastName.toLowerCase()}${stid}@${emailDomain}`;

      const newStudent = new Student(firstName, lastName, stid, dept.did, email, []);
      students.push(newStudent);

      const advisor = deptAdvisors[advisorIndex];
      advisor.students.push(stid);

      advisorIndex = (advisorIndex + 1) % deptAdvisors.length;
    }
  });
}

function generateClasses() {
  let nextCID = Math.max(0, ...classes.map(c => c.cid)) + 1;
  const totalClasses = [];

  professors.forEach(prof => {
    validSemesters.forEach(semester => {
      const numClasses = generateAroundAverage(averageNumClasses);
      const assignedSlots = new Set(
        classes
          .filter(c => c.pid === prof.pid && c.semester === semester)
          .map(c => `${c.time}-${c.days}`)
      );

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
    });
  });

  return totalClasses;
}

function generateEnrollments() {
  let nextEID = 1;

  students.forEach(student => {
    validSemesters.forEach(semester => {
      const semesterClasses = classes.filter(c => c.semester === semester);
      const numEnroll = Math.min(generateAroundAverage(averageEnrollments), semesterClasses.length);

      const shuffled = semesterClasses.sort(() => 0.5 - Math.random());
      const selectedClasses = shuffled.slice(0, numEnroll);

      selectedClasses.forEach(cls => {
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
      });
    });
  });
}

//------------------------------------------------------------------------------------------------

function generateData() {
  generateUniversities();
  generateSchools();
  generateDepartments();
  generateAdvisors();
  generateProfessors();
  generateStudents();
  generateClasses();
  generateEnrollments();
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
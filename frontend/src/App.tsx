import { useState, useMemo } from "react";
import "./App.css";
import { StudentData, VerificationResult } from "./types";

const API_BASE = "http://localhost:5050/api";

function App() {
  const [studentId, setStudentId] = useState("");
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] =
    useState<VerificationResult | null>(null);

  // Generate icon positions once
  const iconPositions = useMemo(() => {
    const icons = ["🎓", "📚", "✏️", "📖", "🏆", "🎯", "💡", "🔬", "🌟"];
    return icons.map((icon) => ({
      icon,
      left: Math.random() * 100,
      top: Math.random() * 100,
      rotation: Math.random() * 60 - 30,
    }));
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) return;

    setLoading(true);
    setVerificationResult(null);

    try {
      const response = await fetch(`${API_BASE}/student/${studentId}`);
      const data = await response.json();

      if (data.success) {
        setStudentData(data);
      } else {
        alert("Student not found");
      }
    } catch (error) {
      alert("Error fetching student data");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!studentData) return;

    setVerifying(true);

    try {
      const response = await fetch(`${API_BASE}/student/verify-transcript`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stid: studentData.student.stid }),
      });

      const result = await response.json();

      // Handle error responses
      if (!response.ok || !result.success) {
        setVerificationResult({
          success: false,
          verified: false,
          studentId: studentData.student.stid,
          totalEnrollments: 0,
          validEnrollments: 0,
          results: [],
          error: result.error || "Verification failed",
        });
        return;
      }

      setVerificationResult(result);
    } catch (error) {
      console.error("Verification error:", error);
      setVerificationResult({
        success: false,
        verified: false,
        studentId: studentData?.student?.stid || 0,
        totalEnrollments: 0,
        validEnrollments: 0,
        results: [],
        error: error instanceof Error ? error.message : "Verification error",
      });
    } finally {
      setVerifying(false);
    }
  };

  const getGradeClass = (grade: string) => {
    const g = grade.toUpperCase();
    if (g === "A") return "grade-a";
    if (g === "B") return "grade-b";
    if (g === "C") return "grade-c";
    return "grade-d";
  };

  return (
    <div className="app">
      <div className="icon-background">
        {iconPositions.map((item, i) => (
          <div
            key={i}
            className="academic-icon"
            style={{
              left: `${item.left}%`,
              top: `${item.top}%`,
              transform: `rotate(${item.rotation}deg)`,
            }}
          >
            {item.icon}
          </div>
        ))}
      </div>

      <div className="container">
        <header>
          <h1 style={{ fontSize: "60px" }}>UChain</h1>
          <p className="subtitle">Hybrid Blockchain for Higher Education</p>
        </header>

        <form onSubmit={handleSearch} className="search-form">
          <div className="input-group">
            <label htmlFor="studentId">Student ID</label>
            <input
              type="number"
              id="studentId"
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="Enter Student ID (e.g., 1)"
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? "Loading..." : "Search Student"}
          </button>
        </form>

        {studentData && (
          <div className="student-data-container">
            <div className="left-panel">
              <div className="student-header">
                <span className="student-icon">👨‍🎓</span>
                <div>
                  <h2>
                    {studentData.student.firstName}{" "}
                    {studentData.student.lastName}
                  </h2>
                  <p className="email">{studentData.student.email}</p>
                </div>
              </div>

              <div className="info-grid">
                {studentData.university && (
                  <div className="info-item">
                    <span>🏛️</span>
                    <div>
                      <div className="info-label">University</div>
                      <div className="info-value">
                        {studentData.university.name}
                      </div>
                    </div>
                  </div>
                )}

                {studentData.school && (
                  <div className="info-item">
                    <span>🏫</span>
                    <div>
                      <div className="info-label">School</div>
                      <div className="info-value">
                        {studentData.school.name}
                      </div>
                    </div>
                  </div>
                )}

                {studentData.advisor && (
                  <div className="info-item">
                    <span>👔</span>
                    <div>
                      <div className="info-label">Advisor</div>
                      <div className="info-value">
                        {studentData.advisor.name}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                className="verify-button"
                onClick={handleVerify}
                disabled={verifying}
              >
                {verifying ? "Verifying..." : "Verify Transcript"}
              </button>

              {verificationResult && (
                <div
                  className={`verification-result ${
                    verificationResult.verified ? "success" : "failed"
                  }`}
                >
                  {verificationResult.error
                    ? `Error: ${verificationResult.error}`
                    : verificationResult.verified
                    ? `Verified! ${verificationResult.validEnrollments}/${verificationResult.totalEnrollments} enrollments match`
                    : `Failed: ${verificationResult.validEnrollments}/${verificationResult.totalEnrollments} verified`}
                </div>
              )}
            </div>

            <div className="right-panel">
              <h3 className="section-title">📚 Academic Transcripts</h3>
              <div className="transcript-list">
                {studentData.transcripts.map((t, i) => (
                  <div key={i} className="transcript-item">
                    <div>
                      <div className="class-name">{t.className}</div>
                      <div className="class-info">
                        {t.semester} • {t.status}
                      </div>
                    </div>
                    <div className={`grade ${getGradeClass(t.grade)}`}>
                      {t.grade}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

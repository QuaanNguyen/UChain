import { useState } from 'react';
import './App.css';
import { StudentData, VerificationResult, Transcript } from './types';

const API_BASE = 'http://localhost:5050/api';

function App() {
  const [studentId, setStudentId] = useState('');
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTranscript, setEditingTranscript] = useState<Transcript | null>(null);
  const [classes, setClasses] = useState<any[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    cid: '',
    grade: 'NG',
    status: 'Enrolled'
  });

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
        // Also load classes for dropdown
        const classesRes = await fetch(`${API_BASE}/enrollments/classes`);
        const classesData = await classesRes.json();
        if (classesData.success) {
          setClasses(classesData.classes);
        }
      } else {
        alert('Student not found');
      }
    } catch (error) {
      alert('Error fetching student data');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!studentData) return;

    setVerifying(true);

    try {
      const response = await fetch(`${API_BASE}/student/verify-transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stid: studentData.student.stid })
      });

      const result = await response.json();
      setVerificationResult(result);
    } catch (error) {
      alert('Verification error');
    } finally {
      setVerifying(false);
    }
  };

  const handleAddEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentData) return;

    setSyncing(true);

    try {
      const response = await fetch(`${API_BASE}/enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sid: studentData.student.stid,
          cid: parseInt(formData.cid),
          grade: formData.grade,
          status: formData.status
        })
      });

      const result = await response.json();

      if (result.success) {
        // Refresh student data
        await handleSearch({ preventDefault: () => { } } as React.FormEvent);
        setShowAddForm(false);
        setFormData({ cid: '', grade: 'NG', status: 'Enrolled' });
      } else {
        alert('Error adding enrollment: ' + result.error);
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleEditEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTranscript) return;

    setSyncing(true);

    try {
      const response = await fetch(`${API_BASE}/enrollments/${editingTranscript.eid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade: formData.grade,
          status: formData.status
        })
      });

      const result = await response.json();

      if (result.success) {
        // Refresh student data
        await handleSearch({ preventDefault: () => { } } as React.FormEvent);
        setEditingTranscript(null);
        setFormData({ cid: '', grade: 'NG', status: 'Enrolled' });
      } else {
        alert('Error updating enrollment: ' + result.error);
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const startEdit = (transcript: Transcript) => {
    setEditingTranscript(transcript);
    setFormData({
      cid: transcript.cid.toString(),
      grade: transcript.grade,
      status: transcript.status
    });
    setShowAddForm(false);
  };

  const getGradeClass = (grade: string) => {
    const g = grade.toUpperCase();
    if (g === 'A') return 'grade-a';
    if (g === 'B') return 'grade-b';
    if (g === 'C') return 'grade-c';
    if (g === 'NG') return 'grade-ng';
    return 'grade-d';
  };

  return (
    <div className="app">
      {/* Academic Icons Background */}
      <div className="icon-background">
        {['🎓', '📚', '✏️', '📖', '🏆', '🎯', '💡', '🔬', '🌟'].map((icon, i) => (
          <div
            key={i}
            className="academic-icon"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              transform: `rotate(${Math.random() * 60 - 30}deg)`
            }}
          >
            {icon}
          </div>
        ))}
      </div>

      {/* Main Container */}
      <div className="container">
        <header>
          <h1>🎓 Student Transcript Verification</h1>
          <p className="subtitle">Verify academic records on the blockchain</p>
        </header>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="search-form">
          <div className="input-group">
            <label htmlFor="studentId">Student ID</label>
            <input
              type="number"
              id="studentId"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="Enter Student ID (e.g., 1)"
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? '⏳ Loading...' : '🔍 Search Student'}
          </button>
        </form>

        {/* Syncing Status */}
        {syncing && (
          <div className="syncing-status">
            <div className="spinner"></div>
            <span>⛓️ Syncing with Blockchain...</span>
          </div>
        )}

        {/* Student Data - Split Layout */}
        {studentData && (
          <div className="student-data-container">
            {/* Left Panel - Fixed */}
            <div className="left-panel">
              <div className="student-header">
                <span className="student-icon">👨‍🎓</span>
                <div>
                  <h2>{studentData.student.firstName} {studentData.student.lastName}</h2>
                  <p className="email">{studentData.student.email}</p>
                </div>
              </div>

              <div className="info-grid">
                {studentData.university && (
                  <div className="info-item">
                    <span>🏛️</span>
                    <div>
                      <div className="info-label">University</div>
                      <div className="info-value">{studentData.university.name}</div>
                    </div>
                  </div>
                )}

                {studentData.school && (
                  <div className="info-item">
                    <span>🏫</span>
                    <div>
                      <div className="info-label">School</div>
                      <div className="info-value">{studentData.school.name}</div>
                    </div>
                  </div>
                )}

                {studentData.advisor && (
                  <div className="info-item">
                    <span>👔</span>
                    <div>
                      <div className="info-label">Advisor</div>
                      <div className="info-value">{studentData.advisor.name}</div>
                    </div>
                  </div>
                )}
              </div>

              <button
                className="verify-button"
                onClick={handleVerify}
                disabled={verifying}
              >
                {verifying ? '🔄 Verifying...' : '🔐 Verify Transcript'}
              </button>

              {verificationResult && (
                <div className={`verification-result ${verificationResult.verified ? 'success' : 'failed'}`}>
                  {verificationResult.verified
                    ? `✅ Verified! ${verificationResult.validEnrollments}/${verificationResult.totalEnrollments} enrollments match`
                    : `❌ Failed: ${verificationResult.validEnrollments}/${verificationResult.totalEnrollments} verified`
                  }
                </div>
              )}
            </div>

            {/* Right Panel - Scrollable */}
            <div className="right-panel">
              <div className="section-header">
                <h3 className="section-title">📚 Academic Transcripts</h3>
                <button
                  className="add-button"
                  onClick={() => {
                    setShowAddForm(true);
                    setEditingTranscript(null);
                    setFormData({ cid: '', grade: 'NG', status: 'Enrolled' });
                  }}
                >
                  + Add Enrollment
                </button>
              </div>

              {/* Add/Edit Form */}
              {(showAddForm || editingTranscript) && (
                <form
                  className="enrollment-form"
                  onSubmit={editingTranscript ? handleEditEnrollment : handleAddEnrollment}
                >
                  <h4>{editingTranscript ? '✏️ Edit Enrollment' : '➕ New Enrollment'}</h4>

                  {!editingTranscript && (
                    <select
                      value={formData.cid}
                      onChange={(e) => setFormData({ ...formData, cid: e.target.value })}
                      required
                    >
                      <option value="">Select Class</option>
                      {classes.map(c => (
                        <option key={c.cid} value={c.cid}>
                          {c.name} ({c.semester})
                        </option>
                      ))}
                    </select>
                  )}

                  <select
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    required
                  >
                    <option value="NG">Grade: NG (No Grade)</option>
                    <option value="A">Grade: A</option>
                    <option value="B">Grade: B</option>
                    <option value="C">Grade: C</option>
                    <option value="D">Grade: D</option>
                    <option value="F">Grade: F</option>
                  </select>

                  <select
                    value={formData.status}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      // Auto-set grade to NG when status is Enrolled
                      if (newStatus === 'Enrolled') {
                        setFormData({ ...formData, status: newStatus, grade: 'NG' });
                      } else {
                        setFormData({ ...formData, status: newStatus });
                      }
                    }}
                    required
                  >
                    <option value="Enrolled">Status: Enrolled</option>
                    <option value="Completed">Status: Completed</option>
                    <option value="Dropped">Status: Dropped</option>
                  </select>

                  <div className="form-buttons">
                    <button type="submit" disabled={syncing}>
                      {syncing ? 'Syncing...' : (editingTranscript ? 'Update' : 'Add')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingTranscript(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <div className="transcript-list">
                {studentData.transcripts.map((t, i) => (
                  <div key={i} className="transcript-item">
                    <div>
                      <div className="class-name">{t.className}</div>
                      <div className="class-info">{t.semester} • {t.status}</div>
                    </div>
                    <div className="transcript-actions">
                      <div className={`grade ${getGradeClass(t.grade)}`}>
                        {t.grade}
                      </div>
                      <button
                        className="edit-btn"
                        onClick={() => startEdit(t)}
                        title="Edit"
                      >
                        ✏️
                      </button>
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

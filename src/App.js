import React, { useState } from 'react';
import './App.css';

const API_URL = 'http://localhost:8000';

function App() {
  const [resumeInput, setResumeInput] = useState('upload'); // 'upload' or 'paste'
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [fileName, setFileName] = useState('');
  
  const [bullets, setBullets] = useState(['', '', '', '', '']);
  const [numBullets, setNumBullets] = useState(5);
  
  const [matchScore, setMatchScore] = useState(null);
  const [gaps, setGaps] = useState([]);
  const [rewrittenBullets, setRewrittenBullets] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/upload-resume`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload file');

      const data = await response.json();
      setResumeText(data.text);
      setFileName(data.filename);
      setBullets(data.bullets.slice(0, 5).concat(Array(5).fill('')).slice(0, 5));
      setError('');
    } catch (err) {
      setError('Error uploading file: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Adjust number of bullets
  const handleNumBulletsChange = (num) => {
    setNumBullets(num);
    const newBullets = [...bullets];
    while (newBullets.length < num) newBullets.push('');
    setBullets(newBullets.slice(0, num));
  };

  // Update bullet text
  const handleBulletChange = (index, value) => {
    const newBullets = [...bullets];
    newBullets[index] = value;
    setBullets(newBullets);
  };

  // Analyze match
  const handleAnalyze = async () => {
    if (!resumeText.trim() || !jobDescription.trim()) {
      setError('Please provide both resume and job description');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume_text: resumeText,
          job_description: jobDescription,
        }),
      });

      if (!response.ok) throw new Error('Failed to analyze match');

      const data = await response.json();
      setMatchScore(data.score);
      setGaps(data.gaps);
    } catch (err) {
      setError('Error analyzing match: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Rewrite bullets
  const handleRewriteBullets = async () => {
    const validBullets = bullets.filter(b => b.trim());
    
    if (validBullets.length === 0) {
      setError('Please add at least one bullet point');
      return;
    }

    if (!jobDescription.trim()) {
      setError('Please provide a job description');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/rewrite-bullets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bullets: validBullets,
          job_description: jobDescription,
        }),
      });

      if (!response.ok) throw new Error('Failed to rewrite bullets');

      const data = await response.json();
      setRewrittenBullets(data.bullets);
    } catch (err) {
      setError('Error rewriting bullets: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Download rewritten bullets
  const handleDownload = () => {
    const text = rewrittenBullets.map(b => `• ${b.rewritten}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tailored_bullets.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Strong Match!';
    if (score >= 60) return 'Good, but can improve';
    return 'Needs significant tailoring';
  };

  return (
    <div className="App">
      <header className="header">
        <h1>Resume to Job Matcher</h1>
      </header>

      <div className="container">
        {error && <div className="error-banner">{error}</div>}

        <div className="two-column">
          <div className="column">
            <h2>Your Resume</h2>
            <div className="input-toggle">
              <label>
                <input
                  type="radio"
                  value="upload"
                  checked={resumeInput === 'upload'}
                  onChange={(e) => setResumeInput(e.target.value)}
                />
                Upload File
              </label>
              <label>
                <input
                  type="radio"
                  value="paste"
                  checked={resumeInput === 'paste'}
                  onChange={(e) => setResumeInput(e.target.value)}
                />
                Paste Text
              </label>
            </div>

            {resumeInput === 'upload' ? (
              <div className="file-upload">
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileUpload}
                  id="file-input"
                />
                <label htmlFor="file-input" className="file-label">
                  Choose File (PDF, DOCX, TXT)
                </label>
                {fileName && <p className="file-name">✓ {fileName}</p>}
              </div>
            ) : (
              <textarea
                className="text-input"
                placeholder="Paste your full resume here..."
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                rows={10}
              />
            )}
          </div>

          <div className="column">
            <h2>Job Description</h2>
            <textarea
              className="text-input"
              placeholder="Paste the job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={14}
            />
          </div>
        </div>

        <div className="divider"></div>

        <div className="bullets-section">
          <h2>✏️ Edit & Rewrite Bullet Points</h2>
          <p className="subtitle">
            Enter or edit your resume bullet points below. We'll rewrite them to perfectly match the job.
          </p>

          <div className="slider-container">
            <label>Number of bullets to edit: {numBullets}</label>
            <input
              type="range"
              min="1"
              max="15"
              value={numBullets}
              onChange={(e) => handleNumBulletsChange(parseInt(e.target.value))}
              className="slider"
            />
          </div>

          <div className="bullets-list">
            {bullets.map((bullet, index) => (
              <div key={index} className="bullet-input">
                <label>Bullet {index + 1}</label>
                <textarea
                  value={bullet}
                  onChange={(e) => handleBulletChange(index, e.target.value)}
                  placeholder="Enter a bullet point from your resume..."
                  rows={3}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="button-group">
          <button 
            className="btn btn-primary" 
            onClick={handleAnalyze}
            disabled={loading || !resumeText.trim() || !jobDescription.trim()}
          >
            {loading ? '⏳ Analyzing...' : '🔍 Analyze Match & Gaps'}
          </button>

          <button 
            className="btn btn-secondary" 
            onClick={handleRewriteBullets}
            disabled={loading || bullets.filter(b => b.trim()).length === 0 || !jobDescription.trim()}
          >
            {loading ? '⏳ Rewriting...' : '✨ Rewrite Bullets to Match Job'}
          </button>
        </div>

        {matchScore !== null && (
          <div className="results-section">
            <div className="match-results">
              <div className="score-card">
                <h3>Match Score</h3>
                <div 
                  className="score-number"
                  style={{ color: getScoreColor(matchScore) }}
                >
                  {matchScore}/100
                </div>
                <p 
                  className="score-label"
                  style={{ color: getScoreColor(matchScore) }}
                >
                  {getScoreLabel(matchScore)}
                </p>
              </div>

              <div className="gaps-card">
                <h3>Critical Gaps</h3>
                <ul className="gaps-list">
                  {gaps.map((gap, index) => (
                    <li key={index}>{gap}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {rewrittenBullets.length > 0 && (
          <div className="rewritten-section">
            <h3>Tailored Bullet Points</h3>
            {rewrittenBullets.map((bullet, index) => (
              <details key={index} className="bullet-result">
                <summary>Bullet {index + 1}: {bullet.rewritten.substring(0, 60)}...</summary>
                <div className="bullet-content">
                  <p><strong>Original:</strong> {bullet.original}</p>
                  <p><strong>✨ Improved:</strong> {bullet.rewritten}</p>
                </div>
              </details>
            ))}
            <button className="btn btn-download" onClick={handleDownload}>
              📥 Download Rewritten Bullets
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
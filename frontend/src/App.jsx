import React, { useState } from 'react';
import axios from 'axios';

export default function App() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [response, setResponse] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [pin, setPin] = useState('');
  const [authPassed, setAuthPassed] = useState(false);

  const checkPin = async () => {
    try {
      const res = await axios.post('https://endurancearc-backend.onrender.com/verify-pin', { pin });
      if (res.data.success) {
        setAuthPassed(true);
      }
    } catch (err) {
      const msg = err.response?.data?.error || "Unknown error";
      alert(msg);
    }
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a file");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);

      const res = await axios.post('https://endurancearc-backend.onrender.com/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setResponse(res.data);
    } catch (err) {
      setResponse({ error: err.response?.data || err.message });
    } finally {
      setUploading(false);
    }
  };

  if (!authPassed) {
    return (
      <div style={styles.container}>
        <h2>🔒 Secure Access</h2>
        <p>Enter your 4-digit PIN to access uploader</p>
        <input
          type="password"
          maxLength={4}
          value={pin}
          onChange={e => setPin(e.target.value)}
          style={styles.input}
          inputMode="numeric"
        />
        <button onClick={checkPin} style={styles.button}>Unlock</button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2>📤 Strava Activity Uploader</h2>
      <p style={{ fontSize: 14, color: '#666' }}>Upload your GPX, FIT, or TCX file to Strava.</p>

      <input type="file" onChange={e => setFile(e.target.files[0])} style={styles.input} />
      <input
        type="text"
        placeholder="Activity title (optional)"
        value={title}
        onChange={e => setTitle(e.target.value)}
        style={styles.input}
      />

      <button onClick={handleUpload} style={styles.button} disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload to Strava'}
      </button>

      {response && (
        <pre style={styles.response}>
          {JSON.stringify(response, null, 2)}
        </pre>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: 20,
    maxWidth: 500,
    margin: '0 auto',
    fontFamily: 'sans-serif',
    textAlign: 'center',
    boxSizing: 'border-box'
  },
  input: {
    width: '100%',
    padding: 12,
    margin: '12px 0',
    fontSize: 16,
    borderRadius: 6,
    border: '1px solid #ccc',
    boxSizing: 'border-box'
  },
  button: {
    width: '100%',
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fc5200',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer'
  },
  response: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#f2f2f2',
    textAlign: 'left',
    wordBreak: 'break-word',
    borderRadius: 6
  }
};

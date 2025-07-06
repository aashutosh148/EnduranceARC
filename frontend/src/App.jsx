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
        const res = await axios.post('https://your-backend.onrender.com/verify-pin', { pin });

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

      const res = await axios.post('http://localhost:4000/upload', formData, {
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
        <h2>🔒 Enter 4-digit PIN</h2>
        <input
          type="password"
          maxLength={4}
          value={pin}
          onChange={e => setPin(e.target.value)}
          style={styles.input}
        />
        <button onClick={checkPin} style={styles.button}>Unlock</button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2>📤 Upload to Strava</h2>
      <input type="file" onChange={e => setFile(e.target.files[0])} />
      <input
        type="text"
        placeholder="Activity title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        style={styles.input}
      />
      <button onClick={handleUpload} style={styles.button} disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload'}
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
    maxWidth: 400,
    margin: 'auto',
    fontFamily: 'sans-serif'
  },
  input: {
    width: '100%',
    padding: 10,
    margin: '10px 0',
    fontSize: 16
  },
  button: {
    width: '100%',
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fc5200',
    color: 'white',
    border: 'none',
    cursor: 'pointer'
  },
  response: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#eee',
    whiteSpace: 'pre-wrap'
  }
};

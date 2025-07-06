require('dotenv').config();
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');

const app = express();
const upload = multer({ dest: 'uploads/' });
app.use(cors());
app.use(express.json());

const {
  CLIENT_ID,
  CLIENT_SECRET,
  REFRESH_TOKEN,
  ACCESS_TOKEN,
} = process.env;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error("Missing required .env variables. Please check CLIENT_ID, CLIENT_SECRET, and REFRESH_TOKEN.");
  process.exit(1); // Exit early if env vars are missing
}

console.log("Backend starting...");
console.log("Loaded ENV values:", {
  CLIENT_ID,
  CLIENT_SECRET: CLIENT_SECRET ? '****' : null,
  REFRESH_TOKEN: REFRESH_TOKEN ? '****' : null,
  ACCESS_TOKEN: ACCESS_TOKEN ? '****' : null
});

// Health check route
app.get("/", (req, res) => {
  res.send("Strava uploader backend is running!");
});

const attempts = {};

app.post('/verify-pin', express.json(), (req, res) => {
  const { pin } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  const correctPin = process.env.ACCESS_PIN || '1234';

  // init IP tracking
  if (!attempts[ip]) {
    attempts[ip] = { count: 0, blockedUntil: null };
  }

  const user = attempts[ip];
  const now = Date.now();

  if (user.blockedUntil && now < user.blockedUntil) {
    return res.status(403).json({ error: "Too many wrong attempts. Try again later." });
  }

  if (pin === correctPin) {
    user.count = 0;
    return res.json({ success: true });
  } else {
    user.count += 1;

    if (user.count >= 3) {
      user.blockedUntil = now + 3 * 60 * 60 * 1000; // 3 hours
      return res.status(403).json({ error: "Locked out for 3 hours." });
    }

    return res.status(401).json({ error: `Wrong PIN. ${3 - user.count} tries left.` });
  }
});

app.post('/upload', upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'title', maxCount: 1 }
]), async (req, res) => {
  console.log("📥 /upload hit - received file:", req.files.file[0]);

  try {
    console.log("🔄 Requesting new access token using refresh token...");
    const tokenRes = await axios.post('https://www.strava.com/oauth/token', {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: REFRESH_TOKEN,
    });

    const accessToken = tokenRes.data.access_token;
    const filePath = path.join(__dirname, req.files.file[0].path);
    const fileStream = fs.createReadStream(filePath);
    const fileExt = req.files.file[0].originalname.split('.').pop();

    console.log("📤 Uploading file to Strava...");
    const formData = new FormData();
    formData.append('file', fileStream);
    formData.append('data_type', fileExt);
    const activityName = req.body.title || 'Uploaded from EnduranceARC T-Rex3';
    formData.append('name', activityName);


    const headers = {
      Authorization: `Bearer ${accessToken}`,
      ...formData.getHeaders()
    };

    const uploadRes = await axios.post('https://www.strava.com/api/v3/uploads', formData, { headers });
    const uploadId = uploadRes.data.id;

    console.log("📦 Upload ID:", uploadId);
    fs.unlinkSync(filePath); // Clean up uploaded file

    // Wait until activity is processed
    console.log("⏳ Polling for upload status...");
    let pollResult = null;
    const maxTries = 20;
    let tries = 0;

    while (tries < maxTries) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // wait 3 seconds
      tries++;

      const statusRes = await axios.get(`https://www.strava.com/api/v3/uploads/${uploadId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      pollResult = statusRes.data;
      console.log(`🔁 Poll attempt ${tries}:`, pollResult.status);

      if (pollResult.status === "Your activity is ready." || pollResult.activity_id) {
        console.log("✅ Activity ready!", pollResult);
        return res.json({
          success: true,
          activity_id: pollResult.activity_id,
          message: "Upload complete!"
        });
      } else if (pollResult.error) {
        console.error("❌ Upload failed:", pollResult.error);
        return res.status(500).json({ error: pollResult.error });
      }
    }

    return res.status(504).json({
      error: "Timeout: Strava didn't finish processing within expected time."
    });

  } catch (err) {
    console.error("❌ Error:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

app.post('/refresh', async (req, res) => {
  try {
    console.log("⏰ Cron triggered: Refreshing Strava token...");

    const tokenRes = await axios.post('https://www.strava.com/oauth/token', {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: REFRESH_TOKEN,
    });

    console.log("✅ Refreshed access token:", tokenRes.data.access_token);

    res.json({ success: true, newAccessToken: tokenRes.data.access_token });
  } catch (err) {
    console.error("⚠️ Refresh failed:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});


// Catch-all for uncaught exceptions to prevent crash
process.on('uncaughtException', err => {
  console.error("Uncaught Exception:", err);
});
process.on('unhandledRejection', err => {
  console.error("Unhandled Rejection:", err);
});

app.listen(4000, () => console.log('✅ Server running on http://localhost:4000'));

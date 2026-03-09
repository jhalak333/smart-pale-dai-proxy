const express = require('express');
const axios = require('axios');
const cors = require('cors');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());

// Create an HTTPS agent that ignores certificate errors
const httpsAgent = new https.Agent({
  rejectUnauthorized: false  // This bypasses SSL verification
});

// Your InfinityFree API endpoint
const TARGET_API = 'https://gandakitech.com.np/smart_bell/api/get_device_data.php';

app.get('/api/device/:deviceId', async (req, res) => {
  try {
    console.log(`Proxying request for device: ${req.params.deviceId}`);
    
    // Make request to InfinityFree with browser headers and the custom agent
    const response = await axios.get(TARGET_API, {
      params: {
        device_id: req.params.deviceId,
        t: Date.now()
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://gandakitech.com.np/',
        'Origin': 'https://gandakitech.com.np',
        'Cache-Control': 'no-cache'
      },
      timeout: 15000,
      maxRedirects: 5,
      httpsAgent: httpsAgent  // Use the agent that ignores SSL errors
    });

    // Forward the response
    res.json(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    console.error('Full error:', error);
    
    // More detailed error response
    res.status(500).json({ 
      error: 'Failed to fetch device data',
      details: error.message,
      code: error.code
    });
  }
});

// Also add a test endpoint
app.get('/api/test', async (req, res) => {
  try {
    const response = await axios.get('https://gandakitech.com.np', {
      httpsAgent: httpsAgent,
      timeout: 5000
    });
    res.json({ status: 'connected', code: response.status });
  } catch (error) {
    res.json({ status: 'error', message: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.send('Smart Pale Dai Proxy Server - Use /api/device/[deviceId]');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});

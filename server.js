const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Your InfinityFree API endpoint
const TARGET_API = 'https://gandakitech.com.np/smart_bell/api/get_device_data.php';

app.get('/api/device/:deviceId', async (req, res) => {
  try {
    console.log(`Proxying request for device: ${req.params.deviceId}`);
    
    // Make request to InfinityFree with browser headers
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
        'Origin': 'https://gandakitech.com.np'
      },
      timeout: 10000,
      maxRedirects: 5
    });

    // Forward the response
    res.json(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch device data',
      details: error.message 
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});

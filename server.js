const express = require('express');
const axios = require('axios');
const cors = require('cors');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());

// Create an HTTPS agent that ignores certificate errors
const httpsAgent = new https.Agent({
  rejectUnauthorized: false  // This is the key fix!
});

const TARGET_API = 'https://gandakitech.com.np/smart_bell/api/get_device_data.php';

app.get('/api/device/:deviceId', async (req, res) => {
    console.log(`\n=== Request for device: ${req.params.deviceId} ===`);
    
    try {
        // Make request with the custom agent
        const response = await axios({
            method: 'get',
            url: TARGET_API,
            params: {
                device_id: req.params.deviceId,
                t: Date.now()
            },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://gandakitech.com.np/',
                'Cache-Control': 'no-cache'
            },
            httpsAgent: httpsAgent,  // Use our agent that ignores SSL errors
            timeout: 10000
        });

        console.log('Response status:', response.status);
        
        // Send the data back to your ESP
        res.json(response.data);
        
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({
            error: 'Failed to fetch device data',
            details: error.message
        });
    }
});

// Simple test endpoint
app.get('/api/test', async (req, res) => {
    try {
        const response = await axios.get('https://gandakitech.com.np', {
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
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
    res.send('Smart Pale Dai Proxy - Use /api/device/[deviceId]');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Proxy running on port ${PORT}`);
});

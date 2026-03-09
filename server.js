const express = require('express');
const axios = require('axios');
const cors = require('cors');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());

// Create HTTPS agent that ignores certificate errors
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

const TARGET_API = 'https://gandakitech.com.np/smart_bell/api/get_device_data.php';

// Store cookies between requests
let cookieJar = {};

app.get('/api/device/:deviceId', async (req, res) => {
    console.log(`\n=== Request for device: ${req.params.deviceId} ===`);
    
    try {
        // Step 1: Make initial request that will get the challenge
        console.log('Step 1: Making initial request...');
        const initialResponse = await axios({
            method: 'get',
            url: TARGET_API,
            params: {
                device_id: req.params.deviceId,
                t: Date.now()
            },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml,application/json',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://gandakitech.com.np/',
                'Cache-Control': 'no-cache'
            },
            httpsAgent: httpsAgent,
            maxRedirects: 0,
            validateStatus: function (status) {
                return status >= 200 && status < 500; // Accept all status codes
            }
        });

        // Save any cookies from the response
        if (initialResponse.headers['set-cookie']) {
            const cookies = initialResponse.headers['set-cookie'];
            cookieJar[req.params.deviceId] = cookies.join('; ');
            console.log('Cookies saved for device');
        }

        // Check if we got the challenge page (HTML)
        const responseData = initialResponse.data;
        const isHTML = typeof responseData === 'string' && 
                      (responseData.includes('<!DOCTYPE') || responseData.includes('<html'));

        if (isHTML) {
            console.log('Step 2: Challenge page received, extracting redirect...');
            
            // Extract the redirect URL from the JavaScript
            const redirectMatch = responseData.match(/location\.href="([^"]+)"/);
            
            if (redirectMatch && redirectMatch[1]) {
                const redirectUrl = redirectMatch[1];
                console.log('Redirect URL:', redirectUrl);
                
                // Step 3: Follow the redirect with cookies
                console.log('Step 3: Following redirect...');
                const finalResponse = await axios({
                    method: 'get',
                    url: redirectUrl,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'application/json, text/plain, */*',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Cookie': cookieJar[req.params.deviceId] || '',
                        'Referer': 'https://gandakitech.com.np/'
                    },
                    httpsAgent: httpsAgent,
                    timeout: 10000
                });
                
                console.log('Final response status:', finalResponse.status);
                console.log('Final response type:', typeof finalResponse.data);
                
                // Send the actual JSON data back to the client
                return res.json(finalResponse.data);
            }
        }
        
        // If we somehow got JSON directly, return it
        return res.json(initialResponse.data);
        
    } catch (error) {
        console.error('Error:', error.message);
        console.error('Full error:', error);
        res.status(500).json({
            error: 'Failed to fetch device data',
            details: error.message
        });
    }
});

// Test endpoint
app.get('/api/test', async (req, res) => {
    try {
        const response = await axios.get('https://gandakitech.com.np', {
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            timeout: 5000
        });
        res.json({ 
            status: 'connected', 
            code: response.status,
            type: typeof response.data
        });
    } catch (error) {
        res.json({ status: 'error', message: error.message });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/', (req, res) => {
    res.send('Smart Pale Dai Proxy Server - Challenge Handler Active');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Proxy running on port ${PORT}`);
});

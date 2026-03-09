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

// Helper function to check if response is JSON
function isJSON(data) {
    if (typeof data !== 'string') return true;
    try {
        JSON.parse(data);
        return true;
    } catch {
        return false;
    }
}

// Helper function to extract redirect URL from HTML
function extractRedirectUrl(html) {
    const match = html.match(/location\.href="([^"]+)"/);
    return match ? match[1] : null;
}

app.get('/api/device/:deviceId', async (req, res) => {
    console.log(`\n=== Request for device: ${req.params.deviceId} ===`);
    
    try {
        let currentUrl = TARGET_API;
        let responseData = null;
        let redirectCount = 0;
        const maxRedirects = 5;
        
        // Add device ID as parameter
        const params = {
            device_id: req.params.deviceId,
            t: Date.now()
        };
        
        // Initial headers
        let headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml,application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://gandakitech.com.np/',
            'Cache-Control': 'no-cache'
        };
        
        // Add cookies if we have them
        if (cookieJar[req.params.deviceId]) {
            headers['Cookie'] = cookieJar[req.params.deviceId];
        }
        
        // Keep following redirects until we get JSON
        while (redirectCount < maxRedirects) {
            console.log(`Redirect attempt ${redirectCount + 1}:`, currentUrl);
            
            const response = await axios({
                method: 'get',
                url: currentUrl,
                params: redirectCount === 0 ? params : {},
                headers: headers,
                httpsAgent: httpsAgent,
                maxRedirects: 0,
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                }
            });
            
            // Save any new cookies
            if (response.headers['set-cookie']) {
                const cookies = response.headers['set-cookie'];
                cookieJar[req.params.deviceId] = cookies.join('; ');
                console.log('Cookies updated');
                headers['Cookie'] = cookieJar[req.params.deviceId];
            }
            
            responseData = response.data;
            
            // Check if we got JSON
            if (isJSON(responseData)) {
                console.log('✅ Got JSON response!');
                break;
            }
            
            // Check if it's HTML with redirect
            if (typeof responseData === 'string' && responseData.includes('<html')) {
                const redirectUrl = extractRedirectUrl(responseData);
                if (redirectUrl) {
                    console.log('➡️ Following redirect to:', redirectUrl);
                    currentUrl = redirectUrl;
                    redirectCount++;
                    continue;
                }
            }
            
            // If we get here, we don't know how to handle it
            console.log('❌ Unexpected response type');
            break;
        }
        
        // Parse the final response
        if (isJSON(responseData)) {
            // If it's a string, parse it first
            if (typeof responseData === 'string') {
                try {
                    const jsonData = JSON.parse(responseData);
                    return res.json(jsonData);
                } catch (e) {
                    return res.send(responseData);
                }
            } else {
                // It's already an object
                return res.json(responseData);
            }
        } else {
            // Still got HTML after max redirects
            return res.status(502).json({
                error: 'Failed to get JSON after multiple redirects',
                html: typeof responseData === 'string' ? responseData.substring(0, 500) : 'Non-HTML response'
            });
        }
        
    } catch (error) {
        console.error('Error:', error.message);
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
            code: response.status 
        });
    } catch (error) {
        res.json({ status: 'error', message: error.message });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/', (req, res) => {
    res.send('Smart Pale Dai Proxy - Multi-Redirect Handler');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Proxy running on port ${PORT}`);
});

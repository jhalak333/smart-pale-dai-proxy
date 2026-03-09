const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const TARGET_API = 'https://gandakitech.com.np/smart_bell/api/get_device_data.php';

// Simple cookie storage
let savedCookies = '';

app.get('/api/device/:deviceId', async (req, res) => {
    console.log(`\n=== Request for device: ${req.params.deviceId} ===`);
    
    try {
        // First attempt - might get challenge
        console.log('Making first request...');
        const firstResponse = await axios({
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
            maxRedirects: 0,
            validateStatus: null
        });

        // Save cookies if any
        if (firstResponse.headers['set-cookie']) {
            savedCookies = firstResponse.headers['set-cookie'].join('; ');
            console.log('Cookies saved');
        }

        // Check if response is HTML (challenge page)
        const data = firstResponse.data;
        if (typeof data === 'string' && data.includes('<html')) {
            console.log('Got challenge page, extracting redirect...');
            
            // Extract redirect URL
            const match = data.match(/location\.href="([^"]+)"/);
            if (match && match[1]) {
                const redirectUrl = match[1];
                console.log('Redirecting to:', redirectUrl);
                
                // Follow redirect
                const finalResponse = await axios({
                    method: 'get',
                    url: redirectUrl,
                    headers: {
                        'User-Agent': 'Mozilla/5.0',
                        'Accept': 'application/json',
                        'Cookie': savedCookies
                    }
                });
                
                console.log('Final response status:', finalResponse.status);
                return res.json(finalResponse.data);
            }
        }
        
        // If we got here, it might be direct JSON
        return res.json(firstResponse.data);
        
    } catch (error) {
        console.error('Error:', error.message);
        res.json({
            error: 'Proxy error',
            message: error.message
        });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.get('/', (req, res) => {
    res.json({ message: 'Smart Pale Dai Proxy is running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Proxy running on port ${PORT}`);
});

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const https = require('https');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

const app = express();
app.use(cors());
app.use(express.json());

// Create a cookie jar to maintain session
const cookieJar = new CookieJar();

// Create HTTPS agent that ignores certificate errors
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// Create axios instance with cookie support
const client = wrapper(axios.create({
  httpsAgent,
  timeout: 15000,
  maxRedirects: 5,
  jar: cookieJar,
  withCredentials: true
}));

// Your InfinityFree API endpoint
const TARGET_API = 'https://gandakitech.com.np/smart_bell/api/get_device_data.php';

app.get('/api/device/:deviceId', async (req, res) => {
  try {
    console.log(`\n--- Proxying request for device: ${req.params.deviceId} ---`);
    
    // Make request with full browser headers
    const response = await client.get(TARGET_API, {
      params: {
        device_id: req.params.deviceId,
        t: Date.now(),
        _: Date.now() // Cache buster
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://gandakitech.com.np/',
        'Origin': 'https://gandakitech.com.np',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      // Don't decompress automatically so we can see raw response
      decompress: false
    });

    // Log what we received
    console.log('Response status:', response.status);
    console.log('Response headers:', JSON.stringify(response.headers, null, 2));
    
    // Check if we got HTML (the challenge page)
    const responseData = response.data;
    const isHTML = typeof responseData === 'string' && 
                   (responseData.includes('<!DOCTYPE') || responseData.includes('<html'));
    
    if (isHTML) {
      console.log('⚠ Received HTML challenge page');
      
      // Try to extract the validation URL from the JavaScript
      const htmlContent = responseData;
      const redirectMatch = htmlContent.match(/location\.href="([^"]+)"/);
      
      if (redirectMatch && redirectMatch[1]) {
        const redirectUrl = redirectMatch[1];
        console.log('Following redirect to:', redirectUrl);
        
        // Follow the redirect with the same session
        const finalResponse = await client.get(redirectUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/plain, */*'
          }
        });
        
        console.log('Final response status:', finalResponse.status);
        console.log('Final response type:', typeof finalResponse.data);
        
        // Send the final response
        if (typeof finalResponse.data === 'object') {
          res.json(finalResponse.data);
        } else {
          // Try to parse if it's JSON string
          try {
            const jsonData = JSON.parse(finalResponse.data);
            res.json(jsonData);
          } catch (e) {
            // If still not JSON, return as-is
            res.send(finalResponse.data);
          }
        }
      } else {
        // If no redirect found, return the HTML with error
        res.status(502).json({
          error: 'Received challenge page but could not extract redirect',
          html: responseData.substring(0, 500) // First 500 chars for debugging
        });
      }
    } else {
      // We got JSON directly
      console.log('✓ Received JSON directly');
      res.json(responseData);
    }
    
  } catch (error) {
    console.error('Proxy error:', error.message);
    console.error('Full error:', error);
    
    res.status(500).json({ 
      error: 'Failed to fetch device data',
      details: error.message,
      code: error.code
    });
  }
});

// Test endpoint to check connection
app.get('/api/test', async (req, res) => {
  try {
    const response = await client.get('https://gandakitech.com.np', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
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
  res.send('Smart Pale Dai Proxy Server - Use /api/device/[deviceId]');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});

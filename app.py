import os
import requests
from flask import Flask, request, jsonify
from infinityfree import InfinityFreeSession

app = Flask(__name__)

# Your InfinityFree site URL (without protocol)
INFINITYFREE_SITE = "gandakitech.com.np"
# Base path to your API (adjust if different)
API_BASE_PATH = "/smart_bell/api/get_device_data.php"

# Create a persistent session that handles the anti-bot challenges
session = InfinityFreeSession()

@app.route('/smart_bell/api/get_device_data.php/<device_id>', methods=['GET'])
def proxy_get_device_data(device_id):
    """
    This endpoint matches the Arduino's request pattern.
    Example: /smart_bell/api/get_device_data.php/65824795ee771127618cb30e?fbclid=12345
    """
    # Forward all query parameters (like fbclid)
    params = request.args.to_dict()
    
    # Construct the target URL (InfinityFree)
    target_url = f"http://{INFINITYFREE_SITE}{API_BASE_PATH}/{device_id}"
    
    try:
        # Use the session to fetch the data (handles JavaScript challenge)
        response = session.get(target_url, params=params)
        response.raise_for_status()  # Raise an error for bad status codes
        
        # Return the JSON content with the same content type
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 500
    except ValueError as e:
        # If response is not JSON, return raw text for debugging
        return jsonify({"error": "Invalid JSON from upstream", "raw": response.text}), 502

@app.route('/', methods=['GET'])
def home():
    return "Smart Pale Dai Proxy Server is running."

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
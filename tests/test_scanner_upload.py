import os
import requests
import json

BASE_URL = "http://localhost:3001"

# Read .env to get APP_SECRET
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
app_secret = "guardian8"  # default from migration spec or read from .env if possible
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            if line.startswith("APP_SECRET="):
                app_secret = line.strip().split("=", 1)[1].strip('"\'')

print(f"Using app_secret: {app_secret}")

# 1. Login to get token
login_res = requests.post(f"{BASE_URL}/api/auth/login", json={"secret": app_secret})
print(f"Login status: {login_res.status_code}, response: {login_res.text}")
if login_res.status_code != 200:
    exit(1)

token = login_res.json()["token"]
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# 2. Valid 1x1 transparent PNG base64
test_image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

# 3. POST to /api/scanner/analyze
analyze_res = requests.post(f"{BASE_URL}/api/scanner/analyze", headers=headers, json={"image_data_url": test_image})
print(f"Analyze status: {analyze_res.status_code}")
print(f"Analyze response: {analyze_res.text}")

import urllib.request
import os

url = os.environ.get("SELF_URL", "https://split-pdf.onrender.com")
try:
    urllib.request.urlopen(url, timeout=10)
    print("Ping OK")
except Exception as e:
    print(f"Ping failed: {e}")

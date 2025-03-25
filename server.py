from flask import Flask, request
import requests
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

app = Flask(__name__)

FETCH_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.6998.118 Safari/537.36",
    "Referer": "https://embedme.top/",
    "Content-Type": "application/json",
    "Origin": "https://embedme.top",
    "Accept": "*/*",
    "Cookie": "dom3ic8zudi28v8lr6fgphwffqoz0j6c=9a3394b7-c5fa-4fda-97fc-b50bde09a10a%3A1%3A1; pp_main_1135f00627fb2b264f5bbc1a0b563ae7=1"
}

def get_encrypted_data(source, match_id, stream_no):
    payload = {"source": source, "id": match_id, "streamNo": stream_no}
    try:
        response = requests.post("https://embedme.top/fetch", headers=FETCH_HEADERS, json=payload, timeout=30)
        print(f"Fetch response: {response.status_code}, {response.text}")
        if response.status_code == 200 and response.text and "Not Found" not in response.text:
            return response.text
        print(f"Failed to fetch encrypted data: {response.status_code}, {response.text}")
        return None
    except Exception as e:
        print(f"Error fetching encrypted data: {e}")
        return None

def decrypt_in_browser(encrypted_data, embed_url):
    chrome_options = Options()
    chrome_options.add_argument("--headless")  # Enable for Render
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--ignore-certificate-errors")
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.6998.118 Safari/537.36")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option("useAutomationExtension", False)

    driver = webdriver.Chrome(options=chrome_options)
    try:
        print(f"Loading embed URL: {embed_url}")
        driver.get(embed_url)
        WebDriverWait(driver, 30).until(
            lambda driver: driver.execute_script("return typeof window.decrypt === 'function';")
        )
        print("WASM loaded, window.decrypt is available")
        WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.TAG_NAME, "video"))
        )
        print("Video element found")
        time.sleep(2)
        print("Executing decryption script...")
        m3u8_url = driver.execute_script(f"""
            console.log('Encrypted data: "{encrypted_data}"');
            const result = window.decrypt("{encrypted_data}");
            console.log('Decrypted: ' + result);
            return "https://rr.vipstreams.in" + result;
        """)
        if m3u8_url:
            print(f"Decrypted M3U8 URL: {m3u8_url}")
            return m3u8_url
        print("Decryption returned null")
        return None
    except Exception as e:
        print(f"Error in browser decryption: {e}")
        print(f"Page source: {driver.page_source[:500]}...")
        return None
    finally:
        driver.quit()

@app.route('/get_m3u8', methods=['GET'])
def get_m3u8():
    source = request.args.get('source')
    match_id = request.args.get('id')
    stream_no = request.args.get('streamNo')

    if not all([source, match_id, stream_no]):
        return {"error": "Missing parameters: source, id, and streamNo are required"}, 400

    encrypted_data = get_encrypted_data(source, match_id, stream_no)
    if not encrypted_data:
        return {"error": "Failed to fetch encrypted data from embedme.top"}, 500

    embed_url = f"https://embedme.top/embed/{source}/{match_id}/{stream_no}"
    m3u8_url = decrypt_in_browser(encrypted_data, embed_url)
    if m3u8_url:
        return {"m3u8_url": m3u8_url}, 200
    return {"error": "Failed to decrypt URL"}, 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
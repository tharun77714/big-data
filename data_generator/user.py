import time
import random
import uuid
import requests
from datetime import datetime

# API Configuration
BASE_URL = "https://www.amazon.in/"
email_address = "[EMAIL_ADDRESS]"
password = "[PASSWORD]"
HEADERS = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
}

def user_session():
    
    session_id = str(uuid.uuid4())
    user_id = f"user_{random.randint(1000, 9999)}"
    
    print(f"\n--- 🚀 - User Session for {user_id} ---")
    print(f"email_address: {email_address}")
    print(f"password: {password}")
    
    # 1. User visits the homepage and loads top products
    print(f"\n[{datetime.now().strftime('%H:%M:%S')}]  [clickstream] User navigated to /homepage")
    try:
        response = requests.get(f"{BASE_URL}/dashboard/top-products", headers=HEADERS)
        if response.status_code == 403:
            print(" Authentication failed! Ensure the X-API-Key is set correctly.")
            return
        
        top_products = response.json().get("products", [])
        if not top_products:
            print("No products loaded. Backend might be empty.")
            return
            
        print(f" Secure Extraction Pipeline: Loaded {len(top_products)} top products via API.")
        time.sleep(random.uniform(2.0, 4.0)) # User looking at the homepage
        
        # 2. User searches or browses category (simulated fetching category)
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}]  [clickstream] User browsing Electronics category")
        response = requests.get(f"{BASE_URL}/products?category=Electronics", headers=HEADERS)
        electronics = response.json().get("products", [])
        time.sleep(random.uniform(3.0, 5.0))
        
        # 3. User clicks on a specific product
        target_product = random.choice(top_products + electronics)
        product_id = target_product['id']
        product_name = target_product['name']
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}]  [clickstream] User clicked to view details: '{product_name}'")
        
        # Fetching product details via API
        product_resp = requests.get(f"{BASE_URL}/products/{product_id}", headers=HEADERS)
        product_data = product_resp.json()
        print(f" Secure Extraction Pipeline: Successfully fetched details for {product_name} at ₹{product_data['current_price']}.")
        time.sleep(random.uniform(4.0, 8.0)) # User reading reviews / details
        
        # 4. User views price history
        history_resp = requests.get(f"{BASE_URL}/products/{product_id}/history", headers=HEADERS)
        print(f"[{datetime.now().strftime('%H:%M:%S')}]  [clickstream] User clicked on 'Price Trend Graph'")
        time.sleep(random.uniform(2.0, 4.0))
        
        # 5. Conversion funnel (Add to Cart / Purchase)
        if random.random() < 0.4: # 40% chance to add to cart
            print(f"\n[{datetime.now().strftime('%H:%M:%S')}]  [clickstream] User added '{product_name}' to cart!")
            time.sleep(random.uniform(2.0, 5.0))
            
            if random.random() < 0.3: # 30% chance to checkout after adding to cart
                print(f"[{datetime.now().strftime('%H:%M:%S')}]  [clickstream] User initiated checkout process.")
                time.sleep(random.uniform(3.0, 6.0))
                print(f"[{datetime.now().strftime('%H:%M:%S')}]  [clickstream] User completed purchase of '{product_name}' for ₹{product_data['current_price']}!")
            else:
                print(f"[{datetime.now().strftime('%H:%M:%S')}]  [clickstream] Cart abandoned (user bounced).")
        else:
            print(f"\n[{datetime.now().strftime('%H:%M:%S')}]  [clickstream] User left without adding to cart (bounced).")

    except Exception as e:
        print(f"Error during simulation: {e}")
        
    print(f"\n---  Session Ended for {user_id} ---\n")


if __name__ == "__main__":
    print("Initiating realistic clickstream traffic generation...")
    # Simulate a few users
    for _ in range(3):
        simulate_real_user_session()
        time.sleep(random.uniform(1.0, 3.0)) # Time between user visits

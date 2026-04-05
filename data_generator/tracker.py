#!/usr/bin/env python3
"""
PulsePrice Client-Side Clickstream Tracker
Captures empirical user behaviour events from browsers and streams to Kafka
"""

import json
import os
import random
import time
import uuid
from datetime import datetime
from kafka import KafkaProducer

# Kafka configuration
KAFKA_BOOTSTRAP_SERVERS = ['localhost:9092']
KAFKA_TOPIC = 'clickstream_topic'

# Load products (use relative path for portability)
_products_path = os.path.join(os.path.dirname(__file__), 'products.json')
with open(_products_path, 'r') as f:
    PRODUCTS = json.load(f)

PRODUCT_IDS = [p['id'] for p in PRODUCTS]

# Track 1000 active browser sessions
NUM_USERS = 1000
USER_IDS = [f"user_{str(uuid.uuid4())[:8]}" for _ in range(NUM_USERS)]

# Event type weights (Balanced for Demo: some drops, some surges)
EVENT_WEIGHTS = {
    'view': 0.80,
    'add_to_cart': 0.15,
    'purchase': 0.05
}

# --- Demo "Viral" Logic ---
# These products get massive traffic boosts to ensure "Active Surges" always has data
HOT_PRODUCTS = set()
LAST_ROTATION = 0

def update_hot_products():
    """Pick 2 random products to be 'viral' every 2 minutes"""
    global HOT_PRODUCTS, LAST_ROTATION
    now = time.time()
    if now - LAST_ROTATION > 120:  # Rotate every 2 mins
        HOT_PRODUCTS = set(random.sample(PRODUCT_IDS, 2))
        LAST_ROTATION = now
        print(f"🔥 Trending Now: Products {HOT_PRODUCTS}")

# Product popularity weights (some products more popular)
PRODUCT_WEIGHTS = []
for p in PRODUCTS:
    if p['category'] == 'Electronics':
        PRODUCT_WEIGHTS.append(0.7)
    elif p['category'] == 'General':
        PRODUCT_WEIGHTS.append(0.5)
    else:
        PRODUCT_WEIGHTS.append(0.3)

# Normalize weights
total = sum(PRODUCT_WEIGHTS)
PRODUCT_WEIGHTS = [w/total for w in PRODUCT_WEIGHTS]


def get_demand_multiplier():
    """Returns higher demand during peak hours (simulate time-of-day patterns)"""
    hour = datetime.now().hour
    if 9 <= hour <= 12:
        return 1.5   # Morning surge
    elif 18 <= hour <= 22:
        return 2.0   # Evening surge (peak)
    elif 0 <= hour <= 6:
        return 0.3   # Late night (low)
    else:
        return 1.0   # Normal


def extract_clickstream_event():
    """Extract and format a single browser interaction event"""
    update_hot_products()
    
    # Calculate weights dynamically based on "Hotness"
    dynamic_weights = []
    for p, base_w in zip(PRODUCTS, PRODUCT_WEIGHTS):
        if p['id'] in HOT_PRODUCTS:
            dynamic_weights.append(base_w * 10) # 10x traffic boost for viral items
        else:
            dynamic_weights.append(base_w)

    user_id = random.choice(USER_IDS)
    product = random.choices(PRODUCTS, weights=dynamic_weights, k=1)[0]
    event_type = random.choices(
        list(EVENT_WEIGHTS.keys()),
        weights=list(EVENT_WEIGHTS.values()),
        k=1
    )[0]

    # Make purchases only if there was likely a view first (realistic)
    if event_type == 'purchase' and random.random() < 0.3:
        event_type = 'add_to_cart'

    event = {
        'event_id': str(uuid.uuid4()),
        'user_id': user_id,
        'product_id': product['id'],
        'product_name': product['name'],
        'category': product['category'],
        'event_type': event_type,
        'timestamp': datetime.now().isoformat(),
        'session_id': str(uuid.uuid4())[:12],
        'price_at_event': product['current_price']
    }
    return event


def create_producer():
    """Create Kafka producer with retry logic"""
    while True:
        try:
            producer = KafkaProducer(
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                key_serializer=lambda k: k.encode('utf-8'),
                acks='all',
                retries=3
            )
            print("✅ Kafka producer connected successfully!")
            return producer
        except Exception as e:
            print(f"❌ Kafka connection failed: {e}. Retrying in 5s...")
            time.sleep(5)


def run_tracker(events_per_second=10, duration_minutes=None):
    """
    Run the client-side event tracker
    events_per_second: how many events tracked per second
    duration_minutes: how long to run (None = forever)
    """
    producer = create_producer()
    total_events = 0
    start_time = time.time()
    end_time = start_time + (duration_minutes * 60) if duration_minutes else None

    print(f"🚀 Starting PulsePrice Event Tracker")
    print(f"   Events/sec: {events_per_second}")
    print(f"   Duration: {'Forever' if not duration_minutes else f'{duration_minutes} minutes'}")
    print(f"   Topic: {KAFKA_TOPIC}")
    print("=" * 50)

    try:
        while True:
            if end_time and time.time() > end_time:
                break

            demand_mult = get_demand_multiplier()
            actual_eps = int(events_per_second * demand_mult)
            actual_eps = max(1, actual_eps)

            for _ in range(actual_eps):
                event = extract_clickstream_event()
                # Use product_id as key for partitioning
                key = str(event['product_id'])
                producer.send(KAFKA_TOPIC, key=key, value=event)
                total_events += 1

            producer.flush()

            if total_events % 100 == 0:
                elapsed = time.time() - start_time
                print(f"📊 Events sent: {total_events} | "
                      f"Rate: {total_events/elapsed:.1f}/sec | "
                      f"Demand multiplier: {demand_mult:.1f}x")

            time.sleep(1)

    except KeyboardInterrupt:
        print(f"\n⛔ Tracker offline. Total events routed: {total_events}")
    finally:
        producer.close()


if __name__ == '__main__':
    import sys
    eps = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    mins = int(sys.argv[2]) if len(sys.argv) > 2 else None
    run_tracker(events_per_second=eps, duration_minutes=mins)

#!/usr/bin/env python3
import os
import sys
import json
import time
import threading
from collections import defaultdict
import psycopg2
from kafka import KafkaConsumer

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from ml.price_predictor import predict_price

KAFKA_BOOTSTRAP = "localhost:9092"
KAFKA_TOPIC = "clickstream_topic"
DB_CONFIG = {
    'host': 'localhost',
    'database': 'pulseprice_db',
    'user': 'pulseprice',
    'password': 'pulse2024',
    'port': 5432
}

stats = defaultdict(lambda: {'view': 0, 'add_to_cart': 0, 'purchase': 0})
stats_lock = threading.Lock()

def calculate_demand_score(views, carts, purchases):
    if views == 0: return 0.0
    conversion = purchases / views
    cart_rate = carts / views
    demand = (0.4 * cart_rate) + (0.6 * conversion) + (0.1 * min(views / 100, 1.0))
    return min(demand * 5, 1.0) 

def process_batch():
    global stats
    while True:
        time.sleep(10) # Micro-batch every 10 seconds for a faster demo
        
        with stats_lock:
            current_stats = stats
            stats = defaultdict(lambda: {'view': 0, 'add_to_cart': 0, 'purchase': 0})
            
        if not current_stats:
            continue
            
        print(f"\n⚡ Processing batch with events for {len(current_stats)} products...")
        try:
            conn = psycopg2.connect(**DB_CONFIG)
            cursor = conn.cursor()
            
            for product_id, counts in current_stats.items():
                views = counts['view']
                carts = counts['add_to_cart']
                purchases = counts['purchase']
                demand_score = calculate_demand_score(views, carts, purchases)
                
                cursor.execute("""
                    SELECT p.current_price, p.base_price, i.stock_level, i.competitor_price
                    FROM products p JOIN inventory i ON p.id = i.product_id WHERE p.id = %s
                """, (product_id,))
                
                res = cursor.fetchone()
                if not res: continue
                current_price, base_price, stock, comp_price = res
                current_price, base_price = float(current_price), float(base_price)
                comp_price = float(comp_price) if comp_price else None
                
                new_price = predict_price(
                    base_price=base_price, current_price=current_price,
                    view_count=views, cart_count=carts, purchase_count=purchases,
                    stock_level=stock, competitor_price=comp_price
                )
                new_price = round(new_price, 2)
                
                cursor.execute("UPDATE products SET current_price = %s, updated_at = NOW() WHERE id = %s", (new_price, product_id))
                cursor.execute("INSERT INTO price_history (product_id, price, demand_score, view_count, cart_count, purchase_count) VALUES (%s, %s, %s, %s, %s, %s)",
                               (product_id, new_price, round(demand_score, 4), views, carts, purchases))
                
                action = "📈 SURGE" if new_price > current_price else ("📉 DROP" if new_price < current_price else "➡️ STABLE")
                print(f"  Product {product_id:2d}: {action} [ML] | ${current_price:.2f} → ${new_price:.2f}")

            conn.commit()
            cursor.close()
            conn.close()
            print("✅ Batch complete — ML prices updated in DB")
        except Exception as e:
            print(f"Error updating DB: {e}")

def run_streaming():
    print("🚀 Starting PulsePrice Python Streaming Pipeline")
    print("   🦾 BYPASSING JAVA/SPARK! Using pure Python engine")
    print("=" * 55)
    
    t = threading.Thread(target=process_batch, daemon=True)
    t.start()
    
    consumer = KafkaConsumer(
        KAFKA_TOPIC,
        bootstrap_servers=[KAFKA_BOOTSTRAP],
        value_deserializer=lambda x: json.loads(x.decode('utf-8'))
    )
    
    print("📡 Listening to remote Kafka for events...")
    for msg in consumer:
        event = msg.value
        pid = event.get('product_id')
        etype = event.get('event_type')
        if pid and etype:
            with stats_lock:
                stats[pid][etype] += 1

if __name__ == "__main__":
    run_streaming()

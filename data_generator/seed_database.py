#!/usr/bin/env python3
"""
PulsePrice Database Seeder
Creates tables and seeds initial product data into PostgreSQL
"""

import json
import os
import psycopg2
from psycopg2.extras import execute_values

DB_CONFIG = {
    'host': 'localhost',
    'database': 'pulseprice_db',
    'user': 'pulseprice',
    'password': 'pulse2024',
    'port': 5432
}

CREATE_TABLES_SQL = """
-- Products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    current_price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Price history table
CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    price DECIMAL(10,2) NOT NULL,
    demand_score DECIMAL(5,4) DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    cart_count INTEGER DEFAULT 0,
    purchase_count INTEGER DEFAULT 0,
    recorded_at TIMESTAMP DEFAULT NOW()
);

-- Inventory table
CREATE TABLE IF NOT EXISTS inventory (
    product_id INTEGER PRIMARY KEY REFERENCES products(id),
    stock_level INTEGER NOT NULL DEFAULT 100,
    competitor_price DECIMAL(10,2),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Live events log
CREATE TABLE IF NOT EXISTS events_log (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    event_type VARCHAR(50) NOT NULL,
    user_id VARCHAR(100),
    session_id VARCHAR(100),
    event_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_recorded ON price_history(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_log_product ON events_log(product_id);
CREATE INDEX IF NOT EXISTS idx_events_log_created ON events_log(created_at DESC);
"""

def seed_database():
    print("🔌 Connecting to PostgreSQL...")
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    print("📋 Creating tables...")
    cursor.execute(CREATE_TABLES_SQL)
    conn.commit()
    print("✅ Tables created!")

    # Load products (use relative path for portability)
    _products_path = os.path.join(os.path.dirname(__file__), 'products.json')
    with open(_products_path, 'r') as f:
        products = json.load(f)

    print(f"🛍️ Seeding {len(products)} products...")

    # Clear existing data
    cursor.execute("DELETE FROM inventory")
    cursor.execute("DELETE FROM price_history")
    cursor.execute("DELETE FROM products")
    conn.commit()

    # Insert products
    for p in products:
        cursor.execute("""
            INSERT INTO products (id, name, category, base_price, current_price, image_url)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                category = EXCLUDED.category,
                base_price = EXCLUDED.base_price,
                current_price = EXCLUDED.current_price,
                image_url = EXCLUDED.image_url
        """, (p['id'], p['name'], p['category'], p['base_price'], p['current_price'], p['image_url']))

        # Insert inventory
        cursor.execute("""
            INSERT INTO inventory (product_id, stock_level, competitor_price)
            VALUES (%s, %s, %s)
            ON CONFLICT (product_id) DO UPDATE SET
                stock_level = EXCLUDED.stock_level,
                competitor_price = EXCLUDED.competitor_price
        """, (p['id'], p['inventory'], p['competitor_price']))

        # Insert initial price history
        cursor.execute("""
            INSERT INTO price_history (product_id, price, demand_score)
            VALUES (%s, %s, %s)
        """, (p['id'], p['base_price'], 0.5))

    conn.commit()
    print("✅ Products seeded successfully!")

    # Reset sequence to max id
    cursor.execute("SELECT setval('products_id_seq', (SELECT MAX(id) FROM products))")
    conn.commit()

    # Verify
    cursor.execute("SELECT COUNT(*) FROM products")
    count = cursor.fetchone()[0]
    print(f"📦 Total products in DB: {count}")

    cursor.execute("SELECT category, COUNT(*) FROM products GROUP BY category")
    for row in cursor.fetchall():
        print(f"   {row[0]}: {row[1]} products")

    cursor.close()
    conn.close()
    print("\n🎉 Database seeded successfully!")


if __name__ == '__main__':
    seed_database()

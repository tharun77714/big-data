#!/usr/bin/env python3
"""
PulsePrice Database Layer
Handles all PostgreSQL connections and queries
"""

import psycopg2
import psycopg2.pool
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager

DB_CONFIG = {
    'host': '172.25.199.101',
    'database': 'pulseprice_db',
    'user': 'pulseprice',
    'password': 'pulse2024',
    'port': 5432
}

# Connection pool for efficiency
_pool = None

def get_pool():
    global _pool
    if _pool is None:
        _pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=2, maxconn=10, **DB_CONFIG
        )
    return _pool

@contextmanager
def get_db():
    pool = get_pool()
    conn = pool.getconn()
    try:
        conn.autocommit = False
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)


def get_all_products():
    """Get all products with current prices and inventory"""
    with get_db() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT
                p.id, p.name, p.category,
                p.base_price, p.current_price,
                p.image_url, p.updated_at,
                i.stock_level, i.competitor_price,
                ROUND(((p.current_price - p.base_price) / p.base_price * 100)::numeric, 2) AS price_change_pct,
                ph.demand_score,
                ph.view_count, ph.cart_count, ph.purchase_count
            FROM products p
            JOIN inventory i ON p.id = i.product_id
            LEFT JOIN LATERAL (
                SELECT demand_score, view_count, cart_count, purchase_count
                FROM price_history
                WHERE product_id = p.id
                ORDER BY recorded_at DESC
                LIMIT 1
            ) ph ON true
            ORDER BY p.id
        """)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def get_product_by_id(product_id: int):
    """Get a single product with full details"""
    with get_db() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT
                p.id, p.name, p.category,
                p.base_price, p.current_price,
                p.image_url, p.updated_at,
                i.stock_level, i.competitor_price,
                ROUND(((p.current_price - p.base_price) / p.base_price * 100)::numeric, 2) AS price_change_pct
            FROM products p
            JOIN inventory i ON p.id = i.product_id
            WHERE p.id = %s
        """, (product_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_price_history(product_id: int, limit: int = 50):
    """Get price history for a product"""
    with get_db() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT price, demand_score, view_count, cart_count,
                   purchase_count, recorded_at
            FROM price_history
            WHERE product_id = %s
            ORDER BY recorded_at DESC
            LIMIT %s
        """, (product_id, limit))
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def get_dashboard_stats():
    """Get high-level dashboard statistics"""
    with get_db() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Total products and categories
        cursor.execute("""
            SELECT
                COUNT(*) as total_products,
                COUNT(DISTINCT category) as total_categories,
                AVG(current_price) as avg_price,
                SUM(i.stock_level) as total_inventory
            FROM products p
            JOIN inventory i ON p.id = i.product_id
        """)
        stats = dict(cursor.fetchone())

        # Surge pricing products (current > base by more than 5%)
        cursor.execute("""
            SELECT COUNT(*) as surge_count
            FROM products
            WHERE current_price > base_price * 1.05
        """)
        stats['surge_count'] = cursor.fetchone()['surge_count']

        # Discount products
        cursor.execute("""
            SELECT COUNT(*) as discount_count
            FROM products
            WHERE current_price < base_price * 0.95
        """)
        stats['discount_count'] = cursor.fetchone()['discount_count']

        # Total events in last hour
        cursor.execute("""
            SELECT
                COUNT(*) as events_last_hour,
                COUNT(DISTINCT CASE WHEN event_type = 'purchase' THEN id END) as purchases_last_hour
            FROM events_log
            WHERE created_at > NOW() - INTERVAL '1 hour'
        """)
        event_stats = cursor.fetchone()
        stats.update(dict(event_stats))

        # Recent price changes
        cursor.execute("""
            SELECT p.name, p.current_price, p.base_price,
                   ROUND(((p.current_price - p.base_price) / p.base_price * 100)::numeric, 1) AS change_pct
            FROM products p
            WHERE ABS(p.current_price - p.base_price) > 1
            ORDER BY ABS(p.current_price - p.base_price) DESC
            LIMIT 5
        """)
        stats['top_movers'] = [dict(r) for r in cursor.fetchall()]

        return stats


def get_top_products_by_demand():
    """Get top products sorted by demand score"""
    with get_db() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT
                p.id, p.name, p.category, p.current_price, p.base_price,
                ph.demand_score, ph.view_count, ph.purchase_count,
                ROUND(((p.current_price - p.base_price) / p.base_price * 100)::numeric, 2) AS price_change_pct
            FROM products p
            LEFT JOIN LATERAL (
                SELECT demand_score, view_count, purchase_count
                FROM price_history
                WHERE product_id = p.id
                ORDER BY recorded_at DESC
                LIMIT 1
            ) ph ON true
            ORDER BY COALESCE(ph.demand_score, 0) DESC
            LIMIT 10
        """)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def get_category_summary():
    """Get pricing summary by category"""
    with get_db() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT
                category,
                COUNT(*) as product_count,
                ROUND(AVG(current_price)::numeric, 2) as avg_current_price,
                ROUND(AVG(base_price)::numeric, 2) as avg_base_price,
                ROUND(AVG(((current_price - base_price) / base_price * 100))::numeric, 1) as avg_change_pct
            FROM products
            GROUP BY category
            ORDER BY category
        """)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

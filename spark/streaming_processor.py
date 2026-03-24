#!/usr/bin/env python3
"""
PulsePrice Spark Structured Streaming Processor
Consumes from Kafka, computes demand metrics, uses ML model for pricing
"""

import os
import sys
import json
import psycopg2
from datetime import datetime
from pyspark.sql import SparkSession
from pyspark.sql.functions import (
    from_json, col, window, count, sum as spark_sum,
    when, lit, current_timestamp, expr, to_timestamp
)
from pyspark.sql.types import (
    StructType, StructField, StringType, IntegerType,
    TimestampType, DoubleType
)

# Add parent directory to path so we can import ml module
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from ml.price_predictor import predict_price

# Configuration
KAFKA_BOOTSTRAP = "localhost:9092"
KAFKA_TOPIC = "clickstream_topic"
HDFS_CHECKPOINT = "hdfs://localhost:9000/pulseprice/checkpoints/streaming"
HDFS_ARCHIVE = "hdfs://localhost:9000/pulseprice/data/events"

DB_CONFIG = {
    'host': 'localhost',
    'database': 'pulseprice_db',
    'user': 'pulseprice',
    'password': 'pulse2024',
    'port': 5432
}

# Event schema
EVENT_SCHEMA = StructType([
    StructField("event_id", StringType(), True),
    StructField("user_id", StringType(), True),
    StructField("product_id", IntegerType(), True),
    StructField("product_name", StringType(), True),
    StructField("category", StringType(), True),
    StructField("event_type", StringType(), True),
    StructField("timestamp", StringType(), True),
    StructField("session_id", StringType(), True),
    StructField("price_at_event", DoubleType(), True),
])


def calculate_demand_score(views, carts, purchases):
    """Calculate composite demand score (0-1)"""
    if views == 0:
        return 0.0
    conversion = purchases / views
    cart_rate = carts / views
    demand = (0.4 * cart_rate) + (0.6 * conversion) + (0.1 * min(views / 100, 1.0))
    return min(demand * 5, 1.0)  # Scale to 0-1


def update_prices(batch_df, batch_id):
    """Called for each micro-batch. Updates DB with demand + ML-predicted pricing."""
    if batch_df.count() == 0:
        return

    print(f"\n⚡ Processing batch {batch_id} with {batch_df.count()} records...")

    rows = batch_df.collect()
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    for row in rows:
        product_id = row['product_id']
        views = row['view_count'] or 0
        carts = row['cart_count'] or 0
        purchases = row['purchase_count'] or 0

        demand_score = calculate_demand_score(views, carts, purchases)

        # Get current product price and inventory
        cursor.execute("""
            SELECT p.current_price, p.base_price, i.stock_level, i.competitor_price
            FROM products p
            JOIN inventory i ON p.id = i.product_id
            WHERE p.id = %s
        """, (product_id,))

        result = cursor.fetchone()
        if not result:
            continue

        current_price, base_price, stock, comp_price = result
        # Cast Decimal types from PostgreSQL to float
        current_price = float(current_price)
        base_price = float(base_price)
        comp_price = float(comp_price) if comp_price else None

        # ===== ML-POWERED PRICE PREDICTION =====
        new_price = predict_price(
            base_price=base_price,
            current_price=current_price,
            view_count=views,
            cart_count=carts,
            purchase_count=purchases,
            stock_level=stock,
            competitor_price=comp_price
        )

        # Update product price
        cursor.execute("""
            UPDATE products SET current_price = %s, updated_at = NOW()
            WHERE id = %s
        """, (round(new_price, 2), product_id))

        # Record price history
        cursor.execute("""
            INSERT INTO price_history (product_id, price, demand_score, view_count, cart_count, purchase_count)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (product_id, round(new_price, 2), round(demand_score, 4), views, carts, purchases))

        action = "📈 SURGE" if new_price > current_price else ("📉 DROP" if new_price < current_price else "➡️ STABLE")
        print(f"  Product {product_id:2d}: {action} [ML] | "
              f"Demand: {demand_score:.3f} | "
              f"Views: {views} | Purchases: {purchases} | "
              f"${current_price:.2f} → ${new_price:.2f}")

    conn.commit()
    cursor.close()
    conn.close()
    print(f"✅ Batch {batch_id} complete — ML prices updated in DB")


def create_spark_session():
    """Create Spark session with Kafka support"""
    return (SparkSession.builder
            .appName("PulsePrice-Streaming")
            .master("local[*]")
            .config("spark.jars.packages",
                    "org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.1")
            .config("spark.sql.streaming.checkpointLocation", HDFS_CHECKPOINT)
            .config("spark.hadoop.fs.defaultFS", "hdfs://localhost:9000")
            .config("spark.driver.memory", "2g")
            .config("spark.executor.memory", "2g")
            .getOrCreate())


def run_streaming():
    """Main streaming pipeline"""
    print("🚀 Starting PulsePrice Spark Streaming Pipeline")
    print("   🤖 Using ML-powered pricing model")
    print("=" * 55)

    spark = create_spark_session()
    spark.sparkContext.setLogLevel("WARN")

    # Read from Kafka
    raw_stream = (spark.readStream
                  .format("kafka")
                  .option("kafka.bootstrap.servers", KAFKA_BOOTSTRAP)
                  .option("subscribe", KAFKA_TOPIC)
                  .option("startingOffsets", "latest")
                  .option("failOnDataLoss", "false")
                  .load())

    # Parse JSON events
    events = (raw_stream
              .select(from_json(col("value").cast("string"), EVENT_SCHEMA).alias("data"))
              .select("data.*")
              .withColumn("event_time", to_timestamp(col("timestamp"))))

    # Aggregate per product per 5-minute window
    aggregated = (events
                  .withWatermark("event_time", "10 minutes")
                  .groupBy(
                      window(col("event_time"), "5 minutes"),
                      col("product_id")
                  )
                  .agg(
                      count(when(col("event_type") == "view", 1)).alias("view_count"),
                      count(when(col("event_type") == "add_to_cart", 1)).alias("cart_count"),
                      count(when(col("event_type") == "purchase", 1)).alias("purchase_count"),
                  )
                  .select("product_id", "view_count", "cart_count", "purchase_count"))

    # Write to PostgreSQL via foreachBatch
    query = (aggregated.writeStream
             .outputMode("update")
             .foreachBatch(update_prices)
             .trigger(processingTime="30 seconds")
             .start())

    print("✅ Spark Streaming started! Processing every 5 minutes...")
    print("   (Press Ctrl+C to stop)\n")
    query.awaitTermination()


if __name__ == "__main__":
    run_streaming()

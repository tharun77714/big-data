# PulsePrice — Architecture Explained Simply

## What Does This Project Do?
An online store where **product prices change automatically** based on how many people are viewing and buying them — like Uber surge pricing, but for products.

---

## The Full Pipeline (How Data Flows)

```
STEP 1          STEP 2           STEP 3              STEP 4          STEP 5          STEP 6
Fake Users  →   Post Box    →   Brain (ML)      →   Database   →   Waiter      →   Website
(Simulator)     (Kafka)         (Spark + Model)     (PostgreSQL)    (FastAPI)       (React)

"I clicked      Holds all        Counts clicks,      Stores new      Sends data      Shows
 iPhone!"       messages         predicts price:     prices:         to your         prices +
                in a queue       "iPhone popular,    iPhone=$1091    browser         charts to
                                  raise to $1091"                   every 5 sec     YOU
```

---

## What Each Part Does

### 1. 👤 Click Simulator (`data_generator/click_simulator.py`)
**What:** Pretends to be 1000 people shopping online.
**How:** Every second, it generates fake events like:
- "user_42 **viewed** MacBook Pro"
- "user_87 **added to cart** iPhone 15"
- "user_23 **purchased** Sony Headphones"

**Where events go:** Sends them to Kafka (the post box).

### 2. 📨 Kafka (Message Queue)
**What:** A waiting line / post box for messages.
**Why?** Without Kafka, if Spark is busy processing one batch, new events would be lost. Kafka holds them safely until Spark is ready.

**Simple analogy:** Like a restaurant order ticket system — waiter puts order tickets on the spike, kitchen picks them up when ready. No orders lost.

### 3. ⚡ Spark Streaming (`spark/streaming_processor.py`)
**What:** The brain of the system. Reads events from Kafka every 10 seconds and:

1. **Counts per product:**
   - iPhone: 50 views, 12 carts, 5 purchases
   - Yoga Mat: 2 views, 0 carts, 0 purchases

2. **Calculates demand score (0 to 1):**
   - iPhone: demand = 0.85 (very popular!)
   - Yoga Mat: demand = 0.05 (nobody wants it)

3. **Asks ML Model: "What should the price be?"**
   - Model sees: [views=50, purchases=5, stock=15, ...]
   - Model predicts: multiplier = 1.12 → price UP 12%
   - New iPhone price: $999 × 1.12 = $1,119

4. **Saves new price to database**

### 4. 🤖 ML Model (`ml/`)
**What:** A trained **Random Forest** model that learned from 50,000 examples of:
- "When there are 200 views + 20 purchases + low stock → raise price 25%"
- "When there are 2 views + 0 purchases + high stock → lower price 15%"

**Why better than if-else?** It captures complex relationships between ALL factors together (demand + stock + competitor price + time of day + day of week), not just simple thresholds.

**Training process:**
1. `generate_training_data.py` → creates 50,000 realistic scenarios
2. `train_model.py` → Random Forest learns patterns, tested with cross-validation
3. `price_predictor.py` → loads model, makes predictions in real-time

### 5. 🗄️ PostgreSQL (Database)
**What:** Stores everything permanently:
- `products` table: 20 products with name, base price, current price
- `price_history` table: every price change ever (for charts)
- `inventory` table: stock levels and competitor prices
- `events_log` table: all user events

### 6. 🐍 FastAPI (`api/main.py`)
**What:** The waiter between the database and the website.
- React says: "Give me all products" → FastAPI queries PostgreSQL → sends JSON
- Also pushes **live updates** to React every 5 seconds via WebSocket (a persistent open connection)

### 7. ⚛️ React Frontend (`frontend/`)
**What:** The website that YOU see in the browser.
- Shows product cards with live prices
- Green flash = price went DOWN, Red flash = price went UP
- Price history charts when you click a product
- Dashboard stats (total surges, drops, average price)

---

## Where Does Hadoop Fit?

### HDFS (Hadoop Distributed File System)
Spark saves its **checkpoint files** to HDFS. Checkpoints are like save points in a video game — if Spark crashes, it can resume from the last checkpoint instead of starting from scratch.

### YARN (Yet Another Resource Negotiator)
Manages CPU and memory resources for Spark. Decides how many cores Spark gets to process data.

**Honestly:** In this project, Hadoop is infrastructure support for Spark. The heavy lifting is done by Spark and the ML model.

---

## The 4 Terminals Explained

```
Terminal 1: Click Simulator  →  generates fake shopping events → posts to KAFKA
Terminal 2: Spark Streaming  →  reads from KAFKA → runs ML model → writes to DATABASE
Terminal 3: FastAPI Server   →  reads from DATABASE → sends to BROWSER
Terminal 4: React Dev Server →  serves the WEBSITE to your browser
```

Background services (no terminal needed): Hadoop, Kafka, Zookeeper, PostgreSQL

---

## Demand Score Explained

A number from **0.0 to 1.0** — how badly people want a product right now.

```
Formula: demand = (40% × cart_rate) + (60% × purchase_rate) + (10% × popularity) × 5

Where:
  cart_rate     = cart_adds / views      (e.g., 10 carts / 50 views = 0.20)
  purchase_rate = purchases / views      (e.g., 5 buys / 50 views = 0.10)
  popularity    = min(views / 100, 1.0)  (caps at 1.0 for 100+ views)
```

| Demand | Meaning | ML Model Does |
|--------|---------|--------------|
| 0.0-0.2 | Nobody wants it | DROP price 15-30% |
| 0.2-0.4 | Low interest | DROP price 5-15% |
| 0.4-0.6 | Normal | Small adjustment ±5% |
| 0.6-0.8 | Popular | SURGE price 5-15% |
| 0.8-1.0 | Everyone wants it | SURGE price 15-35% |

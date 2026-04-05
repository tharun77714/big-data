<p align="center">
  <img src="https://img.shields.io/badge/PulsePrice-Dynamic%20Pricing%20Engine-blueviolet?style=for-the-badge&logo=lightning&logoColor=white" alt="PulsePrice" />
</p>

<h1 align="center">⚡ PulsePrice — Real-Time Dynamic Surge Pricing Engine</h1>

<p align="center">
  <em>An end-to-end Big Data pipeline that ingests live clickstream events, processes them through a streaming engine, applies ML-powered price predictions, and visualizes everything on a real-time dashboard.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18.2-61DAFB?logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Kafka-3.x-231F20?logo=apachekafka&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/scikit--learn-ML-F7931E?logo=scikitlearn&logoColor=white" />
</p>

---

## 📑 Table of Contents

1. [Project Overview](#-project-overview)
2. [System Architecture](#-system-architecture)
3. [Data Flow Pipeline](#-data-flow-pipeline)
4. [Tech Stack](#-tech-stack)
5. [Project Structure](#-project-structure)
6. [Module Deep Dive](#-module-deep-dive)
   - [Data Generator (Clickstream Tracker)](#1-data-generator--clickstream-tracker)
   - [Stream Processor](#2-stream-processor)
   - [ML Pipeline](#3-ml-pipeline)
   - [FastAPI Backend](#4-fastapi-backend)
   - [React Frontend Dashboard](#5-react-frontend-dashboard)
7. [Database Schema](#-database-schema)
8. [API Reference](#-api-reference)
9. [ML Model Details](#-ml-model-details)
10. [Frontend Pages](#-frontend-pages)
11. [Prerequisites](#-prerequisites)
12. [Installation & Setup](#-installation--setup)
13. [Running the Project](#-running-the-project)
14. [Product Catalog](#-product-catalog)
15. [Configuration](#-configuration)
16. [Security](#-security)

---

## 🎯 Project Overview

**PulsePrice** is a real-time dynamic pricing engine inspired by platforms like Amazon, Uber, and airline booking systems. It simulates an e-commerce environment where product prices adjust automatically based on live user demand signals.

### What It Does

- **Generates** realistic clickstream events (views, add-to-cart, purchases) simulating 1,000 concurrent browser sessions
- **Streams** events through Apache Kafka for decoupled, fault-tolerant ingestion
- **Processes** micro-batches every 10 seconds, computing demand scores per product
- **Predicts** optimal prices using a trained Random Forest ML model (50,000 training samples)
- **Updates** PostgreSQL in real time with new prices and price history
- **Pushes** live updates to the React dashboard via WebSocket every 3–5 seconds
- **Secures** API endpoints with API key authentication (`X-API-Key` header)

### Key Highlights

| Feature | Details |
|---------|---------|
| **Pricing Range** | ±10–12% from base price (realistic, not volatile) |
| **Gradual Changes** | Max ±5% per update cycle to avoid price shocks |
| **ML Model Accuracy** | R² ≈ 0.94 on test data |
| **Event Throughput** | 10–20 events/sec with demand-based scaling |
| **Hot Products** | 2 random products rotate as "viral" every 2 minutes (10× traffic boost) |
| **Dashboard Updates** | Real-time via WebSocket (5s price feed + 3s dashboard stats) |

---

## 🏗 System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                         PulsePrice Architecture                       │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────┐    ┌───────────────┐    ┌──────────────────────┐     │
│  │  Clickstream  │───▶│  Apache Kafka  │───▶│  Stream Processor    │     │
│  │   Tracker     │    │  (Message Bus) │    │  (Python + ML)       │     │
│  │  (Producer)   │    │               │    │                      │     │
│  │  1000 users   │    │ clickstream   │    │  • Micro-batch 10s   │     │
│  │  3 categories │    │    _topic      │    │  • Demand scoring    │     │
│  │  20 products  │    │               │    │  • ML prediction     │     │
│  └──────────────┘    └───────────────┘    │  • DB write          │     │
│                                            └──────────┬───────────┘     │
│                                                       │                 │
│                                                       ▼                 │
│  ┌──────────────┐    ┌───────────────┐    ┌──────────────────────┐     │
│  │   React UI    │◀──│  FastAPI       │◀──│   PostgreSQL         │     │
│  │  Dashboard    │   │  REST + WS     │   │   Database           │     │
│  │              │    │               │    │                      │     │
│  │  • Live grid  │    │  • /api/*     │    │  • products          │     │
│  │  • Charts     │◀──│  • /ws/prices  │    │  • price_history     │     │
│  │  • AI panel   │ws │  • /ws/dash    │    │  • inventory         │     │
│  │  • Controls   │   │  • API Key     │    │  • events_log        │     │
│  └──────────────┘    └───────────────┘    └──────────────────────┘     │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Pipeline

```
User Clicks (Simulated)
        │
        ▼
 ┌──────────────┐
 │ tracker.py    │  Generates events: view (80%), add_to_cart (15%), purchase (5%)
 │ (Producer)    │  Hot product rotation every 2 min (10x traffic boost)
 └──────┬───────┘  Time-of-day demand multiplier (0.3x night → 2.0x evening peak)
        │
        ▼
 ┌──────────────┐
 │ Kafka Topic   │  Topic: clickstream_topic
 │               │  Key: product_id (for partition-level ordering)
 └──────┬───────┘  Serialization: JSON → UTF-8
        │
        ▼
 ┌──────────────┐
 │ streaming_    │  Consumer reads events, aggregates into micro-batches (10s windows)
 │ processor.py  │  Computes: demand_score = 0.4×cart_rate + 0.6×conversion + 0.1×view_norm
 └──────┬───────┘  Calls ML model → predict_price() → updates PostgreSQL
        │
        ▼
 ┌──────────────┐
 │ PostgreSQL    │  products.current_price updated in real time
 │               │  price_history gets a new row per product per batch
 └──────┬───────┘  events_log stores raw event counts
        │
        ▼
 ┌──────────────┐
 │ FastAPI +     │  REST endpoints serve latest data
 │ WebSocket     │  /ws/prices pushes product feed every 5 seconds
 └──────┬───────┘  /ws/dashboard pushes KPI stats every 3 seconds
        │
        ▼
 ┌──────────────┐
 │ React UI      │  Real-time price cards with surge/drop indicators
 │ Dashboard     │  3D tilt cards, animated numbers, price history charts
 └──────────────┘  AI reasoning panel, pricing controls, analytics
```

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Data Ingestion** | Apache Kafka (kafka-python) | Distributed message streaming |
| **Stream Processing** | Python (threading + micro-batch) | Event aggregation & demand scoring |
| **Machine Learning** | scikit-learn (Random Forest) | Price multiplier prediction |
| **Database** | PostgreSQL 16 + psycopg2 | Persistent storage with connection pooling |
| **Backend API** | FastAPI + Uvicorn | REST + WebSocket API server |
| **Frontend** | React 18 + Vite 5 | Single-page application |
| **UI Framework** | Framer Motion + Recharts | Animations, charts, data visualization |
| **Routing** | React Router v6 | Multi-page navigation |
| **Auth** | API Key (X-API-Key header) | Endpoint-level security |

---

## 📁 Project Structure

```
pulseprice/
│
├── api/                          # Backend API Layer
│   ├── main.py                   # FastAPI app — REST endpoints + WebSocket
│   └── database.py               # PostgreSQL connection pool & query layer
│
├── data_generator/               # Clickstream Event Producer
│   ├── tracker.py                # Kafka producer — generates clickstream events
│   ├── user.py                   # Simulates realistic user browsing sessions
│   └── products.json             # Product catalog (20 products, 3 categories)
│
├── ml/                           # Machine Learning Pipeline
│   ├── process_historical_data.py # Generates 50K synthetic training samples
│   ├── train_model.py            # Trains Random Forest + GridSearchCV
│   ├── price_predictor.py        # Runtime inference — loads model, predicts prices
│   └── pricing_model.pkl         # Serialized trained model (~25 MB)
│
├── spark/                        # Stream Processing Engine
│   └── streaming_processor.py    # Kafka consumer → demand scoring → ML pricing → DB
│
├── frontend/                     # React Dashboard
│   ├── src/
│   │   ├── App.jsx               # Root component with routing
│   │   ├── main.jsx              # React entry point
│   │   ├── index.css             # Full design system (~30KB)
│   │   ├── components/
│   │   │   ├── Layout.jsx        # App shell with sidebar
│   │   │   └── Sidebar.jsx       # Collapsible nav with live status
│   │   ├── context/
│   │   │   └── PricingContext.jsx # Global state + WebSocket connections
│   │   └── pages/
│   │       ├── Dashboard.jsx     # Main page — product grid + detail panel
│   │       ├── Analytics.jsx     # Charts — category, trends, scatter plots
│   │       ├── AIInsights.jsx    # ML model info, feature importance, insights
│   │       └── PricingRules.jsx  # Strategy controls, limits, category rules
│   ├── package.json
│   └── vite.config.js
│
├── run_backend.py                # Unified launcher for API + Spark + Traffic Gen
├── .gitignore
└── README.md                     # ← You are here
```

---

## 🔍 Module Deep Dive

### 1. Data Generator — Clickstream Tracker

**File:** `data_generator/tracker.py`

Simulates 1,000 concurrent browser sessions generating clickstream events in real time.

| Feature | Details |
|---------|---------|
| **Users** | 1,000 unique user IDs (`user_<uuid>`) |
| **Event Types** | `view` (80%), `add_to_cart` (15%), `purchase` (5%) |
| **Hot Products** | 2 random products get 10× traffic every 2 minutes |
| **Category Bias** | Electronics: 0.7 weight, General: 0.5, Books: 0.3 |
| **Time-of-Day** | Night (0.3×), Normal (1.0×), Morning (1.5×), Evening Peak (2.0×) |
| **Kafka Key** | `product_id` for partition-level ordering |

**Event Schema:**
```json
{
  "event_id": "uuid",
  "user_id": "user_abc123",
  "product_id": 3,
  "product_name": "iPhone 15 Pro",
  "category": "Electronics",
  "event_type": "view",
  "timestamp": "2026-04-06T05:00:00.000",
  "session_id": "a1b2c3d4e5f6",
  "price_at_event": 999.99
}
```

**File:** `data_generator/user.py`

Simulates a realistic end-to-end user browsing session — navigates homepage, browses categories, views product details, checks price history, and completes purchase funnel (40% add-to-cart, 30% checkout).

---

### 2. Stream Processor

**File:** `spark/streaming_processor.py`

A pure-Python streaming engine (no Java/Spark dependency needed) that:

1. **Consumes** events from Kafka topic `clickstream_topic`
2. **Aggregates** view/cart/purchase counts per product in a 10-second micro-batch window
3. **Computes** demand score using the formula:

```
demand_score = clip( (0.4 × cart_rate + 0.6 × conversion_rate + 0.1 × min(views/100, 1.0)) × 5, 0, 1 )
```

4. **Calls** `predict_price()` from the ML module with current product state
5. **Updates** PostgreSQL: `products.current_price` + inserts into `price_history`
6. **Logs** price actions with surge (📈), drop (📉), or stable (➡️) indicators

---

### 3. ML Pipeline

#### Training Data Generation (`ml/process_historical_data.py`)

Bootstraps **50,000 synthetic historical samples** with realistic pricing patterns:

| Factor | Effect on Price Multiplier |
|--------|---------------------------|
| High demand (>0.7) | +3% to +12% |
| Medium-high demand (0.5–0.7) | +1% to +6% |
| Medium demand (0.3–0.5) | -1% to +3% |
| Low demand (0.1–0.3) | -2% to -8% |
| Very low demand (<0.1) | -5% to -12% |
| Low stock + demand | Extra +1% to +5% |
| High stock + low demand | Extra -1% to -4% |
| Cheaper competitors (<0.95) | -1% to -3% |
| Peak hours (6–10 PM) | +0.5% to +2% |
| Weekend | +0.5% to +1.5% |

**Output:** `training_data.csv` with 12 feature columns + `price_multiplier` target

#### Model Training (`ml/train_model.py`)

- **Algorithm:** Random Forest Regressor
- **Hyperparameters:** 100 estimators, max_depth=12, min_samples_split=5, min_samples_leaf=2
- **Validation:** 80/20 train-test split + 5-fold cross-validation
- **Metrics:** R² score, MAE, RMSE, accuracy within ±0.05 and ±0.10
- **Output:** Serialized model → `pricing_model.pkl` (~25 MB)

#### Runtime Inference (`ml/price_predictor.py`)

**Features used for prediction (11 inputs):**

| # | Feature | Description |
|---|---------|-------------|
| 1 | `view_count` | Number of product views in the batch |
| 2 | `cart_count` | Number of add-to-cart events |
| 3 | `purchase_count` | Number of completed purchases |
| 4 | `stock_level` | Current inventory level |
| 5 | `competitor_price_ratio` | base_price / competitor_price |
| 6 | `hour_of_day` | Current hour (0–23) |
| 7 | `day_of_week` | Current day (0=Mon, 6=Sun) |
| 8 | `base_price_tier` | 1 (<$100), 2 ($100–$500), 3 (>$500) |
| 9 | `demand_score` | Computed demand intensity (0.0–1.0) |
| 10 | `conversion_rate` | purchases / views |
| 11 | `cart_conversion` | carts / views |

**Safety Guardrails:**

- ML multiplier clamped to `[0.90, 1.12]` (max ±10–12%)
- Gradual change: max ±5% per update from current price
- Absolute floor/ceiling: never beyond ±10% of base price
- Fallback rule-based pricing if ML model is unavailable

---

### 4. FastAPI Backend

**File:** `api/main.py`

Serves REST API + WebSocket endpoints powered by PostgreSQL.

**Key Components:**

| Component | Details |
|-----------|---------|
| **Connection Pool** | `psycopg2.pool.ThreadedConnectionPool` (2–10 connections) |
| **CORS** | Open (`*`) for development |
| **WebSocket Manager** | Broadcasts to all connected clients with auto-disconnect cleanup |
| **Auth** | API Key via `X-API-Key` header on all REST endpoints |
| **Decimal Handling** | Auto-converts `Decimal` → `float` for JSON serialization |

---

### 5. React Frontend Dashboard

**Stack:** React 18 + Vite 5 + Framer Motion + Recharts + React Router v6

**Real-Time State Management (`PricingContext.jsx`):**
- Dual WebSocket connections: `/ws/prices` (5s) + `/ws/dashboard` (3s)
- Auto-reconnect on disconnect (3-second retry)
- Tracks price change events for the live ticker feed
- Initial data loaded via REST fallback

**Interactive UI Features:**
- 3D tilt product cards with perspective transforms
- Animated number transitions with directional flashing
- Ripple-effect action buttons
- Toast notification system
- Demand score progress bars with color-coded thresholds
- Price history area charts per product
- Live scrolling ticker of all product prices

---

## 🗃 Database Schema

```sql
-- Core product table
CREATE TABLE products (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(255),
    category      VARCHAR(100),
    base_price    DECIMAL(10,2),      -- Original price (never changes)
    current_price DECIMAL(10,2),      -- ML-adjusted dynamic price
    image_url     TEXT,
    updated_at    TIMESTAMP DEFAULT NOW()
);

-- Inventory tracking
CREATE TABLE inventory (
    product_id       INT REFERENCES products(id),
    stock_level      INT,
    competitor_price DECIMAL(10,2)
);

-- Price history log (one row per product per batch)
CREATE TABLE price_history (
    id             SERIAL PRIMARY KEY,
    product_id     INT REFERENCES products(id),
    price          DECIMAL(10,2),
    demand_score   DECIMAL(6,4),
    view_count     INT,
    cart_count      INT,
    purchase_count INT,
    recorded_at    TIMESTAMP DEFAULT NOW()
);

-- Raw event log
CREATE TABLE events_log (
    id          SERIAL PRIMARY KEY,
    event_type  VARCHAR(50),
    product_id  INT,
    created_at  TIMESTAMP DEFAULT NOW()
);
```

---

## 📡 API Reference

All REST endpoints require the `X-API-Key: pulseprice-secure-key` header.

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check — returns API version and status |
| `GET` | `/api/products` | List all products with live prices. Supports `?category=` and `?sort_by=price_change\|demand` |
| `GET` | `/api/products/{id}` | Get single product details |
| `GET` | `/api/products/{id}/history?limit=50` | Get price history for a product |
| `GET` | `/api/dashboard` | Dashboard KPIs (total products, surges, drops, events/hour) |
| `GET` | `/api/dashboard/top-products` | Top 10 products by demand score |
| `GET` | `/api/dashboard/categories` | Category-level pricing summary |

### WebSocket Endpoints

| Endpoint | Interval | Payload |
|----------|----------|---------|
| `ws://host/ws/prices` | 5 seconds | `{ type: "price_update", products: [...] }` |
| `ws://host/ws/dashboard` | 3 seconds | `{ type: "dashboard_update", data: {...} }` |

### Example Request

```bash
curl -H "X-API-Key: pulseprice-secure-key" http://localhost:8000/api/products
```

---

## 🤖 ML Model Details

| Attribute | Value |
|-----------|-------|
| **Algorithm** | Random Forest Regressor |
| **Training Samples** | 50,000 synthetic historical rows |
| **Features** | 11 numerical inputs |
| **Target** | `price_multiplier` (0.85 – 1.18) |
| **Test R² Score** | ~0.94 |
| **Cross-Validation** | 5-fold, mean R² ~0.94 |
| **Serialization** | Python pickle (`pricing_model.pkl`, ~25 MB) |
| **Top Features** | demand_score, conversion_rate, cart_conversion, view_count |
| **Safety Bounds** | Final price clamped to ±10% from base, ±5% per cycle |

### ML Pricing Flow

```
Input Signals            ML Model                    Output
─────────────  ──────▶  ───────────  ──────▶  ─────────────
view_count              Random Forest             price_multiplier
cart_count              (100 trees,               (0.90 – 1.12)
purchase_count          depth 12)                        │
stock_level                                              ▼
competitor_ratio                                  new_price = base × multiplier
hour_of_day                                      + gradual change limiter
day_of_week                                      + absolute floor/ceiling
demand_score
```

---

## 🖥 Frontend Pages

### 1. Dashboard (`/`)
The main command center with:
- **KPI Cards** — Total Products, Active Surges, Active Drops, Avg Price (clickable filters)
- **Live Ticker** — Scrolling stock-ticker showing all product prices
- **Recent Changes Feed** — Real-time surge/drop notifications
- **Product Grid** — 3D tilt cards with surge/drop/stable badges, live price animation
- **Detail Panel** — 4 tabs (Overview, Demand, AI Reason, Controls) with:
  - Price history area chart
  - Demand score breakdown (views, carts, purchases)
  - AI reasoning explanation for current price
  - Price lock toggle, auto-pricing mode, apply AI recommendation

### 2. Analytics (`/analytics`)
- Category Performance (grouped bar chart: surges vs drops vs stable)
- Price Trend (area chart for top product)
- Demand vs Price Change (scatter plot, color-coded)
- Avg Price by Category (horizontal bar chart)
- Top Price Movers table

### 3. AI Insights (`/ai`)
- ML Model card with accuracy, confidence, training samples, price range
- Feature Importance bar chart
- Live AI insight cards (surge detected, price opportunity, demand alerts)
- Price Elasticity Summary (high/medium/low sensitivity breakdown)

### 4. Pricing Rules (`/rules`)
- Global Price Limits (max surge %, max drop %, update interval sliders)
- Strategy Selector (Aggressive / Balanced / Conservative / Demand-Driven)
- Per-Category Overrides (individual surge/drop limits per category)
- Settings persisted to localStorage

---

## ✅ Prerequisites

| Dependency | Version | Installation |
|------------|---------|-------------|
| Python | 3.10+ | `sudo apt install python3` |
| Node.js | 18+ | `sudo apt install nodejs npm` |
| PostgreSQL | 14+ | `sudo apt install postgresql` |
| Apache Kafka | 3.x | [Download](https://kafka.apache.org/downloads) |
| pip packages | — | See below |

### Python Packages

```bash
pip install fastapi uvicorn psycopg2-binary kafka-python \
            scikit-learn numpy pandas requests
```

---

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/tharun77714/big-data.git
cd big-data
```

### 2. Set Up PostgreSQL

```bash
# Create database and user
sudo -u postgres psql -c "CREATE USER pulseprice WITH PASSWORD 'pulse2024';"
sudo -u postgres psql -c "CREATE DATABASE pulseprice_db OWNER pulseprice;"
```

### 3. Set Up Kafka

```bash
# Start Zookeeper
bin/zookeeper-server-start.sh config/zookeeper.properties &

# Start Kafka Broker
bin/kafka-server-start.sh config/server.properties &

# Create topic
bin/kafka-topics.sh --create --topic clickstream_topic \
  --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1
```

### 4. Train the ML Model (one-time)

```bash
cd ml
python3 process_historical_data.py   # Generates 50K training samples
python3 train_model.py               # Trains model → pricing_model.pkl
```

### 5. Install Frontend Dependencies

```bash
cd frontend
npm install
```

---

## 🏃 Running the Project

### Option A: Unified Launcher (Recommended)

```bash
python3 run_backend.py
```

This starts **all three backend services** in one terminal:
- `[API_SERVER]` — FastAPI on port 8000
- `[SPARK]` — Stream processor (Kafka consumer + ML)
- `[TRAFFIC_GEN]` — Clickstream event generator

### Option B: Manual (Separate Terminals)

```bash
# Terminal 1: API Server
cd api && python3 main.py

# Terminal 2: Stream Processor
cd spark && python3 streaming_processor.py

# Terminal 3: Traffic Generator
cd data_generator && python3 tracker.py 10

# Terminal 4: Frontend Dev Server
cd frontend && npm run dev
```

### Access Points

| Service | URL |
|---------|-----|
| **Dashboard** | http://localhost:3000 |
| **API Docs** | http://localhost:8000/docs |
| **API Root** | http://localhost:8000 |

---

## 📦 Product Catalog

The system ships with **20 products** across **3 categories**:

| Category | Products | Price Range |
|----------|----------|-------------|
| **Electronics** (8) | MacBook Pro, iPhone 15, Sony XM5, Samsung TV, iPad Pro, Razer Mouse, AirPods Pro, Dell Monitor | $79.99 – $1,999.99 |
| **General** (7) | Nike Shoes, Osprey Backpack, Breville Coffee, BenQ Lamp, Yoga Mat, Hydro Flask, Instant Pot | $49.99 – $699.99 |
| **Books** (5) | Python ML, Clean Code, System Design, Deep Learning, Data Science Handbook | $34.99 – $79.99 |

---

## ⚙ Configuration

### Database (`api/database.py` & `spark/streaming_processor.py`)

```python
DB_CONFIG = {
    'host': 'localhost',
    'database': 'pulseprice_db',
    'user': 'pulseprice',
    'password': 'pulse2024',
    'port': 5432
}
```

### Kafka (`data_generator/tracker.py` & `spark/streaming_processor.py`)

```python
KAFKA_BOOTSTRAP_SERVERS = ['localhost:9092']
KAFKA_TOPIC = 'clickstream_topic'
```

### ML Safety Bounds (`ml/price_predictor.py`)

```python
multiplier = max(0.90, min(1.12, multiplier))  # Absolute ML bounds
max_change = current_price * 0.05              # Max 5% per cycle
price_floor = base_price * 0.90                # Never below 90% of base
price_ceiling = base_price * 1.12              # Never above 112% of base
```

### Frontend (`frontend/vite.config.js`)

The Vite dev server proxies `/api` and `/ws` to `localhost:8000` for seamless development.

---

## 🔒 Security

- All REST API endpoints are protected with API key authentication
- **Header:** `X-API-Key: pulseprice-secure-key`
- Invalid or missing key returns `403 Forbidden`
- WebSocket endpoints are open (real-time data feed)
- Database uses connection pooling (2–10 connections) to prevent resource exhaustion

---

<p align="center">
  <strong>Built with ❤️ for Big Data Analytics</strong>
</p>
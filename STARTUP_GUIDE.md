# PulsePrice — Complete Startup Guide

This guide covers how to set up and run the PulsePrice application, whether you're deploying everything to the Ubuntu server or doing hybrid local development on Windows.

## ⚠️ Critical Rule Before Starting!
1. Kafka MUST be running before Spark and the Simulator.
2. The `clickstream_topic` MUST exist in Kafka before starting Spark.
3. The ML Model **MUST be trained** before starting Spark (`pricing_model.pkl` must exist).
4. PostgreSQL must be running.

---

## 🏗️ Option A: Run Everything on the Ubuntu Server (Production Setup)

If you are running the entire stack directly on the Ubuntu machine (`ssh jeevan@10.235.174.241`):

### Step 1: Start Infrastructure Services
Open **Terminal 1** and start the core data layers:
```bash
# 1. Start Hadoop (HDFS & YARN)
start-dfs.sh
start-yarn.sh

# Verify Hadoop components are running (expect NameNode, DataNode, ResourceManager, NodeManager)
jps

# 2. Start Zookeeper & Kafka
/usr/local/kafka/bin/zookeeper-server-start.sh -daemon /usr/local/kafka/config/zookeeper.properties
/usr/local/kafka/bin/kafka-server-start.sh -daemon /usr/local/kafka/config/server.properties

# Wait 5 seconds to ensure Kafka starts, then create the topic
sleep 5
/usr/local/kafka/bin/kafka-topics.sh --create --topic clickstream_topic \
  --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1 --if-not-exists

# 3. Ensure PostgreSQL is running
sudo systemctl start postgresql
```

### Step 2: First-Time Setup (Train the ML Model)
*You only need to do this the very first time, or if you update the codebase for the ML model.*
```bash
cd ~/pulseprice
source venv/bin/activate  # Activate your Python virtual environment

cd ml
python3 generate_training_data.py   # Generates 50,000 historic events
python3 train_model.py              # Trains Random Forest and saves `pricing_model.pkl`
python3 price_predictor.py          # Quick test to verify predictions work
cd ..
```

### Step 3: Run the Microservices
## The "Two-Terminal" Demo Setup

For the most professional look during a demo, we consolidate the backend services into one terminal.

```
Terminal 1: Unified Backend  → (Simulator + Spark + API)
                               Handles traffic, ML logic, and data serving.
Terminal 2: React Dev Server → Serves the WEBSITE (UI) to your browser.
```

**Background services (Remote):** Hadoop, Kafka, Zookeeper, PostgreSQL (Running on the Linux machine).

**Terminal 1 — Spark Streaming (The Brain)**
```bash
cd ~/pulseprice/spark
source ../venv/bin/activate
python3 streaming_processor.py
```

**Terminal 2 — Data Generator (Simulates live traffic)**
```bash
cd ~/pulseprice/data_generator
source ../venv/bin/activate
python3 click_simulator.py 10
# > Keep running! Generates 10 events/sec sent to Kafka
```

**Terminal 3 — FastAPI Backend**
```bash
cd ~/pulseprice/api
source ../venv/bin/activate
python3 main.py
# > API runs on port 8000
```

**Terminal 4 — React Frontend**
```bash
cd ~/pulseprice/frontend
npm install   # Only needed the first time
npm run dev
# > UI runs on port 3000
```

### Step 4: Access the Application
Open your browser on Windows and navigate to:
- **PulsePrice Web UI:** `http://10.235.174.241:3000`
- **FastAPI Documentation:** `http://10.235.174.241:8000/docs`

---

## 💻 Windows Setup (The "One-Command" Demo Way)

For the most stable and impressive demo, use the unified launcher which handles all backend services in a single terminal.

1. **Start Infrastructure on Ubuntu:** Start Zookeeper, Kafka, and Postgres on the remote machine.
2. **Find the Ubuntu IP:** Use `hostname -I` on the Linux machine.
3. **Launch Unified Backend (Terminal 1):**
   ```powershell
   python run_backend.py <UBUNTU_IP>
   ```
   *This starts the API, Spark Processing, and Traffic Generator together with tagged logs.*
   
4. **Launch React Frontend (Terminal 2):**
   ```powershell
   cd frontend
   npm run dev
   ```

---

## 🛑 How to Stop Everything Cleanly

1. Press `Ctrl+C` in the terminals running Frontend, API, Simulator, and Spark.
2. Stop Hadoop gracefully:
   ```bash
   stop-yarn.sh
   stop-dfs.sh
   ```
3. Stop Kafka and Zookeeper gracefully:
   ```bash
   /usr/local/kafka/bin/kafka-server-stop.sh
   /usr/local/kafka/bin/zookeeper-server-stop.sh
   ```

## 🛠️ Maintenance Commands

**If prices get wildly out of hand (too high/low) and you need to reset the database back to base configuration:**
```bash
cd ~/pulseprice/data_generator
source ../venv/bin/activate
python3 seed_database.py
```

**If you need to change how the model decides prices:**
1. Alter `generate_training_data.py`.
2. Re-run `generate_training_data.py` followed by `train_model.py`.
3. Restart Spark Streaming so it loads the new `pricing_model.pkl`.

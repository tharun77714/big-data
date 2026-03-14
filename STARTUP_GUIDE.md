# PulsePrice — Startup Guide
# Run these commands IN ORDER on Ubuntu

## Step 1: SSH from Windows PowerShell (open 4 separate terminals)
```
ssh jeevan@10.235.174.241
```

## Step 2: In SSH Terminal 1 — Start Infrastructure
```bash
# Start Hadoop
start-dfs.sh
start-yarn.sh

# Verify (should show NameNode, DataNode, ResourceManager, NodeManager)
jps

# Start Zookeeper + Kafka
/usr/local/kafka/bin/zookeeper-server-start.sh -daemon /usr/local/kafka/config/zookeeper.properties
/usr/local/kafka/bin/kafka-server-start.sh -daemon /usr/local/kafka/config/server.properties

# Wait 5 seconds, then create topic
sleep 5
/usr/local/kafka/bin/kafka-topics.sh --create --topic clickstream_topic --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1 --if-not-exists

# Verify topic exists
/usr/local/kafka/bin/kafka-topics.sh --list --bootstrap-server localhost:9092

# PostgreSQL (auto-starts, but just in case)
sudo systemctl start postgresql
```

## Step 3: Train ML Model (FIRST TIME ONLY)
```bash
cd ~/pulseprice
source venv/bin/activate
cd ml
python3 generate_training_data.py   # Creates 50,000 training rows
python3 train_model.py              # Trains Random Forest → saves pricing_model.pkl
python3 price_predictor.py          # Test: shows sample predictions
```
> Only need to do this once. After training, the model file (pricing_model.pkl) persists.

## Step 4: In SSH Terminal 1 — Start Click Simulator
```bash
cd ~/pulseprice/data_generator
python3 click_simulator.py 10
```
> Keep running! Generates 10 events/sec

## Step 5: In SSH Terminal 2 — Start Spark Streaming (ML-Powered!)
```bash
cd ~/pulseprice/spark
python3 streaming_processor.py
```
> Keep running! Uses ML model to predict prices every 10 seconds

## Step 6: In SSH Terminal 3 — Start FastAPI
```bash
cd ~/pulseprice/api
python3 main.py
```
> Keep running! API on port 8000

## Step 7: In SSH Terminal 4 — Start React Frontend
```bash
cd ~/pulseprice/frontend
npm run dev
```
> Keep running! UI on port 3000

## Open in Browser (from your Windows)
- **API Docs:** http://10.235.174.241:8000/docs
- **PulsePrice UI:** http://10.235.174.241:3000

## IMPORTANT ORDER
1. Kafka MUST be running before Spark & Simulator
2. Topic MUST exist before starting Spark
3. ML model MUST be trained before Spark (pricing_model.pkl must exist)
4. Start Simulator BEFORE or right after Spark
5. FastAPI and Frontend can start anytime after PostgreSQL

## To Stop Everything
- Press Ctrl+C in each terminal
- Then: `stop-yarn.sh && stop-dfs.sh`
- Kafka: `/usr/local/kafka/bin/kafka-server-stop.sh && /usr/local/kafka/bin/zookeeper-server-stop.sh`

## If DB needs re-seeding (prices reset to base)
```bash
cd ~/pulseprice/data_generator
python3 seed_database.py
```

## Re-train ML Model (if you change training data)
```bash
cd ~/pulseprice/ml
python3 generate_training_data.py
python3 train_model.py
```

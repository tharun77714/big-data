# 📖 The PulsePrice "A to Z" Project Bible

*This document is your final reference for exactly how the project works, which laptop does what, and why we used every single tool.*

---

## 🏛️ 1. The Global Architecture: Two Laptops, One System

We have a **Hybrid Distributed System**. We intentionally split the "Work" (Logic) from the "Storage" (Infrastructure) to simulate a real-world enterprise environment.

### 💻 Laptop A: "Mohan" (Windows 11)
**Role:** The **Compute & Visualization Node**.
*   **What it runs:** Spark Streaming, ML Model, FastAPI, React Frontend, Traffic Simulator.
*   **The Logic:** This laptop is "The Brain." It does the math, predicts the prices, and shows the website.

### 🐧 Laptop B: "Kartheek" (Ubuntu Linux)
**Role:** The **Infrastructure & Storage Master**.
*   **What it runs:** Kafka, Zookeeper, Hadoop (NameNode & DataNode), PostgreSQL.
*   **The Logic:** This laptop is "The Heart." It manages the data, holds the messages, and keeps the permanent records.

---

## 🛣️ 2. The "A to Z" Data Pipeline (Step-by-Step)

1.  **[MOHAN] Click Generation**: The `click_simulator.py` generates 10–20 fake user clicks per second.
2.  **[NETWORK] The Journey**: Those clicks are sent as **JSON** over the Wi-Fi from Mohan's IP to Kartheek's IP.
3.  **[KARTHEEK] Ingestion**: **Kafka** receives those clicks and stores them in a "Topic" (a live queue).
4.  **[MOHAN] Processing**: **Spark Streaming** (on Mohan's laptop) connects to Kartheek's Kafka and "pulls" those clicks every 10 seconds.
5.  **[MOHAN] ML Inference**: Spark sends the click counts into the **Random Forest Model** (`.pkl` file). The model predicts a new price.
6.  **[KARTHEEK] Database Sync**: Spark sends a command over the network to **PostgreSQL** on Kartheek's laptop to save the new price.
7.  **[KARTHEEK] Fault Tolerance**: At the same time, Spark saves a "Checkpoint" to **HDFS** on Kartheek's laptop so the system never forgets where it is.
8.  **[MOHAN] Live Dashboard**: **FastAPI** detects the change in Kartheek's DB and pushes it to the **React UI** via WebSockets.

---

## 🛠️ 3. Component Deep-Dive: What they REALLY do

### 🐘 Hadoop & HDFS
*   **What is it?** A distributed file system that treats multiple hard drives as one giant drive.
*   **In OUR Project:** We use it for **Persistence**. Even if Mohan's laptop crashes, all the "State" of the system is safe on Kartheek's Linux machine.
*   **NameNode (Kartheek):** The Master. It knows where the files are stored.
*   **DataNode (Kartheek):** The Slave. It actually holds the bits and bytes on the disk.

### 🦁 Zookeeper
*   **What is it?** A manager for distributed services.
*   **In OUR Project:** It manages **Kafka**. Without Zookeeper, Kafka wouldn't know which broker is in charge or how to handle multiple topics. It’s the "Traffic Police."

### 📮 Kafka
*   **What is it?** A high-speed "Post Office" for data.
*   **In OUR Project:** It acts as a **Buffer**. If our simulator sends 10,000 clicks, Mohan's Spark engine might be too slow to read them all at once. Kafka "holds" them safely so no clicks are lost.

### ⚡ Apache Spark
*   **What is it?** A distributed engine that processes data entirely in **RAM** (In-Memory).
*   **In OUR Project:** It is the **Orchestrator**. It reads from Kafka, calls the ML model, and writes to Postgres. **Is it running on Ubuntu?** No. In our setup, Spark runs on **Mohan (Windows)**, which makes it the "Compute Master."

### 🤖 Random Forest ML Model
*   **What is it?** An ensemble of "Decision Trees."
*   **In OUR Project:** It is the **Decision Maker**. Based on 200,000 training points, it knows that "High Views + Low Stock = Price Increase." It converts raw data into **Intelligent Prices**.

### 🐘 PostgreSQL
*   **What is it?** A standard Relational Database.
*   **In OUR Project:** It is the **Source of Truth**. This is where the React Dashboard goes to find out exactly what the price is *right now*.

---

## ❓ FAQ for your Presentation

**Q: Where is the dataset stored?**
> A: "The raw clickstream is a live 'Virtual Dataset' moving from Mohan to Kartheek. The final processed data is stored in the **PostgreSQL database** on Kartheek's Ubuntu laptop."

**Q: Why use two laptops?**
> A: "To demonstrate a **Multi-Node Cluster**. In a real enterprise like Amazon, you don't run your database on the same machine as your processing engine. We are simulating a professional Data Center setup."

**Q: Are files storing in the other laptop?**
> A: "Yes. Mohan generates the data, but **Kartheek stores it**. The PostgreSQL records and HDFS blocks (checkpoints) are physically on Kartheek's hard drive."

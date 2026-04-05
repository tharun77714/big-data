# 📝 PulsePrice Quick Demo Workflow

Follow these steps in order to launch your distributed demo successfully.

---

### 🐧 On Friend's Linux Laptop (The Infrastructure)
*   **Step 1: Get IP Address**
    *   Command: `hostname -I`
    *   *Note: Write this down! (e.g., `192.168.1.15`)*
*   **Step 2: Start Zookeeper**
    *   Command: `bin/zookeeper-server-start.sh -daemon config/zookeeper.properties`
*   **Step 3: Start Kafka**
    *   Command: `bin/kafka-server-start.sh config/server.properties`

---

### 💻 On Your Windows Laptop (The Application)
*   **Step 4: Launch Unified Backend (Terminal 1)**
    *   Command: `python run_backend.py <FRIEND_IP>`
    *   *Note: This automatically configures his IP into your code and starts the API, Spark, and Traffic Generator.*
*   **Step 5: Launch Frontend (Terminal 2)**
    *   Command: `cd frontend`
    *   Command: `npm run dev`
*   **Step 6: Open Browser**
    *   Navigate to: `http://localhost:3000`

---

### 🛑 To Stop Everything
*   **Your Laptop:** Press `Ctrl+C` in both terminals.
*   **Friend's Laptop:** Press `Ctrl+C` in the Kafka terminal and run `bin/zookeeper-server-stop.sh`.

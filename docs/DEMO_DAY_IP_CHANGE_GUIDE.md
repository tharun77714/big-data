# 🚀 EMERGENCY DEMO DAY GUIDE: Automated IP Sync

If you are on a new Wi-Fi network (Mobile Hotspot) on Demo Day, follow these steps to re-sync the system in seconds.

---

## STEP 1: Find the New IP (On Friend's Linux Laptop)
1. Open a terminal.
2. Type `hostname -I` and hit Enter.
3. **Write down the number** (e.g., `192.168.1.15`). This is your `NEW_IP`.

---

## STEP 2: Start Infrastructure (On Friend's Linux Laptop)
Navigate to your Kafka folder and run these two in separate terminals:
1. **Start Zookeeper:**
   ```bash
   bin/zookeeper-server-start.sh -daemon config/zookeeper.properties
   ```
2. **Start Kafka:**
   ```bash
   bin/kafka-server-start.sh config/server.properties
   ```

---

## STEP 3: Start PulsePrice (On Your Windows Laptop)
No more manual find-and-replace! Use the unified launcher:

1. Open **Terminal 1** in the main project folder.
2. Run the automated re-config and backend launcher:
   ```powershell
   python run_backend.py <NEW_IP>
   ```
   *Example: `python run_backend.py 192.168.1.15`*

3. Open **Terminal 2** and start the UI:
   ```powershell
   cd frontend
   npm run dev
   ```

---

## STEP 4: Success!
Open [http://localhost:3000](http://localhost:3000) and crush the demo.

> [!TIP]
> If you ever need to stop the backend, just hit `Ctrl+C` in Terminal 1. It will safely shut down the API, Spark, and the Simulator all at once.

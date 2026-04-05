# PulsePrice Video Presentation Script

*Use this script for your video recording. It explains the project in a professional way that both your classmates and professor will appreciate.*

---

## 🎙️ Part 1: The Introduction (Face-to-Cam or Voice-over)

"Hello everyone! My name is **Mohan**, and today, along with my partner **Kartheek**, I will be demonstrating our Big Data project: **PulsePrice**. 

PulsePrice is a real-time dynamic pricing engine. In the modern world of e-commerce, prices cannot be static. During high-demand events like a 'Flash Sale' or 'Black Friday,' a business needs to surge prices automatically to manage stock and maximize revenue. But doing this in real-time requires a massive technical stack."

---

## 🏗️ Part 2: The Architecture (Show the README.md Diagram)

"Our project uses a **Distributed Hybrid Architecture**. 

- On my laptop (**Mohan - Windows**), we run the **Compute Node**. This includes the Spark Streaming Engine, the FastAPI Backend, and our React Frontend.
- On my partner’s laptop (**Kartheek - Ubuntu**), we run the **Infrastructure Node**. This hosts our Kafka Messaging Cluster, the Zookeeper Manager, and our PostgreSQL database.

By splitting the work across two laptops, we are simulating a real-world production environment where data storage and data processing happen on separate physical servers."

---

## 🛠️ Part 3: The Tech Stack (Show the Terminals)

"Let's look at the components:

1. **Kafka (The Post Office)**: We use Kafka to handle high-velocity user clicks. It buffers millions of events so our system never crashes during traffic spikes.
2. **Apache Spark (The Brain)**: Every 10 seconds, Spark pulls a 'Micro-Batch' of clicks from Kafka. It calculates the demand intensity and updates the prices.
3. **Random Forest (The ML Layer)**: We didn't just use simple math. We trained a **Random Forest Regressor** on 200,000 scenarios. This ML model predicts the most profitable price multiplier based on views, conversion rates, and stock levels."

---

## 🖥️ Part 4: The Live Demo (Show the Browser / Dashboard)

"Now, let's watch it in action! (Point to the Dashboard)

As our **Traffic Simulator** sends clicks to Kartheek’s laptop, you can see the **Live Store** reacting. 
- When you see a **Red Flash (Surge)**, the ML model has detected a viral product and raised the price to match the demand.
- When you see a **Green Flash (Drop)**, demand is falling, and the model auto-discounts to clear inventory.

Notice the **Market Mood** chart at the top. This is an index of the overall market sentiment—moving from 'Fear' to 'Greed' as our products trend."

---

## 🏁 Part 5: The Conclusion (Final Summary)

"In summary, **PulsePrice** successfully combines:
- **Massive Storage** through Hadoop HDFS.
- **High-Speed Messaging** through Kafka.
- **Real-Time Analytics** through Spark Streaming.
- **Intelligent Decisions** through Machine Learning.

This project proves that with the right Big Data architecture, we can turn raw clickstreams into intelligent, profit-generating decisions in seconds. 

Thank you for watching our demonstration!"

---

### 💡 Tips for the Video:
1. **Show the Terminals first**: Show Kartheek's Linux system running Kafka, then show your Windows system running the `run_backend.py` command.
2. **Zoom in on Spark Logs**: Let the viewer see the lines where it says `[SPARK] Product X: SURGE`. This proves the ML model is working.
3. **Show the Real-Time Chart**: Click a product in the dashboard to show the history graph moving—professors love visual data!

# PulsePrice — Presentation Script
## Complete Presentation Guide for BDA Project Demo

> **Duration:** 12–15 minutes
> **Presenter:** Kartheek Pedireddy
> **Prerequisites:** All services running (see PROJECT_BIBLE.md → Section 11)

---

## 🎙️ PART 1: THE HOOK (1 minute)
*[Face to camera or voice-over with the dashboard visible in the background]*

---

**SPEAK:**

"Imagine you're running an e-commerce store. Right now, 500 people are looking at the iPhone 15 Pro on your site. The demand is through the roof. But your price? It's exactly the same as it was yesterday when no one was looking.

You're leaving money on the table.

Now imagine the opposite — a textbook sitting in your inventory for weeks. Zero views. Zero interest. But the price stays full. Your capital is locked up in dead stock.

This is the **Static Pricing Problem** — and it costs the e-commerce industry billions of dollars every year.

Today, I'm going to show you how I solved it.

My name is **Kartheek Pedireddy**, and this is **PulsePrice** — a real-time dynamic pricing engine powered by Big Data and Machine Learning."

---

## 🏗️ PART 2: THE ARCHITECTURE (2–3 minutes)
*[Show the architecture diagram from README.md or draw on screen]*

---

**SPEAK:**

"Before I show the live demo, let me walk you through the architecture — because this is not just a web app. This is a **full-stack distributed streaming pipeline** running six enterprise-grade technologies.

Let me trace the journey of a single user click through the entire system.

**Step 1 — Data Generation.**
A Click Simulator generates realistic user interactions — views, cart-adds, and purchases — at a rate of 10 to 20 events per second. Each event is a JSON payload with the user ID, product ID, event type, and timestamp. This simulates real e-commerce traffic with realistic patterns — 80% views, 15% cart-adds, and only 5% purchases.

**Step 2 — Apache Kafka.**
Those click events flow into **Apache Kafka**, which is our distributed message broker. Kafka acts as a durable buffer — even if the processing engine falls behind, Kafka holds every single event safely. Our topic has 3 partitions, partitioned by product ID, which guarantees that all events for the same product are processed in order.

**Step 3 — Spark Streaming.**
Every 10 seconds, our **Spark Streaming** engine pulls a micro-batch of events from Kafka. For each product that had activity in those 10 seconds, it counts the views, cart-adds, and purchases, and calculates a **Demand Score** — a composite metric between 0 and 1.

**Step 4 — The ML Brain.**
Here's where it gets intelligent. Spark doesn't use simple rules to set prices. It feeds 11 different features — demand score, view count, stock levels, competitor price ratios, time of day — into a trained **Random Forest Regressor**. The model was trained on 50,000 synthetic scenarios and predicts the exact price multiplier for each product.

**Step 5 — PostgreSQL.**
The new price is written to our **PostgreSQL** database, along with a full price history record. Every price change is logged with the demand score, view counts, and timestamp.

**Step 6 — Hadoop HDFS.**
In parallel, Spark saves a checkpoint to **HDFS** — Hadoop's distributed file system. This means if Spark crashes, it knows exactly where it left off. Zero data loss. Zero duplicate processing.

**Step 7 — Real-Time Dashboard.**
Finally, our **FastAPI** backend pushes the updated prices to the **React Dashboard** via WebSockets every 5 seconds. No polling, no refresh — prices update live on screen.

This entire cycle — from click to price change to dashboard — takes 10 to 15 seconds."

---

## 🤖 PART 3: THE ML MODEL (2–3 minutes)
*[Show terminal output of train_model.py or a slide with the metrics]*

---

**SPEAK:**

"Let me dive deeper into the Machine Learning component, because this is what separates PulsePrice from a simple rule-based pricing tool.

**The Dataset:**
We generated 50,000 training samples using statistical distributions that mirror real e-commerce behavior. View counts follow an exponential distribution — most products get few views, a handful go viral. Cart rates follow a Beta distribution — roughly 20% of viewers add to cart. Purchases follow another Beta distribution conditioned on cart adds.

**The Features:**
The model takes 11 input features:

1. **View count** — raw volume of attention
2. **Cart count** — shows buying intent
3. **Purchase count** — actual conversions
4. **Stock level** — scarcity drives urgency
5. **Competitor price ratio** — our price vs. the competition
6. **Hour of day** — peak hours allow higher prices
7. **Day of week** — weekend vs. weekday patterns
8. **Base price tier** — budget, mid, or premium product
9. **Demand score** — our composite demand metric
10. **Conversion rate** — purchases divided by views
11. **Cart conversion rate** — carts divided by views

**The Model:**
We use a **Random Forest Regressor** with 100 decision trees. Each tree is trained on a random bootstrap subset of the data and considers random subsets of features at each split. The final prediction is the average across all 100 trees, which dramatically reduces variance compared to any single decision tree.

**Why Random Forest?**
Three reasons. First, it captures **non-linear interactions** — for example, high views combined with low stock should increase prices more aggressively than high views with normal stock. A linear model couldn't learn that. Second, **inference is blazing fast** — under 1 millisecond per prediction, which is critical when we're calculating prices every 10 seconds. Third, it gives us **feature importance** — we can see exactly which factors drive pricing decisions.

**The Results:**

*(Point to the metrics)*

Our R-squared score on the test set is approximately **0.93 to 0.96**, meaning the model explains over 93% of the variance in optimal pricing. The Mean Absolute Error is approximately **0.02** — that means for a Rs. 1000 product, the prediction is off by only Rs. 20 on average. And in 5-fold cross-validation, the standard deviation is just 0.007 — showing the model is **stable and not overfitting**.

The top three features by importance are **demand score**, **conversion rate**, and **stock level** — exactly what you'd expect in a real dynamic pricing system."

---

## 🖥️ PART 4: THE LIVE DEMO (3–4 minutes)
*[Switch to showing the actual running system]*

---

**SPEAK:**

"Now let me show you PulsePrice running live.

*(Show Terminal 1 — Infrastructure)*

Here you can see Hadoop, Kafka, and PostgreSQL running as our infrastructure layer.

*(Show Terminal 2 — Unified Backend)*

And here's our unified backend launcher. You can see three tagged log streams:
- `[API_SERVER]` — our FastAPI backend running on port 8000
- `[SPARK]` — our streaming processor pulling from Kafka every 10 seconds
- `[TRAFFIC_GEN]` — our click simulator sending 10 events per second

*(Point to Spark logs)*

Watch these Spark logs carefully. Every 10 seconds, you'll see a batch processing message. When it says **'SURGE'** next to a product, that means the ML model detected high demand and raised the price. When it says **'DROP'**, demand fell and the model lowered the price to clear inventory.

*(Switch to Browser — Dashboard at localhost:3000)*

Now let's look at the live dashboard.

*(Point to product cards)*

See these badges? The red ones say 'Surge' — these products are trending right now. The green ones say 'Drop' — demand is low. Watch closely...

*(Wait for a price update)*

There! Did you see that? The iPhone 15 Pro just went from Rs. 999.99 to Rs. 1,024. That's the ML model responding to a spike in views. And look at the AirPods — price just dropped because demand fell in the last 10-second window.

*(Point to Market Mood indicator)*

This is our **Market Mood Index** — it calculates the percentage of products currently surging versus dropping. When most products are surging, the mood shifts to 'Greed.' When most are dropping, it shifts to 'Fear.' It's inspired by the CNN Fear and Greed Index for stock markets.

*(Click on a product to show price history chart)*

And here's the price history for the MacBook Pro. You can see the price oscillating as demand rises and falls over time. Each point on this chart represents one 10-second Spark micro-batch. The ML model continuously adapts.

*(Show the Analytics page)*

This is our analytics view — category-level performance, demand distribution across products, and the top trending items ranked by demand score."

---

## 📊 PART 5: THE TECH STACK SUMMARY (1–2 minutes)
*[Show a summary slide or the README diagram]*

---

**SPEAK:**

"Let me recap the full technology stack and why each tool was chosen:

**Apache Kafka** — For durable, ordered event streaming. Unlike simple queues, Kafka retains messages even after they're consumed, allowing replay for debugging.

**Apache Spark** — For fault-tolerant micro-batch processing. Spark's HDFS checkpointing guarantees exactly-once processing semantics.

**Hadoop HDFS** — For distributed, replicated storage of Spark checkpoints and system state.

**PostgreSQL** — For ACID-compliant storage of pricing decisions. The Decimal type ensures zero rounding errors in financial calculations.

**Random Forest ML** — For intelligent, non-linear price prediction with sub-millisecond inference time.

**FastAPI with WebSockets** — For real-time data delivery to the frontend without polling overhead.

**React with Vite** — For a responsive, animated dashboard that re-renders only the changed components.

All seven of these technologies run as independent processes on a single Ubuntu machine, communicating via localhost. But the architecture is designed so that each component could be moved to its own server — or a cluster of servers — without changing a single line of application code. That's the power of distributed systems design."

---

## 🏁 PART 6: THE CONCLUSION (1 minute)
*[Face to camera or voice-over]*

---

**SPEAK:**

"In summary, PulsePrice demonstrates that Big Data technologies are not just academic concepts — they solve real, expensive problems.

With this system, we process live user interactions through a **Kafka message broker**, analyze them with a **Spark Streaming engine**, predict optimal prices with a **Random Forest ML model**, store results in a **PostgreSQL database**, checkpoint state in **Hadoop HDFS**, and deliver everything to a live **React dashboard** via **WebSockets** — all within 10 to 15 seconds.

The result? An e-commerce platform where every price is intelligent, every decision is data-driven, and every spike in demand is captured — automatically.

Thank you for watching."

---

## 💡 PRESENTATION TIPS

### What to Show on Screen
1. **Terminal 1**: Infrastructure running (jps showing Hadoop processes)
2. **Terminal 2**: `python3 run_backend.py` with tagged logs scrolling
3. **Browser**: Dashboard at `http://localhost:3000`
4. **Key moments**: Wait for a SURGE or DROP to appear in Spark logs, then immediately switch to the dashboard to show the price change

### Handling Questions

**"Is the data real?"**
→ "The product catalog is real-world products at realistic prices. The clickstream is synthetically generated using probability distributions that match published e-commerce behavioral statistics. The ML model, however, would work identically with real clickstream data."

**"Why not use deep learning?"**
→ "For 11 features with 50,000 training samples, a Random Forest achieves R² = 0.93+ with sub-millisecond inference. A neural network would require more data, longer training time, and GPU resources — all for marginal improvement on a tabular regression problem. Random Forest is the industry standard for this type of structured data."

**"Can this handle millions of users?"**
→ "Yes. Kafka can scale to millions of events per second by adding brokers. Spark can run on a YARN cluster with hundreds of executors. The architecture scales horizontally because every component is decoupled."

**"What if Spark crashes?"**
→ "HDFS checkpointing. Spark saves its consumer offset and processing state to HDFS after every batch. On restart, it reads the checkpoint and resumes exactly where it left off. No data loss, no duplicate processing."

### Timing Guide
| Part | Duration | Content |
|------|----------|---------|
| Part 1: Hook | 1 min | The static pricing problem |
| Part 2: Architecture | 2–3 min | Pipeline walkthrough |
| Part 3: ML Model | 2–3 min | Features, training, accuracy |
| Part 4: Live Demo | 3–4 min | Terminals + Dashboard |
| Part 5: Tech Summary | 1–2 min | Why each tool |
| Part 6: Conclusion | 1 min | Summary |
| **Total** | **10–14 min** | |

---

*End of Presentation Script — Kartheek Pedireddy*

#!/usr/bin/env python3
"""
PulsePrice — Synthetic Training Data Generator
Generates 50,000 rows of REALISTIC pricing data for ML model training.
Prices change by realistic amounts: max ±15%, typically ±2-8%
"""

import numpy as np
import pandas as pd
import os

np.random.seed(42)
NUM_SAMPLES = 50000

def generate_training_data():
    print("🔧 Generating 50,000 training samples (realistic pricing)...")

    # --- Generate Features ---
    view_count = np.random.exponential(scale=40, size=NUM_SAMPLES).astype(int)
    view_count = np.clip(view_count, 0, 500)

    cart_rate = np.random.beta(2, 8, size=NUM_SAMPLES)
    cart_count = (view_count * cart_rate).astype(int)

    purchase_rate = np.random.beta(2, 6, size=NUM_SAMPLES)
    purchase_count = (cart_count * purchase_rate).astype(int)

    # Stock levels
    stock_low = np.random.randint(1, 30, size=NUM_SAMPLES)
    stock_med = np.random.randint(30, 100, size=NUM_SAMPLES)
    stock_high = np.random.randint(100, 300, size=NUM_SAMPLES)
    stock_vhigh = np.random.randint(300, 600, size=NUM_SAMPLES)
    stock_choice = np.random.choice([0, 1, 2, 3], size=NUM_SAMPLES, p=[0.15, 0.35, 0.30, 0.20])
    stock_level = np.where(stock_choice == 0, stock_low,
                  np.where(stock_choice == 1, stock_med,
                  np.where(stock_choice == 2, stock_high, stock_vhigh)))

    competitor_price_ratio = np.random.normal(1.05, 0.08, size=NUM_SAMPLES)
    competitor_price_ratio = np.clip(competitor_price_ratio, 0.80, 1.25)

    hour_of_day = np.random.randint(0, 24, size=NUM_SAMPLES)
    day_of_week = np.random.randint(0, 7, size=NUM_SAMPLES)
    base_price_tier = np.random.choice([1, 2, 3], size=NUM_SAMPLES, p=[0.35, 0.40, 0.25])

    # Derived features
    views = np.maximum(view_count, 1)
    conversion_rate = purchase_count / views
    cart_conversion = cart_count / views
    demand_score = np.clip(
        (0.4 * cart_conversion + 0.6 * conversion_rate + 0.1 * np.minimum(view_count / 100.0, 1.0)) * 5,
        0, 1
    )

    # ===== REALISTIC price_multiplier (0.85 to 1.18) =====
    # Real stores rarely change prices more than ±15%
    multiplier = np.ones(NUM_SAMPLES)

    # HIGH demand (>0.7): +3% to +12%
    mask = demand_score > 0.7
    multiplier[mask] += np.random.uniform(0.03, 0.12, size=mask.sum())

    # MEDIUM-HIGH demand (0.5-0.7): +1% to +6%
    mask = (demand_score > 0.5) & (demand_score <= 0.7)
    multiplier[mask] += np.random.uniform(0.01, 0.06, size=mask.sum())

    # MEDIUM demand (0.3-0.5): -1% to +3%
    mask = (demand_score > 0.3) & (demand_score <= 0.5)
    multiplier[mask] += np.random.uniform(-0.01, 0.03, size=mask.sum())

    # LOW demand (0.1-0.3): -2% to -8%
    mask = (demand_score > 0.1) & (demand_score <= 0.3)
    multiplier[mask] -= np.random.uniform(0.02, 0.08, size=mask.sum())

    # VERY LOW demand (<0.1): -5% to -12%
    mask = demand_score <= 0.1
    multiplier[mask] -= np.random.uniform(0.05, 0.12, size=mask.sum())

    # STOCK effect (smaller adjustments)
    # Low stock + demand → extra +1% to +5%
    low_stock_demand = (stock_level < 30) & (demand_score > 0.3)
    multiplier[low_stock_demand] += np.random.uniform(0.01, 0.05, size=low_stock_demand.sum())

    # High stock + low demand → extra -1% to -4%
    high_stock_low = (stock_level > 200) & (demand_score < 0.3)
    multiplier[high_stock_low] -= np.random.uniform(0.01, 0.04, size=high_stock_low.sum())

    # COMPETITOR effect (small adjustments)
    cheap_comp = competitor_price_ratio < 0.95
    multiplier[cheap_comp] -= np.random.uniform(0.01, 0.03, size=cheap_comp.sum())

    expensive_comp = competitor_price_ratio > 1.10
    multiplier[expensive_comp] += np.random.uniform(0.01, 0.02, size=expensive_comp.sum())

    # TIME effect (tiny adjustments)
    peak = (hour_of_day >= 18) & (hour_of_day <= 22)
    multiplier[peak] += np.random.uniform(0.005, 0.02, size=peak.sum())

    night = (hour_of_day >= 0) & (hour_of_day <= 6)
    multiplier[night] -= np.random.uniform(0.005, 0.015, size=night.sum())

    weekend = day_of_week >= 5
    multiplier[weekend] += np.random.uniform(0.005, 0.015, size=weekend.sum())

    # Small noise
    noise = np.random.normal(0, 0.008, size=NUM_SAMPLES)
    multiplier += noise

    # REALISTIC CLAMP: max ±15% from base price
    multiplier = np.clip(multiplier, 0.85, 1.18)

    # Build DataFrame
    df = pd.DataFrame({
        'view_count': view_count,
        'cart_count': cart_count,
        'purchase_count': purchase_count,
        'stock_level': stock_level,
        'competitor_price_ratio': np.round(competitor_price_ratio, 4),
        'hour_of_day': hour_of_day,
        'day_of_week': day_of_week,
        'base_price_tier': base_price_tier,
        'demand_score': np.round(demand_score, 4),
        'conversion_rate': np.round(conversion_rate, 4),
        'cart_conversion': np.round(cart_conversion, 4),
        'price_multiplier': np.round(multiplier, 4)
    })

    output_path = os.path.join(os.path.dirname(__file__), 'training_data.csv')
    df.to_csv(output_path, index=False)

    print(f"✅ Generated {len(df)} training samples → {output_path}")
    print(f"\n📊 Price Multiplier Distribution:")
    print(f"   Min:    {df['price_multiplier'].min():.4f}  ({(df['price_multiplier'].min()-1)*100:+.1f}%)")
    print(f"   Max:    {df['price_multiplier'].max():.4f}  ({(df['price_multiplier'].max()-1)*100:+.1f}%)")
    print(f"   Mean:   {df['price_multiplier'].mean():.4f}  ({(df['price_multiplier'].mean()-1)*100:+.1f}%)")
    print(f"\n   Surge (>1.03):    {(df['price_multiplier'] > 1.03).sum()} ({(df['price_multiplier'] > 1.03).mean()*100:.1f}%)")
    print(f"   Stable (0.97-1.03): {((df['price_multiplier'] >= 0.97) & (df['price_multiplier'] <= 1.03)).sum()}")
    print(f"   Drop (<0.97):     {(df['price_multiplier'] < 0.97).sum()} ({(df['price_multiplier'] < 0.97).mean()*100:.1f}%)")

    return df


if __name__ == '__main__':
    generate_training_data()

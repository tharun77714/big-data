#!/usr/bin/env python3
"""
PulsePrice — ML Price Predictor
Loads the trained model and predicts optimal prices.
Realistic pricing: changes are small and gradual (±2-15%)
"""

import os
import pickle
import numpy as np

_model_data = None


def load_model():
    global _model_data
    if _model_data is not None:
        return _model_data

    model_path = os.path.join(os.path.dirname(__file__), 'pricing_model.pkl')
    if not os.path.exists(model_path):
        print("⚠️  ML model not found! Using fallback rule-based pricing.")
        return None

    with open(model_path, 'rb') as f:
        _model_data = pickle.load(f)

    print(f"🤖 ML pricing model loaded (v{_model_data.get('version', '?')})")
    return _model_data


def predict_price(base_price, current_price, view_count, cart_count,
                  purchase_count, stock_level, competitor_price,
                  hour_of_day=None, day_of_week=None):
    """
    Predict optimal price using ML model.
    Returns a REALISTIC price that changes gradually (max ±15% from base).
    """
    from datetime import datetime

    model_data = load_model()

    if model_data is None:
        return _fallback_pricing(base_price, current_price, view_count,
                                  cart_count, purchase_count, stock_level,
                                  competitor_price)

    model = model_data['model']

    if hour_of_day is None:
        hour_of_day = datetime.now().hour
    if day_of_week is None:
        day_of_week = datetime.now().weekday()

    views = max(view_count, 1)
    conversion_rate = purchase_count / views
    cart_conversion = cart_count / views
    demand_score = min((0.4 * cart_conversion + 0.6 * conversion_rate +
                        0.1 * min(view_count / 100.0, 1.0)) * 5, 1.0)

    if base_price < 100:
        base_price_tier = 1
    elif base_price < 500:
        base_price_tier = 2
    else:
        base_price_tier = 3

    comp_ratio = base_price / competitor_price if competitor_price else 1.05

    features = np.array([[
        view_count, cart_count, purchase_count,
        stock_level, comp_ratio, hour_of_day, day_of_week,
        base_price_tier, demand_score, conversion_rate, cart_conversion
    ]])

    multiplier = float(model.predict(features)[0])  # cast numpy→Python float

    # REALISTIC clamps: max ±10% from base price
    multiplier = max(0.90, min(1.12, multiplier))

    new_price = base_price * multiplier

    # Gradual change: max ±2% per update from current price
    max_change = current_price * 0.02
    if new_price > current_price + max_change:
        new_price = current_price + max_change
    elif new_price < current_price - max_change:
        new_price = current_price - max_change

    # Absolute floor/ceiling: never beyond ±10% of base
    price_floor = base_price * 0.90
    price_ceiling = base_price * 1.12
    new_price = max(price_floor, min(price_ceiling, new_price))

    return float(round(new_price, 2))  # ensure plain Python float for psycopg2


def _fallback_pricing(base_price, current_price, view_count, cart_count,
                       purchase_count, stock_level, competitor_price):
    """Rule-based fallback if ML model is not available"""
    views = max(view_count, 1)
    conversion_rate = purchase_count / views
    cart_rate = cart_count / views
    demand_score = min((0.4 * cart_rate + 0.6 * conversion_rate +
                        0.1 * min(view_count / 100.0, 1.0)) * 5, 1.0)

    new_price = current_price

    if demand_score > 0.7:
        new_price *= 1.05
    elif demand_score > 0.4:
        new_price *= 1.02
    else:
        new_price *= 0.97

    if competitor_price:
        comp = float(competitor_price)
        if new_price > comp * 1.05:
            new_price = comp * 1.04

    new_price = max(base_price * 0.90, min(base_price * 1.12, new_price))
    return round(new_price, 2)


# --- Test ---
if __name__ == '__main__':
    print("=" * 60)
    print("  PulsePrice ML Predictor — Realistic Test")
    print("=" * 60)

    test_cases = [
        {
            'name': '📈 HIGH demand + LOW stock → expect +5 to +12%',
            'base_price': 999.99, 'current_price': 999.99,
            'view_count': 200, 'cart_count': 50, 'purchase_count': 20,
            'stock_level': 15, 'competitor_price': 1049.99
        },
        {
            'name': '📈 MEDIUM demand → expect +1 to +5%',
            'base_price': 349.99, 'current_price': 349.99,
            'view_count': 50, 'cart_count': 10, 'purchase_count': 3,
            'stock_level': 120, 'competitor_price': 379.99
        },
        {
            'name': '📉 LOW demand + HIGH stock → expect -3 to -10%',
            'base_price': 49.99, 'current_price': 49.99,
            'view_count': 5, 'cart_count': 0, 'purchase_count': 0,
            'stock_level': 500, 'competitor_price': 54.99
        },
        {
            'name': '📉 ZERO demand → expect -5 to -12%',
            'base_price': 89.99, 'current_price': 89.99,
            'view_count': 1, 'cart_count': 0, 'purchase_count': 0,
            'stock_level': 400, 'competitor_price': 99.99
        },
        {
            'name': '🔥 EXTREME demand + VERY LOW stock → expect +8 to +15%',
            'base_price': 1999.99, 'current_price': 1999.99,
            'view_count': 400, 'cart_count': 100, 'purchase_count': 40,
            'stock_level': 5, 'competitor_price': 2099.99
        },
    ]

    for tc in test_cases:
        name = tc.pop('name')
        predicted = predict_price(**tc, hour_of_day=20, day_of_week=3)
        change_pct = ((predicted - tc['base_price']) / tc['base_price']) * 100
        arrow = '📈' if change_pct > 1 else '📉' if change_pct < -1 else '➡️'
        print(f"\n  {name}")
        print(f"    Base: ${tc['base_price']:.2f} → Predicted: ${predicted:.2f} ({arrow} {change_pct:+.1f}%)")

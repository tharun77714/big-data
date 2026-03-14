#!/usr/bin/env python3
"""
PulsePrice — ML Model Training
Trains a Random Forest Regressor to predict optimal price multiplier.
Uses GridSearchCV for hyperparameter tuning and cross-validation.
"""

import os
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler


def load_data():
    """Load training data from CSV"""
    data_path = os.path.join(os.path.dirname(__file__), 'training_data.csv')
    if not os.path.exists(data_path):
        print("❌ training_data.csv not found! Run generate_training_data.py first.")
        exit(1)
    df = pd.read_csv(data_path)
    print(f"📂 Loaded {len(df)} training samples")
    return df


def prepare_features(df):
    """Prepare feature matrix and target vector"""
    feature_cols = [
        'view_count', 'cart_count', 'purchase_count',
        'stock_level', 'competitor_price_ratio',
        'hour_of_day', 'day_of_week', 'base_price_tier',
        'demand_score', 'conversion_rate', 'cart_conversion'
    ]
    X = df[feature_cols].values
    y = df['price_multiplier'].values
    return X, y, feature_cols


def train_model(X, y, feature_cols):
    """Train Random Forest with GridSearchCV for best hyperparameters"""

    # Split data: 80% train, 20% test
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    print(f"📊 Train set: {len(X_train)} | Test set: {len(X_test)}")

    # --- Model 1: Random Forest (Primary) ---
    print("\n🌲 Training Random Forest Regressor with GridSearchCV...")
    rf_params = {
        'n_estimators': [100, 200, 300],
        'max_depth': [10, 15, 20, None],
        'min_samples_split': [2, 5, 10],
        'min_samples_leaf': [1, 2, 4],
    }

    # Use a smaller grid for speed, but still effective
    rf_fast_params = {
        'n_estimators': [150, 250],
        'max_depth': [12, 18, None],
        'min_samples_split': [2, 5],
        'min_samples_leaf': [1, 3],
    }

    rf = RandomForestRegressor(random_state=42, n_jobs=-1)
    grid_search = GridSearchCV(
        rf, rf_fast_params,
        cv=5,               # 5-fold cross-validation
        scoring='r2',        # Optimize for R² score
        verbose=1,
        n_jobs=-1
    )
    grid_search.fit(X_train, y_train)

    best_rf = grid_search.best_estimator_
    print(f"\n✅ Best hyperparameters: {grid_search.best_params_}")
    print(f"   Best CV R² score: {grid_search.best_score_:.4f}")

    # --- Evaluate on Test Set ---
    y_pred = best_rf.predict(X_test)

    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))

    print(f"\n📈 Test Set Performance:")
    print(f"   R² Score:                {r2:.4f}  (1.0 = perfect)")
    print(f"   Mean Absolute Error:     {mae:.4f}  (avg error in multiplier)")
    print(f"   Root Mean Squared Error: {rmse:.4f}")
    print(f"   Accuracy within ±0.05:   {(np.abs(y_test - y_pred) < 0.05).mean()*100:.1f}%")
    print(f"   Accuracy within ±0.10:   {(np.abs(y_test - y_pred) < 0.10).mean()*100:.1f}%")

    # --- Feature Importance ---
    importances = best_rf.feature_importances_
    sorted_idx = np.argsort(importances)[::-1]

    print(f"\n🔑 Feature Importance (what drives pricing decisions):")
    for i, idx in enumerate(sorted_idx):
        bar = '█' * int(importances[idx] * 50)
        print(f"   {i+1}. {feature_cols[idx]:25s} {importances[idx]:.4f}  {bar}")

    # --- Cross-validation on full dataset for robust score ---
    print(f"\n🔄 5-Fold Cross-Validation on full dataset...")
    cv_scores = cross_val_score(best_rf, X, y, cv=5, scoring='r2', n_jobs=-1)
    print(f"   CV R² scores: {[f'{s:.4f}' for s in cv_scores]}")
    print(f"   Mean CV R²:   {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # --- Sample Predictions (sanity check) ---
    print(f"\n🧪 Sample Predictions vs Actual:")
    print(f"   {'Actual':>8s}  {'Predicted':>10s}  {'Error':>8s}  {'Scenario':>30s}")
    for i in range(min(10, len(X_test))):
        actual = y_test[i]
        predicted = y_pred[i]
        error = predicted - actual
        views = X_test[i][0]
        purchases = X_test[i][2]
        stock = X_test[i][3]
        scenario = f"v={int(views)} p={int(purchases)} stk={int(stock)}"
        print(f"   {actual:8.4f}  {predicted:10.4f}  {error:+8.4f}  {scenario:>30s}")

    return best_rf


def save_model(model, feature_cols):
    """Save trained model to pickle file"""
    model_path = os.path.join(os.path.dirname(__file__), 'pricing_model.pkl')
    model_data = {
        'model': model,
        'feature_cols': feature_cols,
        'version': '1.0'
    }
    with open(model_path, 'wb') as f:
        pickle.dump(model_data, f)
    
    model_size = os.path.getsize(model_path) / (1024 * 1024)
    print(f"\n💾 Model saved to {model_path} ({model_size:.1f} MB)")
    return model_path


def main():
    print("=" * 60)
    print("  PulsePrice ML Model Training")
    print("=" * 60)

    df = load_data()
    X, y, feature_cols = prepare_features(df)
    model = train_model(X, y, feature_cols)
    save_model(model, feature_cols)

    print("\n🎉 Training complete! Model ready for deployment.")
    print("   Next: Run streaming_processor.py to use ML-powered pricing.\n")


if __name__ == '__main__':
    main()

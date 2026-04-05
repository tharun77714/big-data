#!/usr/bin/env python3
"""
PulsePrice FastAPI Backend
REST + WebSocket API for real-time pricing dashboard
"""

import asyncio
import json
from datetime import datetime
from typing import List, Optional
from decimal import Decimal

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query, Depends, Security
from fastapi.security.api_key import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from database import (
    get_all_products, get_product_by_id, get_price_history,
    get_dashboard_stats, get_top_products_by_demand, get_category_summary
)

app = FastAPI(
    title="PulsePrice API",
    description="Real-time Dynamic Surge Pricing Engine API",
    version="1.0.0"
)

# --- Authentication Layer ---
API_KEY = "pulseprice-secure-key"
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=True)

async def verify_api_key(api_key: str = Security(api_key_header)):
    if api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API Key. Unauthorized extraction attempt.")
    return api_key

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"🔌 Client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        print(f"❌ Client disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Broadcast to all connected clients"""
        if not self.active_connections:
            return
        data = json.dumps(message, default=str)
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(data)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conn)


manager = ConnectionManager()


def decimal_to_float(obj):
    """Convert Decimal objects to float for JSON serialization"""
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


# ─── REST ENDPOINTS ─────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "message": "PulsePrice Dynamic Pricing Engine API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/api/products")
async def list_products(
    category: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("id"),
    api_key: str = Depends(verify_api_key)
):
    """Get all products with live prices"""
    try:
        products = get_all_products()
        if category:
            products = [p for p in products if p['category'].lower() == category.lower()]
        if sort_by == "price_change":
            products.sort(key=lambda x: abs(float(x.get('price_change_pct') or 0)), reverse=True)
        elif sort_by == "demand":
            products.sort(key=lambda x: float(x.get('demand_score') or 0), reverse=True)
        # Convert decimals
        for p in products:
            for key, val in p.items():
                if isinstance(val, Decimal):
                    p[key] = float(val)
                elif isinstance(val, datetime):
                    p[key] = val.isoformat()
        return {"products": products, "total": len(products)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/products/{product_id}")
async def get_product(product_id: int, api_key: str = Depends(verify_api_key)):
    """Get a single product with details"""
    try:
        product = get_product_by_id(product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        for key, val in product.items():
            if isinstance(val, Decimal):
                product[key] = float(val)
            elif isinstance(val, datetime):
                product[key] = val.isoformat()
        return product
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/products/{product_id}/history")
async def product_price_history(product_id: int, limit: int = 50, api_key: str = Depends(verify_api_key)):
    """Get price history for a product"""
    try:
        history = get_price_history(product_id, limit)
        for h in history:
            for key, val in h.items():
                if isinstance(val, Decimal):
                    h[key] = float(val)
                elif isinstance(val, datetime):
                    h[key] = val.isoformat()
        return {"product_id": product_id, "history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dashboard")
async def dashboard_stats(api_key: str = Depends(verify_api_key)):
    """Get dashboard metrics"""
    try:
        stats = get_dashboard_stats()
        # Convert all decimals
        def convert(obj):
            if isinstance(obj, Decimal):
                return float(obj)
            if isinstance(obj, datetime):
                return obj.isoformat()
            if isinstance(obj, dict):
                return {k: convert(v) for k, v in obj.items()}
            if isinstance(obj, list):
                return [convert(i) for i in obj]
            return obj
        return convert(stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dashboard/top-products")
async def top_products(api_key: str = Depends(verify_api_key)):
    """Get top products by demand"""
    try:
        products = get_top_products_by_demand()
        for p in products:
            for key, val in p.items():
                if isinstance(val, Decimal):
                    p[key] = float(val)
        return {"products": products}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dashboard/categories")
async def category_summary(api_key: str = Depends(verify_api_key)):
    """Get category pricing summary"""
    try:
        categories = get_category_summary()
        for c in categories:
            for key, val in c.items():
                if isinstance(val, Decimal):
                    c[key] = float(val)
        return {"categories": categories}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── WEBSOCKET ENDPOINT ──────────────────────────────────────────────────────

@app.websocket("/ws/prices")
async def websocket_prices(websocket: WebSocket):
    """
    WebSocket endpoint for real-time price updates.
    Pushes updated product data every 5 seconds.
    """
    await manager.connect(websocket)
    try:
        while True:
            try:
                # Get fresh prices from DB
                products = get_all_products()
                for p in products:
                    for key, val in p.items():
                        if isinstance(val, Decimal):
                            p[key] = float(val)
                        elif isinstance(val, datetime):
                            p[key] = val.isoformat()

                await websocket.send_text(json.dumps({
                    "type": "price_update",
                    "timestamp": datetime.now().isoformat(),
                    "products": products
                }))
            except WebSocketDisconnect:
                break
            except Exception as e:
                print(f"WebSocket error: {e}")
                break
            await asyncio.sleep(5)  # Push updates every 5 seconds
    finally:
        manager.disconnect(websocket)


@app.websocket("/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    """WebSocket for live dashboard stats"""
    await manager.connect(websocket)
    try:
        while True:
            try:
                stats = get_dashboard_stats()
                def convert(obj):
                    if isinstance(obj, Decimal):
                        return float(obj)
                    if isinstance(obj, datetime):
                        return obj.isoformat()
                    if isinstance(obj, dict):
                        return {k: convert(v) for k, v in obj.items()}
                    if isinstance(obj, list):
                        return [convert(i) for i in obj]
                    return obj
                await websocket.send_text(json.dumps({
                    "type": "dashboard_update",
                    "timestamp": datetime.now().isoformat(),
                    "data": convert(stats)
                }))
            except WebSocketDisconnect:
                break
            except Exception as e:
                break
            await asyncio.sleep(3)
    finally:
        manager.disconnect(websocket)


if __name__ == "__main__":
    print("🚀 Starting PulsePrice API server...")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        workers=1
    )

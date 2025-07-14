from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
import asyncio
import json
import logging
from typing import Dict, List
from datetime import datetime

from .core.config import settings
from .core.database import init_db, get_db
from .api.mikrotik import router as mikrotik_router
from .services.mikrotik_service import MikrotikService, connection_pool
from .models.mikrotik import MikrotikDevice

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="400 MikroTik cihazını yönetebileceğiniz kapsamlı API sistemi",
    debug=settings.DEBUG
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(mikrotik_router, prefix="/api/v1")

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)
    
    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                # Remove dead connections
                self.active_connections.remove(connection)

manager = ConnectionManager()

# Background task for monitoring devices
async def monitor_devices():
    """Background task to monitor device status"""
    while True:
        try:
            from .core.database import SessionLocal
            db = SessionLocal()
            
            # Get all devices
            devices = db.query(MikrotikDevice).all()
            logger.info(f"Monitoring {len(devices)} devices")
            
            # Test connections in batches
            batch_size = 50
            for i in range(0, len(devices), batch_size):
                batch = devices[i:i+batch_size]
                tasks = []
                
                for device in batch:
                    service = MikrotikService(db)
                    tasks.append(monitor_single_device(service, device))
                
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # Send updates via WebSocket
                for device, result in zip(batch, results):
                    if isinstance(result, Exception):
                        logger.error(f"Error monitoring {device.name}: {result}")
                        continue
                    
                    # Send device status update
                    await manager.broadcast(json.dumps({
                        "type": "device_status",
                        "device_id": device.id,
                        "name": device.name,
                        "is_online": device.is_online,
                        "last_seen": device.last_seen.isoformat() if device.last_seen else None,
                        "last_error": device.last_error
                    }))
            
            db.close()
            
        except Exception as e:
            logger.error(f"Error in monitor_devices: {e}")
        
        # Wait 30 seconds before next check
        await asyncio.sleep(30)

async def monitor_single_device(service: MikrotikService, device: MikrotikDevice):
    """Monitor single device"""
    try:
        success = await service.test_connection(device)
        if success:
            # Get device info and interfaces
            await service.get_device_info(device)
            await service.get_interfaces(device)
        return success
    except Exception as e:
        logger.error(f"Error monitoring device {device.name}: {e}")
        return False

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle different message types
            if message.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
            elif message.get("type") == "subscribe":
                # Client subscribes to device updates
                await websocket.send_text(json.dumps({
                    "type": "subscribed",
                    "message": "Subscribed to device updates"
                }))
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.VERSION
    }

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "MikroTik API Management System",
        "version": settings.VERSION,
        "docs_url": "/docs"
    }

# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info("Starting MikroTik API Management System...")
    
    # Initialize database
    init_db()
    logger.info("Database initialized")
    
    # Start monitoring task
    asyncio.create_task(monitor_devices())
    logger.info("Device monitoring started")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down MikroTik API Management System...")
    
    # Close all connections
    connection_pool.close_all()
    logger.info("All connections closed")

# Test endpoint for bulk operations
@app.post("/api/v1/test-bulk")
async def test_bulk_operations(db: Session = Depends(get_db)):
    """Test endpoint for bulk operations"""
    devices = db.query(MikrotikDevice).limit(10).all()
    service = MikrotikService(db)
    
    # Test parallel connections
    tasks = []
    for device in devices:
        tasks.append(service.test_connection(device))
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    success_count = sum(1 for r in results if r is True)
    
    return {
        "total_tested": len(devices),
        "success_count": success_count,
        "failed_count": len(devices) - success_count,
        "results": [
            {
                "device_id": device.id,
                "device_name": device.name,
                "success": result if not isinstance(result, Exception) else False,
                "error": str(result) if isinstance(result, Exception) else None
            }
            for device, result in zip(devices, results)
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 
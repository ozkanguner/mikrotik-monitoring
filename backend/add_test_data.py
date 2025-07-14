from app.core.database import SessionLocal, init_db
from app.models.mikrotik import MikrotikDevice
from datetime import datetime

# Initialize database first
init_db()

def add_test_devices():
    db = SessionLocal()
    try:
        # Check if devices already exist
        existing_devices = db.query(MikrotikDevice).count()
        if existing_devices > 0:
            print(f"✅ {existing_devices} devices already exist in database")
            return

        # Test devices from your screenshot
        test_devices = [
            {
                "name": "MASLAK-42-VM-SANAL",
                "ip_address": "92.113.42.244",
                "port": 8728,
                "username": "moowifi",
                "password": "Frknzkn61",
                "router_board": "CHR VMware, Inc. VMware Virtual Platform",
                "architecture": "x86_64",
                "version": "7.19.1 (stable)",
                "build_time": "2025-05-23 14:27:17",
                "group_name": "test",
                "location": "NULL",
                "description": "Test device 1",
                "is_online": True,
                "last_seen": datetime.now(),
                "connection_attempts": 0,
                "created_at": datetime.now(),
                "updated_at": datetime.now(),
                "manual_override": False
            },
            {
                "name": "DT_MASLAK_42",
                "ip_address": "92.113.42.242",
                "port": 8728,
                "username": "moowifi",
                "password": "Frknzkn61",
                "router_board": "RB1100Dx4",
                "architecture": "arm",
                "version": "7.15.3 (stable)",
                "build_time": "2024-07-24 10:39:01",
                "group_name": "critical",
                "location": "NULL", 
                "description": "Test device 2",
                "is_online": True,
                "last_seen": datetime.now(),
                "connection_attempts": 0,
                "created_at": datetime.now(),
                "updated_at": datetime.now(),
                "manual_override": False
            },
            {
                "name": "dt.sultanahmet.pppoe",
                "ip_address": "92.113.42.2",
                "port": 8728,
                "username": "moowifi", 
                "password": "Frknzkn61",
                "router_board": "CCR2116-12G-4S+",
                "architecture": "arm64",
                "version": "7.11.3 (stable)",
                "build_time": "Sep/27/2023 13:09:44",
                "group_name": "temp",
                "location": "NULL",
                "description": "Test device 3", 
                "is_online": True,
                "last_seen": datetime.now(),
                "connection_attempts": 0,
                "created_at": datetime.now(),
                "updated_at": datetime.now(),
                "manual_override": False
            },
            {
                "name": "sultanahmet-hotspot.trasst.com",
                "ip_address": "92.113.42.3",
                "port": 8728,
                "username": "moowifi",
                "password": "Frknzkn61", 
                "router_board": "CHR VMware, Inc. VMware Virtual Platform",
                "architecture": "x86_64",
                "version": "7.16 (stable)",
                "build_time": "2024-09-20 13:00:27",
                "group_name": "temp",
                "location": "NULL",
                "description": "Test device 4",
                "is_online": True,
                "last_seen": datetime.now(), 
                "connection_attempts": 0,
                "created_at": datetime.now(),
                "updated_at": datetime.now(),
                "manual_override": False
            }
        ]

        # Add devices to database
        for device_data in test_devices:
            device = MikrotikDevice(**device_data)
            db.add(device)
        
        db.commit()
        print(f"✅ Successfully added {len(test_devices)} test devices to SQLite database")
        
        # Verify
        count = db.query(MikrotikDevice).count()
        print(f"✅ Total devices in database: {count}")
        
    except Exception as e:
        print(f"❌ Error adding test data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_test_devices() 
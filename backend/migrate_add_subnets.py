#!/usr/bin/env python3
"""
Migration script to add subnets table
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import engine
from sqlalchemy import text

def migrate_add_subnets():
    """Add subnets table"""
    try:
        with engine.connect() as conn:
            # Check if table already exists
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='subnets'"))
            if result.fetchone():
                print("✅ subnets table already exists")
                return

            # Create subnets table
            conn.execute(text("""
                CREATE TABLE subnets (
                    id INTEGER NOT NULL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL UNIQUE,
                    network VARCHAR(15) NOT NULL,
                    cidr INTEGER NOT NULL,
                    gateway VARCHAR(15),
                    start_ip VARCHAR(15),
                    end_ip VARCHAR(15),
                    vlan_id INTEGER,
                    description TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """))
            
            # Create index
            conn.execute(text("CREATE INDEX ix_subnets_name ON subnets (name)"))
            
            conn.commit()
            print("✅ subnets table created successfully")
            
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        
def create_default_subnets():
    """Create default subnets"""
    try:
        with engine.connect() as conn:
            # Check if subnets already exist
            result = conn.execute(text("SELECT COUNT(*) FROM subnets"))
            count = result.fetchone()[0]
            
            if count > 0:
                print("✅ Subnets already exist in database")
                return
            
            # Create default subnets
            default_subnets = [
                {
                    "name": "Ofis Ağı",
                    "network": "192.168.1.0",
                    "cidr": 24,
                    "gateway": "192.168.1.1",
                    "start_ip": "192.168.1.10",
                    "end_ip": "192.168.1.254",
                    "description": "Ana ofis ağı"
                },
                {
                    "name": "DMZ",
                    "network": "192.168.100.0",
                    "cidr": 24,
                    "gateway": "192.168.100.1",
                    "start_ip": "192.168.100.10",
                    "end_ip": "192.168.100.100",
                    "description": "DMZ ağı - Dış erişime açık servisler"
                },
                {
                    "name": "Yönetim Ağı",
                    "network": "10.0.0.0",
                    "cidr": 24,
                    "gateway": "10.0.0.1",
                    "start_ip": "10.0.0.10",
                    "end_ip": "10.0.0.254",
                    "description": "Yönetim ve monitöring ağı"
                }
            ]
            
            for subnet in default_subnets:
                conn.execute(text("""
                    INSERT INTO subnets (name, network, cidr, gateway, start_ip, end_ip, description, is_active)
                    VALUES (:name, :network, :cidr, :gateway, :start_ip, :end_ip, :description, 1)
                """), subnet)
            
            conn.commit()
            print(f"✅ {len(default_subnets)} default subnets created successfully")
            
    except Exception as e:
        print(f"❌ Error creating default subnets: {e}")
        
if __name__ == "__main__":
    migrate_add_subnets()
    create_default_subnets() 
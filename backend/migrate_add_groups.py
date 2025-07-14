#!/usr/bin/env python3
"""
Migration script to add groups table and default groups
"""

import sys
import os
import sqlite3
from datetime import datetime

# Add the backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SQLALCHEMY_DATABASE_URL

def create_groups_table():
    """Create groups table"""
    # Extract database path from SQLite URL
    db_path = SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Create groups table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(255) NOT NULL UNIQUE,
                description TEXT,
                color VARCHAR(7) DEFAULT '#1976d2',
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Add group_id column to mikrotik_devices table if it doesn't exist
        cursor.execute('''
            PRAGMA table_info(mikrotik_devices)
        ''')
        
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'group_id' not in columns:
            cursor.execute('''
                ALTER TABLE mikrotik_devices ADD COLUMN group_id INTEGER REFERENCES groups(id)
            ''')
            print("✅ Added group_id column to mikrotik_devices table")
        else:
            print("ℹ️  group_id column already exists in mikrotik_devices table")
        
        conn.commit()
        print("✅ Groups table created successfully")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error creating groups table: {e}")
        raise
    finally:
        conn.close()

def add_default_groups():
    """Add default groups"""
    # Extract database path from SQLite URL
    db_path = SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Default groups to add
        default_groups = [
            {
                "name": "Varsayılan",
                "description": "Sistem varsayılan grubu",
                "color": "#1976d2",
                "is_active": True
            },
            {
                "name": "Ofis Cihazları",
                "description": "Ofis lokasyonundaki MikroTik cihazları",
                "color": "#2e7d32",
                "is_active": True
            },
            {
                "name": "Güvenlik Kameraları",
                "description": "Güvenlik kamera sistemleri",
                "color": "#d32f2f",
                "is_active": True
            },
            {
                "name": "Access Point'ler",
                "description": "Kablosuz erişim noktaları",
                "color": "#1565c0",
                "is_active": True
            },
            {
                "name": "Switch'ler",
                "description": "Ağ anahtarları",
                "color": "#e65100",
                "is_active": True
            },
            {
                "name": "Router'lar",
                "description": "Ağ yönlendiricileri",
                "color": "#6a1b9a",
                "is_active": True
            }
        ]
        
        current_time = datetime.now().isoformat()
        
        for group in default_groups:
            # Check if group already exists
            cursor.execute("SELECT id FROM groups WHERE name = ?", (group["name"],))
            if cursor.fetchone():
                print(f"ℹ️  Group '{group['name']}' already exists")
                continue
            
            # Insert new group
            cursor.execute('''
                INSERT INTO groups (name, description, color, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                group["name"],
                group["description"],
                group["color"],
                group["is_active"],
                current_time,
                current_time
            ))
            
            print(f"✅ Added group: {group['name']}")
        
        conn.commit()
        print("✅ Default groups added successfully")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error adding default groups: {e}")
        raise
    finally:
        conn.close()

def main():
    """Main migration function"""
    print("🚀 Starting groups migration...")
    
    try:
        # Create groups table
        create_groups_table()
        
        # Add default groups
        add_default_groups()
        
        print("✅ Groups migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 
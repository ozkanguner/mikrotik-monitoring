#!/usr/bin/env python3
"""
Migration script to add credential_id column to mikrotik_devices table
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import engine
from sqlalchemy import text
import sqlite3

def migrate_add_credential_id():
    """Add credential_id column to mikrotik_devices table"""
    try:
        with engine.connect() as conn:
            # Check if column already exists
            result = conn.execute(text("PRAGMA table_info(mikrotik_devices)"))
            columns = [row[1] for row in result.fetchall()]
            
            if 'credential_id' not in columns:
                # Add credential_id column
                conn.execute(text("""
                    ALTER TABLE mikrotik_devices 
                    ADD COLUMN credential_id INTEGER 
                    REFERENCES credentials(id)
                """))
                conn.commit()
                print("✅ credential_id column added successfully")
            else:
                print("✅ credential_id column already exists")
                
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        
if __name__ == "__main__":
    migrate_add_credential_id() 
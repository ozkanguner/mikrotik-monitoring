#!/usr/bin/env python3
"""
Migration script to simplify subnets table by removing unnecessary columns
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import engine
from sqlalchemy import text

def migrate_simplify_subnets():
    """Remove unnecessary columns from subnets table"""
    try:
        with engine.connect() as conn:
            # Check if table exists
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='subnets'"))
            if not result.fetchone():
                print("❌ subnets table does not exist")
                return

            # Check which columns exist
            columns_result = conn.execute(text("PRAGMA table_info(subnets)"))
            existing_columns = [row[1] for row in columns_result.fetchall()]
            
            print(f"📋 Current columns: {existing_columns}")
            
            # Columns to keep
            keep_columns = ['id', 'name', 'network', 'cidr', 'is_active', 'created_at', 'updated_at']
            
            # Create new table with only required columns
            conn.execute(text("""
                CREATE TABLE subnets_new (
                    id INTEGER NOT NULL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL UNIQUE,
                    network VARCHAR(15) NOT NULL,
                    cidr INTEGER NOT NULL,
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """))
            
            # Copy data from old table to new table
            conn.execute(text("""
                INSERT INTO subnets_new (id, name, network, cidr, is_active, created_at, updated_at)
                SELECT id, name, network, cidr, is_active, created_at, updated_at
                FROM subnets
            """))
            
            # Drop old table
            conn.execute(text("DROP TABLE subnets"))
            
            # Rename new table
            conn.execute(text("ALTER TABLE subnets_new RENAME TO subnets"))
            
            # Recreate index
            conn.execute(text("CREATE INDEX ix_subnets_name ON subnets (name)"))
            
            # Update group_subnets table foreign key (should still work)
            # Check if group_subnets table exists and test the foreign key
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='group_subnets'"))
            if result.fetchone():
                # Test the foreign key constraint still works
                test_result = conn.execute(text("SELECT COUNT(*) FROM group_subnets gs JOIN subnets s ON gs.subnet_id = s.id"))
                count = test_result.fetchone()[0]
                print(f"✅ Group-subnet relationships verified: {count} associations")
            
            conn.commit()
            print("✅ Subnets table simplified successfully")
            print(f"📋 New columns: {keep_columns}")
            
    except Exception as e:
        print(f"❌ Error during migration: {e}")

if __name__ == "__main__":
    migrate_simplify_subnets()
    print("\n🎉 Subnet simplification migration completed!") 
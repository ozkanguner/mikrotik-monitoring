#!/usr/bin/env python3
"""
Migration script to add group_subnets association table for Group-Subnet many-to-many relationship
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import engine
from sqlalchemy import text

def migrate_group_subnets():
    """Add group_subnets association table"""
    try:
        with engine.connect() as conn:
            # Check if table already exists
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='group_subnets'"))
            if result.fetchone():
                print("✅ group_subnets table already exists")
                return

            # Create group_subnets association table
            conn.execute(text("""
                CREATE TABLE group_subnets (
                    group_id INTEGER NOT NULL,
                    subnet_id INTEGER NOT NULL,
                    PRIMARY KEY (group_id, subnet_id),
                    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
                    FOREIGN KEY (subnet_id) REFERENCES subnets(id) ON DELETE CASCADE
                )
            """))
            
            # Create indexes for performance
            conn.execute(text("CREATE INDEX ix_group_subnets_group_id ON group_subnets (group_id)"))
            conn.execute(text("CREATE INDEX ix_group_subnets_subnet_id ON group_subnets (subnet_id)"))
            
            conn.commit()
            print("✅ group_subnets table created successfully")
            
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        
def create_default_associations():
    """Create default group-subnet associations"""
    try:
        with engine.connect() as conn:
            # Check if associations already exist
            result = conn.execute(text("SELECT COUNT(*) FROM group_subnets"))
            count = result.fetchone()[0]
            
            if count > 0:
                print("✅ Group-Subnet associations already exist in database")
                return
            
            # Get existing groups and subnets
            groups_result = conn.execute(text("SELECT id, name FROM groups WHERE is_active = 1"))
            groups = {row[1]: row[0] for row in groups_result.fetchall()}
            
            subnets_result = conn.execute(text("SELECT id, name FROM subnets WHERE is_active = 1"))
            subnets = {row[1]: row[0] for row in subnets_result.fetchall()}
            
            # Create default associations
            default_associations = [
                ("Ofis Cihazları", "Ofis Ağı"),
                ("Güvenlik Kameraları", "DMZ"),
                ("Access Point'ler", "Ofis Ağı"),
                ("Switch'ler", "Yönetim Ağı"),
                ("Router'lar", "Yönetim Ağı"),
                ("Varsayılan", "Ofis Ağı")
            ]
            
            for group_name, subnet_name in default_associations:
                if group_name in groups and subnet_name in subnets:
                    conn.execute(text("""
                        INSERT INTO group_subnets (group_id, subnet_id)
                        VALUES (:group_id, :subnet_id)
                    """), {
                        "group_id": groups[group_name],
                        "subnet_id": subnets[subnet_name]
                    })
            
            conn.commit()
            print("✅ Default group-subnet associations created successfully")
            
    except Exception as e:
        print(f"❌ Error creating default associations: {e}")

if __name__ == "__main__":
    migrate_group_subnets()
    create_default_associations()
    print("\n🎉 Group-Subnet migration completed successfully!") 
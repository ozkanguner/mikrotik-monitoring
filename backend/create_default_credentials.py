#!/usr/bin/env python3
"""
Script to create default credentials in the database
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal, init_db
from app.models.mikrotik import Credential

def create_default_credentials():
    """Create default credentials"""
    init_db()
    db = SessionLocal()
    
    try:
        # Check if credentials already exist
        existing = db.query(Credential).first()
        if existing:
            print("Credentials already exist in database")
            return
        
        # Create default credentials
        default_credentials = [
            {
                "name": "Varsayılan Admin",
                "username": "admin",
                "password": "",
                "description": "Boş şifre ile varsayılan admin hesabı",
                "is_default": True
            },
            {
                "name": "MooWifi Standart",
                "username": "moowifi", 
                "password": "Frknzkn61.",
                "description": "MooWifi cihazları için standart kimlik bilgisi",
                "is_default": False
            },
            {
                "name": "Güçlü Admin",
                "username": "admin",
                "password": "123456",
                "description": "Güçlü şifre ile admin hesabı",
                "is_default": False
            }
        ]
        
        for cred_data in default_credentials:
            credential = Credential(**cred_data)
            db.add(credential)
        
        db.commit()
        print(f"✅ Created {len(default_credentials)} default credentials")
        
        # List created credentials
        all_creds = db.query(Credential).all()
        print("\nCreated credentials:")
        for cred in all_creds:
            print(f"- {cred.name}: {cred.username} (Default: {cred.is_default})")
            
    except Exception as e:
        print(f"❌ Error creating credentials: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_default_credentials() 
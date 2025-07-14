import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# SQLite konfigürasyonu - çok daha hızlı ve kolay yönetim
SQLALCHEMY_DATABASE_URL = "sqlite:///./mikrotik_devices.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},  # SQLite için gerekli
    echo=False  # SQL debug için True yapılabilir
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    # Tüm tabloları oluştur
    Base.metadata.create_all(bind=engine)
    print("✅ SQLite database initialized successfully") 
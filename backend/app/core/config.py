from pydantic_settings import BaseSettings
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # Database - SQLite kullanıyoruz
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./mikrotik_devices.db")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # Application
    APP_NAME: str = "MikroTik API Management System"
    VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    
    # CORS - Windows bilgisayarından erişim için
    ALLOWED_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        # Windows bilgisayar IP'nizi buraya ekleyin
        "http://YOUR_WINDOWS_IP:3000",
        "http://YOUR_WINDOWS_IP:3001",
        "http://YOUR_WINDOWS_IP:3002",
        # Geliştirme için tüm origin'lere izin (production'da kaldırın)
        "*"
    ]
    
    # MikroTik
    MIKROTIK_DEFAULT_PORT: int = 8728
    MIKROTIK_SSL_PORT: int = 8729
    CONNECTION_TIMEOUT: int = 10
    MAX_CONCURRENT_CONNECTIONS: int = 50
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings() 
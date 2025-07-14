from pydantic_settings import BaseSettings
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "mysql+pymysql://radius:Zkngnr81.@dbmaster.trasst.com:3306/mikrotik")
    DATABASE_HOST: str = os.getenv("DATABASE_HOST", "dbmaster.trasst.com")
    DATABASE_PORT: int = int(os.getenv("DATABASE_PORT", "3306"))
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "mikrotik")
    DATABASE_USER: str = os.getenv("DATABASE_USER", "radius")
    DATABASE_PASSWORD: str = os.getenv("DATABASE_PASSWORD", "Zkngnr81.")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # Application
    APP_NAME: str = "MikroTik API Management System"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # CORS
    ALLOWED_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
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
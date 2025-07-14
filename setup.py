#!/usr/bin/env python3
"""
MikroTik API Yönetim Sistemi - Kurulum Scripti
400 MikroTik cihazını web üzerinden yönetebileceğiniz RouterOS API sistemi
"""

import os
import sys
import subprocess
import json
from pathlib import Path

def run_command(command, cwd=None):
    """Run a command and return the result"""
    try:
        result = subprocess.run(
            command,
            shell=True,
            check=True,
            cwd=cwd,
            capture_output=True,
            text=True
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {command}")
        print(f"Error output: {e.stderr}")
        return None

def check_requirements():
    """Check if required tools are installed"""
    print("🔍 Sistem gereksinimleri kontrol ediliyor...")
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 veya daha yeni sürüm gereklidir")
        return False
    
    # Check if pip is available
    if not run_command("pip --version"):
        print("❌ pip bulunamadı")
        return False
    
    # Check if node and npm are available
    if not run_command("node --version"):
        print("❌ Node.js bulunamadı")
        return False
    
    if not run_command("npm --version"):
        print("❌ npm bulunamadı")
        return False
    
    print("✅ Sistem gereksinimleri karşılanıyor")
    return True

def setup_backend():
    """Setup backend environment"""
    print("🐍 Backend kurulumu başlatılıyor...")
    
    backend_dir = Path(__file__).parent / "backend"
    
    # Install Python dependencies
    if not run_command("pip install -r requirements.txt", cwd=backend_dir):
        print("❌ Backend dependencies kurulumunda hata")
        return False
    
    # Create .env file if it doesn't exist
    env_file = backend_dir / ".env"
    if not env_file.exists():
        env_content = """# SQLite Database - otomatik olarak oluşturulur
DATABASE_URL=sqlite:///./mikrotik_devices.db

# Security
SECRET_KEY=your-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Debug mode
DEBUG=True
"""
        with open(env_file, 'w') as f:
            f.write(env_content)
        print("✅ .env dosyası oluşturuldu (SQLite konfigürasyonu)")
    
    print("✅ Backend kurulumu tamamlandı")
    return True

def setup_frontend():
    """Setup frontend environment"""
    print("⚛️ Frontend kurulumu başlatılıyor...")
    
    frontend_dir = Path(__file__).parent / "frontend"
    
    # Install Node.js dependencies
    if not run_command("npm install", cwd=frontend_dir):
        print("❌ Frontend dependencies kurulumunda hata")
        return False
    
    print("✅ Frontend kurulumu tamamlandı")
    return True

def create_startup_scripts():
    """Create startup scripts"""
    print("📝 Başlatma scriptleri oluşturuluyor...")
    
    # Backend start script
    backend_script = """#!/bin/bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""
    
    with open("start_backend.sh", "w") as f:
        f.write(backend_script)
    os.chmod("start_backend.sh", 0o755)
    
    # Frontend start script
    frontend_script = """#!/bin/bash
cd frontend
npm start
"""
    
    with open("start_frontend.sh", "w") as f:
        f.write(frontend_script)
    os.chmod("start_frontend.sh", 0o755)
    
    # Combined start script
    combined_script = """#!/bin/bash
echo "🚀 MikroTik API Yönetim Sistemi başlatılıyor..."
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "API Docs: http://localhost:8000/docs"
echo ""

# Start backend in background
echo "🐍 Backend başlatılıyor..."
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 5

# Start frontend
echo "⚛️ Frontend başlatılıyor..."
cd ../frontend
npm start &
FRONTEND_PID=$!

# Wait for both processes
echo "✅ Sistem başlatıldı!"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Durdurmak için Ctrl+C basın"

wait $BACKEND_PID $FRONTEND_PID
"""
    
    with open("start_all.sh", "w") as f:
        f.write(combined_script)
    os.chmod("start_all.sh", 0o755)
    
    print("✅ Başlatma scriptleri oluşturuldu")
    return True

def main():
    """Main setup function"""
    print("🌟 MikroTik API Yönetim Sistemi - Kurulum")
    print("=" * 50)
    
    if not check_requirements():
        print("❌ Kurulum başarısız: Sistem gereksinimleri karşılanmıyor")
        return False
    
    if not setup_backend():
        print("❌ Kurulum başarısız: Backend kurulumu hatalı")
        return False
    
    if not setup_frontend():
        print("❌ Kurulum başarısız: Frontend kurulumu hatalı")
        return False
    
    if not create_startup_scripts():
        print("❌ Kurulum başarısız: Startup scriptleri oluşturulamadı")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 Kurulum başarıyla tamamlandı!")
    print("\n📋 Çalıştırma talimatları:")
    print("• Tüm servisleri başlatmak için: ./start_all.sh")
    print("• Sadece backend için: ./start_backend.sh")
    print("• Sadece frontend için: ./start_frontend.sh")
    print("\n🌐 Erişim adresleri:")
    print("• Frontend: http://localhost:3000")
    print("• Backend API: http://localhost:8000")
    print("• API Docs: http://localhost:8000/docs")
    print("\n📖 Daha fazla bilgi için README.md dosyasını okuyun")
    
    return True

if __name__ == "__main__":
    if main():
        sys.exit(0)
    else:
        sys.exit(1) 
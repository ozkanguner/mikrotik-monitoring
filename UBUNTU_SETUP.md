# 🌉 Ubuntu Sunucu + Windows Hybrid Kurulum Rehberi

Bu rehber backend'i Ubuntu sunucuda, frontend'i Windows bilgisayarında çalıştırmak için tasarlanmıştır.

## 🔧 **UBUNTU SUNUCUDA BACKEND KURULUMU**

### 1. Ubuntu Sunucuya SSH Bağlantısı
```bash
ssh username@YOUR_UBUNTU_SERVER_IP
```

### 2. Sistem Güncellemesi
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install python3 python3-pip python3-venv git -y
```

### 3. Projeyi Klonlama
```bash
cd /opt
sudo git clone https://github.com/ozkanguner/mikrotik-monitoring.git
sudo chown -R $USER:$USER mikrotik-monitoring
cd mikrotik-monitoring
```

### 4. Backend Kurulumu
```bash
cd backend

# Virtual environment oluştur
python3 -m venv venv
source venv/bin/activate

# Dependencies yükle
pip install -r requirements.txt

# Database initialize et
python -c "from app.core.database import init_db; init_db()"
```

### 5. Backend'i Çalıştırma
```bash
# Development mode
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Production mode (opsiyonel)
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 6. Systemd Service Oluşturma (Opsiyonel)
```bash
sudo nano /etc/systemd/system/mikrotik-backend.service
```

Service dosyası içeriği:
```ini
[Unit]
Description=MikroTik Backend Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/mikrotik-monitoring/backend
Environment=PATH=/opt/mikrotik-monitoring/backend/venv/bin
ExecStart=/opt/mikrotik-monitoring/backend/venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

Service'i etkinleştir:
```bash
sudo systemctl daemon-reload
sudo systemctl enable mikrotik-backend.service
sudo systemctl start mikrotik-backend.service
```

### 7. Firewall Ayarları
```bash
sudo ufw allow 8000/tcp
sudo ufw enable
```

---

## 💻 **WINDOWS BİLGİSAYARDA FRONTEND KURULUMU**

### 1. Node.js Kurulumu
- [Node.js](https://nodejs.org/) indir ve kur (v16+)

### 2. Proje Klonlama
```cmd
cd C:\
git clone https://github.com/ozkanguner/mikrotik-monitoring.git
cd mikrotik-monitoring\frontend
```

### 3. Dependencies Kurulumu
```cmd
npm install
```

### 4. **ÖNEMLİ: IP Konfigürasyonu**
`frontend/src/config.ts` dosyasını açın ve Ubuntu sunucu IP'nizi yazın:

```typescript
// Ubuntu sunucu IP'nizi buraya yazın
export const UBUNTU_SERVER_IP = '192.168.1.100'; // Gerçek IP'nizi yazın
```

**IP Adresini Öğrenmek İçin:**
Ubuntu sunucuda:
```bash
ip addr show | grep inet
```

### 5. Frontend'i Çalıştırma
```cmd
npm start
```

Frontend http://localhost:3000 adresinde açılacaktır.

---

## 🔧 **UBUNTU SUNUCUDA CORS AYARLARI**

Backend'de Windows bilgisayarından erişim için:

`backend/app/core/config.py` dosyasında:
```python
ALLOWED_ORIGINS: list = [
    "http://localhost:3000",
    "http://YOUR_WINDOWS_IP:3000",  # Windows IP'nizi yazın
    "*"  # Geliştirme için tüm origin'lere izin
]
```

---

## 🧪 **TEST ETMEBaşarılı Erişim**

### 1. Backend Test
Ubuntu sunucuda:
```bash
curl http://localhost:8000/api/v1/mikrotik/stats
```

Windows'tan:
```cmd
curl http://YOUR_UBUNTU_SERVER_IP:8000/api/v1/mikrotik/stats
```

### 2. Frontend Test
Windows'ta tarayıcıda:
- http://localhost:3000
- Dashboard'da istatistikler görünmeli
- Network tab'ında API calls Ubuntu sunucuya gitmeli

---

## 🚀 **AVANTAJLAR**

✅ **Performans**: Backend Ubuntu'da çok daha hızlı  
✅ **Monitoring**: 150+ cihaz stabil şekilde monitor edilir  
✅ **Development**: Windows'ta React hot reload devam eder  
✅ **Scalability**: Ubuntu sunucu daha fazla cihaz destekler  

---

## 🐛 **SORUN GİDERME**

### Backend Bağlantı Hatası
```bash
# Backend durumu
sudo systemctl status mikrotik-backend.service

# Log kontrol
sudo journalctl -u mikrotik-backend.service -f

# Port kontrol
sudo netstat -tlnp | grep 8000
```

### Frontend CORS Hatası
1. Ubuntu sunucuda CORS ayarlarını kontrol edin
2. Windows IP'yi ALLOWED_ORIGINS'e ekleyin
3. Backend'i yeniden başlatın

### Database Hatası
```bash
cd /opt/mikrotik-monitoring/backend
source venv/bin/activate
python -c "from app.core.database import init_db; init_db()"
```

---

## 📞 **DESTEK**

Sorun yaşarsanız:
1. Backend logs kontrol edin
2. Frontend console'daki hataları kontrol edin  
3. Network connectivity test edin
4. Firewall ayarlarını kontrol edin

**Sistem hazır! Windows'tan Ubuntu sunucudaki backend'e bağlı olarak geliştirme yapabilirsiniz.** 🎉 
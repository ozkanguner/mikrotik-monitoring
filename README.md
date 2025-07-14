# MikroTik API Yönetim Sistemi

149 MikroTik cihazını web üzerinden yönetebileceğiniz kapsamlı RouterOS API sistemi.

## 🚀 Özellikler

### Backend (Python FastAPI)
- **Yüksek Performans**: 400 cihaza eş zamanlı bağlantı desteği
- **RouterOS API**: Librouteros ile güvenli bağlantı
- **SQLite Veritabanı**: Hızlı ve kolay cihaz bilgileri yönetimi
- **WebSocket**: Real-time durum güncellemeleri
- **Async İşlemler**: Paralel cihaz yönetimi
- **Connection Pool**: Verimli bağlantı yönetimi

### Frontend (React TypeScript)
- **Modern UI**: Material-UI ile responsive tasarım
- **Real-time Dashboard**: Canlı cihaz durumu
- **Cihaz Yönetimi**: CRUD işlemleri
- **Toplu İşlemler**: Çoklu cihaz yönetimi
- **Filtreleme**: Gelişmiş arama ve filtreleme
- **Grafikler**: Recharts ile görselleştirme

## 📋 Sistem Gereksinimleri

### Backend
- Python 3.8+
- SQLite (built-in)

### Frontend
- Node.js 16+
- npm veya yarn

## 🛠️ Kurulum

### 1. Proje Klonlama
```bash
git clone <repo-url>
cd mikrotikapi
```

### 2. Backend Kurulumu
```bash
cd backend
pip install -r requirements.txt
```

### 3. Veritabanı Yapılandırması
SQLite otomatik olarak oluşturulur. Veritabanı dosyası: `backend/mikrotik_devices.db`

Backend klasöründe isteğe bağlı `.env` dosyası:
```env
SECRET_KEY=your-secret-key-here
DEBUG=True
```

### 4. Frontend Kurulumu
```bash
cd frontend
npm install
```

## 🚀 Çalıştırma

### Backend Başlatma
```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Başlatma
```bash
cd frontend
npm start
```

## 📊 API Endpoints

### Cihaz Yönetimi
- `GET /api/v1/mikrotik/devices` - Cihaz listesi
- `POST /api/v1/mikrotik/devices` - Yeni cihaz
- `PUT /api/v1/mikrotik/devices/{id}` - Cihaz güncelleme
- `DELETE /api/v1/mikrotik/devices/{id}` - Cihaz silme

### Bağlantı Testleri
- `POST /api/v1/mikrotik/devices/{id}/test-connection` - Tekil test
- `POST /api/v1/mikrotik/devices/bulk-test` - Toplu test

### Cihaz Bilgileri
- `GET /api/v1/mikrotik/devices/{id}/interfaces` - Arayüz listesi
- `GET /api/v1/mikrotik/devices/{id}/logs` - Cihaz logları
- `POST /api/v1/mikrotik/devices/{id}/execute` - Komut çalıştırma
- `GET /api/v1/mikrotik/devices/{id}/reboot` - Yeniden başlatma

### Grup Yönetimi
- `GET /api/v1/mikrotik/groups` - Grup listesi
- `POST /api/v1/mikrotik/groups` - Yeni grup
- `PUT /api/v1/mikrotik/groups/{id}` - Grup güncelleme
- `DELETE /api/v1/mikrotik/groups/{id}` - Grup silme

### Subnet Yönetimi
- `GET /api/v1/mikrotik/subnets` - Subnet listesi
- `POST /api/v1/mikrotik/subnets` - Yeni subnet
- `PUT /api/v1/mikrotik/subnets/{id}` - Subnet güncelleme
- `DELETE /api/v1/mikrotik/subnets/{id}` - Subnet silme

### Cihaz Tarama
- `POST /api/v1/mikrotik/groups/{id}/scan` - Grup subnet taraması
- `POST /api/v1/mikrotik/groups/{id}/register-devices` - Bulunan cihazları kaydet

### İstatistikler
- `GET /api/v1/mikrotik/stats` - Genel istatistikler

## 🔧 Yapılandırma

### Backend Ayarları
`backend/app/core/config.py` dosyasında:
- SQLite database path
- MikroTik bağlantı limitleri
- WebSocket konfigürasyonu

### Frontend Ayarları
`frontend/src/services/api.ts` dosyasında:
- API base URL
- Timeout ayarları

## 🏗️ Proje Yapısı

```
mikrotikapi/
├── backend/
│   ├── app/
│   │   ├── api/                # API endpoints
│   │   ├── core/               # Konfigürasyon
│   │   ├── models/             # Veritabanı modelleri
│   │   ├── schemas/            # Pydantic şemaları
│   │   ├── services/           # İş mantığı
│   │   └── main.py            # FastAPI uygulaması
│   ├── requirements.txt
│   └── mikrotik_devices.db    # SQLite veritabanı
├── frontend/
│   ├── src/
│   │   ├── components/         # React bileşenleri
│   │   ├── hooks/             # Custom hooks
│   │   ├── services/          # API servisleri
│   │   ├── types/             # TypeScript tipleri
│   │   └── App.tsx
│   ├── package.json
│   └── public/
└── README.md
```

## 📱 Kullanım

### 1. Dashboard
- Cihaz durumu özeti
- Real-time güncellemeler
- Grafik gösterimler

### 2. Cihaz Listesi
- Tüm cihazları görüntüleme
- Filtreleme ve arama
- Toplu işlemler

### 3. Cihaz Detayı
- Arayüz bilgileri
- Log kayıtları
- Komut çalıştırma

### 4. Grup Yönetimi
- Cihazları gruplara ayırma
- Subnet ilişkilendirme
- Grup bazlı tarama

### 5. Subnet Yönetimi
- IP aralıkları tanımlama
- Grup ilişkilendirme
- Otomatik cihaz keşfi

## 🔒 Güvenlik

- **Local SQLite**: Güvenli yerel veritabanı
- **Validation**: Giriş doğrulaması
- **Rate Limiting**: Aşırı yük koruması
- **Error Handling**: Güvenli hata yönetimi

## 📊 Performans

- **Eş zamanlı bağlantı**: 400 cihaz desteği
- **Connection Pool**: Verimli kaynak kullanımı
- **Async Processing**: Paralel işlem desteği
- **SQLite**: Hızlı yerel veritabanı

## 🐛 Sorun Giderme

### Veritabanı Hatası
```bash
# Veritabanı dosyasını kontrol edin
ls -la backend/mikrotik_devices.db

# Yeni veritabanı oluşturmak için
rm backend/mikrotik_devices.db
# Backend'i yeniden başlatın
```

### RouterOS Bağlantı Hatası
- MikroTik cihazında API servisinin açık olduğundan emin olun
- Firewall kurallarını kontrol edin
- Kullanıcı yetkilerini doğrulayın

### Frontend Bağlantı Hatası
- Backend servisinin çalıştığından emin olun
- CORS ayarlarını kontrol edin
- Proxy yapılandırmasını doğrulayın

## 🚀 Geliştirme

### Yeni Özellik Ekleme
1. Backend'de API endpoint oluşturun
2. Frontend'de servis fonksiyonu yazın
3. UI bileşenini geliştirin
4. Test edin

### Veritabanı Değişiklikleri
```python
# SQLite otomatik olarak şema değişikliklerini uygular
from app.core.database import init_db
init_db()
```

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun
3. Değişikliklerinizi commit edin
4. Branch'inizi push edin
5. Pull Request oluşturun

## 📞 İletişim

Sorularınız için: [email@example.com](mailto:email@example.com)

---

⭐ Bu projeyi beğendiyseniz yıldız vermeyi unutmayın! 
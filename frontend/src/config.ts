// Frontend konfigürasyon ayarları

// Ubuntu sunucu IP'nizi buraya yazın
export const UBUNTU_SERVER_IP = process.env.REACT_APP_UBUNTU_SERVER_IP || '92.113.43.136';

// API ve WebSocket URL'leri
export const API_BASE_URL = `http://${UBUNTU_SERVER_IP}:8000/api/v1`;
export const WS_URL = `ws://${UBUNTU_SERVER_IP}:8000/ws`;

// Debug mode
export const DEBUG = process.env.NODE_ENV === 'development';

// Konfigürasyon kontrolü
if (UBUNTU_SERVER_IP === 'YOUR_UBUNTU_SERVER_IP') {
  console.warn('⚠️  Ubuntu sunucu IP adresi ayarlanmamış! frontend/src/config.ts dosyasını güncelleyin.');
}

export default {
  UBUNTU_SERVER_IP,
  API_BASE_URL,
  WS_URL,
  DEBUG
}; 
import sqlite3
import os

def add_manual_override_column():
    """SQLite veritabanına manual_override sütunu ekle"""
    
    db_path = "backend/mikrotik_devices.db"
    
    if not os.path.exists(db_path):
        print("❌ Veritabanı dosyası bulunamadı:", db_path)
        return False
    
    try:
        print('🔄 SQLite veritabanına bağlanılıyor...')
        connection = sqlite3.connect(db_path)
        print('✅ Veritabanı bağlantısı başarılı')
        
        cursor = connection.cursor()
        
        # Sütunun mevcut olup olmadığını kontrol et
        cursor.execute("PRAGMA table_info(mikrotik_devices)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'manual_override' not in columns:
            # manual_override sütunu ekle
            cursor.execute('''
                ALTER TABLE mikrotik_devices 
                ADD COLUMN manual_override BOOLEAN DEFAULT 0
            ''')
            connection.commit()
            print('✅ manual_override sütunu başarıyla eklendi')
        else:
            print('ℹ️  manual_override sütunu zaten mevcut')
            
        return True
            
    except sqlite3.Error as e:
        print(f'❌ SQLite Hatası: {e}')
        return False
    
    finally:
        if connection:
            connection.close()
            print('🔌 Veritabanı bağlantısı kapatıldı')

if __name__ == "__main__":
    add_manual_override_column() 
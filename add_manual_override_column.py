import pymysql

try:
    print('🔄 Connecting to database...')
    connection = pymysql.connect(
        host='dbmaster.trasst.com',
        port=3306,
        database='mikrotik',
        user='radius',
        password='Zkngnr81.'
    )
    print('✅ Connected to database')
    
    cursor = connection.cursor()
    
    # Check if column already exists
    cursor.execute("""
        SELECT COUNT(*) 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'mikrotik' 
        AND TABLE_NAME = 'mikrotik_devices' 
        AND COLUMN_NAME = 'manual_override'
    """)
    
    exists = cursor.fetchone()[0]
    
    if exists == 0:
        # Add manual_override column
        cursor.execute('ALTER TABLE mikrotik_devices ADD COLUMN manual_override BOOLEAN DEFAULT FALSE')
        connection.commit()
        print('✅ Successfully added manual_override column')
    else:
        print('ℹ️ manual_override column already exists')
            
except Exception as e:
    print(f'❌ Database Error: {e}')
    
finally:
    if connection:
        cursor.close()
        connection.close()
        print('🔌 Database connection closed') 
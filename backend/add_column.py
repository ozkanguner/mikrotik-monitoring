from app.core.database import engine
from sqlalchemy import text

try:
    print('🔄 Adding manual_override column...')
    
    with engine.connect() as connection:
        # Check if column exists
        result = connection.execute(text("""
            SELECT COUNT(*) 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'mikrotik' 
            AND TABLE_NAME = 'mikrotik_devices' 
            AND COLUMN_NAME = 'manual_override'
        """))
        
        exists = result.fetchone()[0]
        
        if exists == 0:
            # Add column
            connection.execute(text(
                'ALTER TABLE mikrotik_devices ADD COLUMN manual_override BOOLEAN DEFAULT FALSE'
            ))
            connection.commit()
            print('✅ Successfully added manual_override column')
        else:
            print('ℹ️ manual_override column already exists')
            
except Exception as e:
    print(f'❌ Error: {e}') 
import asyncio
import logging
import re
from typing import Dict, List, Optional, Any
from librouteros import connect
from librouteros.exceptions import TrapError, FatalError
from sqlalchemy.orm import Session
from ..models.mikrotik import MikrotikDevice, DeviceLog, DeviceInterface
from ..core.config import settings
from datetime import datetime
import json

logger = logging.getLogger(__name__)

def format_uptime(uptime_str: str) -> str:
    """
    MikroTik uptime formatını WinBox tarzı formata çevirir
    Örnek: "1w2d3h4m5s" -> "1 hafta 2 gün 3:04:05"
    """
    if not uptime_str or uptime_str == 'N/A':
        return 'N/A'
    
    try:
        # MikroTik uptime formatını parse et (1w2d3h4m5s)
        pattern = r'(?:(\d+)w)?(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?'
        match = re.match(pattern, uptime_str)
        
        if not match:
            return uptime_str  # Parse edilemezse orijinal formatı döndür
        
        weeks, days, hours, minutes, seconds = match.groups()
        
        # Convert to integers with default 0
        weeks = int(weeks) if weeks else 0
        days = int(days) if days else 0
        hours = int(hours) if hours else 0
        minutes = int(minutes) if minutes else 0
        seconds = int(seconds) if seconds else 0
        
        parts = []
        
        # Add weeks if present
        if weeks > 0:
            if weeks == 1:
                parts.append("1 hafta")
            else:
                parts.append(f"{weeks} hafta")
                
        # Add days if present
        if days > 0:
            if days == 1:
                parts.append("1 gün")
            else:
                parts.append(f"{days} gün")
        
        # Always show time as HH:MM:SS format
        time_str = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        
        if len(parts) == 0:
            if hours == 0 and minutes == 0 and seconds == 0:
                return "Az önce başlatıldı"
            else:
                return time_str
        else:
            parts.append(time_str)
            return " ".join(parts)
        
    except Exception:
        return uptime_str  # Hata durumunda orijinal formatı döndür

class MikrotikConnectionPool:
    def __init__(self, max_connections: int = 50):
        self.max_connections = max_connections
        self.connections: Dict[str, Any] = {}
        self.semaphore = asyncio.Semaphore(max_connections)
    
    async def get_connection(self, device: MikrotikDevice):
        """Get or create connection to MikroTik device"""
        device_key = f"{device.ip_address}:{device.port}"
        
        async with self.semaphore:
            if device_key not in self.connections:
                try:
                    connection = await asyncio.to_thread(
                        connect,
                        username=device.username,
                        password=device.password,
                        host=device.ip_address,
                        port=device.port,
                        timeout=settings.CONNECTION_TIMEOUT
                    )
                    self.connections[device_key] = connection
                    logger.info(f"Connected to {device.name} ({device.ip_address})")
                except Exception as e:
                    logger.error(f"Failed to connect to {device.name}: {str(e)}")
                    raise
            
            return self.connections[device_key]
    
    def close_connection(self, device: MikrotikDevice):
        """Close connection to device"""
        device_key = f"{device.ip_address}:{device.port}"
        if device_key in self.connections:
            try:
                self.connections[device_key].close()
                del self.connections[device_key]
                logger.info(f"Disconnected from {device.name}")
            except Exception as e:
                logger.error(f"Error closing connection to {device.name}: {str(e)}")
    
    def close_all(self):
        """Close all connections"""
        for device_key in list(self.connections.keys()):
            try:
                self.connections[device_key].close()
                del self.connections[device_key]
            except Exception as e:
                logger.error(f"Error closing connection {device_key}: {str(e)}")

# Global connection pool
connection_pool = MikrotikConnectionPool(settings.MAX_CONCURRENT_CONNECTIONS)

class MikrotikService:
    def __init__(self, db: Session):
        self.db = db
    
    def log_activity(self, device: MikrotikDevice, level: str, message: str, 
                    command: str = None, response: dict = None):
        """Log device activity"""
        log = DeviceLog(
            device_id=device.id,
            log_level=level,
            message=message,
            command=command,
            response=response,
            timestamp=datetime.utcnow()
        )
        self.db.add(log)
        self.db.commit()
    
    async def test_connection(self, device: MikrotikDevice) -> bool:
        """Test connection to MikroTik device"""
        try:
            connection = await connection_pool.get_connection(device)
            
            # Test with simple command
            result = await asyncio.to_thread(
                tuple, connection.path('system', 'identity')
            )
            
            device.is_online = True
            device.last_seen = datetime.utcnow()
            device.connection_attempts = 0
            device.last_error = None
            
            self.log_activity(device, "info", "Connection test successful")
            self.db.commit()
            
            return True
            
        except Exception as e:
            device.is_online = False
            device.connection_attempts += 1
            device.last_error = str(e)
            
            self.log_activity(device, "error", f"Connection failed: {str(e)}")
            self.db.commit()
            
            return False
    
    async def get_device_info(self, device: MikrotikDevice) -> dict:
        """Get device system information including CPU, RAM, and identity"""
        try:
            connection = await connection_pool.get_connection(device)
            
            # Get system resource info (CPU, RAM, etc.)
            resource = await asyncio.to_thread(
                list, connection.path('system', 'resource')
            )
            
            # Get device identity (name)
            identity = await asyncio.to_thread(
                list, connection.path('system', 'identity')
            )
            
            # Try to get routerboard info (hardware details)
            try:
                routerboard = await asyncio.to_thread(
                    list, connection.path('system', 'routerboard')
                )
            except Exception:
                # Some devices don't have routerboard command
                routerboard = []
            
            # Format the information
            resource_data = resource[0] if resource else {}
            identity_data = identity[0] if identity else {}
            routerboard_data = routerboard[0] if routerboard else {}
            
            # Extract key information
            cpu_info = {
                'cpu_count': resource_data.get('cpu-count', 'N/A'),
                'cpu_frequency': resource_data.get('cpu-frequency', 'N/A'),
                'cpu_load': resource_data.get('cpu-load', 'N/A'),
                'architecture': resource_data.get('architecture-name', 'N/A')
            }
            
            memory_info = {
                'total_memory': resource_data.get('total-memory', 'N/A'),
                'free_memory': resource_data.get('free-memory', 'N/A'),
                'total_hdd_space': resource_data.get('total-hdd-space', 'N/A'),
                'free_hdd_space': resource_data.get('free-hdd-space', 'N/A')
            }
            
            raw_uptime = resource_data.get('uptime', 'N/A')
            system_info = {
                'board_name': resource_data.get('board-name', 'N/A'),
                'platform': resource_data.get('platform', 'N/A'),
                'version': resource_data.get('version', 'N/A'),
                'build_time': resource_data.get('build-time', 'N/A'),
                'uptime': format_uptime(raw_uptime),  # Formatlanmış uptime
                'uptime_raw': raw_uptime  # Ham uptime (debugging için)
            }
            
            device_identity = {
                'name': identity_data.get('name', 'N/A')
            }
            
            hardware_info = {
                'model': routerboard_data.get('model', 'N/A'),
                'serial_number': routerboard_data.get('serial-number', 'N/A'),
                'firmware_type': routerboard_data.get('firmware-type', 'N/A'),
                'factory_firmware': routerboard_data.get('factory-firmware', 'N/A'),
                'current_firmware': routerboard_data.get('current-firmware', 'N/A')
            }
            
            info = {
                'cpu': cpu_info,
                'memory': memory_info,
                'system': system_info,
                'identity': device_identity,
                'hardware': hardware_info,
                'raw_data': {
                    'resource': resource_data,
                    'identity': identity_data,
                    'routerboard': routerboard_data
                }
            }
            
            # Update device database record (only if no manual override)
            # Bu, manuel güncelleme yapıldığında otomatik güncelleme tarafından ezilmemesini sağlar
            if not device.manual_override:
                current_model = hardware_info.get('model', '')
                current_board_name = system_info.get('board_name', '')
                current_version = system_info.get('version', '')
                current_architecture = cpu_info.get('architecture', '')
                current_build_time = system_info.get('build_time', '')
                
                # Otomatik güncelleme yap (sadece manuel override olmadığında)
                if current_model != 'N/A':
                    device.router_board = current_model
                elif current_board_name != 'N/A':
                    device.router_board = current_board_name
                
                if current_architecture != 'N/A':
                    device.architecture = current_architecture
                
                if current_version != 'N/A':
                    device.version = current_version
                
                if current_build_time != 'N/A':
                    device.build_time = current_build_time
            # Update real-time metrics
            device.cpu_load = cpu_info.get('cpu_load', 'N/A')
            raw_uptime = resource_data.get('uptime', 'N/A')  # Ham uptime verisi
            device.uptime = format_uptime(raw_uptime)  # Formatlanmış uptime
            device.last_seen = datetime.utcnow()
            device.is_online = True
            
            self.log_activity(device, "info", "Device system info retrieved", 
                            command="system info", response=info)
            self.db.commit()
            
            return info
            
        except Exception as e:
            self.log_activity(device, "error", f"Failed to get device info: {str(e)}")
            raise
    
    async def get_interfaces(self, device: MikrotikDevice) -> List[dict]:
        """Get device interfaces"""
        try:
            connection = await connection_pool.get_connection(device)
            
            interfaces = await asyncio.to_thread(
                tuple, connection.path('interface')
            )
            
            # Update database
            for iface_data in interfaces:
                iface = self.db.query(DeviceInterface).filter_by(
                    device_id=device.id,
                    name=iface_data.get('name')
                ).first()
                
                if not iface:
                    iface = DeviceInterface(
                        device_id=device.id,
                        name=iface_data.get('name'),
                        type=iface_data.get('type'),
                        mac_address=iface_data.get('mac-address'),
                        running=iface_data.get('running') == 'true',
                        disabled=iface_data.get('disabled') == 'true'
                    )
                    self.db.add(iface)
                else:
                    iface.type = iface_data.get('type')
                    iface.mac_address = iface_data.get('mac-address')
                    iface.running = iface_data.get('running') == 'true'
                    iface.disabled = iface_data.get('disabled') == 'true'
                    iface.last_updated = datetime.utcnow()
            
            self.db.commit()
            
            self.log_activity(device, "info", f"Retrieved {len(interfaces)} interfaces")
            
            return interfaces
            
        except Exception as e:
            self.log_activity(device, "error", f"Failed to get interfaces: {str(e)}")
            raise
    
    async def execute_command(self, device: MikrotikDevice, command_path: str, 
                            params: dict = None) -> dict:
        """Execute command on MikroTik device"""
        try:
            connection = await connection_pool.get_connection(device)
            
            # Parse command path
            path_parts = command_path.split('.')
            cmd_path = connection.path(*path_parts)
            
            # Execute command
            if params:
                result = await asyncio.to_thread(tuple, cmd_path.where(**params))
            else:
                result = await asyncio.to_thread(tuple, cmd_path)
            
            self.log_activity(device, "info", f"Command executed: {command_path}",
                            command=command_path, response=result)
            
            return {"success": True, "data": result}
            
        except Exception as e:
            error_msg = f"Command failed: {str(e)}"
            self.log_activity(device, "error", error_msg, command=command_path)
            return {"success": False, "error": error_msg}
    
    async def reboot_device(self, device: MikrotikDevice) -> dict:
        """Reboot MikroTik device"""
        try:
            connection = await connection_pool.get_connection(device)
            
            # Execute reboot command
            await asyncio.to_thread(
                connection.path('system', 'reboot').call
            )
            
            # Close connection as device will reboot
            connection_pool.close_connection(device)
            
            self.log_activity(device, "info", "Device reboot initiated")
            
            return {"success": True, "message": "Reboot command sent"}
            
        except Exception as e:
            error_msg = f"Reboot failed: {str(e)}"
            self.log_activity(device, "error", error_msg)
            return {"success": False, "error": error_msg} 
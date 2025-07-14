from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any, TYPE_CHECKING
from datetime import datetime
import ipaddress

if TYPE_CHECKING:
    from . import Group, Subnet

class CredentialBase(BaseModel):
    name: str = Field(..., description="Display name for credential")
    username: str = Field(..., description="Username")
    password: str = Field(..., description="Password")
    description: Optional[str] = Field(None, description="Description")
    is_default: bool = Field(False, description="Is default credential")

class CredentialCreate(CredentialBase):
    pass

class CredentialUpdate(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    description: Optional[str] = None
    is_default: Optional[bool] = None

class Credential(CredentialBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class SubnetBase(BaseModel):
    name: str = Field(..., description="Display name for subnet")
    network: str = Field(..., description="Network IP address")
    cidr: int = Field(..., ge=1, le=32, description="CIDR notation")
    is_active: bool = Field(True, description="Is subnet active")

class SubnetCreate(SubnetBase):
    pass

class SubnetUpdate(BaseModel):
    name: Optional[str] = None
    network: Optional[str] = None
    cidr: Optional[int] = Field(None, ge=1, le=32)
    is_active: Optional[bool] = None

class Subnet(SubnetBase):
    id: int
    created_at: datetime
    updated_at: datetime
    groups: Optional[List[Dict[str, Any]]] = None
    
    @property
    def network_info(self) -> Dict[str, Any]:
        """Calculate network information"""
        try:
            network = ipaddress.IPv4Network(f"{self.network}/{self.cidr}", strict=False)
            return {
                "first_ip": str(network.network_address),
                "last_ip": str(network.broadcast_address),
                "total_ips": int(network.num_addresses),
                "usable_ips": int(network.num_addresses) - 2 if network.num_addresses > 2 else 0,
                "network_address": str(network.network_address),
                "broadcast_address": str(network.broadcast_address),
                "netmask": str(network.netmask)
            }
        except:
            return {
                "first_ip": "Invalid",
                "last_ip": "Invalid", 
                "total_ips": 0,
                "usable_ips": 0,
                "network_address": "Invalid",
                "broadcast_address": "Invalid",
                "netmask": "Invalid"
            }
    
    class Config:
        from_attributes = True

class GroupBase(BaseModel):
    name: str = Field(..., description="Display name for group")
    description: Optional[str] = Field(None, description="Group description")
    color: str = Field("#1976d2", description="Hex color code for UI")
    is_active: bool = Field(True, description="Is group active")

class GroupCreate(GroupBase):
    pass

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None

class Group(GroupBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class MikrotikDeviceBase(BaseModel):
    name: str = Field(..., description="Device name")
    ip_address: str = Field(..., description="IP address")
    port: int = Field(8728, description="RouterOS API port")
    username: str = Field(..., description="Username")
    password: str = Field(..., description="Password")
    group_id: Optional[int] = Field(None, description="Group ID")
    group_name: str = Field("default", description="Group name")
    location: Optional[str] = Field(None, description="Location")
    description: Optional[str] = Field(None, description="Description")
    router_board: Optional[str] = Field(None, description="Router board model")
    
    @validator('ip_address')
    def validate_ip(cls, v):
        import ipaddress
        try:
            ipaddress.ip_address(v)
        except ValueError:
            raise ValueError('Invalid IP address format')
        return v
    
    @validator('port')
    def validate_port(cls, v):
        if not (1 <= v <= 65535):
            raise ValueError('Port must be between 1 and 65535')
        return v

class MikrotikDeviceCreate(MikrotikDeviceBase):
    pass

class MikrotikDeviceUpdate(BaseModel):
    name: Optional[str] = None
    ip_address: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None
    group_id: Optional[int] = None
    group_name: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    router_board: Optional[str] = None
    manual_override: Optional[bool] = None

class MikrotikDevice(MikrotikDeviceBase):
    id: int
    router_board: Optional[str] = None
    architecture: Optional[str] = None
    version: Optional[str] = None
    build_time: Optional[str] = None
    manual_override: Optional[bool] = False
    is_online: bool = False
    last_seen: Optional[datetime] = None
    connection_attempts: int = 0
    last_error: Optional[str] = None
    cpu_load: Optional[str] = None
    uptime: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class DeviceInterface(BaseModel):
    id: int
    device_id: int
    name: str
    type: Optional[str] = None
    mac_address: Optional[str] = None
    running: bool = False
    disabled: bool = False
    rx_bytes: int = 0
    tx_bytes: int = 0
    rx_packets: int = 0
    tx_packets: int = 0
    last_updated: datetime
    
    class Config:
        from_attributes = True

class DeviceLog(BaseModel):
    id: int
    device_id: int
    log_level: str
    message: str
    command: Optional[str] = None
    response: Optional[Dict[str, Any]] = None
    timestamp: datetime
    
    class Config:
        from_attributes = True

class DeviceCommand(BaseModel):
    id: int
    device_id: int
    command: str
    status: str
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class DeviceCommandCreate(BaseModel):
    device_id: int
    command: str
    user_id: Optional[str] = None
    user_name: Optional[str] = None

class ConnectionTestResult(BaseModel):
    success: bool
    message: str
    device_info: Optional[Dict[str, Any]] = None

class BulkOperationResult(BaseModel):
    success_count: int
    failed_count: int
    total_count: int
    results: List[Dict[str, Any]]

class HighCpuDevice(BaseModel):
    id: int
    name: str
    ip_address: str
    cpu_load: str
    group_name: str
    is_online: bool
    last_seen: Optional[datetime] = None

    class Config:
        from_attributes = True

class DeviceStats(BaseModel):
    total_devices: int
    online_devices: int
    offline_devices: int
    groups: Dict[str, int]
    recent_logs: List[DeviceLog]
    high_cpu_devices: List[HighCpuDevice]

 
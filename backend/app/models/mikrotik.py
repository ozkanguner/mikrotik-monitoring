from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, JSON, ForeignKey, Table
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base

# Association table for Group-Subnet many-to-many relationship
group_subnets = Table(
    'group_subnets',
    Base.metadata,
    Column('group_id', Integer, ForeignKey('groups.id'), primary_key=True),
    Column('subnet_id', Integer, ForeignKey('subnets.id'), primary_key=True)
)

class Credential(Base):
    __tablename__ = "credentials"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True, index=True)  # Display name like "Default Admin", "Guest User"
    username = Column(String(255), nullable=False)
    password = Column(String(255), nullable=False)
    description = Column(Text)
    is_default = Column(Boolean, default=False)  # Default credential to use
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Subnet(Base):
    __tablename__ = "subnets"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True, index=True)  # Display name like "Ofis Ağı", "DMZ"
    network = Column(String(15), nullable=False)  # Network IP like "192.168.1.0"
    cidr = Column(Integer, nullable=False)  # CIDR notation like 24
    is_active = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    groups = relationship("Group", secondary=group_subnets, back_populates="subnets")

class Group(Base):
    __tablename__ = "groups"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True, index=True)  # Display name like "Ofis Cihazları", "Güvenlik Kameraları"
    description = Column(Text)
    color = Column(String(7), default="#1976d2")  # Hex color code for UI
    is_active = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    subnets = relationship("Subnet", secondary=group_subnets, back_populates="groups")

class MikrotikDevice(Base):
    __tablename__ = "mikrotik_devices"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    ip_address = Column(String(45), nullable=False, unique=True, index=True)
    port = Column(Integer, default=8728)
    username = Column(String(255), nullable=False)
    password = Column(String(255), nullable=False)
    credential_id = Column(Integer, ForeignKey("credentials.id"), nullable=True)  # Reference to credential
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)  # Reference to group
    
    # Device Info
    router_board = Column(String(255))
    architecture = Column(String(100))
    version = Column(String(100))
    build_time = Column(String(100))
    manual_override = Column(Boolean, default=False)  # Manuel güncelleme flag'i
    
    # Connection Status
    is_online = Column(Boolean, default=False)
    last_seen = Column(DateTime, default=datetime.utcnow)
    connection_attempts = Column(Integer, default=0)
    last_error = Column(Text)
    
    # Real-time metrics
    cpu_load = Column(String(10))  # CPU kullanım yüzdesi
    uptime = Column(String(100))   # Uptime süresi
    
    # Grouping
    group_name = Column(String(255), default="default")
    location = Column(String(255))
    description = Column(Text)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    logs = relationship("DeviceLog", back_populates="device")
    interfaces = relationship("DeviceInterface", back_populates="device")
    credential = relationship("Credential")
    group = relationship("Group")

class DeviceLog(Base):
    __tablename__ = "device_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("mikrotik_devices.id"))
    log_level = Column(String(50))  # info, warning, error, debug
    message = Column(Text)
    command = Column(Text)
    response = Column(JSON)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    device = relationship("MikrotikDevice", back_populates="logs")

class DeviceInterface(Base):
    __tablename__ = "device_interfaces"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("mikrotik_devices.id"))
    name = Column(String(255))
    type = Column(String(100))
    mac_address = Column(String(17))
    running = Column(Boolean, default=False)
    disabled = Column(Boolean, default=False)
    
    # Stats
    rx_bytes = Column(Integer, default=0)
    tx_bytes = Column(Integer, default=0)
    rx_packets = Column(Integer, default=0)
    tx_packets = Column(Integer, default=0)
    
    # Metadata
    last_updated = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    device = relationship("MikrotikDevice", back_populates="interfaces")

class DeviceCommand(Base):
    __tablename__ = "device_commands"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("mikrotik_devices.id"))
    command = Column(Text, nullable=False)
    status = Column(String(50), default="pending")  # pending, running, completed, failed
    result = Column(JSON)
    error_message = Column(Text)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    # User info
    user_id = Column(String(255))
    user_name = Column(String(255)) 
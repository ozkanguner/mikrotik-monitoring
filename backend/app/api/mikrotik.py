from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from ..core.database import get_db
from ..models.mikrotik import MikrotikDevice, DeviceLog, DeviceInterface, DeviceCommand, Credential, Subnet, Group
from ..schemas.mikrotik import (
    MikrotikDevice as MikrotikDeviceSchema,
    MikrotikDeviceCreate,
    MikrotikDeviceUpdate,
    DeviceInterface as DeviceInterfaceSchema,
    DeviceLog as DeviceLogSchema,
    DeviceCommand as DeviceCommandSchema,
    DeviceCommandCreate,
    ConnectionTestResult,
    BulkOperationResult,
    DeviceStats,
    HighCpuDevice,
    Credential as CredentialSchema,
    CredentialCreate,
    CredentialUpdate,
    Subnet as SubnetSchema,
    SubnetCreate,
    SubnetUpdate,
    Group as GroupSchema,
    GroupCreate,
    GroupUpdate
)
from ..services.mikrotik_service import MikrotikService
import asyncio
from datetime import datetime, timedelta

router = APIRouter(prefix="/mikrotik", tags=["mikrotik"])

# Credential endpoints
@router.get("/credentials", response_model=List[CredentialSchema])
async def get_credentials(db: Session = Depends(get_db)):
    """Get all saved credentials"""
    credentials = db.query(Credential).all()
    return credentials

@router.get("/credentials/{credential_id}", response_model=CredentialSchema)
async def get_credential(credential_id: int, db: Session = Depends(get_db)):
    """Get specific credential"""
    credential = db.query(Credential).filter(Credential.id == credential_id).first()
    if not credential:
        raise HTTPException(status_code=404, detail="Credential not found")
    return credential

@router.post("/credentials", response_model=CredentialSchema)
async def create_credential(credential: CredentialCreate, db: Session = Depends(get_db)):
    """Create new credential"""
    # Check if name already exists
    existing = db.query(Credential).filter(Credential.name == credential.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Credential with this name already exists")
    
    # If this is set as default, remove default from others
    if credential.is_default:
        db.query(Credential).update({"is_default": False})
        db.commit()
    
    db_credential = Credential(**credential.dict())
    db.add(db_credential)
    db.commit()
    db.refresh(db_credential)
    return db_credential

@router.put("/credentials/{credential_id}", response_model=CredentialSchema)
async def update_credential(
    credential_id: int, 
    credential: CredentialUpdate, 
    db: Session = Depends(get_db)
):
    """Update credential"""
    db_credential = db.query(Credential).filter(Credential.id == credential_id).first()
    if not db_credential:
        raise HTTPException(status_code=404, detail="Credential not found")
    
    # Check if name already exists (if name is being updated)
    if credential.name and credential.name != db_credential.name:
        existing = db.query(Credential).filter(Credential.name == credential.name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Credential with this name already exists")
    
    # If this is set as default, remove default from others
    if credential.is_default:
        db.query(Credential).update({"is_default": False})
        db.commit()
    
    for field, value in credential.dict(exclude_unset=True).items():
        setattr(db_credential, field, value)
    
    db_credential.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_credential)
    return db_credential

@router.delete("/credentials/{credential_id}")
async def delete_credential(credential_id: int, db: Session = Depends(get_db)):
    """Delete credential"""
    db_credential = db.query(Credential).filter(Credential.id == credential_id).first()
    if not db_credential:
        raise HTTPException(status_code=404, detail="Credential not found")
    
    # Check if credential is being used by devices
    devices_using = db.query(MikrotikDevice).filter(MikrotikDevice.credential_id == credential_id).count()
    if devices_using > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete credential. It is being used by {devices_using} device(s)"
        )
    
    db.delete(db_credential)
    db.commit()
    return {"detail": "Credential deleted successfully"}

@router.get("/devices", response_model=List[MikrotikDeviceSchema])
async def get_devices(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    group_name: Optional[str] = Query(None),
    is_online: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get MikroTik devices with filtering and pagination"""
    query = db.query(MikrotikDevice)
    
    if group_name:
        query = query.filter(MikrotikDevice.group_name == group_name)
    
    if is_online is not None:
        query = query.filter(MikrotikDevice.is_online == is_online)
    
    if search:
        query = query.filter(
            MikrotikDevice.name.contains(search) |
            MikrotikDevice.ip_address.contains(search) |
            MikrotikDevice.location.contains(search)
        )
    
    devices = query.offset(skip).limit(limit).all()
    return devices

@router.get("/devices/{device_id}", response_model=MikrotikDeviceSchema)
async def get_device(device_id: int, db: Session = Depends(get_db)):
    """Get specific MikroTik device"""
    device = db.query(MikrotikDevice).filter(MikrotikDevice.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device

@router.post("/devices", response_model=MikrotikDeviceSchema)
async def create_device(device: MikrotikDeviceCreate, db: Session = Depends(get_db)):
    """Create new MikroTik device"""
    # Check if IP already exists
    existing = db.query(MikrotikDevice).filter(
        MikrotikDevice.ip_address == device.ip_address
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Device with this IP already exists")
    
    db_device = MikrotikDevice(**device.dict())
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device

@router.put("/devices/{device_id}", response_model=MikrotikDeviceSchema)
async def update_device(
    device_id: int,
    device_update: MikrotikDeviceUpdate,
    db: Session = Depends(get_db)
):
    """Update MikroTik device"""
    device = db.query(MikrotikDevice).filter(MikrotikDevice.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Check IP uniqueness if IP is being updated
    if device_update.ip_address and device_update.ip_address != device.ip_address:
        existing = db.query(MikrotikDevice).filter(
            MikrotikDevice.ip_address == device_update.ip_address,
            MikrotikDevice.id != device_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Device with this IP already exists")
    
    # Update fields
    update_data = device_update.dict(exclude_unset=True)
    
    # Eğer router_board, version veya architecture güncellendi ise manuel override flag'ini set et
    if any(field in update_data for field in ['router_board', 'version', 'architecture']):
        device.manual_override = True
    
    for field, value in update_data.items():
        setattr(device, field, value)
    
    device.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(device)
    return device

@router.delete("/devices/{device_id}")
async def delete_device(device_id: int, db: Session = Depends(get_db)):
    """Delete MikroTik device"""
    device = db.query(MikrotikDevice).filter(MikrotikDevice.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    db.delete(device)
    db.commit()
    return {"message": "Device deleted successfully"}

@router.post("/devices/{device_id}/test-connection", response_model=ConnectionTestResult)
async def test_connection(device_id: int, db: Session = Depends(get_db)):
    """Test connection to MikroTik device"""
    device = db.query(MikrotikDevice).filter(MikrotikDevice.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    service = MikrotikService(db)
    success = await service.test_connection(device)
    
    if success:
        return ConnectionTestResult(
            success=True,
            message="Connection successful",
            device_info=None
        )
    else:
        return ConnectionTestResult(
            success=False,
            message=f"Connection failed: {device.last_error}"
        )

@router.post("/devices/bulk-test", response_model=BulkOperationResult)
async def bulk_test_connections(
    device_ids: List[int],
    db: Session = Depends(get_db)
):
    """Test connections to multiple devices"""
    devices = db.query(MikrotikDevice).filter(MikrotikDevice.id.in_(device_ids)).all()
    
    if len(devices) != len(device_ids):
        raise HTTPException(status_code=400, detail="Some devices not found")
    
    service = MikrotikService(db)
    results = []
    success_count = 0
    
    # Use asyncio.gather for parallel testing
    tasks = []
    for device in devices:
        tasks.append(service.test_connection(device))
    
    test_results = await asyncio.gather(*tasks, return_exceptions=True)
    
    for device, result in zip(devices, test_results):
        if isinstance(result, Exception):
            results.append({
                "device_id": device.id,
                "device_name": device.name,
                "success": False,
                "error": str(result)
            })
        else:
            success_count += 1 if result else 0
            results.append({
                "device_id": device.id,
                "device_name": device.name,
                "success": result,
                "error": device.last_error if not result else None
            })
    
    return BulkOperationResult(
        success_count=success_count,
        failed_count=len(device_ids) - success_count,
        total_count=len(device_ids),
        results=results
    )

@router.get("/devices/{device_id}/interfaces", response_model=List[DeviceInterfaceSchema])
async def get_device_interfaces(device_id: int, db: Session = Depends(get_db)):
    """Get device interfaces"""
    device = db.query(MikrotikDevice).filter(MikrotikDevice.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    service = MikrotikService(db)
    try:
        interfaces = await service.get_interfaces(device)
        # Return from database
        db_interfaces = db.query(DeviceInterface).filter(
            DeviceInterface.device_id == device_id
        ).all()
        return db_interfaces
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get interfaces: {str(e)}")

@router.get("/devices/{device_id}/logs", response_model=List[DeviceLogSchema])
async def get_device_logs(
    device_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    level: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get device logs"""
    device = db.query(MikrotikDevice).filter(MikrotikDevice.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    query = db.query(DeviceLog).filter(DeviceLog.device_id == device_id)
    
    if level:
        query = query.filter(DeviceLog.log_level == level)
    
    logs = query.order_by(DeviceLog.timestamp.desc()).offset(skip).limit(limit).all()
    return logs

@router.post("/devices/{device_id}/execute", response_model=DeviceCommandSchema)
async def execute_command(
    device_id: int,
    command: DeviceCommandCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Execute command on MikroTik device"""
    device = db.query(MikrotikDevice).filter(MikrotikDevice.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Create command record
    db_command = DeviceCommand(
        device_id=device_id,
        command=command.command,
        user_id=command.user_id,
        user_name=command.user_name,
        status="pending"
    )
    db.add(db_command)
    db.commit()
    db.refresh(db_command)
    
    # Execute command in background
    background_tasks.add_task(execute_command_task, db_command.id)
    
    return db_command

async def execute_command_task(command_id: int):
    """Background task to execute command"""
    from ..core.database import SessionLocal
    db = SessionLocal()
    
    try:
        command = db.query(DeviceCommand).filter(DeviceCommand.id == command_id).first()
        if not command:
            return
        
        device = db.query(MikrotikDevice).filter(MikrotikDevice.id == command.device_id).first()
        if not device:
            return
        
        service = MikrotikService(db)
        
        command.status = "running"
        command.started_at = datetime.utcnow()
        db.commit()
        
        try:
            result = await service.execute_command(device, command.command)
            command.result = result
            command.status = "completed"
        except Exception as e:
            command.error_message = str(e)
            command.status = "failed"
        
        command.completed_at = datetime.utcnow()
        db.commit()
        
    finally:
        db.close()

@router.get("/devices/{device_id}/reboot")
async def reboot_device(device_id: int, db: Session = Depends(get_db)):
    """Reboot MikroTik device"""
    device = db.query(MikrotikDevice).filter(MikrotikDevice.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    service = MikrotikService(db)
    result = await service.reboot_device(device)
    
    if result["success"]:
        return {"message": "Reboot command sent successfully"}
    else:
        raise HTTPException(status_code=500, detail=result["error"])

@router.get("/devices/{device_id}/system-info")
async def get_device_system_info(device_id: int, db: Session = Depends(get_db)):
    """Get device system information including CPU, RAM, and identity"""
    device = db.query(MikrotikDevice).filter(MikrotikDevice.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    service = MikrotikService(db)
    try:
        system_info = await service.get_device_info(device)
        return {
            "device_id": device_id,
            "device_name": device.name,
            "system_info": system_info,
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get system info: {str(e)}")

@router.get("/stats", response_model=DeviceStats)
async def get_device_stats(db: Session = Depends(get_db)):
    """Get device statistics"""
    total_devices = db.query(MikrotikDevice).count()
    online_devices = db.query(MikrotikDevice).filter(MikrotikDevice.is_online == True).count()
    offline_devices = total_devices - online_devices
    
    # Group statistics
    groups = {}
    group_data = db.query(MikrotikDevice.group_name).all()
    for group in group_data:
        groups[group[0]] = groups.get(group[0], 0) + 1
    
    # Recent logs
    recent_logs = db.query(DeviceLog).order_by(
        DeviceLog.timestamp.desc()
    ).limit(10).all()
    
    # High CPU devices - CPU load'u sayısal olarak sıralayabilmek için çevirip sıralama
    def parse_cpu_load(cpu_str):
        """CPU load string'ini sayısal değere çevirir"""
        if not cpu_str or cpu_str == 'N/A':
            return 0
        try:
            # '%' karakterini kaldır ve sayıya çevir
            return float(cpu_str.replace('%', ''))
        except:
            return 0
    
    # Online olan ve CPU load'u olan cihazları al
    high_cpu_candidates = db.query(MikrotikDevice).filter(
        MikrotikDevice.is_online == True,
        MikrotikDevice.cpu_load.isnot(None),
        MikrotikDevice.cpu_load != 'N/A',
        MikrotikDevice.cpu_load != ''
    ).all()
    
    # CPU load'a göre sırala ve top 10'u al
    high_cpu_devices = sorted(
        high_cpu_candidates,
        key=lambda device: parse_cpu_load(device.cpu_load),
        reverse=True
    )[:10]
    
    return DeviceStats(
        total_devices=total_devices,
        online_devices=online_devices,
        offline_devices=offline_devices,
        groups=groups,
        recent_logs=recent_logs,
        high_cpu_devices=high_cpu_devices
    )

# Subnet endpoints
@router.get("/subnets")
async def get_subnets(db: Session = Depends(get_db)):
    """Get all saved subnets with their group information"""
    subnets = db.query(Subnet).filter(Subnet.is_active == True).all()
    
    # Create response with group information
    result = []
    for subnet in subnets:
        subnet_data = {
            "id": subnet.id,
            "name": subnet.name,
            "network": subnet.network,
            "cidr": subnet.cidr,
            "is_active": subnet.is_active,
            "created_at": subnet.created_at,
            "updated_at": subnet.updated_at,
            "groups": [
                {
                    "id": group.id,
                    "name": group.name,
                    "color": group.color,
                    "is_active": group.is_active
                }
                for group in subnet.groups
            ]
        }
        result.append(subnet_data)
    
    return result

@router.get("/subnets/{subnet_id}", response_model=SubnetSchema)
async def get_subnet(subnet_id: int, db: Session = Depends(get_db)):
    """Get specific subnet"""
    subnet = db.query(Subnet).filter(Subnet.id == subnet_id).first()
    if not subnet:
        raise HTTPException(status_code=404, detail="Subnet not found")
    return subnet

@router.post("/subnets", response_model=SubnetSchema)
async def create_subnet(subnet: SubnetCreate, db: Session = Depends(get_db)):
    """Create new subnet"""
    # Check if name already exists
    existing = db.query(Subnet).filter(Subnet.name == subnet.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Subnet with this name already exists")
    
    # Check if network/CIDR combination already exists
    existing_network = db.query(Subnet).filter(
        Subnet.network == subnet.network,
        Subnet.cidr == subnet.cidr
    ).first()
    if existing_network:
        raise HTTPException(status_code=400, detail="Subnet with this network/CIDR already exists")
    
    db_subnet = Subnet(**subnet.dict())
    db.add(db_subnet)
    db.commit()
    db.refresh(db_subnet)
    return db_subnet

@router.put("/subnets/{subnet_id}", response_model=SubnetSchema)
async def update_subnet(
    subnet_id: int, 
    subnet: SubnetUpdate, 
    db: Session = Depends(get_db)
):
    """Update subnet"""
    db_subnet = db.query(Subnet).filter(Subnet.id == subnet_id).first()
    if not db_subnet:
        raise HTTPException(status_code=404, detail="Subnet not found")
    
    # Check if name already exists (if name is being updated)
    if subnet.name and subnet.name != db_subnet.name:
        existing = db.query(Subnet).filter(Subnet.name == subnet.name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Subnet with this name already exists")
    
    # Check if network/CIDR combination already exists (if being updated)
    if (subnet.network or subnet.cidr) and (subnet.network != db_subnet.network or subnet.cidr != db_subnet.cidr):
        network = subnet.network or db_subnet.network
        cidr = subnet.cidr or db_subnet.cidr
        existing_network = db.query(Subnet).filter(
            Subnet.network == network,
            Subnet.cidr == cidr,
            Subnet.id != subnet_id
        ).first()
        if existing_network:
            raise HTTPException(status_code=400, detail="Subnet with this network/CIDR already exists")
    
    for field, value in subnet.dict(exclude_unset=True).items():
        setattr(db_subnet, field, value)
    
    db_subnet.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_subnet)
    return db_subnet

@router.delete("/subnets/{subnet_id}")
async def delete_subnet(subnet_id: int, db: Session = Depends(get_db)):
    """Delete subnet"""
    db_subnet = db.query(Subnet).filter(Subnet.id == subnet_id).first()
    if not db_subnet:
        raise HTTPException(status_code=404, detail="Subnet not found")
    
    db.delete(db_subnet)
    db.commit()
    return {"detail": "Subnet deleted successfully"}

@router.get("/subnets/{subnet_id}/available-ips")
async def get_available_ips(subnet_id: int, db: Session = Depends(get_db)):
    """Get available IP addresses in subnet"""
    subnet = db.query(Subnet).filter(Subnet.id == subnet_id).first()
    if not subnet:
        raise HTTPException(status_code=404, detail="Subnet not found")
    
    import ipaddress
    
    try:
        # Create network object
        network = ipaddress.IPv4Network(f"{subnet.network}/{subnet.cidr}", strict=False)
        
        # Get used IPs from devices
        used_ips = set()
        devices = db.query(MikrotikDevice.ip_address).all()
        for device in devices:
            if device[0] and ipaddress.IPv4Address(device[0]) in network:
                used_ips.add(device[0])
        
        # Generate available IPs in range (exclude network and broadcast addresses)
        available_ips = []
        start = network.network_address + 1
        end = network.broadcast_address - 1
        
        current = start
        while current <= end and len(available_ips) < 50:  # Limit to 50 IPs
            if str(current) not in used_ips:
                available_ips.append(str(current))
            current += 1
        
        return {
            "subnet_id": subnet_id,
            "subnet_name": subnet.name,
            "network": f"{subnet.network}/{subnet.cidr}",
            "available_ips": available_ips,
            "total_available": len(available_ips)
        }
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid subnet configuration: {str(e)}")

# Group endpoints
@router.get("/groups", response_model=List[GroupSchema])
async def get_groups(db: Session = Depends(get_db)):
    """Get all groups"""
    groups = db.query(Group).all()
    return groups

@router.get("/groups/{group_id}", response_model=GroupSchema)
async def get_group(group_id: int, db: Session = Depends(get_db)):
    """Get specific group"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group

@router.post("/groups", response_model=GroupSchema)
async def create_group(group: GroupCreate, db: Session = Depends(get_db)):
    """Create new group"""
    # Check if name already exists
    existing = db.query(Group).filter(Group.name == group.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Group with this name already exists")
    
    # Create new group
    db_group = Group(
        name=group.name,
        description=group.description,
        color=group.color,
        is_active=group.is_active
    )
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return db_group

@router.put("/groups/{group_id}", response_model=GroupSchema)
async def update_group(
    group_id: int, 
    group: GroupUpdate, 
    db: Session = Depends(get_db)
):
    """Update group"""
    db_group = db.query(Group).filter(Group.id == group_id).first()
    if not db_group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if name already exists (but allow same name for current group)
    if group.name and group.name != db_group.name:
        existing = db.query(Group).filter(Group.name == group.name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Group with this name already exists")
    
    # Update group
    update_data = group.dict(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(db_group, field):
            setattr(db_group, field, value)
    
    db_group.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_group)
    return db_group

@router.delete("/groups/{group_id}")
async def delete_group(group_id: int, db: Session = Depends(get_db)):
    """Delete group"""
    db_group = db.query(Group).filter(Group.id == group_id).first()
    if not db_group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if any devices are using this group
    devices_using_group = db.query(MikrotikDevice).filter(MikrotikDevice.group_id == group_id).count()
    if devices_using_group > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete group. {devices_using_group} devices are using this group"
        )
    
    db.delete(db_group)
    db.commit()
    return {"message": "Group deleted successfully"}

# Group-Subnet management endpoints
@router.get("/groups/{group_id}/subnets")
async def get_group_subnets(group_id: int, db: Session = Depends(get_db)):
    """Get all subnets assigned to a group"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Convert to simple dict to avoid circular reference
    result = []
    for subnet in group.subnets:
        result.append({
            "id": subnet.id,
            "name": subnet.name,
            "network": subnet.network,
            "cidr": subnet.cidr,
            "is_active": subnet.is_active,
            "created_at": subnet.created_at,
            "updated_at": subnet.updated_at
        })
    
    return result

@router.post("/groups/{group_id}/subnets/{subnet_id}")
async def add_subnet_to_group(group_id: int, subnet_id: int, db: Session = Depends(get_db)):
    """Add a subnet to a group"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    subnet = db.query(Subnet).filter(Subnet.id == subnet_id).first()
    if not subnet:
        raise HTTPException(status_code=404, detail="Subnet not found")
    
    # Check if association already exists
    if subnet in group.subnets:
        raise HTTPException(status_code=400, detail="Subnet is already assigned to this group")
    
    group.subnets.append(subnet)
    db.commit()
    return {"message": "Subnet added to group successfully"}

@router.delete("/groups/{group_id}/subnets/{subnet_id}")
async def remove_subnet_from_group(group_id: int, subnet_id: int, db: Session = Depends(get_db)):
    """Remove a subnet from a group"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    subnet = db.query(Subnet).filter(Subnet.id == subnet_id).first()
    if not subnet:
        raise HTTPException(status_code=404, detail="Subnet not found")
    
    # Check if association exists
    if subnet not in group.subnets:
        raise HTTPException(status_code=400, detail="Subnet is not assigned to this group")
    
    group.subnets.remove(subnet)
    db.commit()
    return {"message": "Subnet removed from group successfully"}

@router.get("/subnets/{subnet_id}/groups", response_model=List[GroupSchema])
async def get_subnet_groups(subnet_id: int, db: Session = Depends(get_db)):
    """Get all groups that a subnet is assigned to"""
    subnet = db.query(Subnet).filter(Subnet.id == subnet_id).first()
    if not subnet:
        raise HTTPException(status_code=404, detail="Subnet not found")
    
    return subnet.groups

@router.post("/groups/{group_id}/scan")
async def scan_group_subnets(group_id: int, db: Session = Depends(get_db)):
    """Scan all subnets in a group for devices"""
    import ipaddress
    import asyncio
    import socket
    from concurrent.futures import ThreadPoolExecutor
    
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Get all subnets in this group
    subnets = group.subnets
    if not subnets:
        return {"scanned_devices": [], "group_id": group_id, "group_name": group.name}
    
    def ping_host(ip_str):
        """Ping a single host"""
        try:
            # Test multiple ports for device detection
            ports_to_test = [
                (22, "ssh"),      # SSH
                (8728, "api"),    # MikroTik API
                (8729, "api-ssl"), # MikroTik API over TLS
                (80, "http"),     # HTTP
                (443, "https"),   # HTTPS
                (23, "telnet"),   # Telnet
                (21, "ftp"),      # FTP
                (53, "dns"),      # DNS
            ]
            
            for port, method in ports_to_test:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(0.3)  # 300ms timeout per port
                result = sock.connect_ex((ip_str, port))
                sock.close()
                
                if result == 0:
                    return {"ip": ip_str, "reachable": True, "method": method, "port": port}
                
            return {"ip": ip_str, "reachable": False, "method": "none", "port": None}
        except Exception:
            return {"ip": ip_str, "reachable": False, "method": "error", "port": None}
    
    scanned_devices = []
    
    for subnet in subnets:
        try:
            # Create network object
            network = ipaddress.IPv4Network(f"{subnet.network}/{subnet.cidr}", strict=False)
            
            # Limit scan to reasonable size (max 254 IPs)
            if network.num_addresses > 254:
                # For large networks, scan only first 254 IPs
                host_ips = [str(ip) for ip in list(network.hosts())[:254]]
            else:
                host_ips = [str(ip) for ip in network.hosts()]
            
            # Parallel ping with ThreadPoolExecutor
            with ThreadPoolExecutor(max_workers=50) as executor:
                results = list(executor.map(ping_host, host_ips))
            
            # Filter reachable devices
            for result in results:
                if result["reachable"]:
                    # Check if device already exists in database
                    existing_device = db.query(MikrotikDevice).filter(
                        MikrotikDevice.ip_address == result["ip"]
                    ).first()
                    
                    device_info = {
                        "ip_address": result["ip"],
                        "subnet_name": subnet.name,
                        "subnet_id": subnet.id,
                        "detection_method": result["method"],
                        "detection_port": result.get("port"),
                        "is_registered": existing_device is not None,
                        "existing_device_id": existing_device.id if existing_device else None,
                        "existing_device_name": existing_device.name if existing_device else None
                    }
                    scanned_devices.append(device_info)
                    
        except Exception as e:
            print(f"Error scanning subnet {subnet.name}: {str(e)}")
            continue
    
    return {
        "scanned_devices": scanned_devices,
        "group_id": group_id,
        "group_name": group.name,
        "total_found": len(scanned_devices),
        "registered_count": len([d for d in scanned_devices if d["is_registered"]]),
        "unregistered_count": len([d for d in scanned_devices if not d["is_registered"]])
    }

@router.post("/groups/{group_id}/register-devices")
async def register_discovered_devices(
    group_id: int, 
    devices: List[dict],
    db: Session = Depends(get_db)
):
    """Register discovered devices to the group"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    registered_devices = []
    failed_devices = []
    
    for device_data in devices:
        try:
            ip_address = device_data.get("ip_address")
            device_name = device_data.get("name", f"Device-{ip_address}")
            
            # Check if device already exists
            existing_device = db.query(MikrotikDevice).filter(
                MikrotikDevice.ip_address == ip_address
            ).first()
            
            if existing_device:
                failed_devices.append({
                    "ip_address": ip_address,
                    "error": "Device already registered"
                })
                continue
            
            # Create new device with provided credentials
            new_device = MikrotikDevice(
                name=device_name,
                ip_address=ip_address,
                port=device_data.get("port", 8728),
                username=device_data.get("username", "admin"),
                password=device_data.get("password", ""),
                group_id=group_id,
                group_name=group.name,
                description=f"Auto-discovered from {group.name} group scan via {device_data.get('detection_method', 'unknown')}"
            )
            
            db.add(new_device)
            db.commit()
            db.refresh(new_device)
            
            registered_devices.append({
                "id": new_device.id,
                "name": new_device.name,
                "ip_address": new_device.ip_address,
                "group_name": new_device.group_name
            })
            
        except Exception as e:
            db.rollback()
            failed_devices.append({
                "ip_address": device_data.get("ip_address", "unknown"),
                "error": str(e)
            })
    
    return {
        "registered_devices": registered_devices,
        "failed_devices": failed_devices,
        "success_count": len(registered_devices),
        "failure_count": len(failed_devices)
    } 
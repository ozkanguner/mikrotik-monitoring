export interface MikrotikDevice {
  id: number;
  name: string;
  ip_address: string;
  port: number;
  username: string;
  password: string;
  group_id?: number;
  group_name: string;
  location?: string;
  description?: string;
  router_board?: string;
  architecture?: string;
  version?: string;
  build_time?: string;
  is_online: boolean;
  last_seen?: string;
  connection_attempts: number;
  last_error?: string;
  cpu_load?: string;
  uptime?: string;
  created_at: string;
  updated_at: string;
}

export interface MikrotikDeviceCreate {
  name: string;
  ip_address: string;
  port: number;
  username: string;
  password: string;
  group_id?: number;
  group_name: string;
  location?: string;
  description?: string;
  router_board?: string;
}

export interface MikrotikDeviceUpdate {
  name?: string;
  ip_address?: string;
  port?: number;
  username?: string;
  password?: string;
  group_id?: number;
  group_name?: string;
  location?: string;
  description?: string;
  router_board?: string;
  manual_override?: boolean;
}

export interface DeviceInterface {
  id: number;
  device_id: number;
  name: string;
  type?: string;
  mac_address?: string;
  running: boolean;
  disabled: boolean;
  rx_bytes: number;
  tx_bytes: number;
  rx_packets: number;
  tx_packets: number;
  last_updated: string;
}

export interface DeviceLog {
  id: number;
  device_id: number;
  log_level: string;
  message: string;
  command?: string;
  response?: any;
  timestamp: string;
}

export interface DeviceCommand {
  id: number;
  device_id: number;
  command: string;
  status: string;
  result?: any;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  user_id?: string;
  user_name?: string;
}

export interface DeviceCommandCreate {
  device_id: number;
  command: string;
  user_id?: string;
  user_name?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  device_info?: any;
}

export interface BulkOperationResult {
  success_count: number;
  failed_count: number;
  total_count: number;
  results: Array<{
    device_id: number;
    device_name: string;
    success: boolean;
    error?: string;
  }>;
}

export interface HighCpuDevice {
  id: number;
  name: string;
  ip_address: string;
  cpu_load: string;
  group_name: string;
  is_online: boolean;
  last_seen?: string;
}

export interface DeviceStats {
  total_devices: number;
  online_devices: number;
  offline_devices: number;
  groups: { [key: string]: number };
  recent_logs: DeviceLog[];
  high_cpu_devices: HighCpuDevice[];
}

export interface WebSocketMessage {
  type: string;
  device_id?: number;
  name?: string;
  is_online?: boolean;
  last_seen?: string;
  last_error?: string;
  message?: string;
}

export interface DeviceFilters {
  search?: string;
  group_name?: string;
  is_online?: boolean;
  skip?: number;
  limit?: number;
} 
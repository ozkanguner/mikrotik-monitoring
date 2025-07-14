import axios from 'axios';
import { MikrotikDeviceCreate, MikrotikDeviceUpdate } from '../types/mikrotik';

const API_BASE_URL = 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const mikrotikApi = {
  // Credential management
  getCredentials: () =>
    api.get('/mikrotik/credentials'),
  
  getCredential: (id: number) =>
    api.get(`/mikrotik/credentials/${id}`),
  
  createCredential: (credential: {
    name: string;
    username: string;
    password: string;
    description?: string;
    is_default: boolean;
  }) =>
    api.post('/mikrotik/credentials', credential),
  
  updateCredential: (id: number, credential: {
    name?: string;
    username?: string;
    password?: string;
    description?: string;
    is_default?: boolean;
  }) =>
    api.put(`/mikrotik/credentials/${id}`, credential),
  
  deleteCredential: (id: number) =>
    api.delete(`/mikrotik/credentials/${id}`),

  // Device management
  getDevices: (params?: { limit?: number; skip?: number; search?: string }) =>
    api.get('/mikrotik/devices', { params }),
  
  getDevice: (id: number) =>
    api.get(`/mikrotik/devices/${id}`),
  
  createDevice: (device: MikrotikDeviceCreate) =>
    api.post('/mikrotik/devices', device),
  
  updateDevice: (id: number, device: MikrotikDeviceUpdate) =>
    api.put(`/mikrotik/devices/${id}`, device),
  
  deleteDevice: (id: number) =>
    api.delete(`/mikrotik/devices/${id}`),

  // Device operations
  testConnection: (id: number) =>
    api.post(`/mikrotik/devices/${id}/test-connection`),
  
  bulkTestConnections: (deviceIds: number[]) =>
    api.post('/mikrotik/devices/bulk-test', { device_ids: deviceIds }),
  
  rebootDevice: (id: number) =>
    api.get(`/mikrotik/devices/${id}/reboot`),
  
  executeCommand: (id: number, command: string) =>
    api.post(`/mikrotik/devices/${id}/execute`, { command }),

  // Device interfaces
  getDeviceInterfaces: (id: number) =>
    api.get(`/mikrotik/devices/${id}/interfaces`),

  // Device logs
  getDeviceLogs: (id: number, params?: { limit?: number }) =>
    api.get(`/mikrotik/devices/${id}/logs`, { params }),

  // Device system info
  getDeviceSystemInfo: (id: number) =>
    api.get(`/mikrotik/devices/${id}/system-info`),

  // Statistics
  getStats: () =>
    api.get('/mikrotik/stats'),

  // Subnets
  getSubnets: () =>
    api.get('/mikrotik/subnets'),
  
  createSubnet: (data: any) =>
    api.post('/mikrotik/subnets', data),
  
  updateSubnet: (id: number, data: any) =>
    api.put(`/mikrotik/subnets/${id}`, data),
  
  deleteSubnet: (id: number) =>
    api.delete(`/mikrotik/subnets/${id}`),
    
  getAvailableIPs: (subnetId: number) =>
    api.get(`/mikrotik/subnets/${subnetId}/available-ips`),

  // Groups
  getGroups: () =>
    api.get('/mikrotik/groups'),
  
  createGroup: (data: {
    name: string;
    description?: string;
    color?: string;
    is_active?: boolean;
  }) =>
    api.post('/mikrotik/groups', data),
  
  updateGroup: (id: number, data: {
    name?: string;
    description?: string;
    color?: string;
    is_active?: boolean;
  }) =>
    api.put(`/mikrotik/groups/${id}`, data),
  
  deleteGroup: (id: number) =>
    api.delete(`/mikrotik/groups/${id}`),
  
  // Group-Subnet management
  getGroupSubnets: (groupId: number) =>
    api.get(`/mikrotik/groups/${groupId}/subnets`),
  
  addSubnetToGroup: (groupId: number, subnetId: number) =>
    api.post(`/mikrotik/groups/${groupId}/subnets/${subnetId}`),
  
  removeSubnetFromGroup: (groupId: number, subnetId: number) =>
    api.delete(`/mikrotik/groups/${groupId}/subnets/${subnetId}`),
  
  getSubnetGroups: (subnetId: number) =>
    api.get(`/mikrotik/subnets/${subnetId}/groups`),
  
  // Group scanning
  scanGroupSubnets: (groupId: number) =>
    api.post(`/mikrotik/groups/${groupId}/scan`),
  
  registerDiscoveredDevices: (groupId: number, devices: any[]) =>
    api.post(`/mikrotik/groups/${groupId}/register-devices`, devices),
};

export default api; 
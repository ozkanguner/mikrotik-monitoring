import React, { useState } from 'react';

import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  PlayArrow,
  RestartAlt,
  CheckCircle,
  Error as ErrorIcon,
  Search,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Computer
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useSnackbar } from 'notistack';
import { mikrotikApi } from '../services/api';
import { MikrotikDevice, DeviceFilters } from '../types/mikrotik';
import { useWebSocket } from '../hooks/useWebSocket';
import { WS_URL } from '../config';


export const DeviceList: React.FC = () => {
  const [filters, setFilters] = useState<DeviceFilters>({
    search: '',
    group_name: '',
    is_online: undefined,
    skip: 0,
    limit: 100,
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<MikrotikDevice | null>(null);
  const [selectedDevices, setSelectedDevices] = useState<number[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<MikrotikDevice | null>(null);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [selectedDeviceInfo, setSelectedDeviceInfo] = useState<any>(null);
  const [loadingDeviceInfo, setLoadingDeviceInfo] = useState(false);
  const [autoFetchingInfo, setAutoFetchingInfo] = useState(false);
  const [newDevice, setNewDevice] = useState({
    name: '',
    ip_address: '',
    port: 8728,
    username: '',
    password: '',
    group_id: null as number | null,
    group_name: 'default',
    location: '',
    description: '',
    router_board: ''
  });
  const [selectedCredential, setSelectedCredential] = useState<number | ''>('');
  const [selectedSubnet, setSelectedSubnet] = useState<number | ''>('');
  const [availableIPs, setAvailableIPs] = useState<string[]>([]);
  
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const { isConnected } = useWebSocket({
    url: WS_URL,
    onMessage: (message: any) => {
      if (message.type === 'device_status') {
        // Refresh devices when status changes
        queryClient.invalidateQueries(['devices']);
      }
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
    },
  });

  const { data: devices = [], isLoading, error, refetch } = useQuery(
    ['devices'],
    () => mikrotikApi.getDevices().then(res => res.data),
    {
      refetchOnWindowFocus: false,
      refetchInterval: 30000,
    }
  );

  // Fetch credentials for dropdown
  const { data: credentials = [] } = useQuery(
    ['credentials'],
    () => mikrotikApi.getCredentials().then((res: any) => res.data),
    {
      refetchOnWindowFocus: false,
    }
  );

  // Fetch subnets for IP selection
  const { data: subnets = [] } = useQuery(
    ['subnets'],
    () => mikrotikApi.getSubnets().then((res: any) => res.data),
    {
      refetchOnWindowFocus: false,
    }
  );

  // Fetch groups for dropdown
  const { data: groups = [] } = useQuery(
    ['groups'],
    () => mikrotikApi.getGroups().then((res: any) => res.data),
    {
      refetchOnWindowFocus: false,
    }
  );

  const deleteMutation = useMutation(mikrotikApi.deleteDevice, {
    onSuccess: () => {
      queryClient.invalidateQueries(['devices']);
      enqueueSnackbar('Cihaz başarıyla silindi', { variant: 'success' });
      setDeleteDialogOpen(false);
      setDeviceToDelete(null);
    },
    onError: (error: any) => {
      enqueueSnackbar(`Cihaz silinirken hata: ${error.message}`, { variant: 'error' });
    },
  });

  const testConnectionMutation = useMutation(mikrotikApi.testConnection, { 
    onSuccess: (result, deviceId) => {
      if (result.data.success) {
        enqueueSnackbar('Bağlantı başarılı', { variant: 'success' });
      } else {
        enqueueSnackbar(`Bağlantı hatası: ${result.data.message}`, { variant: 'error' });
      }
      queryClient.invalidateQueries(['devices']);
    },
    onError: (error) => {
      enqueueSnackbar('Bağlantı testi sırasında hata oluştu', { variant: 'error' });
      console.error('Test connection error:', error);
    },
  });

  const rebootMutation = useMutation(mikrotikApi.rebootDevice, {
    onSuccess: () => {
      enqueueSnackbar('Cihaz yeniden başlatılıyor', { variant: 'success' });
      queryClient.invalidateQueries(['devices']);
    },
    onError: (error) => {
      enqueueSnackbar('Yeniden başlatma hatası', { variant: 'error' });
      console.error('Reboot error:', error);
    },
  });

  const bulkTestMutation = useMutation(mikrotikApi.bulkTestConnections, {
    onSuccess: (result: any) => {
      enqueueSnackbar(
        `Toplu test tamamlandı: ${result.data.success_count} başarılı, ${result.data.failed_count} başarısız`,
        { variant: 'info' }
      );
      queryClient.invalidateQueries(['devices']);
    },
    onError: (error) => {
      enqueueSnackbar('Toplu test sırasında hata oluştu', { variant: 'error' });
      console.error('Bulk test error:', error);
    },
  });

  const createDeviceMutation = useMutation(mikrotikApi.createDevice, {
    onSuccess: () => {
      queryClient.invalidateQueries(['devices']);
      enqueueSnackbar('Yeni cihaz başarıyla eklendi', { variant: 'success' });
      setAddDialogOpen(false);
      setNewDevice({
        name: '',
        ip_address: '',
        port: 8728,
        username: '',
        password: '',
        group_id: null,
        group_name: 'default',
        location: '',
        description: '',
        router_board: ''
      });
      setSelectedCredential('');
      setSelectedSubnet('');
      setAvailableIPs([]);
    },
    onError: (error: any) => {
      enqueueSnackbar(`Cihaz eklenirken hata: ${error.response?.data?.detail || error.message}`, { variant: 'error' });
    },
  });

  const updateDeviceNameMutation = useMutation(
    ({ deviceId, ...updateData }: { deviceId: number; [key: string]: any }) => 
      mikrotikApi.updateDevice(deviceId, updateData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['devices']);
        enqueueSnackbar('Cihaz bilgileri başarıyla güncellendi', { variant: 'success' });
      },
      onError: (error: any) => {
        enqueueSnackbar(`Cihaz bilgileri güncellenirken hata: ${error.response?.data?.detail || error.message}`, { variant: 'error' });
      },
    }
  );

  const updateDeviceMutation = useMutation(
    ({ deviceId, ...updateData }: { deviceId: number; [key: string]: any }) => 
      mikrotikApi.updateDevice(deviceId, updateData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['devices']);
        enqueueSnackbar('Cihaz başarıyla güncellendi', { variant: 'success' });
        setEditDialogOpen(false);
        setEditingDevice(null);
      },
      onError: (error: any) => {
        enqueueSnackbar(`Cihaz güncellenirken hata: ${error.response?.data?.detail || error.message}`, { variant: 'error' });
      },
    }
  );

  const handleTestConnection = (deviceId: number) => {
    testConnectionMutation.mutate(deviceId);
  };

  const handleReboot = (deviceId: number) => {
    rebootMutation.mutate(deviceId);
  };

  const handleDelete = (device: MikrotikDevice) => {
    setDeviceToDelete(device);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deviceToDelete) {
      deleteMutation.mutate(deviceToDelete.id);
    }
  };

  const handleBulkTest = () => {
    if (selectedDevices.length > 0) {
      bulkTestMutation.mutate(selectedDevices);
    }
  };

  const handleAddDevice = () => {
    if (newDevice.name && newDevice.ip_address && newDevice.username && newDevice.password) {
      const deviceData = {
        ...newDevice,
        group_id: newDevice.group_id || undefined
      };
      createDeviceMutation.mutate(deviceData);
    } else {
      enqueueSnackbar('Lütfen gerekli alanları doldurun', { variant: 'warning' });
    }
  };

  const handleEditDevice = (device: MikrotikDevice) => {
    setEditingDevice(device);
    setNewDevice({
      name: device.name,
      ip_address: device.ip_address,
      port: device.port,
      username: device.username,
      password: device.password,
      group_id: (device as any).group_id || null,
      group_name: device.group_name || 'default',
      location: device.location || '',
      description: device.description || '',
      router_board: device.router_board || ''
    });
    setEditDialogOpen(true);
  };

  const handleUpdateDevice = () => {
    if (editingDevice && newDevice.name && newDevice.ip_address && newDevice.username && newDevice.password) {
      const deviceData = {
        ...newDevice,
        group_id: newDevice.group_id || undefined
      };
      updateDeviceMutation.mutate({
        deviceId: editingDevice.id,
        ...deviceData
      });
    } else {
      enqueueSnackbar('Lütfen gerekli alanları doldurun', { variant: 'warning' });
    }
  };

  const handleCredentialChange = (credentialId: number | '') => {
    setSelectedCredential(credentialId);
    if (credentialId !== '') {
      const credential = credentials.find((cred: any) => cred.id === credentialId);
      if (credential) {
        setNewDevice(prev => ({
          ...prev,
          username: credential.username,
          password: credential.password
        }));
      }
    }
  };

  const handleSubnetChange = async (subnetId: number | '') => {
    setSelectedSubnet(subnetId);
    setAvailableIPs([]);
    
    if (subnetId !== '') {
      try {
        const response = await mikrotikApi.getAvailableIPs(subnetId);
        setAvailableIPs(response.data.available_ips);
        
        // Auto-select first available IP if exists
        if (response.data.available_ips.length > 0) {
          setNewDevice(prev => ({
            ...prev,
            ip_address: response.data.available_ips[0]
          }));
        }
      } catch (error) {
        console.error('Error fetching available IPs:', error);
        enqueueSnackbar('Kullanılabilir IP adresleri alınamadı', { variant: 'error' });
      }
    }
  };

  const handleDeviceInfo = async (deviceId: number, deviceName: string) => {
    try {
      setLoadingDeviceInfo(true);
      setInfoDialogOpen(true);
      const response = await mikrotikApi.getDeviceSystemInfo(deviceId);
      setSelectedDeviceInfo({
        deviceId,
        deviceName,
        systemInfo: response.data.system_info
      });
    } catch (error) {
      console.error('Device info error:', error);
      enqueueSnackbar('Cihaz bilgileri alınırken hata oluştu', { variant: 'error' });
      setInfoDialogOpen(false);
    } finally {
      setLoadingDeviceInfo(false);
    }
  };

  const handleUpdateDeviceName = () => {
    if (selectedDeviceInfo?.systemInfo?.identity?.name) {
      const realDeviceName = selectedDeviceInfo.systemInfo.identity.name;
      const modelInfo = selectedDeviceInfo.systemInfo.system?.board_name;
      
      const updateData: any = { 
        name: realDeviceName,
        manual_override: true  // Manuel güncelleme flag'ini set et
      };
      if (modelInfo) {
        updateData.router_board = modelInfo;
      }
      
      updateDeviceNameMutation.mutate({ 
        deviceId: selectedDeviceInfo.deviceId, 
        ...updateData
      });
    } else {
      enqueueSnackbar('Cihaz kimliği bilgisi bulunamadı', { variant: 'error' });
    }
  };

  const handleAutoFetchDeviceInfo = async () => {
    if (!newDevice.ip_address || !newDevice.username || !newDevice.password) {
      enqueueSnackbar('IP adresi, kullanıcı adı ve şifre gerekli', { variant: 'error' });
      return;
    }

    try {
      setAutoFetchingInfo(true);
      
      // Önce geçici cihaz oluştur
      const tempDevice = {
        name: 'temp-device',
        ip_address: newDevice.ip_address,
        port: newDevice.port,
        username: newDevice.username,
        password: newDevice.password,
        group_name: 'temp',
        location: '',
        description: '',
        router_board: ''
      };

      // Geçici cihazı oluştur
      const createResult = await mikrotikApi.createDevice(tempDevice);
      const tempDeviceId = createResult.data.id;

      // Sistem bilgilerini çek
      const systemInfoResult = await mikrotikApi.getDeviceSystemInfo(tempDeviceId);
      const systemInfo = systemInfoResult.data.system_info;

      // Geçici cihazı sil
      await mikrotikApi.deleteDevice(tempDeviceId);

      // Form alanlarını güncelle
      if (systemInfo.identity?.name) {
        setNewDevice(prev => ({
          ...prev,
          name: systemInfo.identity.name
        }));
      }

      // Model bilgisini router_board alanına kaydet (Board Name'den)
      const modelInfo = systemInfo.system?.board_name;
      if (modelInfo) {
        setNewDevice(prev => ({
          ...prev,
          router_board: modelInfo
        }));
      }

      enqueueSnackbar('Cihaz bilgileri başarıyla çekildi', { variant: 'success' });
      
    } catch (error) {
      console.error('Auto fetch error:', error);
      enqueueSnackbar('Cihaz bilgileri çekilirken hata oluştu', { variant: 'error' });
    } finally {
      setAutoFetchingInfo(false);
    }
  };

  const getStatusChip = (device: MikrotikDevice) => {
    if (device.is_online) {
      return (
        <Chip
          icon={<CheckCircle />}
          label="Çevrimiçi"
          color="success"
          size="small"
        />
      );
    } else {
      return (
        <Chip
          icon={<ErrorIcon />}
          label="Çevrimdışı"
          color="error"
          size="small"
        />
      );
    }
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Cihaz Adı', width: 200 },
    { field: 'ip_address', headerName: 'IP Adresi', width: 130 },
    { 
      field: 'router_board', 
      headerName: 'Model', 
      width: 140,
      renderCell: (params) => {
        if (!params.value || params.value === 'N/A') return '-';
        const modelValue = params.value.toLowerCase();
        // Eğer model adında "chr" varsa sadece "CHR" göster
        if (modelValue.includes('chr')) {
          return 'CHR';
        }
        return params.value;
      },
    },
    { field: 'version', headerName: 'Sürüm', width: 110 },
    {
      field: 'cpu_load',
      headerName: 'CPU',
      width: 80,
      renderCell: (params) => {
        if (!params.value || params.value === 'N/A') return '-';
        const cpu = parseInt(params.value);
        return (
          <Chip 
            label={`${cpu}%`}
            size="small"
            color={cpu > 80 ? 'error' : cpu > 60 ? 'warning' : 'success'}
          />
        );
      },
    },
    {
      field: 'uptime',
      headerName: 'Uptime',
      width: 150,
      renderCell: (params) => {
        if (!params.value || params.value === 'N/A') return '-';
        // Backend'den formatlanmış uptime geliyordur
        return (
          <Chip 
            label={params.value}
            size="small"
            variant="outlined"
            color="info"
            sx={{ fontSize: '0.75rem' }}
          />
        );
      },
    },
    { field: 'group_name', headerName: 'Grup', width: 100 },
    { field: 'location', headerName: 'Konum', width: 120 },
    {
      field: 'is_online',
      headerName: 'Durum',
      width: 100,
      renderCell: (params) => getStatusChip(params.row),
    },
    {
      field: 'last_seen',
      headerName: 'Son Görülme',
      width: 120,
      renderCell: (params) => {
        if (!params.value) return '-';
        const now = new Date();
        // Backend UTC zamanı gönderiyor, bunu doğru şekilde parse et
        const lastSeen = new Date(params.value + (params.value.includes('Z') ? '' : 'Z'));
        const diffInMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'Şimdi';
        if (diffInMinutes < 60) return `${diffInMinutes} dk`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} sa`;
        return `${Math.floor(diffInMinutes / 1440)} gn`;
      },
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'İşlemler',
      width: 200,
      getActions: (params) => [
        <GridActionsCellItem
          icon={
            <Tooltip title="Sistem Bilgileri">
              <InfoIcon />
            </Tooltip>
          }
          label="Info"
          onClick={() => handleDeviceInfo(params.row.id, params.row.name)}
        />,
        <GridActionsCellItem
          icon={
            <Tooltip title="Bağlantı Testi">
              <PlayArrow />
            </Tooltip>
          }
          label="Test"
          onClick={() => handleTestConnection(params.row.id)}
          disabled={testConnectionMutation.isLoading}
        />,
        <GridActionsCellItem
          icon={
            <Tooltip title="Yeniden Başlat">
              <RestartAlt />
            </Tooltip>
          }
          label="Reboot"
          onClick={() => handleReboot(params.row.id)}
          disabled={rebootMutation.isLoading}
        />,
        <GridActionsCellItem
          icon={
            <Tooltip title="Düzenle">
              <Edit />
            </Tooltip>
          }
          label="Edit"
          onClick={() => handleEditDevice(params.row)}
        />,
        <GridActionsCellItem
          icon={
            <Tooltip title="Sil">
              <Delete />
            </Tooltip>
          }
          label="Delete"
          onClick={() => handleDelete(params.row)}
        />,
      ],
    },
  ];

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error" action={
          <IconButton onClick={() => refetch()} size="small">
            <RefreshIcon />
          </IconButton>
        }>
          Cihazlar yüklenirken hata oluştu
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          MikroTik Cihazları
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              console.log('Yeni Cihaz butonuna tıklandı');
              setAddDialogOpen(true);
            }}
          >
            Yeni Cihaz
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
            disabled={isLoading}
          >
            Yenile
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <TextField
            label="Ara"
            variant="outlined"
            size="small"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            InputProps={{
              startAdornment: <Search />,
            }}
            sx={{ minWidth: 200 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Grup</InputLabel>
            <Select
              value={filters.group_name || ''}
              onChange={(e) => setFilters({ ...filters, group_name: e.target.value })}
            >
              <MenuItem value="">Tümü</MenuItem>
              <MenuItem value="default">Varsayılan</MenuItem>
              <MenuItem value="critical">Kritik</MenuItem>
              <MenuItem value="test">Test</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Durum</InputLabel>
            <Select
              value={filters.is_online === undefined ? '' : filters.is_online.toString()}
              onChange={(e) => {
                const value = e.target.value;
                setFilters({ 
                  ...filters, 
                  is_online: value === '' ? undefined : value === 'true' 
                });
              }}
            >
              <MenuItem value="">Tümü</MenuItem>
              <MenuItem value="true">Çevrimiçi</MenuItem>
              <MenuItem value="false">Çevrimdışı</MenuItem>
            </Select>
          </FormControl>

          <Chip
            icon={isConnected ? <CheckCircle /> : <ErrorIcon />}
            label={isConnected ? 'WebSocket Bağlı' : 'WebSocket Bağlantı Yok'}
            color={isConnected ? 'success' : 'error'}
            size="small"
          />
        </Box>
      </Paper>

      {/* Bulk Actions */}
      {selectedDevices.length > 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box display="flex" gap={2} alignItems="center">
            <Typography variant="body2">
              {selectedDevices.length} cihaz seçili
            </Typography>
            <Button
              variant="outlined"
              startIcon={<PlayArrow />}
              onClick={handleBulkTest}
              disabled={bulkTestMutation.isLoading}
            >
              Toplu Bağlantı Testi
            </Button>
          </Box>
        </Paper>
      )}

      {/* Data Grid */}
      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={devices}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 50 },
            },
          }}
          pageSizeOptions={[25, 50, 100]}
          checkboxSelection
          disableRowSelectionOnClick
          loading={isLoading}
          onRowSelectionModelChange={(newSelection: any) => {
            setSelectedDevices(newSelection as number[]);
          }}
          sx={{
            border: 0,
            '& .MuiDataGrid-row:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        />
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Cihaz Silme Onayı</DialogTitle>
        <DialogContent>
          <Typography>
            "{deviceToDelete?.name}" cihazını silmek istediğinizden emin misiniz?
            Bu işlem geri alınamaz.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            İptal
          </Button>
          <Button 
            onClick={confirmDelete} 
            color="error"
            disabled={deleteMutation.isLoading}
          >
            {deleteMutation.isLoading ? <CircularProgress size={20} /> : 'Sil'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Device Dialog */}
      <Dialog open={addDialogOpen} onClose={() => { setAddDialogOpen(false); setSelectedCredential(''); setSelectedSubnet(''); setAvailableIPs([]); }} maxWidth="md" fullWidth>
        <DialogTitle>Yeni MikroTik Cihazı Ekle</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              fullWidth
              label="Cihaz Adı *"
              value={newDevice.name}
              disabled={true}
              placeholder="Otomatik çekilecek"
              helperText="Cihaz bilgilerini otomatik çektikten sonra doldurulacak"
            />
            {/* Subnet Seçimi */}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Subnet Seçin</InputLabel>
              <Select
                value={selectedSubnet}
                onChange={(e) => handleSubnetChange(e.target.value as number | '')}
                label="Subnet Seçin"
              >
                <MenuItem value="">
                  <em>Manuel IP girişi</em>
                </MenuItem>
                {subnets.map((subnet: any) => (
                  <MenuItem key={subnet.id} value={subnet.id}>
                    {subnet.name} ({subnet.network}/{subnet.cidr})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="IP Adresi *"
              value={newDevice.ip_address}
              onChange={(e) => setNewDevice({ ...newDevice, ip_address: e.target.value })}
              placeholder="ör: 192.168.1.1"
              select={availableIPs.length > 0 && selectedSubnet !== ''}
              helperText={availableIPs.length > 0 ? `${availableIPs.length} IP adresi mevcut` : undefined}
            >
              {availableIPs.length > 0 && selectedSubnet !== '' && availableIPs.map((ip) => (
                <MenuItem key={ip} value={ip}>
                  {ip}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              label="Port"
              type="number"
              value={newDevice.port}
              onChange={(e) => setNewDevice({ ...newDevice, port: parseInt(e.target.value) || 8728 })}
            />
            {/* Grup Seçimi */}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Grup Seçin</InputLabel>
              <Select
                value={newDevice.group_id || ''}
                onChange={(e) => setNewDevice({ ...newDevice, group_id: e.target.value as number | null })}
                label="Grup Seçin"
              >
                <MenuItem value="">
                  <em>Grup seçmeyin</em>
                </MenuItem>
                {groups.map((group: any) => (
                  <MenuItem key={group.id} value={group.id}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: group.color,
                          border: '1px solid #e0e0e0'
                        }}
                      />
                      {group.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {/* Kayıtlı Kimlik Bilgileri Seçimi */}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Kayıtlı Kimlik Bilgilerini Kullan</InputLabel>
              <Select
                value={selectedCredential}
                onChange={(e) => handleCredentialChange(e.target.value as number | '')}
                label="Kayıtlı Kimlik Bilgilerini Kullan"
              >
                <MenuItem value="">
                  <em>Manuel giriş yap</em>
                </MenuItem>
                {credentials.map((credential: any) => (
                  <MenuItem key={credential.id} value={credential.id}>
                    {credential.name} ({credential.username})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Kullanıcı Adı *"
              value={newDevice.username}
              onChange={(e) => setNewDevice({ ...newDevice, username: e.target.value })}
              placeholder="ör: admin"
              disabled={selectedCredential !== ''}
            />
            <TextField
              fullWidth
              label="Şifre *"
              type="password"
              value={newDevice.password}
              onChange={(e) => setNewDevice({ ...newDevice, password: e.target.value })}
              disabled={selectedCredential !== ''}
            />
            
            {/* Otomatik Bilgi Çekme Butonu */}
            <Button
              fullWidth
              variant="outlined"
              color="primary"
              onClick={handleAutoFetchDeviceInfo}
              disabled={autoFetchingInfo || !newDevice.ip_address || !newDevice.username || !newDevice.password}
              startIcon={autoFetchingInfo ? <CircularProgress size={20} /> : <Search />}
              sx={{ mt: 1, mb: 2 }}
            >
              {autoFetchingInfo ? 'Cihaz Bilgileri Çekiliyor...' : 'Cihaz Bilgilerini Otomatik Çek'}
            </Button>
            
            <FormControl fullWidth>
              <InputLabel>Grup</InputLabel>
              <Select
                value={newDevice.group_name}
                onChange={(e) => setNewDevice({ ...newDevice, group_name: e.target.value })}
              >
                <MenuItem value="default">Varsayılan</MenuItem>
                <MenuItem value="critical">Kritik</MenuItem>
                <MenuItem value="test">Test</MenuItem>
                <MenuItem value="backup">Yedek</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Konum"
              value={newDevice.location}
              onChange={(e) => setNewDevice({ ...newDevice, location: e.target.value })}
              placeholder="ör: Ankara Ofis"
            />
            <TextField
              fullWidth
              label="Açıklama"
              multiline
              rows={3}
              value={newDevice.description}
              onChange={(e) => setNewDevice({ ...newDevice, description: e.target.value })}
              placeholder="Cihaz hakkında notlar..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setAddDialogOpen(false); setSelectedCredential(''); setSelectedSubnet(''); setAvailableIPs([]); }}>İptal</Button>
          <Button 
            onClick={handleAddDevice} 
            variant="contained"
            disabled={createDeviceMutation.isLoading}
          >
            {createDeviceMutation.isLoading ? 'Ekleniyor...' : 'Cihaz Ekle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Device Dialog */}
      <Dialog open={editDialogOpen} onClose={() => { setEditDialogOpen(false); setEditingDevice(null); }} maxWidth="md" fullWidth>
        <DialogTitle>Cihaz Düzenle</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              fullWidth
              label="Cihaz Adı *"
              value={newDevice.name}
              onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
              placeholder="Cihaz adı"
            />
            <TextField
              fullWidth
              label="IP Adresi *"
              value={newDevice.ip_address}
              onChange={(e) => setNewDevice({ ...newDevice, ip_address: e.target.value })}
              placeholder="ör: 192.168.1.1"
            />
            <TextField
              fullWidth
              label="Port"
              type="number"
              value={newDevice.port}
              onChange={(e) => setNewDevice({ ...newDevice, port: parseInt(e.target.value) || 8728 })}
            />
            {/* Grup Seçimi */}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Grup Seçin</InputLabel>
              <Select
                value={newDevice.group_id || ''}
                onChange={(e) => setNewDevice({ ...newDevice, group_id: e.target.value as number | null })}
                label="Grup Seçin"
              >
                <MenuItem value="">
                  <em>Grup seçmeyin</em>
                </MenuItem>
                {groups.map((group: any) => (
                  <MenuItem key={group.id} value={group.id}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: group.color,
                          border: '1px solid #e0e0e0'
                        }}
                      />
                      {group.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Kullanıcı Adı *"
              value={newDevice.username}
              onChange={(e) => setNewDevice({ ...newDevice, username: e.target.value })}
              placeholder="ör: admin"
            />
            <TextField
              fullWidth
              label="Şifre *"
              type="password"
              value={newDevice.password}
              onChange={(e) => setNewDevice({ ...newDevice, password: e.target.value })}
            />
            <TextField
              fullWidth
              label="Konum"
              value={newDevice.location}
              onChange={(e) => setNewDevice({ ...newDevice, location: e.target.value })}
              placeholder="ör: Ankara Ofis"
            />
            <TextField
              fullWidth
              label="Açıklama"
              multiline
              rows={3}
              value={newDevice.description}
              onChange={(e) => setNewDevice({ ...newDevice, description: e.target.value })}
              placeholder="Cihaz hakkında notlar..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setEditDialogOpen(false); setEditingDevice(null); }}>İptal</Button>
          <Button 
            onClick={handleUpdateDevice} 
            variant="contained"
            disabled={updateDeviceMutation.isLoading}
          >
            {updateDeviceMutation.isLoading ? 'Güncelleniyor...' : 'Güncelle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Device Info Dialog */}
      <Dialog 
        open={infoDialogOpen} 
        onClose={() => setInfoDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Computer />
            Cihaz Sistem Bilgileri
            {selectedDeviceInfo && (
              <Chip 
                label={selectedDeviceInfo.deviceName} 
                color="primary" 
                variant="outlined"
                size="small"
              />
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {loadingDeviceInfo ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
              <CircularProgress />
            </Box>
          ) : selectedDeviceInfo?.systemInfo ? (
            <Box>
              <Box display="flex" flexWrap="wrap" gap={2} mb={3}>
                {/* Cihaz Kimliği ve Donanım */}
                <Paper elevation={1} sx={{ p: 2, flex: '1 1 300px' }}>
                  <Typography variant="h6" color="primary" gutterBottom>
                    <Computer sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Cihaz Kimliği ve Donanım
                  </Typography>
                  <Typography><strong>Adı:</strong> {selectedDeviceInfo.systemInfo.identity?.name || 'N/A'}</Typography>
                  <Typography><strong>Model:</strong> {selectedDeviceInfo.systemInfo.hardware?.model || 'N/A'}</Typography>
                  <Typography><strong>Seri No:</strong> {selectedDeviceInfo.systemInfo.hardware?.serial_number || 'N/A'}</Typography>
                  <Typography><strong>Board Name:</strong> {selectedDeviceInfo.systemInfo.system?.board_name || 'N/A'}</Typography>
                  <Typography><strong>Firmware Sürümü:</strong> {selectedDeviceInfo.systemInfo.system?.version || 'N/A'}</Typography>
                  <Typography><strong>Platform:</strong> {selectedDeviceInfo.systemInfo.system?.platform || 'N/A'}</Typography>
                  <Typography><strong>Mimari:</strong> {selectedDeviceInfo.systemInfo.cpu?.architecture || 'N/A'}</Typography>
                </Paper>

                {/* İşlemci Bilgileri */}
                <Paper elevation={1} sx={{ p: 2, flex: '1 1 300px' }}>
                  <Typography variant="h6" color="primary" gutterBottom>
                    İşlemci (CPU)
                  </Typography>
                  <Typography><strong>Çekirdek:</strong> {selectedDeviceInfo.systemInfo.cpu?.cpu_count || 'N/A'}</Typography>
                  <Typography><strong>Frekans:</strong> {selectedDeviceInfo.systemInfo.cpu?.cpu_frequency ? `${selectedDeviceInfo.systemInfo.cpu.cpu_frequency} MHz` : 'N/A'}</Typography>
                  <Typography><strong>Yük:</strong> {selectedDeviceInfo.systemInfo.cpu?.cpu_load || 'N/A'}%</Typography>
                  <Typography><strong>Mimari:</strong> {selectedDeviceInfo.systemInfo.cpu?.architecture || 'N/A'}</Typography>
                </Paper>
              </Box>

              <Box display="flex" flexWrap="wrap" gap={2}>
                {/* Bellek Bilgileri */}
                <Paper elevation={1} sx={{ p: 2, flex: '1 1 300px' }}>
                  <Typography variant="h6" color="primary" gutterBottom>
                    Bellek (RAM)
                  </Typography>
                  <Typography><strong>Toplam RAM:</strong> {formatBytes(selectedDeviceInfo.systemInfo.memory?.total_memory)}</Typography>
                  <Typography><strong>Boş RAM:</strong> {formatBytes(selectedDeviceInfo.systemInfo.memory?.free_memory)}</Typography>
                  <Typography><strong>Toplam Disk:</strong> {formatBytes(selectedDeviceInfo.systemInfo.memory?.total_hdd_space)}</Typography>
                  <Typography><strong>Boş Disk:</strong> {formatBytes(selectedDeviceInfo.systemInfo.memory?.free_hdd_space)}</Typography>
                </Paper>

                {/* Sistem Bilgileri */}
                <Paper elevation={1} sx={{ p: 2, flex: '1 1 300px' }}>
                  <Typography variant="h6" color="primary" gutterBottom>
                    Sistem
                  </Typography>
                  <Typography><strong>Platform:</strong> {selectedDeviceInfo.systemInfo.system?.platform || 'N/A'}</Typography>
                  <Typography><strong>Versiyon:</strong> {selectedDeviceInfo.systemInfo.system?.version || 'N/A'}</Typography>
                  <Typography><strong>Donanım:</strong> {selectedDeviceInfo.systemInfo.system?.board_name || 'N/A'}</Typography>
                  <Typography><strong>Çalışma Süresi:</strong> {selectedDeviceInfo.systemInfo.system?.uptime || 'N/A'}</Typography>
                </Paper>
              </Box>
            </Box>
          ) : (
            <Typography color="error">Sistem bilgileri alınamadı</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoDialogOpen(false)}>Kapat</Button>
          {selectedDeviceInfo && (
            <>
              <Button 
                onClick={() => handleDeviceInfo(selectedDeviceInfo.deviceId, selectedDeviceInfo.deviceName)}
                disabled={loadingDeviceInfo}
              >
                Yenile
              </Button>
              {selectedDeviceInfo.systemInfo?.identity?.name && (
                <Button 
                  onClick={handleUpdateDeviceName}
                  disabled={updateDeviceNameMutation.isLoading}
                  variant="contained"
                  color="primary"
                >
                  {updateDeviceNameMutation.isLoading ? 'Güncelleniyor...' : 'Cihaz Bilgilerini Güncelle'}
                </Button>
              )}
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Bytes formatı için helper fonksiyon
const formatBytes = (bytes: number | string) => {
  if (bytes === 'N/A' || !bytes) return 'N/A';
  const numBytes = typeof bytes === 'string' ? parseInt(bytes) : bytes;
  if (numBytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(numBytes) / Math.log(k));
  return parseFloat((numBytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default DeviceList; 
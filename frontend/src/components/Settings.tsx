import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Alert,
  Switch,
  FormControlLabel,
  Grid,
  Card,
  CardContent,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Settings as SettingsIcon,
  VpnKey,
  Save,
  Cancel,
  Search
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useSnackbar } from 'notistack';
import { mikrotikApi } from '../services/api';

interface Credential {
  id: number;
  name: string;
  username: string;
  password: string;
  description?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface CredentialFormData {
  name: string;
  username: string;
  password: string;
  description: string;
  is_default: boolean;
}

interface Subnet {
  id: number;
  name: string;
  network: string;
  cidr: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  groups?: Array<{
    id: number;
    name: string;
    color: string;
    is_active: boolean;
  }>;
  network_info?: {
    first_ip: string;
    last_ip: string;
    total_ips: number;
    usable_ips: number;
    network_address: string;
    broadcast_address: string;
    netmask: string;
  };
}

interface SubnetFormData {
  name: string;
  network: string;
  cidr: number;
  is_active: boolean;
}

interface Group {
  id: number;
  name: string;
  description?: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface GroupFormData {
  name: string;
  description: string;
  color: string;
  is_active: boolean;
}

export const Settings: React.FC = () => {
  const [credentialDialogOpen, setCredentialDialogOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null);
  const [credentialForm, setCredentialForm] = useState<CredentialFormData>({
    name: '',
    username: '',
    password: '',
    description: '',
    is_default: false
  });

  // Subnet states
  const [subnetDialogOpen, setSubnetDialogOpen] = useState(false);
  const [editingSubnet, setEditingSubnet] = useState<Subnet | null>(null);
  const [subnetForm, setSubnetForm] = useState<SubnetFormData>({
    name: '',
    network: '',
    cidr: 24,
    is_active: true
  });

  // Group states
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [groupForm, setGroupForm] = useState<GroupFormData>({
    name: '',
    description: '',
    color: '#1976d2',
    is_active: true
  });

  // Group-Subnet states
  const [subnetSelectorOpen, setSubnetSelectorOpen] = useState(false);
  const [selectedGroupForSubnet, setSelectedGroupForSubnet] = useState<Group | null>(null);
  const [groupSubnets, setGroupSubnets] = useState<{[key: number]: Subnet[]}>({});

  // Device scanning states
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [selectedGroupForScan, setSelectedGroupForScan] = useState<Group | null>(null);
  const [scanResults, setScanResults] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [selectedCredentialForDevices, setSelectedCredentialForDevices] = useState<number | ''>('');

  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  // Fetch credentials
  const { data: credentials = [], error } = useQuery(
    ['credentials'],
    () => mikrotikApi.getCredentials().then((res: any) => res.data),
    {
      refetchOnWindowFocus: false,
    }
  );

  // Fetch subnets
  const { data: subnets = [] } = useQuery(
    ['subnets'],
    () => mikrotikApi.getSubnets().then((res: any) => res.data),
    {
      refetchOnWindowFocus: false,
    }
  );

  // Fetch groups
  const { data: groups = [] } = useQuery(
    ['groups'],
    () => mikrotikApi.getGroups().then((res: any) => res.data),
    {
      refetchOnWindowFocus: false,
    }
  );

  // Create credential mutation
  const createCredentialMutation = useMutation(mikrotikApi.createCredential, {
    onSuccess: () => {
      queryClient.invalidateQueries(['credentials']);
      enqueueSnackbar('Kimlik bilgisi başarıyla eklendi', { variant: 'success' });
      handleCloseDialog();
    },
    onError: (error: any) => {
      enqueueSnackbar(`Hata: ${error.response?.data?.detail || error.message}`, { variant: 'error' });
    },
  });

  // Update credential mutation
  const updateCredentialMutation = useMutation(
    ({ id, data }: { id: number; data: Partial<CredentialFormData> }) => 
      mikrotikApi.updateCredential(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['credentials']);
        enqueueSnackbar('Kimlik bilgisi başarıyla güncellendi', { variant: 'success' });
        handleCloseDialog();
      },
      onError: (error: any) => {
        enqueueSnackbar(`Hata: ${error.response?.data?.detail || error.message}`, { variant: 'error' });
      },
    }
  );

  // Delete credential mutation
  const deleteCredentialMutation = useMutation(mikrotikApi.deleteCredential, {
    onSuccess: () => {
      queryClient.invalidateQueries(['credentials']);
      enqueueSnackbar('Kimlik bilgisi başarıyla silindi', { variant: 'success' });
    },
    onError: (error: any) => {
      enqueueSnackbar(`Hata: ${error.response?.data?.detail || error.message}`, { variant: 'error' });
    },
  });

  // Subnet mutations
  const createSubnetMutation = useMutation(mikrotikApi.createSubnet, {
    onSuccess: () => {
      queryClient.invalidateQueries(['subnets']);
      enqueueSnackbar('Subnet başarıyla eklendi', { variant: 'success' });
      handleCloseSubnetDialog();
    },
    onError: (error: any) => {
      enqueueSnackbar(`Hata: ${error.response?.data?.detail || error.message}`, { variant: 'error' });
    },
  });

  const updateSubnetMutation = useMutation(
    ({ id, data }: { id: number; data: any }) => 
      mikrotikApi.updateSubnet(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['subnets']);
        enqueueSnackbar('Subnet başarıyla güncellendi', { variant: 'success' });
        handleCloseSubnetDialog();
      },
      onError: (error: any) => {
        enqueueSnackbar(`Hata: ${error.response?.data?.detail || error.message}`, { variant: 'error' });
      },
    }
  );

  const deleteSubnetMutation = useMutation(mikrotikApi.deleteSubnet, {
    onSuccess: () => {
      queryClient.invalidateQueries(['subnets']);
      enqueueSnackbar('Subnet başarıyla silindi', { variant: 'success' });
    },
    onError: (error: any) => {
      enqueueSnackbar(`Hata: ${error.response?.data?.detail || error.message}`, { variant: 'error' });
    },
  });

  // Group mutations
  const createGroupMutation = useMutation(mikrotikApi.createGroup, {
    onSuccess: () => {
      queryClient.invalidateQueries(['groups']);
      enqueueSnackbar('Grup başarıyla eklendi', { variant: 'success' });
      handleCloseGroupDialog();
    },
    onError: (error: any) => {
      enqueueSnackbar(`Hata: ${error.response?.data?.detail || error.message}`, { variant: 'error' });
    },
  });

  const updateGroupMutation = useMutation(
    ({ id, data }: { id: number; data: any }) => 
      mikrotikApi.updateGroup(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['groups']);
        enqueueSnackbar('Grup başarıyla güncellendi', { variant: 'success' });
        handleCloseGroupDialog();
      },
      onError: (error: any) => {
        enqueueSnackbar(`Hata: ${error.response?.data?.detail || error.message}`, { variant: 'error' });
      },
    }
  );

  const deleteGroupMutation = useMutation(mikrotikApi.deleteGroup, {
    onSuccess: () => {
      queryClient.invalidateQueries(['groups']);
      enqueueSnackbar('Grup başarıyla silindi', { variant: 'success' });
    },
    onError: (error: any) => {
      enqueueSnackbar(`Hata: ${error.response?.data?.detail || error.message}`, { variant: 'error' });
    },
  });

  const handleOpenDialog = (credential?: Credential) => {
    if (credential) {
      setEditingCredential(credential);
      setCredentialForm({
        name: credential.name,
        username: credential.username,
        password: credential.password,
        description: credential.description || '',
        is_default: credential.is_default
      });
    } else {
      setEditingCredential(null);
      setCredentialForm({
        name: '',
        username: '',
        password: '',
        description: '',
        is_default: false
      });
    }
    setCredentialDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setCredentialDialogOpen(false);
    setEditingCredential(null);
  };

  const handleSaveCredential = () => {
    if (!credentialForm.name || !credentialForm.username || !credentialForm.password) {
      enqueueSnackbar('Lütfen zorunlu alanları doldurun', { variant: 'warning' });
      return;
    }

    if (editingCredential) {
      updateCredentialMutation.mutate({
        id: editingCredential.id,
        data: credentialForm
      });
    } else {
      createCredentialMutation.mutate(credentialForm);
    }
  };

  const handleDeleteCredential = (credential: Credential) => {
    if (window.confirm(`"${credential.name}" kimlik bilgisini silmek istediğinizden emin misiniz?`)) {
      deleteCredentialMutation.mutate(credential.id);
    }
  };

  // Subnet handlers
  const handleOpenSubnetDialog = (subnet?: Subnet) => {
    if (subnet) {
      setEditingSubnet(subnet);
      setSubnetForm({
        name: subnet.name,
        network: subnet.network,
        cidr: subnet.cidr,
        is_active: subnet.is_active
      });
    } else {
      setEditingSubnet(null);
      setSubnetForm({
        name: '',
        network: '',
        cidr: 24,
        is_active: true
      });
    }
    setSubnetDialogOpen(true);
  };

  const handleCloseSubnetDialog = () => {
    setSubnetDialogOpen(false);
    setEditingSubnet(null);
  };

  const handleSaveSubnet = () => {
    if (!subnetForm.name || !subnetForm.network || !subnetForm.cidr) {
      enqueueSnackbar('Lütfen zorunlu alanları doldurun', { variant: 'warning' });
      return;
    }

    const submitData = {
      name: subnetForm.name,
      network: subnetForm.network,
      cidr: subnetForm.cidr,
      is_active: subnetForm.is_active
    };

    if (editingSubnet) {
      updateSubnetMutation.mutate({
        id: editingSubnet.id,
        data: submitData
      });
    } else {
      createSubnetMutation.mutate(submitData);
    }
  };

  const handleDeleteSubnet = (subnet: Subnet) => {
    if (window.confirm(`"${subnet.name}" subnet'ini silmek istediğinizden emin misiniz?`)) {
      deleteSubnetMutation.mutate(subnet.id);
    }
  };

  // Group handlers
  const handleOpenGroupDialog = (group?: Group) => {
    if (group) {
      setEditingGroup(group);
      setGroupForm({
        name: group.name,
        description: group.description || '',
        color: group.color,
        is_active: group.is_active
      });
    } else {
      setEditingGroup(null);
      setGroupForm({
        name: '',
        description: '',
        color: '#1976d2',
        is_active: true
      });
    }
    setGroupDialogOpen(true);
  };

  const handleCloseGroupDialog = () => {
    setGroupDialogOpen(false);
    setEditingGroup(null);
  };

  const handleSaveGroup = () => {
    if (!groupForm.name) {
      enqueueSnackbar('Lütfen grup adını girin', { variant: 'warning' });
      return;
    }

    if (editingGroup) {
      updateGroupMutation.mutate({
        id: editingGroup.id,
        data: groupForm
      });
    } else {
      createGroupMutation.mutate(groupForm);
    }
  };

  const handleDeleteGroup = (group: Group) => {
    if (window.confirm(`"${group.name}" grubunu silmek istediğinizden emin misiniz?`)) {
      deleteGroupMutation.mutate(group.id);
    }
  };

  // Group-Subnet handlers
  const handleOpenSubnetSelector = (group: Group) => {
    setSelectedGroupForSubnet(group);
    setSubnetSelectorOpen(true);
  };

  const handleCloseSubnetSelector = () => {
    setSubnetSelectorOpen(false);
    setSelectedGroupForSubnet(null);
  };

  const handleAddSubnetToGroup = (subnetId: number) => {
    if (selectedGroupForSubnet) {
      addSubnetToGroupMutation.mutate({
        groupId: selectedGroupForSubnet.id,
        subnetId: subnetId
      });
    }
  };

  const handleRemoveSubnetFromGroup = (groupId: number, subnetId: number) => {
    removeSubnetFromGroupMutation.mutate({
      groupId: groupId,
      subnetId: subnetId
    });
  };

  // Group-Subnet mutations
  const addSubnetToGroupMutation = useMutation(
    ({ groupId, subnetId }: { groupId: number; subnetId: number }) => 
      mikrotikApi.addSubnetToGroup(groupId, subnetId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['groups']);
        loadGroupSubnets();
        enqueueSnackbar('Subnet başarıyla gruba eklendi', { variant: 'success' });
        handleCloseSubnetSelector();
      },
      onError: (error: any) => {
        enqueueSnackbar(`Hata: ${error.response?.data?.detail || error.message}`, { variant: 'error' });
      },
    }
  );

  const removeSubnetFromGroupMutation = useMutation(
    ({ groupId, subnetId }: { groupId: number; subnetId: number }) => 
      mikrotikApi.removeSubnetFromGroup(groupId, subnetId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['groups']);
        loadGroupSubnets();
        enqueueSnackbar('Subnet başarıyla gruptan çıkarıldı', { variant: 'success' });
      },
      onError: (error: any) => {
        enqueueSnackbar(`Hata: ${error.response?.data?.detail || error.message}`, { variant: 'error' });
      },
    }
  );

  // Load group subnets
  const loadGroupSubnets = async () => {
    try {
      const groupSubnetsData: {[key: number]: Subnet[]} = {};
      
      for (const group of groups) {
        const response = await mikrotikApi.getGroupSubnets(group.id);
        groupSubnetsData[group.id] = response.data;
      }
      
      setGroupSubnets(groupSubnetsData);
    } catch (error) {
      console.error('Error loading group subnets:', error);
    }
  };

  // Device scanning handlers
  const handleOpenScanModal = (group: Group) => {
    setSelectedGroupForScan(group);
    setScanModalOpen(true);
    setScanResults(null);
    setSelectedDevices(new Set());
  };

  const handleCloseScanModal = () => {
    setScanModalOpen(false);
    setSelectedGroupForScan(null);
    setScanResults(null);
    setIsScanning(false);
    setSelectedDevices(new Set());
    setSelectedCredentialForDevices('');
  };

  const handleStartScan = async () => {
    if (!selectedGroupForScan) return;
    
    setIsScanning(true);
    try {
      const response = await mikrotikApi.scanGroupSubnets(selectedGroupForScan.id);
      setScanResults(response.data);
      enqueueSnackbar(`Tarama tamamlandı: ${response.data.total_found} cihaz bulundu`, { variant: 'success' });
    } catch (error: any) {
      enqueueSnackbar(`Tarama hatası: ${error?.response?.data?.detail || error.message}`, { variant: 'error' });
    } finally {
      setIsScanning(false);
    }
  };

  const handleDeviceSelect = (ipAddress: string, selected: boolean) => {
    const newSelected = new Set(selectedDevices);
    if (selected) {
      newSelected.add(ipAddress);
    } else {
      newSelected.delete(ipAddress);
    }
    setSelectedDevices(newSelected);
  };

  const handleSelectAll = (selectAll: boolean) => {
    if (selectAll) {
      // Sadece kayıtsız cihazları seç
      const unregisteredDevices = scanResults.scanned_devices
        .filter((device: any) => !device.is_registered)
        .map((device: any) => device.ip_address);
      setSelectedDevices(new Set(unregisteredDevices));
    } else {
      // Hiçbirini seçme
      setSelectedDevices(new Set());
    }
  };

  const handleSelectByMethod = (method: string) => {
    const devicesByMethod = scanResults.scanned_devices
      .filter((device: any) => !device.is_registered && device.detection_method === method)
      .map((device: any) => device.ip_address);
    setSelectedDevices(new Set([...Array.from(selectedDevices), ...devicesByMethod]));
  };

  const handleSelectFirst = (count: number) => {
    const firstDevices = scanResults.scanned_devices
      .filter((device: any) => !device.is_registered)
      .slice(0, count)
      .map((device: any) => device.ip_address);
    setSelectedDevices(new Set(firstDevices));
  };

  // Toplu seçim durumu hesapla
  const getSelectAllState = () => {
    if (!scanResults?.scanned_devices) return { checked: false, indeterminate: false };
    
    const unregisteredDevices = scanResults.scanned_devices.filter((device: any) => !device.is_registered);
    const selectedCount = unregisteredDevices.filter((device: any) => selectedDevices.has(device.ip_address)).length;
    
    if (selectedCount === 0) {
      return { checked: false, indeterminate: false };
    } else if (selectedCount === unregisteredDevices.length) {
      return { checked: true, indeterminate: false };
    } else {
      return { checked: false, indeterminate: true };
    }
  };

  const handleRegisterDevices = async () => {
    if (!selectedGroupForScan || !scanResults || selectedDevices.size === 0) return;
    
    if (selectedCredentialForDevices === '') {
      enqueueSnackbar('Lütfen bir kimlik bilgisi seçin', { variant: 'warning' });
      return;
    }

    const selectedCredential = credentials.find((cred: any) => cred.id === selectedCredentialForDevices);
    if (!selectedCredential) {
      enqueueSnackbar('Seçilen kimlik bilgisi bulunamadı', { variant: 'error' });
      return;
    }

    const devicesToRegister = scanResults.scanned_devices
      .filter((device: any) => selectedDevices.has(device.ip_address) && !device.is_registered)
      .map((device: any) => ({
        ip_address: device.ip_address,
        name: `Device-${device.ip_address}`,
        username: selectedCredential.username,
        password: selectedCredential.password,
        port: device.detection_port || 8728,
        detection_method: device.detection_method
      }));

    try {
      const response = await mikrotikApi.registerDiscoveredDevices(selectedGroupForScan.id, devicesToRegister);
      enqueueSnackbar(`${response.data.success_count} cihaz başarıyla kaydedildi`, { variant: 'success' });
      
      if (response.data.failure_count > 0) {
        enqueueSnackbar(`${response.data.failure_count} cihaz kaydedilemedi`, { variant: 'warning' });
      }
      
      // Kayıtlı cihazların gerçek adlarını çek ve güncelle
      if (response.data.registered_devices && response.data.registered_devices.length > 0) {
        enqueueSnackbar('Cihaz adları güncelleniyor...', { variant: 'info' });
        
        // Her kayıtlı cihaz için gerçek adını çek
        const updatePromises = response.data.registered_devices.map(async (device: any) => {
          try {
            const systemInfo = await mikrotikApi.getDeviceSystemInfo(device.id);
            const realName = systemInfo.data.system_info?.identity?.name;
            const boardName = systemInfo.data.system_info?.system?.board_name;
            
            if (realName && realName !== device.name) {
              const updateData: any = { 
                name: realName,
                manual_override: true
              };
              if (boardName) {
                updateData.router_board = boardName;
              }
              
              await mikrotikApi.updateDevice(device.id, updateData);
              return { success: true, ip: device.ip_address, name: realName };
            }
          } catch (error) {
            console.error(`Error updating device ${device.ip_address}:`, error);
            return { success: false, ip: device.ip_address };
          }
        });
        
        // Tüm güncellemeleri bekle
        const updateResults = await Promise.allSettled(updatePromises);
        const successfulUpdates = updateResults.filter(result => 
          result.status === 'fulfilled' && result.value.success
        ).length;
        
        if (successfulUpdates > 0) {
          enqueueSnackbar(`${successfulUpdates} cihazın adı başarıyla güncellendi`, { variant: 'success' });
        }
      }
      
      // Refresh caches
      queryClient.invalidateQueries(['devices']); // Ana cihaz listesini güncelle
      queryClient.invalidateQueries(['stats']); // Dashboard istatistiklerini güncelle
      handleStartScan(); // Scan sonuçlarını güncelle
      setSelectedDevices(new Set());
      setSelectedCredentialForDevices('');
    } catch (error: any) {
      enqueueSnackbar(`Kayıt hatası: ${error?.response?.data?.detail || error.message}`, { variant: 'error' });
    }
  };

  // Load group subnets when groups change
  useEffect(() => {
    if (groups.length > 0) {
      loadGroupSubnets();
    }
  }, [groups]);

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Ayarlar yüklenirken hata oluştu
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" alignItems="center" mb={3}>
        <SettingsIcon sx={{ mr: 2, fontSize: 32 }} />
        <Typography variant="h4" component="h1">
          Sistem Ayarları
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Credential Management Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box display="flex" alignItems="center">
                  <VpnKey sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Kimlik Bilgileri Yönetimi
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => handleOpenDialog()}
                >
                  Yeni Kimlik Bilgisi
                </Button>
              </Box>

              <Typography variant="body2" color="textSecondary" mb={2}>
                MikroTik cihazlarında kullanılacak kullanıcı adı/şifre kombinasyonlarını burada yönetebilirsiniz.
              </Typography>

              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Ad</TableCell>
                      <TableCell>Kullanıcı Adı</TableCell>
                      <TableCell>Şifre</TableCell>
                      <TableCell>Açıklama</TableCell>
                      <TableCell>Varsayılan</TableCell>
                      <TableCell>İşlemler</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {credentials.map((credential: Credential) => (
                      <TableRow key={credential.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {credential.name}
                          </Typography>
                        </TableCell>
                        <TableCell>{credential.username}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {'•'.repeat(credential.password.length)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="textSecondary">
                            {credential.description || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {credential.is_default && (
                            <Chip label="Varsayılan" color="primary" size="small" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Düzenle">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog(credential)}
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Sil">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteCredential(credential)}
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                    {credentials.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography variant="body2" color="textSecondary">
                            Henüz kimlik bilgisi eklenmemiş
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Subnet Management Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box display="flex" alignItems="center">
                  <Typography variant="h6">
                    IP Subnet Yönetimi
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => handleOpenSubnetDialog()}
                >
                  Yeni Subnet
                </Button>
              </Box>

              <Typography variant="body2" color="textSecondary" mb={2}>
                Ağ segmentlerinizi ve IP aralıklarınızı burada tanımlayarak cihaz ekleme işlemlerinde hızlıca kullanabilirsiniz.
              </Typography>

              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Ad</TableCell>
                      <TableCell>Ağ/CIDR</TableCell>
                      <TableCell>IP Aralığı</TableCell>
                      <TableCell>IP Sayısı</TableCell>
                      <TableCell>Gruplar</TableCell>
                      <TableCell>Durum</TableCell>
                      <TableCell>İşlemler</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {subnets.map((subnet: Subnet) => {
                      const calculateNetworkInfo = () => {
                        try {
                          const cidr = subnet.cidr;
                          const totalIPs = Math.pow(2, 32 - cidr);
                          const usableIPs = totalIPs > 2 ? totalIPs - 2 : 0;
                          const networkParts = subnet.network.split('.').map(Number);
                          const maskBits = cidr;
                          
                          // Calculate first and last IP
                          const networkInt = (networkParts[0] << 24) | (networkParts[1] << 16) | (networkParts[2] << 8) | networkParts[3];
                          const firstIP = networkInt;
                          const lastIP = networkInt + totalIPs - 1;
                          
                          const firstIPStr = [
                            (firstIP >>> 24) & 0xFF,
                            (firstIP >>> 16) & 0xFF,
                            (firstIP >>> 8) & 0xFF,
                            firstIP & 0xFF
                          ].join('.');
                          
                          const lastIPStr = [
                            (lastIP >>> 24) & 0xFF,
                            (lastIP >>> 16) & 0xFF,
                            (lastIP >>> 8) & 0xFF,
                            lastIP & 0xFF
                          ].join('.');
                          
                          return {
                            first_ip: firstIPStr,
                            last_ip: lastIPStr,
                            total_ips: totalIPs,
                            usable_ips: usableIPs
                          };
                        } catch {
                          return {
                            first_ip: 'Invalid',
                            last_ip: 'Invalid',
                            total_ips: 0,
                            usable_ips: 0
                          };
                        }
                      };
                      
                      const networkInfo = calculateNetworkInfo();
                      
                      return (
                        <TableRow key={subnet.id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {subnet.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontFamily="monospace">
                              {subnet.network}/{subnet.cidr}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontFamily="monospace" fontSize="0.8rem">
                              {networkInfo.first_ip} - {networkInfo.last_ip}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {networkInfo.usable_ips.toLocaleString()} / {networkInfo.total_ips.toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" flexWrap="wrap" gap={0.5}>
                              {subnet.groups && subnet.groups.length > 0 ? (
                                subnet.groups.map((group) => (
                                  <Chip
                                    key={group.id}
                                    label={group.name}
                                    size="small"
                                    sx={{
                                      backgroundColor: group.color,
                                      color: 'white',
                                      fontSize: '0.7rem',
                                      height: 20
                                    }}
                                  />
                                ))
                              ) : (
                                <Typography variant="body2" color="textSecondary" fontSize="0.8rem">
                                  Grup yok
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={subnet.is_active ? 'Aktif' : 'Pasif'} 
                              color={subnet.is_active ? 'success' : 'default'}
                              size="small" 
                            />
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Düzenle">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenSubnetDialog(subnet)}
                              >
                                <Edit />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Sil">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteSubnet(subnet)}
                              >
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {subnets.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography variant="body2" color="textSecondary">
                            Henüz subnet eklenmemiş
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Group Management Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box display="flex" alignItems="center">
                  <Typography variant="h6">
                    Grup Yönetimi
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => handleOpenGroupDialog()}
                >
                  Yeni Grup
                </Button>
              </Box>

              <Typography variant="body2" color="textSecondary" mb={2}>
                Cihazlarınızı kategorilere ayırarak daha kolay yönetebilirsiniz.
              </Typography>

              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Renk</TableCell>
                      <TableCell>Grup Adı</TableCell>
                      <TableCell>Açıklama</TableCell>
                      <TableCell>Subnet'ler</TableCell>
                      <TableCell>Durum</TableCell>
                      <TableCell>İşlemler</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {groups.map((group: Group) => (
                      <TableRow key={group.id}>
                        <TableCell>
                          <Box
                            sx={{
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              backgroundColor: group.color,
                              border: '1px solid #e0e0e0'
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {group.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="textSecondary">
                            {group.description || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" flexDirection="column" gap={1}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="body2" color="textSecondary">
                                {groupSubnets[group.id]?.length || 0} subnet
                              </Typography>
                              <Tooltip title="Subnet Ekle">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenSubnetSelector(group)}
                                >
                                  <Add />
                                </IconButton>
                              </Tooltip>
                            </Box>
                            {groupSubnets[group.id] && groupSubnets[group.id].length > 0 && (
                              <Box display="flex" flexWrap="wrap" gap={0.5}>
                                {groupSubnets[group.id].map((subnet: Subnet) => (
                                  <Chip
                                    key={subnet.id}
                                    label={`${subnet.name} (${subnet.network}/${subnet.cidr})`}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      fontSize: '0.7rem',
                                      height: 20,
                                      borderColor: group.color,
                                      color: group.color
                                    }}
                                  />
                                ))}
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={group.is_active ? 'Aktif' : 'Pasif'} 
                            color={group.is_active ? 'success' : 'default'}
                            size="small" 
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Cihaz Tarama">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleOpenScanModal(group)}
                              disabled={!groupSubnets[group.id] || groupSubnets[group.id].length === 0}
                            >
                              <Search />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Düzenle">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenGroupDialog(group)}
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Sil">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteGroup(group)}
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                    {groups.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography variant="body2" color="textSecondary">
                            Henüz grup eklenmemiş
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Credential Dialog */}
      <Dialog 
        open={credentialDialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingCredential ? 'Kimlik Bilgisini Düzenle' : 'Yeni Kimlik Bilgisi Ekle'}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              fullWidth
              label="Ad *"
              value={credentialForm.name}
              onChange={(e) => setCredentialForm({ ...credentialForm, name: e.target.value })}
              placeholder="ör: Varsayılan Admin"
              helperText="Bu kimlik bilgisi için açıklayıcı bir ad"
            />
            <TextField
              fullWidth
              label="Kullanıcı Adı *"
              value={credentialForm.username}
              onChange={(e) => setCredentialForm({ ...credentialForm, username: e.target.value })}
              placeholder="ör: admin"
            />
            <TextField
              fullWidth
              label="Şifre *"
              type="password"
              value={credentialForm.password}
              onChange={(e) => setCredentialForm({ ...credentialForm, password: e.target.value })}
            />
            <TextField
              fullWidth
              label="Açıklama"
              multiline
              rows={2}
              value={credentialForm.description}
              onChange={(e) => setCredentialForm({ ...credentialForm, description: e.target.value })}
              placeholder="Bu kimlik bilgisi hakkında notlar..."
            />
            <FormControlLabel
              control={
                <Switch
                  checked={credentialForm.is_default}
                  onChange={(e) => setCredentialForm({ ...credentialForm, is_default: e.target.checked })}
                />
              }
              label="Varsayılan kimlik bilgisi olarak ayarla"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} startIcon={<Cancel />}>
            İptal
          </Button>
          <Button 
            onClick={handleSaveCredential}
            variant="contained"
            startIcon={<Save />}
            disabled={createCredentialMutation.isLoading || updateCredentialMutation.isLoading}
          >
            {editingCredential ? 'Güncelle' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Subnet Dialog */}
      <Dialog 
        open={subnetDialogOpen} 
        onClose={handleCloseSubnetDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingSubnet ? 'Subnet Düzenle' : 'Yeni Subnet Ekle'}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Subnet Adı *"
                  value={subnetForm.name}
                  onChange={(e) => setSubnetForm({ ...subnetForm, name: e.target.value })}
                  placeholder="ör: Ofis Ağı"
                  helperText="Bu subnet için açıklayıcı bir ad"
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Ağ Adresi *"
                  value={subnetForm.network}
                  onChange={(e) => setSubnetForm({ ...subnetForm, network: e.target.value })}
                  placeholder="192.168.1.0"
                  helperText="Ağ adresi"
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="CIDR *"
                  type="number"
                  value={subnetForm.cidr}
                  onChange={(e) => setSubnetForm({ ...subnetForm, cidr: parseInt(e.target.value) || 24 })}
                  inputProps={{ min: 1, max: 32 }}
                  helperText="Subnet maskesi"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={subnetForm.is_active}
                      onChange={(e) => setSubnetForm({ ...subnetForm, is_active: e.target.checked })}
                    />
                  }
                  label="Aktif subnet"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSubnetDialog} startIcon={<Cancel />}>
            İptal
          </Button>
          <Button 
            onClick={handleSaveSubnet}
            variant="contained"
            startIcon={<Save />}
            disabled={createSubnetMutation.isLoading || updateSubnetMutation.isLoading}
          >
            {editingSubnet ? 'Güncelle' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Group Dialog */}
      <Dialog 
        open={groupDialogOpen} 
        onClose={handleCloseGroupDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingGroup ? 'Grup Düzenle' : 'Yeni Grup Ekle'}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              fullWidth
              label="Grup Adı *"
              value={groupForm.name}
              onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
              placeholder="ör: Ofis Cihazları"
              helperText="Bu grup için açıklayıcı bir ad"
            />
            <TextField
              fullWidth
              label="Açıklama"
              multiline
              rows={2}
              value={groupForm.description}
              onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
              placeholder="Bu grup hakkında açıklama..."
            />
            <Box>
              <Typography variant="body2" color="textSecondary" mb={1}>
                Grup Rengi
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                {[
                  '#1976d2', '#2e7d32', '#d32f2f', '#1565c0', 
                  '#e65100', '#6a1b9a', '#455a64', '#f57c00'
                ].map((color) => (
                  <Box
                    key={color}
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      backgroundColor: color,
                      border: groupForm.color === color ? '3px solid #000' : '1px solid #e0e0e0',
                      cursor: 'pointer',
                      '&:hover': {
                        transform: 'scale(1.1)'
                      }
                    }}
                    onClick={() => setGroupForm({ ...groupForm, color })}
                  />
                ))}
              </Box>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={groupForm.is_active}
                  onChange={(e) => setGroupForm({ ...groupForm, is_active: e.target.checked })}
                />
              }
              label="Aktif grup"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseGroupDialog} startIcon={<Cancel />}>
            İptal
          </Button>
          <Button 
            onClick={handleSaveGroup}
            variant="contained"
            startIcon={<Save />}
            disabled={createGroupMutation.isLoading || updateGroupMutation.isLoading}
          >
            {editingGroup ? 'Güncelle' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Subnet Selector Dialog */}
      <Dialog 
        open={subnetSelectorOpen} 
        onClose={handleCloseSubnetSelector}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Subnet Ekle: {selectedGroupForSubnet?.name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" mb={2}>
            Bu gruba eklemek istediğiniz subnet'i seçin:
          </Typography>
          
          {/* Show current group subnets */}
          {selectedGroupForSubnet && groupSubnets[selectedGroupForSubnet.id]?.length > 0 && (
            <Box mb={2}>
              <Typography variant="subtitle2" mb={1}>
                Mevcut Subnet'ler:
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {groupSubnets[selectedGroupForSubnet.id].map((subnet: Subnet) => (
                  <Chip 
                    key={subnet.id}
                    label={`${subnet.name} (${subnet.network}/${subnet.cidr})`}
                    onDelete={() => handleRemoveSubnetFromGroup(selectedGroupForSubnet.id, subnet.id)}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}
          
          {/* Available subnets */}
          <Typography variant="subtitle2" mb={1}>
            Eklenebilir Subnet'ler (Hiçbir gruba eklenmemiş):
          </Typography>
          <Box display="flex" flexDirection="column" gap={1}>
            {subnets
              .filter((subnet: Subnet) => {
                // Sadece hiçbir gruba eklenmemiş subnet'leri göster
                const isInAnyGroup = subnet.groups && subnet.groups.length > 0;
                return !isInAnyGroup;
              })
              .map((subnet: Subnet) => (
                <Box 
                  key={subnet.id}
                  display="flex" 
                  alignItems="center" 
                  justifyContent="space-between"
                  p={1}
                  border="1px solid #e0e0e0"
                  borderRadius={1}
                >
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {subnet.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {subnet.network}/{subnet.cidr}
                    </Typography>
                  </Box>
                  <Button 
                    size="small" 
                    variant="outlined"
                    onClick={() => handleAddSubnetToGroup(subnet.id)}
                  >
                    Ekle
                  </Button>
                </Box>
              ))}
            {subnets.filter((subnet: Subnet) => !(subnet.groups && subnet.groups.length > 0)).length === 0 && (
              <Typography variant="body2" color="textSecondary" textAlign="center">
                Tüm subnet'ler bir gruba eklenmiş
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSubnetSelector}>
            Kapat
          </Button>
        </DialogActions>
      </Dialog>

      {/* Device Scan Modal */}
      <Dialog 
        open={scanModalOpen} 
        onClose={handleCloseScanModal}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Cihaz Tarama: {selectedGroupForScan?.name}
        </DialogTitle>
        <DialogContent>
          {!scanResults && (
            <Box textAlign="center" py={3}>
              <Typography variant="body1" mb={2}>
                Bu grubun subnet'lerinde cihaz taraması başlatmak için "Tarama Yap" butonuna tıklayın.
              </Typography>
              {selectedGroupForScan && groupSubnets[selectedGroupForScan.id] && (
                <Box mb={2}>
                  <Typography variant="body2" color="textSecondary">
                    Taranacak Subnet'ler:
                  </Typography>
                  {groupSubnets[selectedGroupForScan.id].map((subnet) => (
                    <Chip
                      key={subnet.id}
                      label={`${subnet.name} (${subnet.network}/${subnet.cidr})`}
                      size="small"
                      sx={{ margin: 0.5 }}
                    />
                  ))}
                </Box>
              )}
              <Button
                variant="contained"
                color="primary"
                onClick={handleStartScan}
                disabled={isScanning}
                size="large"
                startIcon={isScanning ? undefined : <Search />}
              >
                {isScanning ? 'Tarama Yapılıyor...' : 'Tarama Yap'}
              </Button>
            </Box>
          )}

          {scanResults && (
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Tarama Sonuçları
                </Typography>
                <Button
                  variant="outlined"
                  onClick={handleStartScan}
                  disabled={isScanning}
                  startIcon={<Search />}
                >
                  Yeniden Tara
                </Button>
              </Box>

              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box display="flex" gap={2}>
                  <Chip 
                    label={`Toplam: ${scanResults.total_found}`} 
                    color="primary" 
                    size="small" 
                  />
                  <Chip 
                    label={`Kayıtlı: ${scanResults.registered_count}`} 
                    color="success" 
                    size="small" 
                  />
                  <Chip 
                    label={`Kayıtsız: ${scanResults.unregistered_count}`} 
                    color="warning" 
                    size="small" 
                  />
                  {selectedDevices.size > 0 && (
                    <Chip 
                      label={`Seçili: ${selectedDevices.size}`} 
                      color="info" 
                      size="small" 
                    />
                  )}
                </Box>
                
                {scanResults.unregistered_count > 0 && (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={getSelectAllState().checked}
                        indeterminate={getSelectAllState().indeterminate}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2" color="textSecondary">
                        {getSelectAllState().checked ? 'Hiçbirini Seç' : 
                         getSelectAllState().indeterminate ? 'Tümünü Seç' : 'Tümünü Seç'}
                      </Typography>
                    }
                  />
                )}
              </Box>

              {/* Hızlı Seçim Butonları */}
              {scanResults.unregistered_count > 0 && (
                <Box mb={2} p={2} bgcolor="grey.50" borderRadius={1}>
                  <Typography variant="body2" color="textSecondary" mb={1}>
                    Hızlı Seçim:
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleSelectFirst(5)}
                      disabled={scanResults.unregistered_count === 0}
                    >
                      İlk 5'i Seç
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleSelectFirst(10)}
                      disabled={scanResults.unregistered_count < 10}
                    >
                      İlk 10'u Seç
                    </Button>
                    {scanResults.scanned_devices.some((d: any) => !d.is_registered && d.detection_method === 'api') && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        onClick={() => handleSelectByMethod('api')}
                      >
                        API Cihazları
                      </Button>
                    )}
                    {scanResults.scanned_devices.some((d: any) => !d.is_registered && d.detection_method === 'ssh') && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        onClick={() => handleSelectByMethod('ssh')}
                      >
                        SSH Cihazları
                      </Button>
                    )}
                    {scanResults.scanned_devices.some((d: any) => !d.is_registered && d.detection_method === 'http') && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleSelectByMethod('http')}
                      >
                        HTTP Cihazları
                      </Button>
                    )}
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => setSelectedDevices(new Set())}
                      disabled={selectedDevices.size === 0}
                    >
                      Seçimi Temizle
                    </Button>
                  </Box>
                </Box>
              )}

              {scanResults.scanned_devices && scanResults.scanned_devices.length > 0 ? (
                <Box>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={getSelectAllState().checked}
                              indeterminate={getSelectAllState().indeterminate}
                              onChange={(e) => handleSelectAll(e.target.checked)}
                              disabled={!scanResults.scanned_devices.some((device: any) => !device.is_registered)}
                            />
                          </TableCell>
                          <TableCell>IP Adresi</TableCell>
                          <TableCell>Subnet</TableCell>
                          <TableCell>Algılama</TableCell>
                          <TableCell>Port</TableCell>
                          <TableCell>Durum</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {scanResults.scanned_devices.map((device: any) => (
                          <TableRow key={device.ip_address}>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={selectedDevices.has(device.ip_address)}
                                onChange={(e) => handleDeviceSelect(device.ip_address, e.target.checked)}
                                disabled={device.is_registered}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontFamily="monospace">
                                {device.ip_address}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="textSecondary">
                                {device.subnet_name}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={device.detection_method}
                                size="small"
                                color={device.detection_method === 'api' ? 'success' : device.detection_method === 'ssh' ? 'primary' : 'default'}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontFamily="monospace">
                                {device.detection_port || 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {device.is_registered ? (
                                <Chip
                                  label={`Kayıtlı: ${device.existing_device_name}`}
                                  size="small"
                                  color="success"
                                />
                              ) : (
                                <Chip
                                  label="Kayıtsız"
                                  size="small"
                                  color="warning"
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {selectedDevices.size > 0 && (
                    <Box mt={2}>
                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Kimlik Bilgisi Seçin *</InputLabel>
                        <Select
                          value={selectedCredentialForDevices}
                          onChange={(e) => setSelectedCredentialForDevices(e.target.value as number | '')}
                          label="Kimlik Bilgisi Seçin *"
                        >
                          <MenuItem value="">
                            <em>Kimlik bilgisi seçin</em>
                          </MenuItem>
                          {credentials.map((credential: any) => (
                            <MenuItem key={credential.id} value={credential.id}>
                              {credential.name} ({credential.username})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      
                      <Box textAlign="center">
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={handleRegisterDevices}
                          startIcon={<Add />}
                          disabled={selectedCredentialForDevices === ''}
                        >
                          Seçili Cihazları Kaydet ({selectedDevices.size})
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Box>
              ) : (
                <Typography variant="body1" textAlign="center" color="textSecondary">
                  Bu subnet'lerde hiç cihaz bulunamadı.
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseScanModal}>
            Kapat
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 
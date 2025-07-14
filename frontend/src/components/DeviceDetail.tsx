import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  ArrowBack,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Info,
  PlayArrow,
  RestartAlt,
  Terminal,
  Computer,
  Send
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useSnackbar } from 'notistack';
import { mikrotikApi } from '../services/api';
import { MikrotikDevice } from '../types/mikrotik';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = ({ children, value, index, ...other }: TabPanelProps) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

// Sistem Bilgileri Component'i
const SystemInfoTab: React.FC<{ deviceId: number }> = ({ deviceId }) => {
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const fetchSystemInfo = async () => {
    try {
      setLoading(true);
      const response = await mikrotikApi.getDeviceSystemInfo(deviceId);
      setSystemInfo(response.data.system_info);
    } catch (error) {
      console.error('System info error:', error);
      enqueueSnackbar('Sistem bilgileri alınırken hata oluştu', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchSystemInfo();
  }, [deviceId, fetchSystemInfo]);

  const formatBytes = (bytes: number | string) => {
    if (bytes === 'N/A' || !bytes) return 'N/A';
    const numBytes = typeof bytes === 'string' ? parseInt(bytes) : bytes;
    if (numBytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(numBytes) / Math.log(k));
    return parseFloat((numBytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatFrequency = (freq: number | string) => {
    if (freq === 'N/A' || !freq) return 'N/A';
    const numFreq = typeof freq === 'string' ? parseInt(freq) : freq;
    return `${numFreq} MHz`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  if (!systemInfo) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" minHeight="300px" gap={2}>
        <Typography variant="h6">Sistem bilgileri alınamadı</Typography>
        <Button variant="outlined" onClick={fetchSystemInfo}>
          Tekrar Dene
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Sistem Bilgileri
      </Typography>
      
      <Grid container spacing={3}>
        {/* Cihaz Kimliği */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                <Computer sx={{ mr: 1, verticalAlign: 'middle' }} />
                Cihaz Kimliği
              </Typography>
              <Typography><strong>Adı:</strong> {systemInfo.identity?.name || 'N/A'}</Typography>
              <Typography><strong>Model:</strong> {systemInfo.hardware?.model || 'N/A'}</Typography>
              <Typography><strong>Seri No:</strong> {systemInfo.hardware?.serial_number || 'N/A'}</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* İşlemci Bilgileri */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                İşlemci (CPU)
              </Typography>
              <Typography><strong>Çekirdek Sayısı:</strong> {systemInfo.cpu?.cpu_count || 'N/A'}</Typography>
              <Typography><strong>Frekans:</strong> {formatFrequency(systemInfo.cpu?.cpu_frequency)}</Typography>
              <Typography><strong>Yük:</strong> {systemInfo.cpu?.cpu_load || 'N/A'}%</Typography>
              <Typography><strong>Mimari:</strong> {systemInfo.cpu?.architecture || 'N/A'}</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Bellek Bilgileri */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                Bellek (RAM)
              </Typography>
              <Typography><strong>Toplam RAM:</strong> {formatBytes(systemInfo.memory?.total_memory)}</Typography>
              <Typography><strong>Boş RAM:</strong> {formatBytes(systemInfo.memory?.free_memory)}</Typography>
              <Typography><strong>Toplam Disk:</strong> {formatBytes(systemInfo.memory?.total_hdd_space)}</Typography>
              <Typography><strong>Boş Disk:</strong> {formatBytes(systemInfo.memory?.free_hdd_space)}</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Sistem Bilgileri */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                Sistem
              </Typography>
              <Typography><strong>Platform:</strong> {systemInfo.system?.platform || 'N/A'}</Typography>
              <Typography><strong>Versiyon:</strong> {systemInfo.system?.version || 'N/A'}</Typography>
              <Typography><strong>Donanım:</strong> {systemInfo.system?.board_name || 'N/A'}</Typography>
              <Typography><strong>Çalışma Süresi:</strong> {systemInfo.system?.uptime || 'N/A'}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box mt={3}>
        <Button variant="outlined" onClick={fetchSystemInfo} disabled={loading}>
          Bilgileri Yenile
        </Button>
      </Box>
    </Box>
  );
};

export const DeviceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [commandDialogOpen, setCommandDialogOpen] = useState(false);
  const [command, setCommand] = useState('');
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const deviceId = parseInt(id || '0', 10);

  const { data: deviceResponse, isLoading: deviceLoading } = useQuery(
    ['device', deviceId],
    () => mikrotikApi.getDevice(deviceId),
    {
      enabled: !!deviceId,
    }
  );
  
  const device = deviceResponse?.data;

  const testConnectionMutation = useMutation(mikrotikApi.testConnection, { 
    onSuccess: (result: any) => {
      if (result.data.success) {
        enqueueSnackbar('Bağlantı başarılı', { variant: 'success' });
      } else {
        enqueueSnackbar(`Bağlantı hatası: ${result.data.message}`, { variant: 'error' });
      }
      queryClient.invalidateQueries(['device', deviceId]);
    },
    onError: (error) => {
      enqueueSnackbar('Bağlantı testi sırasında hata oluştu', { variant: 'error' });
      console.error('Test connection error:', error);
    },
  });

  const rebootMutation = useMutation(mikrotikApi.rebootDevice, {
    onSuccess: () => {
      enqueueSnackbar('Cihaz yeniden başlatılıyor', { variant: 'success' });
      queryClient.invalidateQueries(['device', deviceId]);
    },
    onError: (error) => {
      enqueueSnackbar('Yeniden başlatma hatası', { variant: 'error' });
      console.error('Reboot error:', error);
    },
  });

  const executeCommandMutation = useMutation(
    (cmd: string) => mikrotikApi.executeCommand(deviceId, cmd),
    {
      onSuccess: () => {
        enqueueSnackbar('Komut gönderildi', { variant: 'success' });
        queryClient.invalidateQueries(['device', deviceId]);
      },
      onError: (error) => {
        enqueueSnackbar('Komut gönderme hatası', { variant: 'error' });
        console.error('Execute command error:', error);
      },
    }
  );

  const { data: interfaces = [] } = useQuery(
    ['interfaces', deviceId],
    () => mikrotikApi.getDeviceInterfaces(deviceId).then(res => res.data),
    {
      enabled: !!deviceId,
      refetchInterval: 10000,
    }
  );

  const { data: logs = [] } = useQuery(
    ['logs', deviceId],
    () => mikrotikApi.getDeviceLogs(deviceId).then(res => res.data),
    {
      enabled: !!deviceId,
      refetchInterval: 5000,
    }
  );

  const handleExecuteCommand = () => {
    if (command.trim()) {
      executeCommandMutation.mutate(command);
    }
  };

  const getStatusChip = (device: MikrotikDevice) => {
    if (device.is_online) {
      return <Chip icon={<CheckCircle />} label="Çevrimiçi" color="success" />;
    } else {
      return <Chip icon={<ErrorIcon />} label="Çevrimdışı" color="error" />;
    }
  };

  const getLogLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <Warning color="warning" />;
      case 'info':
        return <Info color="info" />;
      default:
        return <CheckCircle color="success" />;
    }
  };



  if (deviceLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!device) {
    return (
      <Box p={3}>
        <Alert severity="error">Cihaz bulunamadı</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate('/devices')} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          {device.name}
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<PlayArrow />}
            onClick={() => testConnectionMutation.mutate(device.id)}
            disabled={testConnectionMutation.isLoading}
          >
            Bağlantı Testi
          </Button>
          <Button
            variant="outlined"
            startIcon={<RestartAlt />}
            onClick={() => rebootMutation.mutate(device.id)}
            disabled={rebootMutation.isLoading}
            color="warning"
          >
            Yeniden Başlat
          </Button>
          <Button
            variant="outlined"
            startIcon={<Terminal />}
            onClick={() => setCommandDialogOpen(true)}
          >
            Komut Çalıştır
          </Button>
        </Box>
      </Box>

      {/* Device Info Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Computer color="primary" />
                <Box>
                  <Typography variant="h6">{device.name}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {device.ip_address}:{device.port}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Durum</Typography>
              {getStatusChip(device)}
              {device.last_seen && (
                <Typography variant="body2" color="textSecondary" mt={1}>
                  Son görülme: {formatDistanceToNow(new Date(device.last_seen), { 
                    addSuffix: true, 
                    locale: tr 
                  })}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Sistem Bilgisi</Typography>
              <Typography variant="body2">
                Sürüm: {device.version || 'Bilinmiyor'}
              </Typography>
              <Typography variant="body2">
                Model: {device.router_board || 'Bilinmiyor'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Grup</Typography>
              <Chip label={device.group_name} size="small" />
              {device.location && (
                <Typography variant="body2" color="textSecondary" mt={1}>
                  Konum: {device.location}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          indicatorColor="primary"
          textColor="primary"
        >
                      <Tab label="Arayüzler" />
            <Tab label="Loglar" />
            <Tab label="Sistem Bilgileri" />
            <Tab label="Ayarlar" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {/* interfacesLoading ? ( // This line was removed as per the new_code */}
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          {/* ) : ( // This line was removed as per the new_code */}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Arayüz Adı</TableCell>
                    <TableCell>Tip</TableCell>
                    <TableCell>MAC Adresi</TableCell>
                    <TableCell>Durum</TableCell>
                    <TableCell>RX Bytes</TableCell>
                    <TableCell>TX Bytes</TableCell>
                    <TableCell>Son Güncelleme</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {interfaces.map((iface: any) => (
                    <TableRow key={iface.id}>
                      <TableCell>{iface.name}</TableCell>
                      <TableCell>{iface.type}</TableCell>
                      <TableCell>{iface.status}</TableCell>
                      <TableCell>{iface.ip_address}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          {/* )} // This line was removed as per the new_code */}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* logsLoading ? ( // This line was removed as per the new_code */}
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          {/* ) : ( // This line was removed as per the new_code */}
            <List>
              {logs.map((log: any) => (
                <ListItem key={log.id}>
                  <ListItemIcon>
                    {getLogLevelIcon(log.log_level)}
                  </ListItemIcon>
                  <ListItemText
                    primary={log.message}
                    secondary={`${log.log_level.toUpperCase()} - ${formatDistanceToNow(new Date(log.timestamp), { 
                      addSuffix: true, 
                      locale: tr 
                    })}`}
                  />
                </ListItem>
              ))}
            </List>
          {/* )} // This line was removed as per the new_code */}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <SystemInfoTab deviceId={deviceId} />
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            Cihaz Ayarları
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Cihaz Adı"
                value={device.name}
                fullWidth
                disabled
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="IP Adresi"
                value={device.ip_address}
                fullWidth
                disabled
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Port"
                value={device.port}
                fullWidth
                disabled
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Grup"
                value={device.group_name}
                fullWidth
                disabled
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Açıklama"
                value={device.description || ''}
                fullWidth
                multiline
                rows={3}
                disabled
              />
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Command Dialog */}
      <Dialog
        open={commandDialogOpen}
        onClose={() => setCommandDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Komut Çalıştır</DialogTitle>
        <DialogContent>
          <TextField
            label="RouterOS Komutu"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            fullWidth
            multiline
            rows={4}
            margin="normal"
            helperText="Örnek: system.resource (nokta ile ayrılmış komut yolu)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommandDialogOpen(false)}>
            İptal
          </Button>
          <Button
            onClick={handleExecuteCommand}
            variant="contained"
            startIcon={<Send />}
            disabled={executeCommandMutation.isLoading || !command.trim()}
          >
            {executeCommandMutation.isLoading ? <CircularProgress size={20} /> : 'Gönder'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeviceDetail; 
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  SignalWifiOff,
  Computer,
  Wifi,
  Error,
  CheckCircle,
  Memory,
  Warning,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useWebSocket } from '../hooks/useWebSocket';
import { mikrotikApi } from '../services/api';
import { DeviceStats, WebSocketMessage } from '../types/mikrotik';
import { WS_URL } from '../config';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DeviceStats | null>(null);
  const [loading, setLoading] = useState(true);

  const { isConnected } = useWebSocket({
    url: WS_URL,
    onMessage: (message: WebSocketMessage) => {
      if (message.type === 'device_status') {
        // Update stats when device status changes
        fetchStats();
      }
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
    },
  });

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await mikrotikApi.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!stats) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Veri bulunamadı</Typography>
      </Box>
    );
  }

  const groupData = Object.entries(stats.groups).map(([group, count]) => ({
    name: group,
    count,
  }));

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          MikroTik Dashboard
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <Chip
            icon={isConnected ? <Wifi /> : <SignalWifiOff />}
            label={isConnected ? 'Bağlı' : 'Bağlantı Yok'}
            color={isConnected ? 'success' : 'error'}
            size="small"
          />

        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Toplam Cihaz
                  </Typography>
                  <Typography variant="h4" component="h2">
                    {stats.total_devices}
                  </Typography>
                </Box>
                <Computer sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Çevrimiçi
                  </Typography>
                  <Typography variant="h4" component="h2" color="success.main">
                    {stats.online_devices}
                  </Typography>
                </Box>
                <CheckCircle sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Çevrimdışı
                  </Typography>
                  <Typography variant="h4" component="h2" color="error.main">
                    {stats.offline_devices}
                  </Typography>
                </Box>
                <Error sx={{ fontSize: 40, color: 'error.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Başarı Oranı
                  </Typography>
                  <Typography variant="h4" component="h2" color="primary.main">
                    {stats.total_devices > 0 
                      ? Math.round((stats.online_devices / stats.total_devices) * 100) 
                      : 0}%
                  </Typography>
                </Box>

              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* CPU Yüksek Cihazlar */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Memory color="warning" />
              <Typography variant="h6">
                İşlemci Kullanımı Yüksek Cihazlar
              </Typography>
            </Box>
            {stats.high_cpu_devices?.length > 0 ? (
              <Box sx={{ maxHeight: 350, overflow: 'auto' }}>
                {stats.high_cpu_devices.map((device, index) => {
                  const cpuLoad = parseFloat(device.cpu_load?.replace('%', '') || '0');
                  return (
                    <Box 
                      key={device.id} 
                      sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        p: 1.5,
                        mb: 1,
                        bgcolor: index % 2 === 0 ? 'grey.50' : 'background.paper',
                        borderRadius: 1,
                        border: cpuLoad > 80 ? '1px solid' : 'none',
                        borderColor: cpuLoad > 80 ? 'error.main' : 'transparent'
                      }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {device.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {device.ip_address} • {device.group_name}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          size="small"
                          label={device.cpu_load}
                          color={cpuLoad > 80 ? 'error' : cpuLoad > 60 ? 'warning' : 'success'}
                          icon={cpuLoad > 80 ? <Warning /> : undefined}
                        />
                        <Chip
                          size="small"
                          label={device.is_online ? 'Online' : 'Offline'}
                          color={device.is_online ? 'success' : 'error'}
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="textSecondary">
                  CPU kullanım verisi olan cihaz bulunamadı
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Charts */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Grup Bazında Cihaz Dağılımı
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={groupData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#1976d2" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
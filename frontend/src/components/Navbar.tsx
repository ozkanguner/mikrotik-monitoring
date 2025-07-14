import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  Router,
  Dashboard,
  Settings,
  Computer,
  Assessment,
} from '@mui/icons-material';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();

  const menuItems = [
    { label: 'Dashboard', icon: <Dashboard />, path: '/' },
    { label: 'Cihazlar', icon: <Computer />, path: '/devices' },
    { label: 'Raporlar', icon: <Assessment />, path: '/reports' },
    { label: 'Ayarlar', icon: <Settings />, path: '/settings' },
  ];

  return (
    <AppBar position="static">
      <Toolbar>
        <Router sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          MikroTik API Yönetimi
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          {menuItems.map((item) => (
            <Button
              key={item.path}
              color="inherit"
              startIcon={item.icon}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </Button>
          ))}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar; 